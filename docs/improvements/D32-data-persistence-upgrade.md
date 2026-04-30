# D32：数据持久化升级

> 状态：方案已产出  
> 涉及范围：后端  
> 依赖：D9（knowledge/ 目录已独立）、D13（Plan 字段清理后 schema 更干净）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 所有数据存于单个 `data.json`，修改任何字段都需全量读-改-写 | 中 |
| 2 | 无并发安全保障（虽有队列串行化，但原子写入范围过大） | 低 |
| 3 | 无备份/恢复机制，数据损坏影响所有模块 | 中 |
| 4 | 无法水平扩展、无法做增量查询 | 低 |

### 当前架构

```
data.json (单文件)
  → loadData() 全量解析
  → updateData(fn) deep clone → mutate → JSON.stringify → write
  → 串行队列保证原子性
```

已经做到原子写入（`tmp + rename`），但本质上是单文件全量读改写。

---

## 二、方案设计

### 2.1 选型：SQLite（better-sqlite3）

| 维度 | JSON | SQLite |
|------|------|--------|
| 配置 | 零配置 | 零配置（单文件） |
| 并发 | 串行队列模拟 | 原生 WAL 模式 |
| 写入 | 全量读改写 | 增量行级更新 |
| 查询 | 全量过滤 | SQL 索引查询 |
| 备份 | 手动复制 | `VACUUM INTO` |
| 迁移 | 无 | SQL 迁移脚本 |
| 依赖 | 0 | `better-sqlite3` (~5MB native) |

### 2.2 Schema 设计

```sql
CREATE TABLE brand (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  keywords TEXT,          -- JSON array
  summary TEXT,
  website TEXT,
  established_at TEXT,
  audience TEXT,
  positioning TEXT,
  tone_of_voice TEXT,
  do_and_donts TEXT,      -- JSON array
  default_review_policy TEXT,
  setup_complete INTEGER,
  channels TEXT,          -- JSON array
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  source_type TEXT,
  original_name TEXT,
  original_mime_type TEXT,
  original_size_bytes INTEGER,
  status TEXT,
  summary TEXT,
  tags TEXT,              -- JSON array
  md_file_path TEXT,
  extraction_confidence REAL,
  extraction_error TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE plan_tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  brand_id TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  execution_type TEXT,
  schedule TEXT,
  status TEXT,
  brief TEXT,
  channel TEXT,
  content_type TEXT,
  requirements TEXT,          -- JSON array
  research_instructions TEXT,
  review_policy TEXT,
  linked_draft_ids TEXT,      -- JSON array
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  task_id TEXT,
  platform TEXT,
  group_name TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  status TEXT,
  cover_image TEXT,           -- JSON
  assets TEXT,                -- JSON array
  sources TEXT,               -- JSON array
  review_state TEXT,          -- JSON
  versions TEXT,              -- JSON array
  agent_run_id TEXT,
  content_type TEXT,
  publish_state TEXT,
  updated_at TEXT,
  created_at TEXT
);

CREATE TABLE agent_runs (...);
CREATE TABLE publish_records (...);
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
```

- 复杂嵌套结构（channels, requirements, versions 等）保留为 JSON 列
- 核心查询字段（status, platform, brand_id 等）独立列，方便索引
- 时间字段统一为 ISO 8601 字符串

### 2.3 迁移策略

**启动时自动检测：**
1. 检查 `data.db` 是否存在
2. 不存在 + `data.json` 存在 → 运行 JSON → SQLite 迁移
3. 迁移完成 → 备份 `data.json` 为 `data.json.bak`
4. 后续使用 SQLite，不再读写 JSON

```bash
# 新增 npm script
"migrate": "tsx server/migrate.ts"
```

### 2.4 新增备份功能

Settings 页面新增"数据管理"区块：

```
┌──────────────────────────────────────────┐
│  💿  数据管理                              │
│                                           │
│  存储引擎：SQLite                          │
│  数据文件：data.db                         │
│                                           │
│  [导出备份]  [导入备份]                     │
│                                           │
│  上次备份：2026-04-29 10:30                │
└──────────────────────────────────────────┘
```

- "导出备份"：复制 `data.db` + `knowledge/` 目录打包为 zip → 下载
- "导入备份"：上传 zip → 解压 → 替换 `data.db` + `knowledge/` → 重启生效
- 备份 API 不经过 `updateData`，直接文件操作

### 2.5 路由模块化（解决 data.ts 冲突）

`server/routes/data.ts` 当前承载所有 API 路由（600+ 行），被 12 个 topic 同时修改。D32 迁移到 SQLite 时拆分为独立模块：

```
server/routes/
├── brand.ts       # PUT /api/brand, POST /api/brand/suggest, POST /api/brand/preview
├── knowledge.ts   # GET/POST/DELETE /api/knowledge, POST /api/knowledge/upload
├── plans.ts       # GET/POST /api/plans, PUT/DELETE /api/plans/:id
├── tasks.ts       # GET/POST /api/plans/:id/tasks, PUT/DELETE tasks, POST preview-prompt
├── drafts.ts      # GET/POST /api/drafts, PUT/DELETE drafts, approve/reject/regenerate/publish/export
├── agent-runs.ts  # GET /api/agent-runs, POST /api/tasks/:id/agent-runs
├── config.ts      # GET/PUT /api/config, POST test-llm, POST test-image-gen, GET config/status
└── index.ts       # createDataRouter() — 挂载所有子路由
```

每个子路由文件 export 一个 `Router`，`index.ts` 中统一挂载。后续 topic 只修改对应的子路由文件，避免合并冲突。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增 `better-sqlite3` + `@types/better-sqlite3` |
| `server/routes/*.ts` | **新增/拆分** | data.ts 拆为 7 个子路由模块 |
| `server/db/schema.ts` | 新增 | SQLite schema 定义 + 建表 |
| `server/db/index.ts` | 新增 | 数据库连接 + WAL 模式初始化 |
| `server/db/migrate.ts` | 新增 | JSON → SQLite 迁移脚本 |
| `server/store.ts` | 重写 | `loadData`/`saveData`/`updateData` → SQLite 操作 |
| `server/routes/data.ts` | 修改 | 适配新的 store API |
| `server/knowledge/*.ts` | 修改 | 适配新的 store API |
| `src/pages/Settings.tsx` | 修改 | 新增"数据管理"区块 |

---

## 四、验收标准

- [ ] 首次启动自动检测 + 迁移 JSON → SQLite
- [ ] 迁移后备份原 `data.json`
- [ ] 所有 CRUD 操作通过 SQLite 正常执行
- [ ] WAL 模式启用，并发读写安全
- [ ] Settings 页面可导出/导入备份
- [ ] 备份包包含 `data.db` + `knowledge/` 目录
- [ ] 导入备份后数据完整恢复
- [ ] `server/routes/data.ts` 拆分为 7 个子路由模块
- [ ] 各子路由均通过 `req.app.get('db')` 获取 SQLite 实例
- [ ] 现有测试全部通过（适配新 store）
