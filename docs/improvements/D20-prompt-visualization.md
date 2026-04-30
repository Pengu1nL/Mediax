# D20：Prompt 可视化与可调试

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D19（AgentRunDetails 已有轮询和步骤展示）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | Agent 发送给 LLM 的完整 prompt 在任何前端页面上完全不可见 | 高 |
| 2 | 用户不知道 Agent 是否正确理解了品牌设定和任务要求 | 高 |
| 3 | 当生成结果不如预期时，无法判断问题是出在 Brief、品牌设定、还是 LLM | 中 |

---

## 二、方案设计

### 2.1 执行前：Prompt 预览

RunAgentDialog 新增"查看 Prompt"可展开区域：

```
┌──────────────────────────────────────┐
│  启动 Agent 执行                      │
│                                      │
│  任务：xxx    平台：xxx              │
│                                      │
│  ── Prompt 预览 ──              [展开]│
│  ┌────────────────────────────────┐  │
│  │ System Prompt                  │  │
│  │ 你是品牌"Mediax"的内容创作...    │  │
│  │                                │  │
│  │ User Prompt                    │  │
│  │ 请为以下任务创作内容...          │  │
│  └────────────────────────────────┘  │
│                                      │
│  （配图相关配置...）                  │
│                                      │
│  [取消]              [确认执行]       │
└──────────────────────────────────────┘
```

- 默认收起，点击展开
- 每个 prompt 在可滚动的 `<pre>` 代码块中展示（等宽字体，深色背景）
- 展开后用户可确认 prompt 是否合理再决定执行
- 对话框打开时即 fetch prompt 预览

### 2.2 API：Prompt 预览

```
POST /api/tasks/:taskId/preview-prompt
```

**请求体：**
```json
{ "generateImage": true, "imageSize": "1024x1024" }
```

**响应体：**
```json
{
  "systemPrompt": "你是品牌...",
  "userPrompt": "请为以下任务创作...",
  "imagePrompt": "为品牌...创作一张配图..."
}
```

- 复用 `buildSystemPrompt(context, options)` / `buildUserPrompt(context, options)`，options 使用统一 [`AgentGenerationOptions`](_shared-agent-options.md)
- 不执行 LLM 调用，仅返回拼接后的 prompt 文本
- 如任务数据不完整，返回错误提示

### 2.3 执行后：Prompt 存档

AgentRun 类型新增 3 个可选字段：

```typescript
interface AgentRun {
  // ... existing fields
  systemPrompt?: string;
  userPrompt?: string;
  imagePrompt?: string;
}
```

Agent 执行时，在创建 AgentRun 记录时存储实际使用的 prompt。AgentRunDetails 页面已有的步骤列表中新增可展开的 prompt 查看区域。

**AgentRunDetails 展示：**

在每个步骤下方（特别是"生成内容草稿"步骤），显示：

```
生成内容草稿  ✅
已通过 LLM 生成图文草稿"xxx"

[查看完整 Prompt ▼]
┌──────────────────────────────────────┐
│ System Prompt:                       │
│ ...                                  │
│ ─────────────────                    │
│ User Prompt:                         │
│ ...                                  │
└──────────────────────────────────────┘
```

- 点击展开/收起
- 代码块样式（等宽、深色背景、可滚动）
- 配图步骤同样可查看 `imagePrompt`

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/RunAgentDialog.tsx` | 修改 | 新增 Prompt 预览展开区（约 +40 行） |
| `src/pages/AgentRunDetails.tsx` | 修改 | 步骤下新增 Prompt 查看（约 +30 行） |
| `src/types.ts` | 修改 | AgentRun 新增 3 个 prompt 字段 |
| `server/routes/data.ts` | 修改 | 新增 `POST /api/tasks/:taskId/preview-prompt`（约 +30 行） |
| `server/agent/runAgentTask.ts` | 修改 | 执行时存储 prompt 到 AgentRun |
| `server/agent/draftGenerator.ts` | 修改 | 导出 `buildSystemPrompt` / `buildUserPrompt` 供预览 API 复用 |

---

## 四、验收标准

- [ ] RunAgentDialog 可展开查看 System Prompt 和 User Prompt
- [ ] Prompt 在等宽字体代码块中展示
- [ ] 预览 API 返回的 prompt 与实际执行时使用的一致
- [ ] AgentRunDetails 每个步骤可查看对应 prompt
- [ ] AgentRun 存档中保留实际使用的 prompt
- [ ] 预览 API 在任务数据不完整时返回错误提示
