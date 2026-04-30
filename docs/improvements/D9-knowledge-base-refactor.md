# D9：素材批量知识化 —— Library 重构为知识库

> 状态：方案已产出  
> 涉及范围：全栈（前端 + 后端）  
> 依赖：D5（LLM 连通性测试，知识库 AI 解析依赖 LLM 配置）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | "加入品牌知识"逐文件手动操作，一个三点菜单一个文件 | 高 |
| 2 | 知识提取仅基于文件名和元数据，完全不会解析文件内容 | 高 |
| 3 | File System Access API 强制绑定 Chrome/Edge，且整个 Library 架构围绕本地文件夹设计 | 中 |
| 4 | 知识摘要质量太低，直接拉低 Agent 内容生成质量 | 高 |

---

## 二、架构变更总览

### 当前架构

```
用户绑定本地文件夹 (FSA)
  → scanAssetDirectory() 递归扫描
  → 展示文件列表 (Library.tsx)
  → 逐文件手动"加入品牌知识"
  → 前端拼凑元数据摘要 → POST /api/knowledge → data.json
```

### 目标架构

```
用户上传文件 (multipart upload)
  → 服务端接收文件 → 按类型解析
    ├── 文本/PDF/文档 → 全文提取 → LLM 摘要 → .md
    └── 图片 → 视觉 AI 描述 → 品牌风格分析 → .md
  → .md 存入 knowledge/ 目录
  → 知识条目元数据存入 data.json
  → 知识库页浏览/搜索/删除
```

### 核心变更

| 维度 | 当前 | 目标 |
|------|------|------|
| **文件来源** | FSA 本地文件夹绑定 | HTTP 文件上传 |
| **存储** | 用户本地目录 | `knowledge/` 目录（在 data.json 旁） |
| **数据模型** | `BrandKnowledgeItem` | `KnowledgeEntry`（引用 .md 文件） |
| **内容提取** | 前端拼凑文件名+大小 | 服务端 AI 解析 |
| **Agent 使用** | 读取 `summary` 字段 | 读取完整 .md 文档 |
| **localAssetLibrary.ts** | 530 行 | 完全删除 |
| **KnowledgeExtraction.ts** | 21 行前端逻辑 | 服务端处理管线 |

---

## 三、存储设计

### 目录结构

```
project-root/
├── data.json
├── knowledge/                    ← 新增，可配置路径
│   ├── entry-abc123/
│   │   ├── original.png         ← 原始上传文件
│   │   ├── summary.md           ← AI 生成的知识文档
│   │   └── meta.json            ← 解析元数据
│   ├── entry-def456/
│   │   ├── original.pdf
│   │   ├── summary.md
│   │   └── meta.json
│   └── ...
```

### 配置

```bash
# .env 新增
KNOWLEDGE_DIR=./knowledge   # 默认值，可通过环境变量自定义
```

### meta.json 结构

```json
{
  "id": "entry-abc123",
  "originalFileName": "秋招主视觉.png",
  "originalMimeType": "image/png",
  "originalSizeBytes": 204800,
  "sourceType": "image",
  "extractionModel": "deepseek-v4-pro",
  "extractionConfidence": 0.85,
  "extractionDuration": 2340,
  "brandId": "brand-1",
  "createdAt": "2026-04-28T10:30:00Z"
}
```

### summary.md 格式

```markdown
# {素材名称}

**来源类型：** 图片
**标签：** 秋招, 主视觉, 海报, 品牌宣传

## 内容描述

{AI 生成的内容描述}

## 品牌风格分析

{AI 分析的品牌视觉风格}
```

---

## 四、文件处理管线

### 4.1 整体流程

```
file uploaded
  → save to temp
  → detect type (extension + mime)
  → dispatch to handler:
      ├── text:   readFile → LLM.summarize → write .md
      ├── pdf:    pdf-parse → LLM.summarize → write .md
      ├── doc:    mammoth → LLM.summarize → write .md
      └── image:  toBase64 → LLM.vision → write .md
  → write meta.json
  → move to knowledge/{id}/
  → update data.json
  → return KnowledgeEntry
```

### 4.2 文本文件处理（.txt .md .csv .rtf）

```
read file as UTF-8 text
  → if text length > 4000 chars, truncate
  → LLM prompt: "为以下文本生成摘要和关键信息提取..."
  → parse LLM JSON output
  → write summary.md
```

### 4.3 PDF 处理（.pdf）

