# D5：API 配置引导与连通性测试

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：无

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | API Key 手动配置门槛高，无获取链接、无 Provider 默认值说明 | 高 |
| 2 | 填写 API Key 后无"测试连接"按钮，只能在跑 Agent 时验证 | 高 |
| 3 | LLM 失败时静默 fallback 到模板生成，用户不知道 API 未生效 | 高 |
| 4 | 图片生成切换 Provider 时静默覆盖 baseUrl/model，无提示 | 中 |
| 5 | 文本生成（LlmForm）切换 Provider 无默认值自动填充，体验不一致 | 低 |

---

## 二、方案设计

### 2.1 连通性测试

#### API 端点

新增两个测试端点，发送最小化 API 调用验证连通性和认证：

```
POST /api/config/test-llm
POST /api/config/test-image-gen
```

**请求体：**

```typescript
{
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}
```

**响应体：**

```typescript
// 成功
{ ok: true, latency: 842 }

// 失败
{ ok: false, error: "API Key 无效 (401)" }
```

**后端实现要点：**
- LLM 测试：发送 `messages: [{ role: 'user', content: 'Hi' }]`, `max_tokens: 1`
- 图片生成测试：根据 provider 类型发送最小生成请求
- 不在 `updateData()` 内执行，不持久化任何数据
- 超时设置 15 秒

#### 前端交互

每个配置区块 header 右侧放置"测试连接"按钮：

```
文本生成  ⚡ ────────────  [测试连接]
图片生成  🖼 ────────────  [测试连接]
```

| 状态 | UI |
|------|-----|
| 空闲 | outline 样式按钮"测试连接" |
| API Key 为空 | disabled + tooltip "请先填写 API Key" |
| 测试中 | spinner + "正在测试..."，按钮 disabled |
| 成功 | 绿色 `CheckCircle2` + "连接成功 (342ms)"，3 秒后自动消失 |
| 失败 | 红色 InlineAlert 显示具体错误 + 修复建议 |

#### 错误信息映射

| HTTP/网络错误 | 用户提示 |
|-------------|---------|
| 401 | "API Key 无效，请检查是否填写正确" |
| 403 | "API Key 无权限，请检查账户余额和接口权限" |
| 404 | "Base URL 或 Model 名称错误" |
| 超时 | "连接超时，请检查 Base URL 是否正确、网络是否可达" |
| DNS/网络错误 | "无法连接服务器，请检查 Base URL 或网络设置" |

### 2.2 API 配置引导卡片

切换 Provider 时，在表单下方显示对应的引导卡片：

```
┌──────────────────────────────────────────────────┐
│ 💡 DeepSeek 配置指南                               │
│                                                   │
│ • 前往 platform.deepseek.com 注册并获取 API Key    │
│ • 默认 Base URL：https://api.deepseek.com/v1       │
│ • 推荐 Model：deepseek-v4-pro（高质量）/            │
│               deepseek-v4-flash（快速）            │
│ • 📖 API 文档：https://api-docs.deepseek.com/zh-cn/ │
│                                                   │
│ ⚠️ deepseek-chat / deepseek-reasoner 于            │
│    2026-07-24 退役，请使用新模型名                   │
└──────────────────────────────────────────────────┘
```

各 Provider 引导信息：

| Provider | 注册地址 | 默认 Base URL | 推荐 Model | 文档链接 |
|----------|---------|--------------|-----------|---------|
| DeepSeek | platform.deepseek.com | `https://api.deepseek.com/v1` | `deepseek-v4-pro` | `https://api-docs.deepseek.com/zh-cn/` |
| OpenAI | platform.openai.com/api-keys | `https://api.openai.com/v1` | `gpt-4o` | `https://platform.openai.com/docs` |
| OpenRouter | openrouter.ai/keys | `https://openrouter.ai/api/v1` | `openai/gpt-4o` | `https://openrouter.ai/docs` |
| 自定义 | — | — | — | — |

自定义选项不显示引导卡片（用户自行了解）。

### 2.3 Provider 切换覆盖保护

**LLM 表单（LlmForm）**：新增 Provider 默认值自动填充（与 ImageForm 行为一致）。

**两个表单统一规则**：切换 Provider 时，仅对**空字段**自动填充默认值。

