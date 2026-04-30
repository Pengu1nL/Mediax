# D3：行业选择灵活化

> 状态：方案已产出  
> 涉及范围：前端  
> 依赖：无（独立改动）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 行业选项仅 4 个硬编码，无法覆盖大多数用户 | 高 |
| 2 | 缺失餐饮、零售、金融、医疗、制造等主流行业 | 高 |
| 3 | 没有"其他"自定义输入，不在列表中的用户只能选相近选项 | 中 |
| 4 | 不准确的行业信息导致 Agent prompt 中品牌上下文偏差 | 中 |

---

## 二、方案设计

### 2.1 整体思路

将固定的 4 选项 `<select>` 改为 **预设选项 + 自定义输入** 的组合控件。纯前端改动，无需修改后端或数据结构。

`industry` 字段类型为 `string`（`src/types.ts:32`），`getIndustryNews()` 对未知行业有 `DEFAULT_NEWS` fallback（`src/data/industryNews.ts:147`），自定义行业值完全兼容现有逻辑。

### 2.2 交互设计

#### 正常态（预设行业）

```
┌─────────────────────────────────┐
│ 教育 / 民办高中            ▼   │
└─────────────────────────────────┘
```

下拉选择框，包含 16 个预设选项 + "其他（自定义）"。

#### 自定义态（选择"其他"后）

```
┌─────────────────────────────────┐
│ 其他（自定义）              ▼   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 请输入您的行业                  │  ← 文本输入框动态出现
└─────────────────────────────────┘
```

#### 交互规则

| 场景 | 行为 |
|------|------|
| 选择预设行业 | 直接使用选中值，隐藏自定义输入框 |
| 选择"其他（自定义）" | 下方出现文本输入框，光标自动聚焦 |
| 预设 → 其他 | 自定义输入框出现，为空状态 |
| 其他 → 预设 | 自定义输入框隐藏，输入内容保留不清空 |
| 编辑已有品牌回显 | 如果 `brand.industry` 不在预设列表中 → 下拉选中"其他"，输入框显示该值 |
| 提交 | 如果是预设选项 → 保存选项文本；如果是自定义 → 保存输入框文本 |

### 2.3 行业选项列表

```typescript
const INDUSTRY_OPTIONS = [
  '教育 / 民办高中',      // 保留，对应 industryNews key
  '科技与软件',           // 保留，对应 industryNews key
  '媒体与出版',           // 保留，对应 industryNews key
  '设计与创意服务',       // 保留，对应 industryNews key
  '餐饮与食品',
  '零售与电商',
  '金融服务',
  '医疗健康',
  '制造业',
  '房地产与建筑',
  '旅游与酒店',
  '文化娱乐',
  '教育培训',
  '农业与食品加工',
  '交通运输与物流',
  '能源与环保',
];

const CUSTOM_INDUSTRY_VALUE = '__custom__';
```

- 前 4 个保留原有选项（与 `industryNews.ts` 中的 lookup key 保持一致）
- 后 12 个为新增常见行业
- 自定义选项在下拉中显示为"其他（自定义）"，内部值为 `__custom__`

### 2.4 实现逻辑

```typescript
// 判断当前 industry 是否为预设值
const isPresetIndustry = (value: string) =>
  INDUSTRY_OPTIONS.includes(value);

// 初始化
const [customIndustry, setCustomIndustry] = useState(
  brand.industry && !isPresetIndustry(brand.industry) ? brand.industry : ''
);
const [selectedIndustry, setSelectedIndustry] = useState(
  brand.industry && isPresetIndustry(brand.industry) ? brand.industry : CUSTOM_INDUSTRY_VALUE
);

// 提交时取值
const effectiveIndustry = selectedIndustry === CUSTOM_INDUSTRY_VALUE
  ? customIndustry.trim()
  : selectedIndustry.trim();
```

---

## 三、改动清单

### 3.1 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Onboarding.tsx` | 修改 | 行业选择器重构（约 +30 行） |

### 3.2 改动范围

仅修改 Onboarding.tsx 中行业选择部分（当前第 113-134 行）：
- 将 4 个硬编码 `<option>` 替换为 `INDUSTRY_OPTIONS.map()`
- 新增"其他（自定义）"选项
- 新增自定义输入框（条件渲染）
- 新增初始化回显逻辑
- `handleSubmit` 中 `industry` 取值逻辑适配

### 3.3 不影响

- `server/store.ts` 种子数据
- `src/constants.ts` 默认品牌
- `src/data/industryNews.ts` 行业新闻
- `BrandProfile` 类型定义
- 品牌页（Brand.tsx）仅展示 `brand.industry` 字符串，无需修改

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D2** | D2 的 AI 品牌档案生成需要准确的行业信息。自定义行业不会影响 AI prompt（LLM 直接接收行业文本） |
| **D1** | D1 的 Step 1 中包含行业选择器，本方案直接应用于 D1 的 Step 1 UI |

---

## 五、验收标准

- [ ] 下拉列表包含 16 个预设行业选项 + "其他（自定义）"
- [ ] 选择"其他（自定义）"时，下方动态出现文本输入框，光标自动聚焦
- [ ] 选择预设行业时，自定义输入框隐藏
- [ ] 自定义输入的文本正确保存为 industry 值
- [ ] 编辑已有品牌时，自定义行业值正确回显（下拉选中"其他"，输入框显示原值）
- [ ] 编辑已有品牌时，预设行业值正确回显（下拉选中对应选项）
- [ ] 提交时自定义行业值通过必填校验（`!industry.trim()`）
- [ ] preset → custom → preset 切换过程中数据不丢失
