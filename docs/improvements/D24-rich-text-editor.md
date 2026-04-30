# D24：富文本编辑器选型与集成

> 状态：方案已产出  
> 涉及范围：前端  
> 依赖：无

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 正文编辑使用裸 `<textarea>`，零格式化能力 | 高 |
| 2 | 公众号图文需要标题层级、加粗、分割线 → 无法实现 | 高 |
| 3 | 小红书内容需要 emoji、短段落、标签 → 只能手动打字 | 中 |

### 当前代码

`DraftEditor.tsx:254-261`：

```tsx
<textarea rows={16} value={content} onChange={...} />
```

---

## 二、方案设计

### 2.1 选型：TipTap

基于 ProseMirror，React 一等公民，插件按需加载。

**新增依赖：**

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-placeholder": "^2.x"
}
```

### 2.2 极简工具栏

固定在编辑区顶部，单行紧凑布局：

```
[B] [I] [U] [H1] [H2] | [• 列表] [1. 列表] | [— 分割线]
```

9 个按钮，覆盖核心格式化需求：

| 按钮 | 功能 |
|------|------|
| B | 加粗 |
| I | 斜体 |
| U | 下划线 |
| H1 | 一级标题 |
| H2 | 二级标题 |
| • 列表 | 无序列表 |
| 1. 列表 | 有序列表 |
| — | 分割线 |

- 激活态高亮（与 Mediax signal-orange 色系一致）
- 无文字仅图标，hover 显示 tooltip
- 移动端自适应缩小间距

### 2.3 编辑器配置

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2] },  // 仅 H1/H2
    }),
    Placeholder.configure({
      placeholder: '编辑正文内容...',
    }),
  ],
  content: draft.content,  // 初始值从草稿加载
  onUpdate: ({ editor }) => {
    setContent(editor.getHTML());  // 保存为 HTML 字符串
  },
});
```

### 2.4 存储格式

- content 字段从纯文本改为 HTML 字符串
- Agent 生成的纯文本在首次加载时正常显示（TipTap 自动处理纯文本）
- 向后兼容：已有的纯文本草稿在编辑器中正常展示

### 2.5 布局

```
┌──────────────────────────────────────────┐
│ 标题：[                          ]        │
│                                           │
│ 摘要：[                          ]        │
│                                           │
│ 正文：                                    │
│ [B] [I] [U] [H1] [H2] | [•] [1.] | [—]  │  ← 工具栏
│ ┌──────────────────────────────────────┐  │
│ │                                      │  │
│ │  （TipTap 编辑区）                    │  │
│ │                                      │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

标题和摘要保留 textarea（不需要富文本）。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增 3 个 TipTap 依赖 |
| `src/pages/DraftEditor.tsx` | 修改 | textarea → TipTap + Toolbar（约 -15 行 +60 行） |

---

## 四、验收标准

- [ ] 正文区域为 TipTap 富文本编辑器，非 textarea
- [ ] 工具栏包含 B/I/U/H1/H2/无序列表/有序列表/分割线按钮
- [ ] 工具栏激活态使用 signal-orange 色系
- [ ] 格式化操作实时生效
- [ ] Agent 生成的纯文本草稿正常显示
- [ ] 现有 HTML 格式草稿正常显示
- [ ] 标题和摘要仍为 textarea（不受影响）
- [ ] 移动端工具栏自适应