```typescript
// 修改后逻辑
onChange({
  ...value,
  provider,
  ...(defaults ? {
    baseUrl: value.baseUrl || defaults.baseUrl,
    model: value.model || defaults.model,
  } : {}),
});
```

如果字段已有用户填写的值，切换 Provider 时保留不覆盖。如果自动填充了字段，显示短暂提示"已自动填充 Base URL 和 Model"。

### 2.4 更新 DeepSeek 默认模型名

全代码库将默认模型从 `deepseek-chat` 更新为 `deepseek-v4-pro`：

| 文件 | 位置 | 变更 |
|------|------|------|
| `server/llm/deepseek.ts` | `:12` | `'deepseek-chat'` → `'deepseek-v4-pro'` |
| `server/llm/index.ts` | `:14` | `'deepseek-chat'` → `'deepseek-v4-pro'` |
| `server/store.ts` | `:56, :85` | 种子数据中 `model: 'deepseek-chat'` → `'deepseek-v4-pro'` |
| `src/constants.ts` | `:8` | 默认配置 `model: 'deepseek-chat'` → `'deepseek-v4-pro'` |
| `src/repositories/localStorageRepositories.ts` | `:200` | localStorage fallback 中 `model: 'deepseek-chat'` → `'deepseek-v4-pro'` |
| `src/pages/Settings.tsx` | `:21` | Model placeholder `"deepseek-chat"` → `"deepseek-v4-pro"` |
| `.env.example` | `:14` | `DEEPSEEK_MODEL=deepseek-chat` → `DEEPSEEK_MODEL=deepseek-v4-pro` |

### 2.5 Placeholder 动态化

| 字段 | 当前 | 改进后 |
|------|------|--------|
| Model | 固定 `deepseek-chat` | 根据当前选中 Provider 动态显示推荐 model |
| API Key | `sk-...` | `请输入您的 API Key` |
| Base URL | 固定值 | 根据 Provider 显示对应默认值 |

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/routes/data.ts` | 修改 | 新增 `POST /api/config/test-llm` 和 `POST /api/config/test-image-gen`（约 +70 行） |
| `server/llm/deepseek.ts` | 修改 | 默认 model 更新为 `deepseek-v4-pro` |
| `server/llm/index.ts` | 修改 | 默认 model 更新为 `deepseek-v4-pro` |
| `server/store.ts` | 修改 | 种子数据 model 更新为 `deepseek-v4-pro` |
| `src/pages/Settings.tsx` | 修改 | 测试按钮、引导卡片、覆盖保护、placeholder 动态化（约 +140 行） |
| `src/constants.ts` | 修改 | 默认配置 model 更新 |
| `src/repositories/localStorageRepositories.ts` | 修改 | localStorage fallback model 更新 |
| `.env.example` | 修改 | 环境变量示例 model 更新 |

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D2** | API Key 未配置时 D2 AI 辅助填写不可用，引导到这里 |
| **D4** | API Key 未配置时 D4 效果预览不可用，引导到这里 |
| **D6** | 配合 D6 统一配置入口，减少 `.env` 与 Settings 的混淆 |
| **D22** | 测试连接能提前发现配置问题，减少 LLM 运行时失败的静默 fallback |

---

## 五、验收标准

- [ ] LLM 和图片生成配置区块各有一个"测试连接"按钮
- [ ] 点击"测试连接"后发送最小化 API 请求，返回成功/失败 + 延迟
- [ ] 测试成功显示绿色提示 + 延迟数据，3 秒后自动消失
- [ ] 测试失败显示具体错误类型和修复建议（非通用错误提示）
- [ ] 切换 Provider 后显示对应配置引导卡片，包含文档链接
- [ ] 引导卡片包含注册地址、默认 Base URL、推荐 Model、API 文档链接
- [ ] DeepSeek 引导卡片提示旧模型名退役时间（2026-07-24）
- [ ] Model placeholder 随 Provider 切换动态变化
- [ ] 切换 Provider 不会覆盖用户已手动填写的 Base URL 和 Model
- [ ] 自动填充字段时显示短暂提示
- [ ] 代码库中 `deepseek-chat` 全部替换为 `deepseek-v4-pro`