```
npm: pdf-parse (MIT license, 轻量)
  → extract text from all pages
  → LLM prompt: "为以下 PDF 内容生成结构化摘要..."
  → write summary.md
```

### 4.4 Word 文档处理（.docx）

```
npm: mammoth (.docx → HTML/text, 无 .doc 支持)
  → extract text
  → LLM.summarize
  → write summary.md
```

注意：`.doc` 格式暂不支持（mammoth 仅支持 .docx），上传时提示用户转换格式。

### 4.5 图片处理（image/*）

```
read image → toBase64 data URL
  → LLM multimodal prompt（system: 品牌风格分析师 + user: 图片base64）
  → extract: 内容描述 + 品牌视觉风格 + 适用场景
  → write summary.md
```

视觉 AI 依赖 LLM 的 multimodal 能力。如 DeepSeek V4 支持图片输入。如果当前配置的 LLM 不支持 multimodal，图片处理降级为仅记录文件名和元数据，并提示"当前模型不支持图片解析"。

### 4.6 视频处理

当前返回 `{ skipped: true, reason: "视频解析暂不支持" }`，前端展示"视频暂不支持解析，已保留原始文件"。目录结构仍创建，但 summary.md 为占位内容。

---

## 五、数据模型

### 新类型定义

```typescript
// 知识条目来源类型
type KnowledgeSourceType = 'image' | 'pdf' | 'document' | 'text' | 'video';

// 处理状态
type KnowledgeProcessingStatus = 'processing' | 'ready' | 'failed';

// 单条知识条目
interface KnowledgeEntry {
  id: string;
  brandId: string;
  sourceType: KnowledgeSourceType;
  originalName: string;       // 原始文件名
  originalMimeType: string;
  originalSizeBytes: number;
  status: KnowledgeProcessingStatus;
  summary: string;             // 摘要（来自 summary.md 的前 160 字符）
  tags: string[];              // AI 提取的标签
  mdFilePath: string;          // 相对路径 "knowledge/{id}/summary.md"
  extractionConfidence: number;
  extractionError?: string;    // 处理失败时的错误信息
  createdAt: string;
  updatedAt: string;
}

// AppData 变更
interface AppData {
  brand: BrandProfile;
  // assets: Asset[];          ← 删除
  knowledgeEntries: KnowledgeEntry[];  // 替换 knowledgeItems
  plans: Plan[];
  planTasks: PlanTask[];
  drafts: Draft[];
  agentRuns: AgentRun[];
  publishRecords: PublishRecord[];
  config: SystemConfig;
}
```

### 删除的类型

- `BrandKnowledgeItem`
- `KnowledgeContentType`
- `KnowledgeProcessingStatus`（重新定义）
- `Asset`
- `LocalAssetFile` / `DirectoryNode` / `AssetScanResult` 等 FSA 相关类型

---

## 六、API 设计

### 上传知识条目

```
POST /api/knowledge/upload
Content-Type: multipart/form-data

files: File[]  (1-10 个文件，单文件 ≤ 50MB)
brandId: string
```

**响应：**

```json
{
  "entries": [
    {
      "id": "entry-abc123",
      "originalName": "秋招主视觉.png",
      "status": "ready",
      "summary": "一张以橙色为主色调的...",
      "tags": ["秋招", "主视觉", "海报"]
    },
    {
      "id": "entry-def456",
      "originalName": "品牌手册.pdf",
      "status": "ready",
      "summary": "建桥融高品牌手册，涵盖..."
    }
  ],
  "errors": [
    { "fileName": "old-design.doc", "reason": ".doc 格式暂不支持，请转换为 .docx" }
  ]
}
```

**处理流程：**
1. 接收文件，保存到临时目录
2. 逐个处理（串行，避免并发 LLM 调用限流）
3. 每处理完一个，写入 `knowledge/{id}/` 并更新 `data.json`
4. 全部完成后返回汇总结果

### 获取知识条目列表

```
GET /api/knowledge?brandId={brandId}
```
返回 `KnowledgeEntry[]`，与现有接口兼容。

### 获取单条知识条目（含 .md 内容）

```
GET /api/knowledge/:entryId?full=true
```
`?full=true` 时返回字段包含 `mdContent: string`（从 summary.md 读取的完整内容）。

### 删除知识条目

```
DELETE /api/knowledge/:entryId
```
删除 `knowledge/{entryId}/` 整个目录 + `data.json` 中的引用。

### 删除的端点

- `GET /api/data`（snapshot）中不再包含 `assets` 字段

