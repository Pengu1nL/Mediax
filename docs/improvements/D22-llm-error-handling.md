# D22：LLM 错误处理与用户感知

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D19（异步执行后错误可实时展示）、D20（Prompt 可视化辅助排查）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | LLM 调用失败时静默回退到模板生成，生成的占位文字以假乱真 | 高 |
| 2 | 用户看到草稿内容时不知道是 LLM 生成还是模板生成的 | 中 |
| 3 | 错误信息仅 `console.error`，用户得不到任何可操作的修复指引 | 高 |
| 4 | LLM 未配置和 LLM 调用失败在 UI 上无区分 | 中 |

### 当前 fallback 行为

```typescript
// draftGenerator.ts:137-144
catch (err) {
  console.error('LLM 生成失败，使用 fallback:', err);
  const fallback = createFallbackDraft(context);
  // fallback 产出：以{语气}的语气，为{品牌名}创作：{brief}
}
```

用户看到的是无法分辨的占位文字。

---

## 二、方案设计

### 2.1 AgentRun 新增字段

```typescript
interface AgentRun {
  // ... existing fields
  generationMethod: 'llm' | 'fallback';
  fallbackReason?: string;
  generationOptions?: AgentGenerationOptions;  // 存档完整参数（见 _shared-agent-options.md）
}
```

### 2.2 错误分类与消息

| 场景 | generationMethod | fallbackReason | 用户消息 |
|------|-----------------|---------------|---------|
| LLM 生成成功 | `llm` | — | "已通过 LLM 生成草稿" |
| LLM 未配置 | `fallback` | `llm_not_configured` | "未配置 LLM，使用模板生成。请在 Settings 中配置 API Key。" |
| LLM 调用失败 | `fallback` | `llm_call_failed` | "LLM 调用失败：{错误摘要}。已使用模板生成，请检查 API 配置或稍后重试。" |

### 2.3 各页面感知

**AgentRunDetails 页面：**

fallback 时在页面顶部显示醒目警告 banner：

```
┌──────────────────────────────────────────────┐
│ ⚠️  本次生成使用了模板而非 AI                     │
│    原因：未配置 LLM API Key                     │
│    [前往 Settings 配置]                         │
└──────────────────────────────────────────────┘
```

"生成内容草稿"步骤状态改为 `failed`（而非 `completed`），附带具体原因和修复指引。

**DraftEditor 页面：**

Agent 来源面板区分展示：

```
正常（LLM）：
  ✅ 由 Agent (LLM) 生成

Fallback：
  ⚠️ 由模板生成（AI 不可用）
  原因：LLM 调用失败 — Invalid API Key
  [查看执行记录 →]  [前往 Settings →]
```

**Plans 列表 + Dashboard：** 不在此范围改动（保持轻量）。

### 2.4 后端改造

使用统一 [`AgentGenerationOptions`](_shared-agent-options.md) 参数。`draftGenerator.ts` 不再静默吞异常，改为向上抛出带类型标签的错误：

```typescript
// 新增
class LlmGenerationError extends Error {
  constructor(
    message: string,
    public reason: 'llm_not_configured' | 'llm_call_failed',
    public originalError?: unknown,
  ) {
    super(message);
  }
}
```

`runAgentTask.ts` 捕获后：
1. 仍然调用 `createFallbackDraft()` 生成占位内容（不给用户空白）
2. 将 `generationMethod: 'fallback'` 和 `fallbackReason` 写入 AgentRun
3. 步骤状态设为 `failed`，消息包含可操作的修复指引

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types.ts` | 修改 | AgentRun 新增 `generationMethod` + `fallbackReason` |
| `server/agent/draftGenerator.ts` | 修改 | 新增 `LlmGenerationError`，不再静默吞异常 |
| `server/agent/runAgentTask.ts` | 修改 | 捕获错误后记录 fallback 信息到 AgentRun |
| `src/pages/AgentRunDetails.tsx` | 修改 | fallback 时显示警告 banner + 步骤改 failed 态 |
| `src/pages/DraftEditor.tsx` | 修改 | Agent 来源面板区分 LLM/fallback，附修复指引 |

---

## 四、验收标准

- [ ] LLM 生成成功时 AgentRun.generationMethod = 'llm'
- [ ] LLM 未配置时标记 fallback，步骤显示 failed + 配置指引
- [ ] LLM 调用失败时标记 fallback，步骤显示 failed + 错误摘要
- [ ] AgentRunDetails fallback 时顶部显示醒目警告 banner
- [ ] DraftEditor Agent 来源面板区分 LLM / 模板生成
- [ ] fallback 仍产出占位内容（不给用户空白页）
- [ ] 警告信息包含可操作的修复步骤（前往 Settings / 检查配置）
