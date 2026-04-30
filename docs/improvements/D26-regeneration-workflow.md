# D26：重新生成工作流优化

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D19（异步执行 + 轮询）、D21（Agent 行为参数化）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 重新生成需多次页面跳转：DraftEditor → TaskDetails → AgentRunDetails → 新 DraftEditor | 高 |
| 2 | 修改说明（modification note）未传入 Agent prompt，AI 不知道要改什么 | 高 |
| 3 | 重新生成后之前的手动修改全部丢失，无版本保留（D27 解决） | 中 |

### 当前流程

```
DraftEditor("重新生成"→填反馈) → navigate → TaskDetails → 点"启动Agent" 
→ AgentRunDetails → 新DraftEditor
```

4 次页面跳转 + 1 次手动触发 Agent + 反馈丢失。

---

## 二、方案设计

### 2.1 目标流程

```
DraftEditor("重新生成"→填反馈→确认)
  → 后台自动启动 Agent（反馈注入 prompt）
  → DraftEditor 内展示进度（轮询）
  → 新草稿替换当前内容
```

**零页面跳转，一键完成。**

### 2.2 前端改造

**DraftEditor "重新生成"按钮改造：**

点击后打开简化版确认弹窗（非 RunAgentDialog，更轻量）：

```
┌──────────────────────────────────────┐
│  重新生成                              │
│                                       │
│  修改说明 *                            │
│  ┌──────────────────────────────────┐ │
│  │ 请说明需要修改的内容...           │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                       │
│  ⚠️ 当前修改将在新版本中保留为历史版本  │
│                                       │
│  [取消]                  [确认重新生成] │
└──────────────────────────────────────┘
```

确认后：
1. 调用 `POST /api/drafts/:draftId/request-regeneration`（含反馈文本）
2. 后端返回 `{ newAgentRunId }`
3. DraftEditor 不跳转，改为显示进度指示器："正在重新生成... (步骤 2/4)"
4. 轮询 `GET /api/agent-runs/:newAgentRunId`（复用 D19 轮询逻辑）
5. 完成后加载新草稿内容，替换编辑器中的 title/excerpt/content
6. 旧内容保存为版本（D27 实现版本回退能力）

### 2.3 后端改造

**`POST /api/drafts/:draftId/request-regeneration`：**

当前只更新 reviewState + task.status = 'queued'。改造后**自动启动 Agent 执行**：

```
1. 保存当前草稿为版本历史（调用 D27 saveDraftVersion）
2. 保存 reviewState（changes_requested + reviewerNote）
3. 创建新 AgentRun: initAgentRun(taskId, agentOptions)
4. executeAgentRun(runId)  // 异步
5. 返回 { draft, newAgentRunId }
```

> **与 D27 的衔接点（由 D26 负责调用）：**
> 在步骤 1，D26 的 request-regeneration handler 显式调用 `saveDraftVersion(draft)` 保存当前内容为版本（label: "重新生成前"），然后再启动新 AgentRun。D27 负责提供 `saveDraftVersion()` 函数和版本存储逻辑。

**`buildUserPrompt()` 使用统一接口：**

函数签名见 [`_shared-agent-options.md`](_shared-agent-options.md) 中的 `AgentGenerationOptions`。`regenerationFeedback` 作为其中一员参与：

```typescript
// AgentGenerationOptions.regenerationFeedback 非空时追加：
if (options?.regenerationFeedback) {
  lines.push('');
  lines.push('【修改要求】');
  lines.push(`以下是对上一版内容的修改反馈，请据此重新创作：`);
  lines.push(options.regenerationFeedback);
}
```

**D21 参数保留：** 重新生成时从原 `AgentRun.generationOptions` 读取 D21 参数（`contentLength` / `toneOverride` / `extraInstructions`），与 `regenerationFeedback` 合并后传给新 AgentRun。

Agent 收到修改反馈后针对性地调整内容，而非从零生成。

### 2.4 进度展示

DraftEditor 在"重新生成"进行中时：

```
┌──────────────────────────────────────────┐
│  🔄 正在重新生成...                        │
│  ✅ 加载品牌上下文                         │
│  🔄 分析 Brief 和修改反馈                  │
│  ⏳ 生成内容草稿                           │
│  ⏳ 生成配图                               │
└──────────────────────────────────────────┘
```

复用 D19 的步骤状态轮询逻辑，进度条完成 → 新内容自动替换。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/DraftEditor.tsx` | 修改 | 重新生成改为弹窗 + 内联进度（约 +60 行） |
| `server/routes/data.ts` | 修改 | request-regeneration 自动启动 Agent（约 +15 行） |
| `server/agent/draftGenerator.ts` | 修改 | buildUserPrompt 接收 regenerationFeedback |
| `server/agent/runAgentTask.ts` | 修改 | 传递 regenerationFeedback 到 prompt |

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D19** | 复用异步执行 + 轮询机制 |
| **D20** | 重新生成时 Prompt 预览可见（含修改反馈） |
| **D27** | 重新生成前保存当前内容为版本历史 |

---

## 五、验收标准

- [ ] "重新生成"按钮不再跳转到 TaskDetails
- [ ] 确认弹窗收集修改反馈
- [ ] 确认后自动启动 Agent，无需手动触发
- [ ] DraftEditor 内展示执行进度（复用 D19 轮询）
- [ ] 修改反馈注入 Agent prompt（可在 D20 Prompt 预览中验证）
- [ ] 完成后新内容替换编辑器中的标题/正文/摘要
- [ ] 旧内容保存为版本（D27 实现后）
