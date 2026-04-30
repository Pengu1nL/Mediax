# D19：Agent 执行异步化与实时进度

> 状态：方案已产出  
> 涉及范围：全栈  
> 依赖：无

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | Agent 执行期间前端同步阻塞 30+ 秒，UI 完全冻结 | 高 |
| 2 | 后端所有步骤在一个 HTTP 请求中完成，浏览器可能超时 | 高 |
| 3 | AgentRunDetails 页面从未展示 `running` 状态（数据一次性到达） | 中 |
| 4 | 用户不知道执行进度，不知道是卡住了还是在正常运行 | 高 |

---

## 二、方案设计

### 2.1 异步架构

```
前端                          后端
  │                            │
  ├─ POST agent-runs ─────────→│  立即返回 runId (202)
  │  ←─── { runId } ──────────┤
  │                            │  async process():
  ├─ navigate to details       │   Step 1 → updateData()
  │                            │   Step 2 → updateData()
  ├─ poll GET /agent-runs/:id ─→│   Step 3 → LLM → updateData()
  │  ←─── step[0]=completed ───┤   Step 4 → image → updateData()
  ├─ poll (2s) ────────────────→│
  │  ←─── step[2]=running ─────┤
  ├─ poll (2s) ────────────────→│
  │  ←─── step[2]=completed ───┤
  └─ stop (terminal status)    │
```

### 2.2 后端：拆分 init + execute

`server/agent/runAgentTask.ts` 拆为两个函数：

**`initAgentRun(taskId, options)`** — 同步返回：
- 创建 AgentRun 记录，所有步骤 status = `queued`
- 写入 data.json
- 返回 AgentRun（含 runId）

**`executeAgentRun(runId)`** — 异步不阻塞：
- 逐个处理步骤（load context → analyze brief → LLM generate → image generate）
- 每完成一步，通过 `updateData()` 更新对应步骤 status
- 全部完成后更新 AgentRun 整体 status

**`data.ts` 路由：**
```typescript
router.post('/tasks/:taskId/agent-runs', async (req, res) => {
  const run = await initAgentRun(taskId, options);
  executeAgentRun(run.id);  // 不 await
  res.status(202).json(run);
});
```

### 2.3 前端：轮询 + 渐进展示

**TaskDetails.tsx：**
- `startAgentRun()` 不再阻塞 30 秒，立即返回 runId
- 立即 `navigate()` 到 AgentRunDetails

**AgentRunDetails.tsx：**
- 新增 `useEffect` 轮询，每 2 秒 `GET /api/agent-runs/:runId`
- 当前步骤显示 `Loader` 旋转动画（已有 running 态图标和样式）
- 检测到 terminal 状态（`waiting_for_review` / `completed` / `failed` / `cancelled`）时停止轮询
- 已有 UI 组件完全复用（STEP_STATUS_ICON、timeline 布局）

### 2.4 数据一致性

`updateData()` 已内置串行化队列（`storeQueue`），异步步骤更新和前端轮询读取不会竞态。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/agent/runAgentTask.ts` | 重写 | 拆分 init + execute（约 +50 行） |
| `server/routes/data.ts` | 修改 | POST 路由返回 202，后台执行 |
| `src/pages/TaskDetails.tsx` | 修改 | 移除同步等待 |
| `src/pages/AgentRunDetails.tsx` | 修改 | 增加轮询逻辑 |

---

## 四、验收标准

- [ ] POST agent-runs 立即返回（< 500ms）
- [ ] Agent 后台异步执行，不阻塞 HTTP 响应
- [ ] AgentRunDetails 每 2 秒轮询，渐进展示步骤
- [ ] 当前步骤显示 running 旋转动画
- [ ] LLM/配图生成完成后步骤实时更新
- [ ] Terminal 状态时停止轮询
- [ ] 执行失败显示失败步骤 + 错误信息
- [ ] TaskDetails 不再有 30 秒同步等待