---

## 七、新增依赖

| 包 | 用途 | 大小 |
|----|------|------|
| `multer` | multipart/form-data 文件上传解析 | 轻量 |
| `pdf-parse` | PDF 文本提取 | 轻量 |
| `mammoth` | .docx → text 提取 | 轻量 |

已在 `package.json` 中的依赖无需变更。

---

## 八、Agent prompt 适配

### 当前（draftGenerator.ts:40-44）

```typescript
if (knowledge.length > 0) {
  parts.push('【品牌知识库】');
  knowledge.forEach((k) => parts.push(`- ${k.summary}`));
}
```

### 目标

```typescript
if (knowledgeEntries.length > 0) {
  parts.push('【品牌知识库】');
  for (const entry of knowledgeEntries) {
    const mdContent = await readKnowledgeMd(entry.mdFilePath);
    parts.push(`### ${entry.originalName}`);
    parts.push(mdContent);
    parts.push('');
  }
}
```

Agent 从读 160 字摘要变为读完整 .md 文档，生成质量显著提升。

---

## 九、前端改动

### Library.tsx → KnowledgeBase.tsx

| 当前（1150 行） | 目标 |
|----------------|------|
| FSA 目录绑定 + 状态机 | 简单的文件上传 + 知识列表 |
| `scanAssetDirectory()` | `POST /api/knowledge/upload` |
| 左侧目录树 | 标签筛选栏 |
| 6 种 Library 状态 | 3 种状态：加载中 / 空 / 列表 |
| 素材卡片（预览/下载/重命名/删除） | 知识卡片（预览 .md / 下载原始文件 / 删除） |
| 逐文件"加入品牌知识" | 批量上传即自动处理 |

### 知识库页面布局

```
┌──────────────────────────────────────────────────┐
│  知识库                          [上传文件] 按钮   │
│                                                    │
│  ┌────┬────┬────┬────┐                            │
│  │全部│图片│PDF │文档│  标签筛选                    │
│  └────┴────┴────┴────┘                            │
│                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ 📷       │ │ 📄       │ │ 📝       │             │
│  │ 秋招KV   │ │ 品牌手册  │ │ 招生文案  │             │
│  │ 2个标签  │ │ 3个标签  │ │ 2个标签  │             │
│  │ 12KB     │ │ 2.4MB    │ │ 8KB      │             │
│  └─────────┘ └─────────┘ └─────────┘             │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 上传交互

1. 点击"上传文件"按钮（或拖拽到知识库页面）
2. 弹出文件选择器（`<input type="file" multiple>`）
3. 文件列表预览（缩略图 + 文件名 + 大小）
4. 点击"开始上传"
5. 进度提示："正在上传并解析... (2/5)"
6. 完成：新增的知识条目以动画形式出现在列表中
7. 部分失败：显示失败项 + 原因

### Brand.tsx 适配

将"品牌知识库"区块从展示 `BrandKnowledgeItem[]` 改为展示 `KnowledgeEntry[]`，点击可展开查看 .md 全文。

---

## 九点五、旧数据迁移

D9 删除 `BrandKnowledgeItem` 类型并替换为 `KnowledgeEntry`。如果 `data.json` 中存在旧 `knowledgeItems` 数据，启动时自动执行迁移：

### 迁移脚本（`server/knowledge/migrate.ts`）

```
1. 检测 data.json 中 knowledgeItems 是否存在且非空
2. 对每个 BrandKnowledgeItem：
   a. 创建 knowledge/{entryId}/ 目录
   b. 将 summary 字段写入 summary.md：
       # {sourceName}
       **来源类型：** {sourceType}
       **标签：** {tags 逗号分隔}
       {summary}
   c. 生成 meta.json（复用旧字段）
   d. 创建 KnowledgeEntry 记录
3. 备份原 data.json 为 data.json.pre-d9.bak
4. 删除 knowledgeItems 字段，写入 knowledgeEntries 字段
5. 日志输出迁移统计（成功 N 条，跳过 0 条）
```

**重要：** 旧条目没有 `original.*` 文件（文件未实际保存过），迁移后的 `original` 字段留空。在知识库 UI 中，这类条目标记为"历史迁移"并仅显示 .md 内容。

### 迁移时机

服务端启动时（`server/index.ts`）在 `loadData()` 之后自动检测并运行迁移。迁移是幂等的（检测到 `knowledgeEntries` 已存在则跳过）。

---

