# D16：循环调度 UI 简化

> 状态：方案已产出  
> 涉及范围：前端 + 后端（死字段清理）  
> 依赖：D15（表单精简）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | `publishSchedule` 字段在代码库中仅存储从未使用，是死字段 | 中 |
| 2 | 循环调度需要操作两个 time picker（执行时间 + 计划发布时间），概念混淆 | 高 |
| 3 | 星期选择 7 个独立按钮，无快捷预设（工作日/每天/周末） | 中 |

---

## 二、方案设计

### 2.1 移除 publishSchedule 死字段

`publishSchedule` 在 Agent 和后端逻辑中零引用，仅被存储。

**移除范围：**

| 文件 | 变更 |
|------|------|
| `src/types.ts` | `PlanTask.publishSchedule?` 删除 |
| `src/pages/PlanDetails.tsx` | `TaskFormState.publishSchedule` + `recurringPublishTime` state 删除 |
| `src/repositories/localStorageRepositories.ts` | `CreatePlanTaskInput.publishSchedule?` 删除 |
| `server/routes/data.ts` | 创建/更新 task 路由中 `publishSchedule` 移除 |

### 2.2 合并时间选择器

两个 time picker → 一个：

```
之前：执行时间 [--:--]  +  计划发布时间 [--:--]
之后：发布时间 [--:--]
```

Agent 执行时间的确定逻辑与前端脱钩（后端自行计算），用户只需关心"什么时候发"。

### 2.3 快捷日选

星期按钮上方增加 3 个快捷预设：

```
快捷选择： [工作日] [每天] [周末]

详细选择： [周一] [周二] [周三] [周四] [周五] [周六] [周日]
```

| 快捷按钮 | 选中 |
|---------|------|
| 工作日 | 周一至周五（0-4） |
| 每天 | 全部 7 天（0-6） |
| 周末 | 周六、周日（5-6） |

**交互逻辑：**
- 点击快捷按钮 → 对应日期选中，其他取消
- 快捷按钮后手动调整个别日期 → 自由增减
- 当前选中匹配某个快捷预设时，该快捷按钮高亮
- 自定义组合时，无快捷按钮高亮

### 2.4 简化前后对比

**之前（4 个区域）：**

```
1 执行类型: single / recurring

（循环模式）
2 执行周期: [周一][周二]...[周日]
3 执行时间: [--:--]
4 计划发布时间: [--:--]
```

**之后（3 行）：**

```
执行类型: [单次执行] [循环执行]

（循环模式）
快捷选择:  [工作日] [每天] [周末]
执行日:    [周一][周二]...[周日]
发布时间:  [--:--]
```

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/PlanDetails.tsx` | 修改 | 移除 publishSchedule，合并时间选择器，添加快捷日选 |
| `src/types.ts` | 修改 | `PlanTask.publishSchedule?` 删除 |
| `src/repositories/localStorageRepositories.ts` | 修改 | `CreatePlanTaskInput.publishSchedule?` 删除 |
| `server/routes/data.ts` | 修改 | 路由中移除 publishSchedule |

---

## 四、验收标准

- [ ] `publishSchedule` 从类型、表单、存储中完全移除
- [ ] 循环调度仅一个"发布时间" time picker
- [ ] "工作日"/"每天"/"周末" 快捷按钮正确切换日期
- [ ] 快捷按钮高亮态匹配当前选中集合
- [ ] 手动调整个别日期后快捷高亮正确响应
- [ ] 单次执行模式不受影响
- [ ] 已有测试通过
