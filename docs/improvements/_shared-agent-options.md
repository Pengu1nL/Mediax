# AgentGenerationOptions（跨课题共享接口）

> 此接口被 D20、D21、D22、D26 共同使用，定义在此避免各课题独立参数导致函数签名膨胀。

---

## 接口定义

```typescript
// server/agent/types.ts

interface AgentGenerationOptions {
  // === 配图（已有）===
  generateImage?: boolean;
  imageSize?: string;

  // === D21：Agent 行为参数化 ===
  contentLength?: 'short' | 'standard' | 'long';  // 默认 'standard'
  toneOverride?: string;                            // 非空时覆盖品牌语气
  extraInstructions?: string;                       // 追加到 user prompt

  // === D26：重新生成反馈 ===
  regenerationFeedback?: string;                    // 重新生成时的修改说明
}
```

## 各课题使用方式

| 课题 | 使用场景 | 传递路径 |
|------|---------|---------|
| D21 | RunAgentDialog 收集 → `startAgentRun` → `executeAgentRun` | 前端 → API → `runAgentTask` → `buildSystemPrompt` / `buildUserPrompt` |
| D20 | 预览 API 接收 options 构建 prompt 并返回 | `POST /api/tasks/:taskId/preview-prompt` → `buildSystemPrompt` / `buildUserPrompt` |
| D22 | `LlmGenerationError` 不影响 options，仅增加错误处理分支 | 在 `createDraftFromTaskContext` 的 try/catch 中 |
| D26 | request-regeneration 携带完整 options（含 `regenerationFeedback`） | `POST /api/drafts/:draftId/request-regeneration` → `initAgentRun(taskId, options)` |

## 函数签名

```typescript
// server/agent/draftGenerator.ts

export function buildSystemPrompt(
  context: AgentTaskContext,
  options?: AgentGenerationOptions,     // ← 统一参数
): string;

export function buildUserPrompt(
  context: AgentTaskContext,
  options?: AgentGenerationOptions,     // ← 统一参数
): string;

export async function createDraftFromTaskContext(
  context: AgentTaskContext,
  llmConfig?: LlmConfig,
  options?: AgentGenerationOptions,     // ← 统一参数
): Promise<CreateDraftInput>;
```

## D26 重新生成时保存原始 options

```typescript
// AgentRun 新增字段
interface AgentRun {
  // ...
  generationOptions?: AgentGenerationOptions;  // 存档本次执行使用的完整参数
}
```

D26 启动重新生成时，从原 `AgentRun.generationOptions` 读取 D21 参数，合并 `regenerationFeedback`，传递给新的 AgentRun。确保 D21 参数不丢失。