## 十、改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `server/knowledge/processor.ts` | 文件处理管线（文本/PDF/文档/图片/视频） |
| `server/knowledge/storage.ts` | 知识目录读写、.md 文件管理 |
| `server/knowledge/migrate.ts` | **新增** 旧 `BrandKnowledgeItem` → `KnowledgeEntry` 迁移 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `server/knowledge/processor.ts` | 文件处理管线（文本/PDF/文档/图片/视频） |
| `server/knowledge/storage.ts` | 知识目录读写、.md 文件管理 |

### 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/routes/data.ts` | **重写知识路由** | 删旧三端点，加 `POST /upload` + `GET ?full=true` |
| `server/index.ts` | 修改 | 加 multer middleware + `/api/knowledge` 路由挂载 |
| `server/agent/draftGenerator.ts` | 修改 | 知识引用从 `summary` 改为读 .md 全文 |
| `server/agent/brandContext.ts` | 修改 | `knowledgeItems` → `knowledgeEntries` |
| `server/store.ts` | 修改 | 默认数据 `knowledgeItems` → `knowledgeEntries` |
| `src/types.ts` | 修改 | 删旧知识类型 + 加 `KnowledgeEntry` + 删 `Asset` |
| `src/constants.ts` | 修改 | 删 `SEED_ASSETS` + `SEED_KNOWLEDGE_ITEMS` → `SEED_KNOWLEDGE_ENTRIES` |
| `src/pages/Library.tsx` | **重写** | → `KnowledgeBase.tsx`（约 400 行） |
| `src/pages/Brand.tsx` | 修改 | 知识库展示适配 |
| `src/context/AppContext.tsx` | 修改 | `knowledgeItems` → `knowledgeEntries` |
| `src/repositories/apiRepositories.ts` | 修改 | 知识库 API 方法适配 |
| `src/repositories/localStorageRepositories.ts` | 修改 | 知识库存储方法适配 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `src/services/localAssetLibrary.ts` | FSA 操作（530 行），全部删除 |
| `src/services/knowledgeExtraction.ts` | 前端知识提取（21 行），逻辑移至服务端 |

### 不需要改动的文件

- `TopNavBar.tsx`（导航中 "Library" → 改为 "知识库" 标签，只改一个字符串）
- `Router`（路由 `/library` → `/knowledge`）
- Dashboard（引用 `knowledgeItems` 的地方改为 `knowledgeEntries`）

---

## 十一、router 和导航调整

| 项目 | 当前 | 目标 |
|------|------|------|
| URL | `/library` | `/knowledge` |
| 导航标签 | "Library" | "知识库" |
| 页面组件 | `Library.tsx` | `KnowledgeBase.tsx` |

---

## 十二、与后续课题的关系

| 课题 | 关系 |
|------|------|
| **D10** | 云端存储集成。知识目录结构（`knowledge/{id}/`）设计为本地文件系统，未来 D10 可扩展为云存储后端 |
| **D11** | 上传体验优化（拖拽上传等）。D9 建立了基本上传流程，D11 在此基础上优化交互体验 |
| **D5** | 知识解析依赖 LLM 配置，D5 的测试连接可验证 LLM 是否可用于知识解析 |
| **D19** | Agent 执行异步化。知识上传处理也可受益（大文件异步后台处理） |

---

## 十三、验收标准

- [ ] File System Access API 相关代码全部移除
- [ ] 知识库页面支持多文件上传（一次可选 1-10 个文件）
- [ ] 文本文件上传后生成 AI 摘要 .md
- [ ] PDF 文件上传后提取全文并生成 .md
- [ ] 图片文件上传后通过视觉 AI 生成内容描述和风格分析 .md
- [ ] 视频文件上传时提示"暂不支持解析"
- [ ] .md 文件存入 `knowledge/` 目录，结构正确
- [ ] 知识库页面展示知识条目列表，支持标签筛选
- [ ] 知识条目可预览 .md 内容、下载原始文件、删除
- [ ] Agent prompt 引用完整 .md 内容
- [ ] Brand 页面知识库区块正常展示新格式
- [ ] 旧 `BrandKnowledgeItem` 类型和相关代码全部移除
- [ ] `/library` → `/knowledge` 路由和导航已更新
- [ ] 启动时自动检测旧 `knowledgeItems` 数据并迁移为 .md + `KnowledgeEntry`
- [ ] 迁移后旧数据备份为 `data.json.pre-d9.bak`
- [ ] 迁移的旧条目在 UI 中标记"历史迁移"
