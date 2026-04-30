# D1-D4 修改日志

## D1 · Onboarding 分步表单重构

**问题：** 单页 9 字段长表单，顶部写"Step 1 of 3"但无实际分步，认知负荷高。

**改动：**

| 文件 | 说明 |
|------|------|
| `src/pages/Onboarding.tsx` | 重写为 3 步向导（267→851 行） |
| `src/pages/Onboarding.test.tsx` | 新增 13 个测试 |

**实现点：**
- 真正的 3 步指示器（品牌身份 → 品牌声音 → 审核确认），已完成步骤可点击返回
- Step 1（2-3 字段）：品牌名称、所属行业、核心关键词
- Step 2（5 字段）：品牌简介、语气、受众、定位、禁用表达，各字段预留 AI 按钮位
- Step 3：审核策略 radio card（3 选项带说明） + 品牌档案只读总览卡片（编辑图标可跳回）
- `AnimatePresence` 滑动切换动画
- 步骤间切换不丢失已填数据
- 提交时校验必填字段，失败自动跳转对应步骤
- "稍后完善"保存已填数据后跳转
- 按回车自动前进到下一步（Step 3 才提交）

---

## D2 · 品牌档案 AI 辅助填写

**问题：** 品牌档案全靠手工填写，无 AI 辅助，填写质量影响下游 Agent。

**改动：**

| 文件 | 说明 |
|------|------|
| `server/routes/data.ts` | 新增 `POST /api/brand/suggest` 路由（~55 行） |
| `server/routes/data.test.ts` | 新增 5 个后端测试 |
| `src/repositories/apiRepositories.ts` | 新增 `BrandSuggestInput`/`BrandSuggestResult` 类型 + `suggestFields` 方法 |
| `src/repositories/localStorageRepositories.ts` | 新增类型到 `BrandRepository` 接口 |
| `src/context/AppContext.tsx` | 暴露 `suggestBrandFields` 到 store |
| `src/pages/Onboarding.tsx` | Step 2 各字段启用 AI 优化按钮 |

**实现点：**
- Step 2 每个文本字段旁有 ✨ "AI 优化"按钮
- 用户在字段中填写草稿后按钮自动可用，无需前置条件
- 点击后将用户原文发给 LLM 润色优化，保持核心意图不变
- 不同字段有不同优化策略：列表字段（禁用表达、语气）保持逗号分隔格式，文案字段（简介、受众、定位）优化表达
- AI 调用中显示 spinner + 字段只读，完成后回填 + 黄色高亮闪烁 1.5 秒
- 失败时 InlineAlert 提示，已填内容不受影响
- 设计原则：AI 辅助不取代人为编辑（经讨论后移除"一键生成"横幅）

---

## D3 · 行业选择灵活化

**问题：** 仅 4 个硬编码行业选项，无法覆盖大多数用户。

**改动：**

| 文件 | 说明 |
|------|------|
| `src/pages/Onboarding.tsx` | 行业选择器重构（约 +30 行） |

**实现点：**
- 从 4 选项扩展为 16 个预设行业 + "其他（自定义）"
- 选择"其他"时动态展示文本输入框，`autoFocus` 自动聚焦
- 切回预设时隐藏输入框，自定义内容保留不丢
- 已有品牌的自定义行业值正确回显
- 提交时自动取有效行业值（预设选预设，自定义取输入框）

---

## D4 · 品牌页重构

**问题：** Brand 页展示未在 Onboarding 填写过的字段（官方网站、成立时间），显示"待补充"假数据；关联账号用假数据填充；右侧过长。

**改动：**

| 文件 | 说明 |
|------|------|
| `src/pages/Brand.tsx` | 重新设计布局和内容（~130 行变更） |
| `src/constants.ts` | 种子数据从"建桥融高/教育"改为"Mediax/媒体" |
| `server/store.ts` | 服务器种子数据同步更新 |

**实现点：**
- 移除未填写字段（官方网站、成立时间），不再显示"待补充"
- "网站 & 平台"和"品牌知识库"合并为一行两列布局，与品牌档案对齐
- 空字段显示"未配置"而非"待补充"
- 种子数据全面更新：品牌名 → Mediax，行业 → 媒体与出版，受众 → 内容创作者，定位 → AI 驱动的一站式自媒体运营平台
- Placeholder 文本同步更新（目标受众、品牌定位、禁用表达）
- 删除未使用的 `AccountRow` 组件

---

## 跨 D1-D4 的其他改动

| 文件 | 说明 |
|------|------|
| `src/App.test.tsx` | 适配 3 步向导和种子数据变更 |
| `src/repositories/localStorageRepositories.test.ts` | 种子数据断言更新 |
| `src/pages/Settings.tsx` | （后续改动预留） |
| `docs/improvements/D2-ai-brand-suggest.md` | 同步更新为实际"优化模式"方案 |

## 统计

- **变更文件：** 14 个
- **新增行：** ~1050
- **删除行：** ~257
- **新增测试：** 18 个
- **总测试数：** 75（全部通过）
