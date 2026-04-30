# D33：多用户与权限体系

> 状态：方案已产出  
> 涉及范围：全栈  
> 依赖：D32（SQLite 存储用户数据）

---

## 一、部署模型：局域网团队协作

Mediax 是本地部署的单机应用，多用户通过**局域网**共享访问：

```
办公室局域网

  editor-A (192.168.1.101) ──┐
                              │
  editor-B (192.168.1.102) ──┼──→ 服务器 (192.168.1.100)
                              │     ├── Express API (:3001)
  reviewer  (192.168.1.103) ─┘     ├── SQLite data.db
                                    └── knowledge/ 目录
```

**关键前提：**
- 一台机器运行 `npm run dev`，Vite 已绑定 `0.0.0.0`（`package.json:9`），局域网可访问
- SQLite WAL 模式支持多读单写并发，小团队（<10 人）完全够用
- `knowledge/` 目录存在服务器上，所有用户共享同一套品牌知识库
- 纯局域网运行，数据不出内网

**与云服务多租户的区别：**
- 非 SaaS 多租户，而是**同一实例下的团队账号体系**
- 数据共享同一份 `data.db` + `knowledge/`，非隔离
- 权限管控用于**角色分工**（谁写、谁审、谁管），而非数据隔离

---

## 二、问题回顾（已纳入多用户方案）

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 仅一对 ADMIN_EMAIL/PASSWORD 硬编码，无多用户支持 | 高 |
| 2 | 无角色和权限区分，所有人都是 admin | 中 |
| 3 | 内容运营是团队工作，需要编辑、审核角色分工 | 中 |

---

## 三、方案设计

### 2.1 用户模型

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'reviewer')),
  active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
```

| 角色 | 权限范围 |
|------|---------|
| **admin** | 全部权限：CRUD 所有数据 + 管理用户 + 修改系统配置 |
| **editor** | 品牌档案 + 知识库 + 计划/任务创建编辑 + Agent 执行 + 草稿编辑 |
| **reviewer** | 查看所有内容 + 审核草稿（批准/拒绝/要求修改）|

### 2.2 权限矩阵

| 操作 | admin | editor | reviewer |
|------|-------|--------|----------|
| 查看 Dashboard / Brand / 知识库 / Plans | ✅ | ✅ | ✅ |
| 创建/编辑品牌档案 | ✅ | ✅ | ❌ |
| 创建/编辑知识条目 | ✅ | ✅ | ❌ |
| 创建/编辑计划 | ✅ | ✅ | ❌ |
| 创建/编辑任务 | ✅ | ✅ | ❌ |
| 执行 Agent | ✅ | ✅ | ❌ |
| 编辑草稿 | ✅ | ✅ | ❌ |
| 审核草稿（批准/拒绝） | ✅ | ❌ | ✅ |
| 发布草稿 | ✅ | ✅ | ❌ |
| 修改系统配置 (Settings) | ✅ | ❌ | ❌ |
| 管理用户 | ✅ | ❌ | ❌ |
| 数据导出/备份 | ✅ | ❌ | ❌ |

### 2.3 RBAC 中间件

```typescript
// server/auth.ts
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '无此操作权限。' });
    }
    next();
  };
}

// 使用
router.post('/brand', requireAuth, requireRole('admin', 'editor'), handler);
router.put('/config', requireAuth, requireRole('admin'), handler);
router.post('/drafts/:id/approve', requireAuth, requireRole('admin', 'reviewer'), handler);
```

### 2.4 密码管理

- 使用 `bcrypt` 哈希存储密码
- 登录验证：`bcrypt.compare(password, hash)`
- 默认 admin 账号：首次启动时从 `.env` 中的 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 种子创建
- admin 可创建/禁用/删除其他用户

### 2.5 团队管理 UI

Settings 页面新增"团队管理"区块（仅 admin 可见）：

```
┌──────────────────────────────────────────┐
│  👥  团队管理                              │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │ admin@mediax.local   管理员    [编辑]  │ │
│  │ 小张@mediax.local    编辑      [编辑]  │ │
│  │ 小李@mediax.local    审核员    [编辑]  │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  [+ 添加成员]                              │
└──────────────────────────────────────────┘
```

**添加/编辑用户弹窗：**
- 姓名
- 邮箱
- 角色（admin/editor/reviewer）
- 密码（创建时必填，编辑时选填）

### 2.6 前端适配

- TopNavBar 显示当前用户名 + 角色标签
- 非 admin 用户看不到 Settings 菜单（或部分区块 disabled）
- 操作按钮根据权限显示/隐藏（如 reviewer 看不到"发布"按钮）

---

## 四、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增 `bcryptjs` + `@types/bcryptjs` |
| `server/auth.ts` | 修改 | 用户数据库认证 + RBAC 中间件 + 用户 CRUD API |
| `server/routes/data.ts` | 修改 | 各路由添加 `requireRole` 检查 |
| `server/db/schema.ts` | 修改 | 新增 `users` 表 |
| `server/store.ts` | 修改 | 默认 seed admin 用户 |
| `src/types.ts` | 修改 | `SessionUser` role 扩展为 `admin | editor | reviewer` |
| `src/pages/Settings.tsx` | 修改 | 新增"团队管理"区块（仅 admin 可见） |
| `src/components/TopNavBar.tsx` | 修改 | 显示用户名+角色，非 admin 隐藏 Settings |

---

## 五、验收标准

- [ ] 支持多用户注册和登录（局域网内不同机器访问同一服务端）
- [ ] admin 可在 Settings 管理用户（添加/编辑/禁用）
- [ ] editor 可创建编辑内容但不可改系统配置
- [ ] reviewer 仅可查看 + 审核草稿
- [ ] 权限不足时返回 403 + 前端按钮隐藏
- [ ] 密码 bcrypt 哈希存储
- [ ] 默认 admin 从 .env 种子创建
- [ ] 现有单用户行为不变（admin 权限完整）
- [ ] 局域网中多台机器同时访问同一 Mediax 实例，各自使用独立账号
