# D13：计划与品牌上下文联动

> 状态：方案已产出  
> 涉及范围：前端  
> 依赖：D12（Plan 类型清理）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 创建计划时未传递 `brandId`，计划与品牌无数据关联 | 中 |
| 2 | Plans 页面完全没有品牌信息，用户感知不到 Onboarding 工作的价值 | 中 |
| 3 | 示例品牌"建桥融高"与产品名 Mediax 不一致，且行业不通用 | 低 |

---

## 二、方案设计

### 2.1 修复 brandId 传递

`Plans.tsx` 创建计划时传入当前品牌 `brandId`：

```typescript
const payload = {
  title: formState.title.trim(),
  category: formState.category.trim() || undefined,
  status: formState.status,
  startDate: formState.startDate,
  endDate: formState.endDate,
  brandId: brand.id,  // 新增
};
```

### 2.2 Plans 页面品牌上下文

**Header：**

```
Mediax · 发布计划
管理和追踪您的所有内容发布时间表。
```

品牌名（`text-signal-orange`）可点击跳转到 `/brand`。

**创建弹窗标题：**

```
为「Mediax」创建发布计划
```

description 行展示品牌行业和档案完整度：

```
传媒 · 品牌档案完整度 88%
```

**空状态：**

```
还没有为「Mediax」创建发布计划
先为你的品牌创建第一个内容计划。
```

### 2.3 全局示例品牌替换

将代码库中所有示例/种子数据从"建桥融高"替换为"Mediax"，行业从"教育 / 民办高中"改为"传媒"。

**涉及文件：**

| 文件 | 说明 |
|------|------|
| `src/constants.ts` | SEED_BRAND_PROFILE + SEED_PLANS + SEED_PLAN_TASKS + SEED_DRAFTS 全部改写 |
| `server/store.ts` | 默认品牌数据改写 |
| `src/utils/brandProfile.test.ts` | 测试数据 |
| `src/App.test.tsx` | 测试数据 |
| `src/repositories/localStorageRepositories.test.ts` | 测试数据 |
| `server/agent/runAgentTask.test.ts` | 测试数据 |
| `server/routes/data.test.ts` | 测试数据 |
| `server/store.test.ts` | 测试数据 |

**新品牌档案：**

```typescript
{
  id: 'brand-1',
  name: 'Mediax',
  industry: '传媒',
  website: 'https://mediax.app',
  establishedAt: '2025年',
  keywords: ['AI内容', '自动化运营', '品牌管理', '多平台发布'],
  summary: 'Mediax 是一个 AI 驱动的内容运营平台，帮助品牌高效创建、管理和发布多平台内容。',
  audience: '新媒体运营团队、品牌经理、内容创作者',
  positioning: 'AI 驱动的内容运营自动化平台',
  toneOfVoice: '专业、简洁、有洞察力',
  doAndDonts: ['避免过度技术术语', '避免夸大AI能力', '避免贬低人工创作的价值'],
  defaultReviewPolicy: 'manual_required',
  channels: [
    { name: '微信公众号', handle: '@Mediax', kind: 'wechat', active: true },
    { name: '小红书', handle: '@Mediax', kind: 'xiaohongshu', active: true },
    { name: '抖音', handle: '@Mediax', kind: 'douyin', active: true },
    { name: '视频号', handle: '@Mediax', kind: 'video', active: true },
  ],
}
```

**新种子计划（示例）：**

| 计划 | 标题 | 分类 |
|------|------|------|
| p1 | 2026 春季产品发布 | 产品发布 |
| p2 | 品牌周年庆活动 | 活动营销 |
| p3 | Q2 日常内容日历 | 日常运营 |

**新种子任务和草稿**随之更新，内容围绕 Mediax（传媒行业、AI 工具产品）展开。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Plans.tsx` | 修改 | brandId 传递 + header 品牌名 + 弹窗标题（约 +15 行） |
| `src/constants.ts` | 修改 | SEED 数据全部改写为 Mediax |
| `server/store.ts` | 修改 | 默认品牌数据改写为 Mediax |
| 6 个测试文件 | 修改 | 品牌名和行业适配 |

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D1-D4** | 方案文档中的示例品牌已使用 Mediax |
| **D33** | 未来多品牌场景下，品牌上下文联动是刚需 |

---

## 五、验收标准

- [ ] 创建计划时 `brandId` 正确传递
- [ ] Plans header 显示"Mediax · 发布计划"
- [ ] 创建弹窗标题显示"为「Mediax」创建发布计划"
- [ ] 弹窗显示品牌行业和档案完整度
- [ ] 空状态文案包含品牌名
- [ ] 所有种子数据品牌名替换为 Mediax，行业为传媒
- [ ] 所有种子计划、任务、草稿内容与 Mediax 品牌一致
- [ ] 所有测试用例通过
