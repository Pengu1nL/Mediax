# D2：品牌档案 AI 辅助填写

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D1（分步结构 + 预留 AI 按钮位置）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 品牌档案所有文本字段纯手工填写，零 AI 辅助 | 高 |
| 2 | 填写质量参差不齐，直接影响下游 Agent 生成内容质量 | 高 |
| 3 | 用户需要反复试错（填完 → 跑 Agent → 看效果 → 回来改） | 中 |
| 4 | summary、positioning、doAndDonts 等字段需要品牌策略思维，无专业背景的用户填写困难 | 中 |
| 5 | 一个以 AI 内容生成为核心卖点的平台，品牌档案配置环节全靠人力 | 高 |

---

## 二、方案设计（实际实现）

### 2.1 整体思路

在 Onboarding Step 2（品牌声音）中，为每个文本字段提供 **AI 优化润色** 能力。LLM 作为辅助角色，基于用户已填写的内容进行改进，而不是凭空生成。

设计原则：**AI 辅助，不取代人为编辑**。用户先写草稿，再让 AI 帮忙优化。

### 2.2 交互设计

#### 逐字段 AI 优化按钮

每个文本字段旁有独立的 ✨ "AI 优化" 按钮：

| 字段 | AI 按钮行为 |
|------|-----------|
| 品牌简介 | 优化用户已填的品牌简介，使其更专业、更精准 |
| 品牌语气 | 优化用户已填的语气体描述，保持逗号分隔格式 |
| 目标受众 | 优化用户已填的受众描述 |
| 品牌定位 | 优化用户已填的定位陈述 |
| 禁用表达 | 优化用户已填的禁用项列表，保持逗号分隔格式 |

**交互流程：**
1. 用户在字段中填入草稿内容
2. 字段有内容后 ✨ 按钮自动变为可用
3. 点击按钮 → mini spinner → LLM 优化 → 回填 + 黄色高亮闪烁 1.5 秒
4. 用户可继续手动编辑

**注意：** 由于"一键生成"（靠品牌名+行业生成全量档案）质量不佳，横幅功能已移除。AI 仅做优化，不做凭空生成。

#### 状态处理

| 状态 | UI 表现 |
|------|---------|
| 字段为空 | 按钮 disabled，tooltip "请先输入内容再进行 AI 优化" |
| AI 调用中 | 按钮 loading 态，字段只读 |
| AI 调用成功 | 字段填入 + 高亮闪烁，按钮恢复 |
| AI 调用失败 | InlineAlert 错误提示，已填内容不受影响 |

### 2.3 各字段优化策略

| 字段 | 格式要求 |
|------|---------|
| 品牌简介 | 优化为 2-4 句流畅的品牌描述 |
| 品牌语气 | 逗号分隔形容词列表（3-5 个），不写成句子 |
| 目标受众 | 1-2 句精准的受众描述 |
| 品牌定位 | 1 句简练的差异化定位陈述 |
| 禁用表达 | 逗号分隔列表，每条 2-6 字，不写成句子或段落 |
| 核心关键词 | （Step 1 字段，暂未接入 AI） |

---

## 三、API 设计（实际实现）

### 端点

```
POST /api/brand/suggest
```

### 请求体

```typescript
{
  field: string;      // 必填，字段名（summary/toneOfVoice/audience/positioning/doAndDonts）
  current: string;    // 必填，用户已填的草稿内容
  name?: string;      // 可选，品牌名称（作为优化参考上下文）
  industry?: string;  // 可选，所属行业（作为优化参考上下文）
}
```

### 响应体

```typescript
{
  [field]: string;    // 优化后的字段值，key 动态对应请求的 field
}
```

### 后端处理流程

```
1. 校验必填参数（field, current）
2. 从 data.json 读取 config，传入 getLlmProvider(config.llm)
3. LLM 不可用 → 400 { error: "AI 接口未配置..." }
4. 根据 field 类型构建针对性的 system prompt（不同字段不同格式要求）
5. 构建 user prompt（用户原文 + 可选品牌上下文）
6. 调用 llm.generate()
7. 解析 JSON 输出 → 返回单字段结果
```

---

## 四、前端数据流

```
Onboarding.tsx
  ├── Step 2 AI 横幅按钮 onClick
  │     └── suggestBrandFields({ name, industry })
  │           └── POST /api/brand/suggest
  │                 └── 填入所有字段 + 高亮闪烁
  │
  └── 逐字段 AI 按钮 onClick
        └── suggestBrandFields({ name, industry, field: 'toneOfVoice' })
              └── POST /api/brand/suggest
                    └── 填入单字段 + 高亮闪烁
```

### AppContext 新增方法

```typescript
// 新增
suggestBrandFields: (input: {
  name: string;
  industry: string;
  field?: string;
}) => Promise<BrandSuggestResult | null>;
```

### apiRepositories 新增方法

```typescript
// brand repository 新增
suggestFields: (input: { name: string; industry: string; field?: string }) =>
  apiPost('/api/brand/suggest', input)
```

---

## 五、改动清单

### 5.1 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/routes/data.ts` | 修改 | 新增 `POST /api/brand/suggest` 路由（约 60 行） |
| `src/pages/Onboarding.tsx` | 修改 | Step 2 启用 AI 按钮 + 横幅，添加调用逻辑和高亮动画（约 +80 行） |
| `src/repositories/apiRepositories.ts` | 修改 | 新增 `brand.suggestFields()` 方法（约 10 行） |
| `src/context/AppContext.tsx` | 修改 | 暴露 `suggestBrandFields` 到 store（约 +15 行） |

### 5.2 新增依赖

无新增 npm 依赖。高亮闪烁效果用 CSS animation（Tailwind `animate-pulse` + 自定义 keyframe 或 inline style）。

---

## 六、与后续课题的关系

| 课题 | 关系 |
|------|------|
| **D1** | 依赖 D1 的分步结构 + 预留的 AI 按钮位置 |
| **D4** | AI 填写是"静态填充表单"，D4 是"动态预览 Agent 生成效果"，两者互补构成完整的品牌设定迭代闭环 |
| **D5** | 如果用户未配 API Key，AI 建议功能不可用，按钮 tooltip 引导到 Settings |

---

## 七、验收标准

- [x] 逐字段 ✨ 按钮在字段有内容时可用，无内容时 disabled + tooltip
- [x] AI 调用中按钮显示 loading 态（spinner），字段只读
- [x] AI 调用失败时显示 InlineAlert，已填内容不受影响
- [x] 优化后内容回填 + 黄色高亮闪烁 1.5 秒
- [x] 不同字段有不同的优化策略（列表字段保持逗号分隔，文案字段优化表达）
- [x] 用户可在 AI 优化后继续手动编辑
- [ ] Step 1 的关键词字段接入 AI 优化（暂未实现）
