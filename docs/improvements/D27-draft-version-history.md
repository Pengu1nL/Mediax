# D27：草稿版本历史

> 状态：方案已产出  
> 涉及范围：后端 + 前端  
> 依赖：D26（重新生成前自动保存版本）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 草稿多次编辑/重新生成后，无版本追溯能力 | 高 |
| 2 | `Draft.versions` 字段已声明但类型未定义、逻辑未实现 | 中 |
| 3 | 重新生成后旧内容丢失，用户无法回到之前的版本 | 高 |

---

## 二、方案设计

### 2.1 数据模型

```typescript
// 新增类型（src/types.ts）
interface DraftVersion {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  createdAt: string;
  source: 'agent' | 'manual' | 'regeneration';
  agentRunId?: string;
  label: string;  // "AI 生成 v1" / "手动编辑" / "重新生成（含修改反馈）"
}
```

`Draft.versions` 已存在于接口中，补齐类型定义即可。

### 2.2 版本保存时机

| 触发操作 | 保存行为 |
|---------|---------|
| Agent 首次生成草稿 | 保存初始版本 `source: 'agent'` |
| 用户手动保存（content 有变化） | 保存编辑版本 `source: 'manual'` |
| 重新生成（D26） | D26 的 request-regeneration handler 显式调用 `saveDraftVersion(draft, { label: '重新生成前' })` 保存当前内容，再启动 Agent |
| Agent 重新生成完成 | 保存新版本 `source: 'regeneration'`，由 runAgentTask 在 draft 创建后调用 |

版本上限 20 个，超出时移除最旧的。

### 2.3 版本历史面板

DraftEditor 右侧栏新增"版本历史"面板：

```
版本历史                            [展开]

┌──────────────────────────────────┐
│ v3  · 10 分钟前                  │  ← 当前
│ 重新生成（含修改反馈）             │
├──────────────────────────────────┤
│ v2  · 1 小时前                   │
│ 手动编辑                         │  [预览]
├──────────────────────────────────┤
│ v1  · 3 小时前                   │
│ AI 生成                          │  [预览] [恢复]
└──────────────────────────────────┘
```

- 默认展示最近 5 个版本
- 点击版本行展开预览（只读，灰色背景卡片）
- "恢复"按钮 → 将当前编辑器内容替换为该版本内容
- 恢复前保存当前内容为新版本（不丢失当前修改）

### 2.4 版本恢复

```
恢复 v2 的确认：

┌──────────────────────────────────┐
│  恢复版本 v2？                    │
│                                  │
│  当前内容将自动保存为 v4，         │
│  然后编辑器内容替换为 v2 的内容。   │
│                                  │
│  [取消]              [确认恢复]   │
└──────────────────────────────────┘
```

- 恢复实质：保存当前为版本 → 编辑器回填目标版本内容
- 不删除任何版本

### 2.5 后端改动

- `POST /api/drafts/:draftId` (save) — 保存时如 content 变化则 push 版本
- Agent run 完成时 — 保存初始版本
- D26 request-regeneration — 保存当前版本后再处理
- 版本保存在 `updateData()` 内原子操作

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types.ts` | 修改 | 新增 `DraftVersion` 接口定义 |
| `src/pages/DraftEditor.tsx` | 修改 | 新增版本历史面板 + 恢复逻辑（约 +80 行） |
| `server/draft/versions.ts` | **新增** | 导出 `saveDraftVersion(draft, opts)` 函数（供 D26 调用） |
| `server/routes/data.ts` | 修改 | save draft 时调用 `saveDraftVersion` |
| `server/agent/runAgentTask.ts` | 修改 | Agent 生成时调用 `saveDraftVersion` |
| `server/routes/data.ts` | 修改 | request-regeneration：先调 `saveDraftVersion`，再启动 Agent |

---

## 四、验收标准

- [ ] Agent 首次生成草稿时自动保存 v1 版本
- [ ] 用户手动保存且内容有变化时保存新版本
- [ ] 重新生成前自动保存当前版本
- [ ] 版本上限 20 个，超出自动移除最旧版本
- [ ] DraftEditor 右侧栏显示版本历史面板
- [ ] 版本可展开预览（只读）
- [ ] 恢复版本前自动保存当前内容
- [ ] 恢复后编辑器内容替换为目标版本
- [ ] 版本标签正确标识来源（AI 生成 / 手动编辑 / 重新生成）
