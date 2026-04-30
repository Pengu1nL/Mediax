# D8：浏览器兼容性提示优化

> 状态：**被 D9 吸收**（D9 移除了 FSA 代码，unsupported 状态不再存在）  
> 涉及范围：~~前端~~  
> 依赖：~~无~~

---

## ⚠️ 此课题已被 D9 吸收

D9（Library → 知识库重构）**彻底移除了 File System Access API** 和 `Library.tsx` 中的 `unsupported` 分支。HTTP 文件上传方式在所有浏览器中通用，不再有浏览器兼容性问题。D8 的 UX 优化原则（正向引导、下载链接）已无目标代码。**本课题不再单独实施。**

---

## 一、决策说明

Mediax 的素材库功能深度依赖 File System Access API，仅 Chrome/Edge 提供完整支持。**不做 Firefox/Safari 的降级方案**，保持 Chrome/Edge 为唯一推荐浏览器。D8 仅优化 unsupported 状态页面的用户体验。

---

## 二、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | unsupported 页面措辞生硬，纯技术表述 | 低 |
| 2 | 没有引导用户去下载 Chrome/Edge | 低 |
| 3 | "请使用 Chrome 或 Edge 打开 Mediax"像是报错而不是引导 | 低 |

### 当前代码

`Library.tsx:481-490`：

```tsx
if (status === 'unsupported') {
  return (
    <LibraryState
      icon={<AlertTriangle size={28} />}
      eyebrow="浏览器能力"
      title="当前浏览器不支持本地文件夹访问"
      description="请使用 Chrome 或 Edge 打开 Mediax，再绑定本地素材文件夹。"
    />
  );
}
```

### 问题分析

| 问题点 | 当前 | 改进方向 |
|--------|------|---------|
| 图标 | `AlertTriangle`（警告三角形）→ 负面暗示 | 改用 `Globe` 或 `Download`，中性/积极 |
| eyebrow | "浏览器能力" → 技术化表述 | 改为更友好的引导语 |
| title | "当前浏览器不支持" → 否定句式 | 改为正向引导 |
| CTA | 无操作按钮 | 增加下载链接 |

---

## 三、方案设计

### 改进后

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                   🌐                                 │
│                                                      │
│           MEDIAX · 浏览器建议                         │
│                                                      │
│     为获得完整素材库体验（本地文件夹绑定、文件管理），  │
│     请使用 Chrome 或 Edge 浏览器打开 Mediax。         │
│                                                      │
│     [下载 Chrome]    [下载 Edge]                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 设计要点

- 图标：`Globe` 替代 `AlertTriangle`，颜色保持 signal-orange（品牌色）
- eyebrow：`MEDIAX · 浏览器建议`
- title：**正向表述**，说明 Chrome/Edge 能提供什么，而非当前浏览器不能什么
- description：简要说明原因（本地文件夹绑定、文件管理能力）
- 新增操作按钮：
  - "下载 Chrome" → 链接到 `https://www.google.com/chrome/`
  - "下载 Edge" → 链接到 `https://www.microsoft.com/edge/`
  - 两个按钮并排，outline 样式（不要喧宾夺主）
- 保留 `LibraryState` 组件的整体布局（居中卡片）

---

## 四、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Library.tsx` | 修改 | `unsupported` 分支的 `LibraryState` 属性替换（约 +15 行） |

仅一个文件，改动量极小。

---

## 五、验收标准

- [ ] unsupported 页面使用 `Globe` 图标替代 `AlertTriangle`
- [ ] 文案为正向引导，说明 Chrome/Edge 的优势
- [ ] 页面包含"下载 Chrome"和"下载 Edge"按钮
- [ ] 下载按钮链接正确，新标签页打开
- [ ] 其他状态页面（unbound/permission/scanning/ready）不受影响
