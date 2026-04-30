# D6：配置入口整合与引导

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D5（测试连接功能补齐后，配置状态更可感知）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | Settings 入口是纯图标按钮（齿轮），无文字标签，新用户难以发现 | 高 |
| 2 | `.env` 与 Settings 页面均可配置 API Key，用户不清楚优先级和当前生效来源 | 高 |
| 3 | Settings 页面不显示配置来源（Settings 还是 `.env`），用户可能修改后不生效 | 中 |
| 4 | Onboarding 完成后无引导到 Settings 配置 API | 中 |

---

## 二、方案设计

### 2.1 Settings 入口增强

#### TopNavBar 改动

将纯图标按钮改为图标 + 文字，并增加未配置状态指示：

```tsx
<button
  onClick={() => navigate('/settings')}
  className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors
    text-ink-black/60 hover:text-ink-black hover:bg-zinc-100"
>
  <Settings size={18} />
  <span className="text-sm font-bold">设置</span>
  {!llmConfigured ? (
    <span className="w-2 h-2 bg-signal-orange rounded-full" title="LLM 未配置" />
  ) : null}
</button>
```

- 与左侧 "New Brand" 文字按钮形成视觉平衡
- 未配置时橙色圆点引导用户注意到配置缺失
- `llmConfigured` 状态来自 AppContext（从 `/api/config/status` 获取）

### 2.2 配置状态端点

```
GET /api/config/status
```

**响应体：**

```typescript
{
  llm: {
    configured: boolean;
    source: 'stored' | 'env' | 'none';
    hasApiKey: boolean;
    provider: string;
    model: string;
  };
  imageGen: {
    configured: boolean;
    source: 'stored' | 'env' | 'none';
    hasApiKey: boolean;
    provider: string;
    model: string;
  };
}
```

**后端逻辑**：按优先级 `stored config → env vars` 检查，返回第一个有效的配置和来源。

### 2.3 配置摘要卡片

Settings 页面 header 下方插入配置状态总览：

```
┌─────────────────────────────────────────────────┐
│  配置状态                                        │
│                                                  │
│  文本生成  ✅ 已配置（Settings）  deepseek-v4-pro  │
│  图片生成  ⚠️ 使用环境变量       dall-e-3         │
│                                                  │
│  💡 Settings 页面中的配置优先于 .env 环境变量      │
└─────────────────────────────────────────────────┘
```

- 状态图标：✅ 已配置 / ⚠️ 来自 env / ❌ 未配置
- 来源标签："Settings"（绿色）/ "环境变量"（黄色）/ "未配置"（红色）
- 底部提示说明优先级
- 来源为 env 的行使用半透明样式，暗示不可通过 UI 直接修改

### 2.4 `.env.example` 注释澄清

```bash
# ---- LLM API（Agent 内容生成）----
# 以下环境变量作为 fallback 默认值。
# 用户在 Settings 页面（/settings）填写的配置优先级更高。
# 获取 API Key：https://platform.deepseek.com/
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-pro

# ---- Image Generation ----
# 以下环境变量作为 fallback 默认值。
# 用户在 Settings 页面（/settings）填写的配置优先级更高。
IMAGE_GEN_API_KEY=your-openai-api-key
IMAGE_GEN_BASE_URL=https://api.openai.com/v1
IMAGE_GEN_MODEL=gpt-image-2
```

### 2.5 Onboarding 后引导提示

Onboarding 提交完成后，如果 LLM 未配置，在 `/brand` 页面顶部显示可关闭提示条：

```
┌─────────────────────────────────────────────────┐
│ ⚠️  AI 接口尚未配置，Agent 将无法生成内容         │
│     [前往设置]                        [✕ 关闭]   │
└─────────────────────────────────────────────────┘
```

- 通过 `/api/config/status` 判断是否需要展示
- 关闭后存入 `localStorage`，不再显示（除非配置状态变为已配置 → 又变为未配置）
- Brand 页面和 Dashboard 页面均展示此提示

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/TopNavBar.tsx` | 修改 | Settings 按钮改图标+文字+状态指示点（约 +15 行） |
| `src/pages/Settings.tsx` | 修改 | 新增配置摘要卡片（约 +50 行） |
| `src/pages/Brand.tsx` | 修改 | 新增 API 未配置提示条（约 +25 行） |
| `src/pages/Dashboard.tsx` | 修改 | 新增 API 未配置提示条（复用同一组件，约 +5 行） |
| `server/routes/data.ts` | 修改 | 新增 `GET /api/config/status` 端点（约 +40 行） |
| `src/context/AppContext.tsx` | 修改 | 新增 `configStatus` 状态（约 +15 行） |
| `.env.example` | 修改 | API Key 注释说明优先级 |

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D5** | D5 的测试连接功能让配置状态更可感知，摘要卡片中的状态可与测试结果关联 |
| **D2 / D4** | API 未配置时 D2/D4 引导到这里，摘要卡片直接显示缺失项 |
| **D7** | 同为 Settings 页面的改进，但 D7 针对视频生成占位体验 |

---

## 五、验收标准

- [ ] TopNavBar 中 Settings 按钮显示图标 + "设置" 文字
- [ ] LLM 未配置时 Settings 按钮旁显示橙色圆点指示
- [ ] Settings 页面顶部显示配置状态摘要卡片
- [ ] 摘要卡片正确显示文本生成和图片生成的配置状态、来源和 model
- [ ] 来源为 env 时行样式半透明 + "使用环境变量"标签
- [ ] 摘要卡片底部有优先级说明
- [ ] `.env.example` 注释说明 API Key 为 fallback
- [ ] Onboarding 后 LLM 未配置时，Brand 和 Dashboard 页面显示引导提示条
- [ ] 提示条关闭后不重复显示
