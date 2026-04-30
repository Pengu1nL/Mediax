# D30：状态管理优化（增量刷新 + 乐观更新）

> 状态：方案已产出  
> 涉及范围：前端  
> 依赖：D9（移除 assets 后 refresh 调用减少）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 每次 `runMutation()` 后全量刷新 8+ API，任意小改动触发过度请求 | 高 |
| 2 | 所有写操作无乐观更新，UI 需等待 API 返回 + 全量刷新后才反映变化 | 中 |
| 3 | 导致不必要的组件重渲染和 UI 闪烁 | 中 |

### 当前代码

```typescript
// AppContext.tsx:154-166
const runMutation = useCallback(async <T>(action) => {
  const result = await action();
  await refresh();  // ← 8+ API calls per mutation
  return result;
}, [refresh]);
```

---

## 二、方案设计

### 2.1 乐观更新模式

```typescript
const runMutation = useCallback(
  async <T>(
    action: () => Promise<T>,
    optimisticUpdate: (prev: AppSnapshot) => AppSnapshot,
  ): Promise<T | undefined> => {
    const prevSnapshot = snapshotRef.current;  // 捕获当前快照
    
    // 立即乐观更新 UI
    setSnapshot(optimisticUpdate(prevSnapshot));
    
    try {
      const result = await action();
      return result;  // 乐观更新有效，无需回退
    } catch (nextError) {
      // API 失败，回退到变更前状态
      setSnapshot(prevSnapshot);
      setError(getErrorMessage(nextError));
      return undefined;
    }
  },
  [],
);
```

### 2.2 各操作乐观更新映射

每个 mutation 提供自己的状态更新函数：

| 操作 | 乐观更新 |
|------|---------|
| `saveBrandProfile(profile)` | `prev.brand = { ...prev.brand, ...profile }` |
| `createPlan(input)` | `prev.plans = [newPlan, ...prev.plans]` |
| `updatePlan(id, input)` | `prev.plans = prev.plans.map(p => p.id===id ? {...p, ...input} : p)` |
| `deletePlan(id)` | `prev.plans = prev.plans.filter(p => p.id !== id)` |
| `createTask(planId, input)` | `prev.planTasks = [newTask, ...prev.planTasks]` |
| `updateDraft(draftId, input)` | `prev.drafts = prev.drafts.map(d => d.id===draftId ? {...d, ...input} : d)` |
| `deleteDraft(draftId)` | `prev.drafts = prev.drafts.filter(d => d.id !== draftId)` |
| `saveConfig(config)` | `prev.config = { ...prev.config, ...config }` |

以此类推覆盖所有 20+ 个 mutation。

### 2.3 保留后端一致性校验

乐观更新后不需要 `refresh()`，但需要确保后端返回的数据是最新的。对于创建操作（createXXX），用 API 返回的完整对象（含新的 id/timestamps）更新乐观渲染：

```typescript
// 创建操作的更完整模式
createPlan: (input) => runMutation(
  () => dataRepos.plans.createPlan(input),
  // 乐观：用本地 id
  (prev) => ({
    ...prev,
    plans: [{ id: 'optimistic-xxx', ...input, status: 'draft' }, ...prev.plans],
  }),
  // 后端返回后：替换为真实数据
  (result, prev) => ({
    ...prev,
    plans: prev.plans.map(p => p.id === 'optimistic-xxx' ? result : p),
  }),
),
```

### 2.4 保留 refresh 的时机

`refresh()` 保留但仅用于：
- **应用初始化**（`useEffect` on mount）
- **登录/登出**（全量状态切换）
- **手动刷新**（未来可加"刷新"按钮）

移除所有 mutation 后的 `refresh()` 调用。

### 2.5 异步 mutation 模式（兼容 D19/D26）

乐观更新模式适用于同步 CRUD（API 返回即完成），但 D19 和 D26 引入了**异步操作**（POST 返回 runId → 后台执行 → 轮询完成）。这类操作不适用乐观回滚模式。

**新增 `runAsyncMutation`：**

```typescript
const runAsyncMutation = useCallback(
  async <T>(
    action: () => Promise<{ runId: string }>,
    onProgress?: (snapshot: AppSnapshot) => void,
  ): Promise<string | undefined> => {
    try {
      const { runId } = await action();  // 立即返回 runId
      // 不立即更新 snapshot，由轮询接管状态同步
      return runId;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      return undefined;
    }
  },
  [],
);
```

**与 `runMutation` 的差异：**

| 维度 | runMutation | runAsyncMutation |
|------|------------|-----------------|
| API 返回 | 最终结果 | runId（202 Accepted） |
| 状态更新 | 立即乐观更新 | 轮询后自然更新 |
| 失败回退 | 乐观回退 | 轮询步骤中显示 failed |
| 使用场景 | saveBrandProfile, createPlan, ... | startAgentRun, requestRegeneration |

异步操作的状态同步由 D19/D26 的轮询组件负责，不属于 AppContext 职责。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/context/AppContext.tsx` | 修改 | `runMutation` 改为乐观更新模式 + 所有 mutation 加乐观逻辑（约 +80 行） |

单文件改动。通过 TypeScript 的类型系统保证乐观更新的正确性。

---

## 四、验收标准

- [ ] 所有 20+ mutation 实现乐观更新
- [ ] 更新操作 UI 即时响应（无网络延迟感知）
- [ ] API 失败时自动回退到变更前状态
- [ ] 创建操作用 API 返回的真实数据替换乐观 ID
- [ ] `runAsyncMutation` 正确处理 D19/D26 异步操作（返回 runId，不乐观更新）
- [ ] 异步操作状态由轮询组件同步，不触发 `runMutation` 回退
- [ ] 登录/登出/初始化时仍执行完整 refresh
- [ ] 现有功能行为不变（仅响应速度提升）
