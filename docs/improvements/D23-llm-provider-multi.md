# D23：LLM Provider 多选扩展

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D5（Settings 已有 provider 选择 UI + 引导卡片）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | LLM 后端只对接 DeepSeek 协议，Settings 中选 OpenAI/OpenRouter 实际无效 | 高 |
| 2 | 环境变量只有 `DEEPSEEK_API_KEY`，其他 provider 无 env 支持 | 中 |
| 3 | `createDeepSeekProvider()` 命名暗示只支持 DeepSeek | 低 |

### 技术事实

DeepSeek、OpenAI、OpenRouter 的 chat completions API **格式完全一致**：

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Body: { model, messages, max_tokens, temperature, stream }
```

当前 `createDeepSeekProvider()` 已经是标准的 OpenAI 兼容实现——只是命名和默认值绑定了 DeepSeek。

---

## 二、方案设计

### 2.1 重命名为通用 Provider

`server/llm/deepseek.ts` → `server/llm/openaiCompatible.ts`

```typescript
// 重命名
function createOpenAICompatibleProvider(config: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): LlmProvider
```

### 2.2 Provider 默认值

```typescript
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
  },
};
```

### 2.3 环境变量支持

为每个 provider 提供对应的 env fallback：

| Provider | API Key env | Model env |
|----------|------------|-----------|
| deepseek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` |
| openai | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| openrouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` |
| custom | — | — |

**优先级（不变）：** Settings 存储配置 > 环境变量 > provider 默认值

### 2.4 工厂函数改造

```typescript
// server/llm/index.ts
export function getLlmProvider(config?: LlmConfig): LlmProvider | null {
  const provider = config?.provider || 'deepseek';
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.deepseek;

  // API Key: stored > provider env var > 无
  const apiKey = config?.apiKey?.trim()
    || getProviderEnvVar(provider, 'API_KEY');

  if (!apiKey) return null;

  // Base URL: stored > defaults
  const baseUrl = config?.baseUrl?.trim() || defaults.baseUrl;
  
  // Model: stored > provider env var > defaults
  const model = config?.model?.trim()
    || getProviderEnvVar(provider, 'MODEL')
    || defaults.model;

  return createOpenAICompatibleProvider({ apiKey, baseUrl, model });
}
```

### 2.5 文件变更

| 操作 | 文件 |
|------|------|
| 重命名 | `server/llm/deepseek.ts` → `server/llm/openaiCompatible.ts` |
| 修改 | `server/llm/index.ts` — provider 默认值 + 多 env 支持 |
| 修改 | `.env.example` — 新增 `OPENAI_API_KEY`、`OPENROUTER_API_KEY` 等 |

**不影响：**
- Settings 页面（provider 选择 UI 已存在，D5 已完善）
- 前端任何代码
- Agent 执行流程
- 图片生成（独立于 LLM）

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/llm/openaiCompatible.ts` | 重命名自 | `deepseek.ts`，函数改为通用名 |
| `server/llm/deepseek.ts` | 删除 | 内容已移动到 openaiCompatible.ts |
| `server/llm/index.ts` | 修改 | provider 默认值映射 + 多 env 支持（约 +30 行） |
| `.env.example` | 修改 | 新增其他 provider 的 env 示例 |

---

## 四、验收标准

- [ ] Settings 中选择 OpenAI → LLM 调用实际发送到 OpenAI API
- [ ] Settings 中选择 OpenRouter → LLM 调用实际发送到 OpenRouter API
- [ ] 选择自定义 → 使用手动填写的 baseUrl 和 model
- [ ] 各 provider 的 env fallback 正常工作
- [ ] 未配置时行为与之前一致（返回 null → fallback 模板）
- [ ] 图片生成不受影响
- [ ] DeepSeek 作为默认 provider 行为不变
