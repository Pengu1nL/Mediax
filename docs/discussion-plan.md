# Mediax 体验改进研讨计划

> 基于 `docs/ux-analysis.md` 中梳理的 30+ 个问题，按用户链路顺序逐条研讨。
> 每次研讨一个课题，梳理思路并产出改进方案文档。

---

## 研讨方式

- **每次只研讨一个课题**
- 每个课题流程：回顾问题 → 讨论方案 → 输出方案文档到 `docs/improvements/` 目录
- 每个课题预计涉及前端、后端或全栈改动，方案文档需明确改动范围、实现路径和预期效果
- 全部课题完成后，汇总为总体改进路线图

---

## 课题列表

### 第一部分：品牌创建（4 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D1 | Onboarding 表单分步体验重构 | 虚假的"Step 1 of 3"提示；9 个字段一屏展示压力大 | 前端 |
| D2 | 品牌档案 AI 辅助填写 | 纯手工填写，零 AI 辅助；填写质量影响下游 Agent 效果 | 前端 + 后端 |
| D3 | 行业选择灵活化 | 行业选项仅 4 个硬编码，无法覆盖大多数用户 | 前端 |
| D4 | 品牌设定效果预览 | 填写后无法预览 AI 生成效果，需反复试错 | 前端 + 后端 |

### 第二部分：系统配置（3 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D5 | API 配置引导与连通性测试 | 手动填 API Key 门槛高；无测试连接按钮；LLM 失败静默 fallback | 前端 + 后端 |
| D6 | 配置入口整合与引导 | Settings 入口不明显；`.env` 与 Settings 双重配置入口混淆 | 前端 |
| D7 | 视频生成占位体验优化 | 占位 UI 传递"功能不完整"信号 | 前端 |

### 第三部分：素材上传（4 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D8 | 浏览器兼容性扩展 | File System Access API 仅支持 Chrome/Edge | 前端 |
| D9 | 素材批量知识化 | "加入品牌知识"逐文件手动操作，知识提取过于简陋 | 前端 + 后端 |
| D10 | 云端存储集成方案 | 仅支持本地文件夹，不支持云存储 | 全栈 |
| D11 | 上传体验优化 | 权限状态机复杂；缺少拖拽上传 | 前端 |

### 第四部分：计划创建（2 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D12 | 计划创建简化与模板化 | 字段冗余且未被 Agent 充分利用；无模板 | 前端 |
| D13 | 计划与品牌上下文联动 | 计划创建时与品牌信息割裂 | 前端 |

### 第五部分：任务创建（5 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D14 | Brief AI 辅助写作 | Brief 是核心但缺乏辅助；直接决定 Agent 产出质量 | 前端 + 后端 |
| D15 | 任务创建表单精简 | 创建表单是全局最复杂的配置点；必填项多 | 前端 |
| D16 | 循环调度 UI 简化 | 星期选择 + 双时间 picker 过于复杂 | 前端 |
| D17 | 渠道与内容类型自定义 | 固定选项无法满足长尾需求 | 前端 + 后端 |
| D18 | 任务复制与死字段补齐 | 缺少任务复制；requirements/researchInstructions 无 UI | 前端 |

### 第六部分：Agent 执行（5 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D19 | Agent 执行异步化与实时进度 | 同步阻塞等待；无实时反馈 | 全栈 |
| D20 | Prompt 可视化与可调试 | Agent 的 system/user prompt 完全不可见 | 前端 + 后端 |
| D21 | Agent 行为参数化定制 | 仅配图开关和尺寸可选，缺乏风格/长度/多候选等控制 | 前端 + 后端 |
| D22 | LLM 错误处理与用户感知 | LLM 失败静默 fallback，用户不知内容质量下降 | 前端 + 后端 |
| D23 | LLM Provider 多选扩展 | 只支持 DeepSeek 协议，不像图片生成有 provider 选择 | 全栈 |

### 第七部分：草稿编辑与审核（4 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D24 | 富文本编辑器选型与集成 | 纯 textarea 编辑，无格式化能力 | 前端 |
| D25 | 审核对照视图 | 编辑时无法并排查看原始 Brief | 前端 |
| D26 | 重新生成工作流优化 | 路径过长：多次页面跳转 + 重新执行 | 前端 + 后端 |
| D27 | 草稿版本历史 | 无修改追溯和版本回退 | 后端 + 前端 |

### 第八部分：发布与导出（2 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D28 | 真实平台对接方案 | 发布是模拟的，不实际推送到任何平台 | 全栈 |
| D29 | 草稿快速预览 | 必须进入完整编辑器才能查看内容，审核成本高 | 前端 |

### 第九部分：架构与基础设施（4 个课题）

