<div align="center">
<img width="1200" height="475" alt="Mediax Banner" src="./public/mediax-banner.svg" />
</div>

# Mediax

Mediax 是一个 Agent 驱动的品牌内容运营平台。从品牌上下文建立 → 知识库 → Agent 计划与任务 → AI 内容生成 → 草稿审核 → 发布，覆盖完整内容工作流。

## 功能概览

| 模块 | 说明 |
|------|------|
| **品牌管理** | 品牌档案（名称/行业/定位/语气/表达规范/渠道），首次使用强制创建，完整度评分 |
| **品牌知识库** | 素材转知识条目，支持标签、摘要、来源追溯，Agent 生成时自动注入 |
| **计划与任务** | Agent-ready 任务（Brief/渠道/内容类型/审核策略），单次执行 / 循环执行调度 |
| **Agent 执行** | 一键启动 Agent，加载品牌上下文 → 分析 Brief → LLM 生成草稿（DeepSeek），含执行步骤追踪 |
| **草稿审核** | 编辑器 + Agent 来源面板 + 审核操作（批准/拒绝/要求重新生成），状态自动同步到关联任务 |
| **发布导出** | 模拟发布 + 导出发布包（含平台发布说明），三级审核策略优先级 |

## 技术栈

- **前端：** React 19、TypeScript、Vite、Tailwind CSS 4、React Router、Motion
- **后端：** Express、JWT Auth、File System Access API
- **AI：** DeepSeek LLM（可扩展 OpenAI/Claude 等）
- **测试：** Vitest、Testing Library

## 本地开发

**前置要求：** Node.js 20+

```bash
npm install
cp .env.example .env
```

编辑 `.env`，填入 DeepSeek API Key（从 [platform.deepseek.com](https://platform.deepseek.com/) 获取）以启用 AI 内容生成。不填 Key 时系统使用模板生成作为 fallback。

```bash
npm run dev
```

前端 `http://localhost:3000`，API `http://localhost:3001`。

**Demo 登录：**

```
Email: admin@mediax.local
Password: mediax2026
```

## 脚本

```bash
npm run dev          # 启动 API + Vite 客户端
npm run server       # 仅启动 API
npm run dev:client   # 仅启动 Vite 客户端
npm test             # 运行测试
npm run lint         # TypeScript 类型检查
npm run build        # 生产构建
```

## 项目说明

- 数据存储在 `data.json`（Git 忽略），Express 服务端读写，支持本地持久化。
- 当前为单品牌、单管理员模式。
- 素材库通过 File System Access API 绑定本地文件夹（需 Chrome/Edge），支持图片/PDF/视频/文档的浏览、上传、重命名、下载、删除，单文件最大 50MB。
- Agent 生成默认使用 DeepSeek LLM，可通过 `server/llm/` 模块扩展其他厂商。
- `.env` 已加入 `.gitignore`，API Key 不会提交到仓库。

## 架构

```
src/                  → React 前端（pages / components / context / repositories）
server/
  agent/              → Agent 执行引擎（品牌上下文加载、草稿生成、任务编排）
  llm/                → LLM 提供商（DeepSeek，可扩展）
  publishers/         → 模拟发布 + 导出
  routes/             → Express API 路由
  store.ts            → 数据读写 + 原子更新
```