| 编号 | 课题 | 来源问题 | 涉及范围 |
|------|------|----------|----------|
| D30 | 状态管理优化（增量刷新 + 乐观更新） | 每次 mutation 全量刷新 8+ API | 前端 |
| D31 | 端到端新用户向导 | 10+ 页面跳转，无引导 | 前端 |
| D32 | 数据持久化升级 | 单文件 JSON 存储的局限性 | 后端 |
| D33 | 多用户与权限体系 | 单用户模式无法支撑团队协作 | 全栈 |

---

## 进度追踪

| 课题编号 | 状态 | 方案文档 |
|----------|------|----------|
| D1 | 方案已产出 | [D1-onboarding-stepper.md](improvements/D1-onboarding-stepper.md) |
| D2 | 方案已产出 | [D2-ai-brand-suggest.md](improvements/D2-ai-brand-suggest.md) |
| D3 | 方案已产出 | [D3-industry-select.md](improvements/D3-industry-select.md) |
| D4 | 方案已产出 | [D4-brand-preview.md](improvements/D4-brand-preview.md) |
| D5 | 方案已产出 | [D5-api-config-guide-and-test.md](improvements/D5-api-config-guide-and-test.md) |
| D6 | 方案已产出 | [D6-config-entry-consolidation.md](improvements/D6-config-entry-consolidation.md) |
| D7 | 方案已产出 | [D7-video-gen-placeholder.md](improvements/D7-video-gen-placeholder.md) |
| D8 | 被 D9 吸收 | [D8-browser-unsupported-message.md](improvements/D8-browser-unsupported-message.md) |
| D9 | 方案已产出 | [D9-knowledge-base-refactor.md](improvements/D9-knowledge-base-refactor.md) |
| D10 | 暂缓 | [D10-cloud-storage-deferred.md](improvements/D10-cloud-storage-deferred.md) |
| D11 | 方案已产出 | [D11-upload-experience.md](improvements/D11-upload-experience.md) |
| D12 | 方案已产出 | [D12-plan-simplify-and-templates.md](improvements/D12-plan-simplify-and-templates.md) |
| D13 | 方案已产出 | [D13-plan-brand-context.md](improvements/D13-plan-brand-context.md) |
| D14 | 方案已产出 | [D14-brief-ai-assist.md](improvements/D14-brief-ai-assist.md) |
| D15 | 方案已产出 | [D15-task-form-simplify.md](improvements/D15-task-form-simplify.md) |
| D16 | 方案已产出 | [D16-schedule-ui-simplify.md](improvements/D16-schedule-ui-simplify.md) |
| D17 | 方案已产出 | [D17-channel-contenttype-custom.md](improvements/D17-channel-contenttype-custom.md) |
| D18 | 方案已产出 | [D18-task-copy-and-fields.md](improvements/D18-task-copy-and-fields.md) |
| D19 | 方案已产出 | [D19-agent-async-and-progress.md](improvements/D19-agent-async-and-progress.md) |
| D20 | 方案已产出 | [D20-prompt-visualization.md](improvements/D20-prompt-visualization.md) |
| D21 | 方案已产出 | [D21-agent-behavior-params.md](improvements/D21-agent-behavior-params.md) |
| D22 | 方案已产出 | [D22-llm-error-handling.md](improvements/D22-llm-error-handling.md) |
| D23 | 方案已产出 | [D23-llm-provider-multi.md](improvements/D23-llm-provider-multi.md) |
| D24 | 方案已产出 | [D24-rich-text-editor.md](improvements/D24-rich-text-editor.md) |
| D25 | 方案已产出 | [D25-review-comparison-view.md](improvements/D25-review-comparison-view.md) |
| D26 | 方案已产出 | [D26-regeneration-workflow.md](improvements/D26-regeneration-workflow.md) |
| D27 | 方案已产出 | [D27-draft-version-history.md](improvements/D27-draft-version-history.md) |
| D28 | 方案已产出 | [D28-platform-publish-abstraction.md](improvements/D28-platform-publish-abstraction.md) |
| D29 | 方案已产出 | [D29-draft-quick-preview.md](improvements/D29-draft-quick-preview.md) |
| D30 | 方案已产出 | [D30-state-management-optimize.md](improvements/D30-state-management-optimize.md) |
| D31 | 方案已产出 | [D31-onboarding-wizard.md](improvements/D31-onboarding-wizard.md) |
| D32 | 方案已产出 | [D32-data-persistence-upgrade.md](improvements/D32-data-persistence-upgrade.md) |
| D33 | 方案已产出 | [D33-multi-user-rbac.md](improvements/D33-multi-user-rbac.md) |
| D33 | 待研讨 | - |

状态说明：🟡 待研讨 → 🟢 方案已产出 → ✅ 已实施

---

## 使用说明

告诉我你想从哪个课题开始（如"D1"或"先讨论品牌创建的第一步"），我们将开始逐条研讨。
