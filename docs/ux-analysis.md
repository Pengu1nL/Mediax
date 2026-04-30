# Mediax 用户体验分析报告

> 分析日期：2026-04-28  
> 分析范围：前端交互、后端架构、端到端用户链路

---

## 目录

1. [核心矛盾](#核心矛盾)
2. [品牌创建（Onboarding）](#一品牌创建onboarding--门槛高缺少智能辅助)
3. [系统配置（Settings）](#二系统配置settings--对非技术用户极不友好)
4. [素材上传（Library）](#三素材上传library--浏览器兼容性受限知识转化低效)
5. [计划创建（Plans）](#四计划创建plans--字段冗余缺乏引导)
6. [任务创建（Task）](#五任务创建task--整个链路中配置最繁琐的环节)
7. [Agent 执行](#六agent-执行--黑盒体验缺乏可控性)
8. [草稿编辑与审核](#七草稿编辑与审核--编辑体验简陋)
9. [架构与全局问题](#八架构与全局问题)
10. [改进优先级建议](#改进优先级建议)

---

## 核心矛盾

> **Mediax 的定位是"Agent 驱动的自动化内容运营平台"，但为了达到让 Agent 跑起来的状态，用户需要手动完成大量的前置配置工作。这些配置的复杂度和繁琐程度，几乎抵消了 Agent 自动化带来的效率提升。**

用户花了 80% 的时间在"教 AI 如何工作"上，只有 20% 的时间在"让 AI 工作"。理想的体验应该是反过来的。

**完整用户路径（10+ 页面跳转）：**

```
Login → Onboarding → Settings(配API) → Library(绑素材) → Brand(加知识)
→ Plans(创建计划) → PlanDetails(创建任务) → TaskDetails(启Agent)
→ AgentRunDetails(看结果) → DraftEditor(审编辑)
```

---

## 一、品牌创建（Onboarding）—— 门槛高、缺少智能辅助

### 问题 1：虚假的分步提示

**文件：** `src/pages/Onboarding.tsx:88`

页面顶部显示 **"Step 1 OF 3"**，但实际上只有一个长表单，没有第 2、3 步。用户会产生预期落差，等待进入下一步却发现直接结束了。

**影响：** 用户信任感下降，且表单一屏承载所有字段（9 个），视觉压力大。

### 问题 2：纯手工填写，零 AI 辅助

一个以 AI 内容生成为核心卖点的平台，品牌档案的填写却完全靠用户自己思考和输入。以下字段直接影响 Agent 生成质量，但没有任何 AI 辅助生成、示例参考或智能补全：

- 品牌简介（`summary`）
- 品牌语气（`toneOfVoice`）
- 目标受众（`audience`）
- 品牌定位（`positioning`）
- 禁用表达（`doAndDonts`）

**影响：** 用户填写质量参差不齐，最终 Agent 生成内容的质量也随之波动。而且用户需要反复试错——填完 → 跑 Agent → 看效果 → 回来修改——才能找到合适的品牌设定。

### 问题 3：行业选项太少且硬编码

**文件：** `src/pages/Onboarding.tsx:127-131`

```typescript
<option>教育 / 民办高中</option>
<option>科技与软件</option>
<option>媒体与出版</option>
<option>设计与创意服务</option>
```

仅 4 个固定选项，无法覆盖大多数用户的实际行业（餐饮、零售、金融、医疗、制造等完全缺失）。没有"其他"自定义输入框。

**影响：** 不在列表中的用户只能选一个相近的，导致品牌上下文不准确，Agent 生成内容时可能出现偏差。

### 问题 4：填写效果无法预览

用户填完所有字段后，无法预览"AI 基于这些设定会生成什么风格的内容"。无法在提交前验证和迭代。

**影响：** 用户只能等到实际跑 Agent 时才能验证品牌设定是否合适，不合适就得回头修改，形成低效的试错循环。

### 问题 5：必填字段过多

必填项：品牌名称、行业、简介（3 个显式校验，`Onboarding.tsx:39-42`）。但表单实际包含 9 个字段，用户感知的填写负担很重。像"禁用表达"、"审核策略"这类字段对首次用户来说难以决策。

### 问题 6：审核策略默认值与后续体验割裂

默认审核策略选的是 `manual_required`（必须人工审核），但用户在 Onboarding 阶段并不理解这个选择对后续工作流意味着什么。当 Agent 生成内容后还需要手动进入 DraftEditor 审核时，用户才会意识到这个设置的影响——但此时已经忘记了当初的选择。

---

## 二、系统配置（Settings）—— 对非技术用户极不友好

### 问题 1：API Key 手动配置门槛高

**文件：** `src/pages/Settings.tsx`

用户需要自行：
1. 去 DeepSeek/OpenAI 平台注册账号
2. 获取 API Key
3. 了解 base URL 和 model 名称的格式
4. 回到 Mediax 手动填入

这是纯技术人员才会的操作。对于新媒体运营、品牌经理等目标用户来说，这是一个显著的劝退点。

### 问题 2：缺乏连通性测试

填写 API Key 后没有 **"测试连接"** 按钮，用户只能在跑 Agent 时才能发现配置是否正确。

更严重的是，Agent 在 LLM 不可用时会静默回退到模板生成（`draftGenerator.ts:137-143`），产出一段占位文字。用户可能根本不知道 API 没生效，以为 AI 就这水平。

### 问题 3：`.env` 和 Settings 页面双重配置入口

LLM 和图片生成的 API Key 既可以在 `.env` 配置（服务端环境变量），又可以在 Settings 页面配置（存入 `data.json`）。虽然代码有优先级逻辑，但用户并不清楚，配置体验碎片化。

### 问题 4：入口不明显

Settings 页面藏在右上角角落的齿轮图标中（`TopNavBar`），没有文字标签。新用户可能找不到配置入口，且没有从 Onboarding 或其他页面引导用户前往配置。

### 问题 5：图片生成配置的 provider 切换逻辑隐式修改字段

**文件：** `src/pages/Settings.tsx:36-39, 46-54`

```typescript
const IMAGE_GEN_PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'dall-e-3' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'gpt-image-2' },
};
```

切换 Provider 时会自动填充 baseUrl 和 model，但这对用户来说是一个隐式行为，可能覆盖掉他们之前手动填写的值。

### 问题 6：视频生成占位

视频生成整个 section 是 disabled + 60% 透明度的占位状态（`Settings.tsx:163`），标签写着"即将支持"。这种占位 UI 给用户传递了"功能不完整"的信号，且没有预期上线时间。

---

## 三、素材上传（Library）—— 浏览器兼容性受限、知识转化低效

### 问题 1：File System Access API 的浏览器锁定

**文件：** `src/pages/Library.tsx:115-118, 481-489`

```typescript
if (!isFileSystemAccessSupported()) {
  setStatus('unsupported');
  // 显示："当前浏览器不支持本地文件夹访问，请使用 Chrome 或 Edge"
}
```

Firefox 和 Safari 用户完全无法使用素材库。对于 Mac 用户（Safari 默认浏览器），开局即劝退。

**影响：** 丢失潜在用户群体。如果需要支持更多浏览器，需要实现基于 `<input type="file" webkitdirectory>` 的 fallback 方案。

### 问题 2："加入品牌知识"完全手动、逐文件操作

**文件：** `src/pages/Library.tsx:442-479`

每个素材文件需要：点击三点菜单 → "加入品牌知识" → 触发 `createKnowledgeItem()`。不支持多选批量操作。

一个品牌可能有几十上百个素材文件，逐一手动转换非常低效。用户大概率会放弃。

### 问题 3：知识提取过于简陋

**文件：** `src/services/knowledgeExtraction.ts`

```typescript
// 摘要只是简单的文本拼接
const summary = createKnowledgeSummaryFromText(
  `${asset.name} 位于 ${getAssetLocationLabel(asset)}，类型为 ${asset.type}，大小 ${asset.sizeLabel}。`
);
// 标签从文件名分词推断
tags: inferKnowledgeTags(sourceText),
```

知识提取只基于文件名和元数据，没有对文件内容的实际解析。对于 PDF、文档类素材，文件名能提供的信息非常有限。Agent 依赖这些知识条目来生成内容，低质量的知识输入会导致低质量的内容输出。

### 问题 4：缺乏云端存储集成

只支持本地文件夹绑定（File System Access API），不支持 Google Drive、OneDrive、OSS、S3 等云端存储。现代内容团队通常使用云存储协作，本地文件夹模式与实际工作流不匹配。

### 问题 5：权限状态机复杂

素材库有 6 种状态，每种状态对应不同的 UI：

| 状态 | 含义 |
|------|------|
| `checking` | 正在检查浏览器授权 |
| `unsupported` | 浏览器不支持 |
| `unbound` | 未绑定本地文件夹 |
| `permission` | 需要重新授权 |
| `scanning` | 正在扫描文件 |
| `ready` | 正常工作 |
| `error` | 出错 |

用户需要理解并穿越多种状态，体验碎片化。

### 问题 6：上传同时只支持两种方式

- 上传单个文件（`<input type="file" multiple>`）
- 上传整个文件夹（`<input webkitdirectory>`）

没有拖拽上传（drag & drop），也没有从 URL/剪贴板粘贴。

---

## 四、计划创建（Plans）—— 字段冗余、缺乏引导

### 问题 1：计划创建弹窗字段过多且未被充分利用

**文件：** `src/pages/Plans.tsx`（Modal 表单）

创建计划需要填写：标题、分类、状态、开始日期、结束日期、目标、受众、渠道、自动化级别——共 9 个字段。

但查看 Agent 执行代码（`brandContext.ts`），Agent 主要使用的是 Task 级别的 `brief`、`channel`、`contentType`，Plan 级别的很多字段（如目标、受众、渠道）在 prompt 构建中并未被充分利用。用户花了时间填的信息没有被有效使用。

### 问题 2：与品牌上下文的割裂感

创建计划时没有引用或展示已配置的品牌信息（品牌名、行业、定位等），用户感觉前面在 Onboarding 花时间做的工作没有产生价值。计划应该是品牌的自然延伸，但 UI 上没有建立这种关联。

### 问题 3：无模板/示例

没有预制的内容计划模板（如"新品发布计划"、"节日营销计划"、"日常内容日历"），用户每次都要从零开始。对于"一周发 3 篇公众号"这种常见需求，缺乏快速创建的能力。

### 问题 4：Plans 列表页缺少批量操作

**文件：** `src/pages/Plans.tsx`

计划列表只有展开查看和单个操作，没有批量删除、批量归档、批量导出等功能。对于有多个历史计划的用户，管理成本线性增长。

---

## 五、任务创建（Task）—— 整个链路中配置最繁琐的环节

### 问题 1：任务创建表单是全局最复杂的配置点

**文件：** `src/pages/PlanDetails.tsx:346-564`（Modal 内表单）

仅显式校验的必填项就有 6 个（`PlanDetails.tsx:146-161`）：

```
任务名称 / Brief / 发布渠道 / 内容类型 / 执行类型 / 计划发布时间
```

加上可选的补充说明、状态、审核策略，用户感知的填写项有 10+ 个。这是整个平台中单次交互信息密度最高的页面。

### 问题 2：Brief 是核心但缺乏辅助

**文件：** `src/pages/PlanDetails.tsx:361-373`

Brief 是 Agent 生成内容质量的决定性因素——它直接进入 LLM 的 user prompt（`draftGenerator.ts:58-86`）。但 Brief 输入框只是一个裸 `<textarea>`：

- 没有示例模板（如"新品发布 Brief 模板"）
- 没有字数/质量建议
- 没有 AI 辅助优化（"帮我润色这段 Brief"）
- 没有关联品牌知识库中的素材

**影响：** Brief 写得差的用户 → Agent 产出质量差 → 用户认为平台不行 → 流失。

### 问题 3：循环调度的 UI 过于复杂

**文件：** `src/pages/PlanDetails.tsx:446-498`

"循环执行"模式下，用户需要：
1. 点击 7 个星期按钮选择执行日
2. 设置执行时间（time picker）
3. 设置计划发布时间（time picker）

对于"每周一早上发一篇公众号文章"这种常见需求，配置体验有 3 个步骤过于繁琐。

### 问题 4：单次任务创建后立即自动跳转

**文件：** `src/pages/PlanDetails.tsx:196-217`

```typescript
// 单次执行：保存后立即创建草稿并跳转到草稿编辑页
if (!editingTaskId && isSingle) {
  const draft = await createDraft({...});
  if (draft) {
    await updateTask(plan.id, task.id, {...});
    navigate(`/drafts/${draft.id}`);
  }
}
```

用户刚创建完任务，就被跳转到一个自动生成的空白草稿编辑器。这个行为不可预期——用户可能想去启动 Agent，却被带到了草稿页。

### 问题 5：渠道和内容类型的选项固定且有限

```typescript
// 渠道
['微信公众号', '小红书', '抖音', '视频号', '官方博客']
// 内容类型
['图文', '短视频', '直播', '长文章', '海报']
```

这些选项硬编码在 JSX 中（`PlanDetails.tsx:388-411`），既没有品牌级别的自定义渠道，也没有在类型系统中集中管理。不同品牌的内容策略差异巨大，固定的选项列表无法满足长尾需求。

### 问题 6：缺少任务复制/克隆功能

`TaskRow` 组件的操作菜单只有"编辑"和"删除"（`PlanDetails.tsx:644-658`）。同一计划下通常有多个类似的任务（如不同日期的公众号图文），但没有复制任务的入口。

### 问题 7：`requirements` 和 `researchInstructions` 字段有类型定义但无创建 UI

**类型定义：** `src/types.ts`

```typescript
interface PlanTask {
  requirements?: string[];
  researchInstructions?: string;
  // ...
}
```

**Agent 使用：** `draftGenerator.ts:51-53, 80-83` — 这两个字段会被注入到 LLM prompt

**UI 缺失：** 任务创建表单中没有对应的输入框（`PlanDetails.tsx:346-564`）

这意味着代码层面已经设计了两个有价值的功能入口（执行要求、调研指令），但用户完全无法使用，成了"死字段"。

---

## 六、Agent 执行 —— 黑盒体验、缺乏可控性

### 问题 1：Agent 执行是纯黑盒

**文件：** `src/components/RunAgentDialog.tsx`

用户点击"启动 Agent 执行"后，看到的确认弹窗只展示：
- 任务名称
- 平台
- 内容类型
- 推荐图片尺寸
- 配图生成开关

用户完全不知道：
- Agent 会给 LLM 发什么样的 prompt
- 会使用哪些品牌知识条目
- 生成过程会经历哪些步骤
- 预计需要多长时间

### 问题 2：执行过程同步阻塞 UI

**文件：** `src/pages/TaskDetails.tsx:48-59`

```typescript
const handleConfirmRun = async (options) => {
  setShowAgentDialog(false);
  setAgentLoading(true);
  const run = await startAgentRun(task.id, options);  // 同步等待
  if (run) navigate(`/agent-runs/${run.id}`);
};
```

整个 Agent 执行过程（加载上下文 + LLM 调用 + 图片生成）是一个同步的 async 函数调用，前端只能干等。按钮显示"Agent 执行中..."且不可操作。

LLM 调用通常需要 10-30 秒，配图生成可能需要更久。没有任何实时进度反馈。

### 问题 3：后端 Agent 执行是同步的

**文件：** `server/agent/runAgentTask.ts`

```typescript
export async function runAgentTask(taskId, options): Promise<AgentRun> {
  // 所有步骤都在一个函数中同步执行
  // Step 1: 加载上下文
  // Step 2: 分析 Brief
  // Step 3: LLM 生成内容（阻塞等待）
  // Step 4: 生成配图（阻塞等待）
  // 最后一次性写入结果
}
```

Agent 的整个生命周期在一个 HTTP 请求中完成。没有使用任务队列、WebSocket 推送或轮询机制，导致：
- 浏览器可能超时
- 用户无法获得实时进度
- 无法并行处理多个 Agent 任务

### 问题 4：缺乏 Agent 行为定制

`RunAgentDialog` 只提供两个选项：
- 是否生成配图（checkbox）
- 图片尺寸（text input）

用户无法：
- 调整生成风格/语气（覆盖品牌设定）
- 指定内容长度（短文案 vs 长文章）
- 提供额外的 prompt 指令
- 选择不同的 LLM 模型（如用 GPT-4 生成重点内容）
- 生成多个候选版本供选择

### 问题 5：Prompt 完全不可见

**文件：** `server/agent/draftGenerator.ts:17-86`

`buildSystemPrompt()` 和 `buildUserPrompt()` 拼接了品牌信息、知识库、任务要求，最终发送给 LLM。但这个完整的 prompt 在任何前端页面上都不可见。

用户不知道 Agent 是否正确理解了品牌设定和任务要求。当生成结果不如预期时，用户无法判断问题是出在 Brief、品牌设定、还是 LLM 本身。

### 问题 6：失败的静默处理

**文件：** `server/agent/draftGenerator.ts:137-143`

```typescript
} catch (err) {
  console.error('LLM 生成失败，使用 fallback:', err);
  const fallback = createFallbackDraft(context);
  // fallback 生成的是占位文字：
  // "以{语气}的语气，为{品牌名}创作：{brief}"
}
```

LLM 调用失败时，Agent 静默回退到模板生成。前端 `AgentRunDetails` 页面会显示"已通过 LLM 生成"或"使用模板生成"，但普通用户可能：
- 不理解这两者的区别
- 不知道内容质量已经显著下降
- 不知道如何修复（重新配置 API Key？换模型？）

### 问题 7：图片生成的尺寸配置体验割裂

RunAgentDialog 中显示"推荐尺寸"（来自 `platformImageSizes.ts`），用户可以手动修改。但这个推荐尺寸是基于平台和内容类型的硬编码映射，用户修改后系统不会记住这个偏好，下次执行同样组合时又会显示默认推荐值。

---

## 七、草稿编辑与审核 —— 编辑体验简陋

### 问题 1：纯文本编辑器

**文件：** `src/pages/DraftEditor.tsx:254-261`

```tsx
<textarea
  rows={16}
  value={content}
  onChange={(event) => setContent(event.target.value)}
  className="..."
/>
```

正文内容使用原生 `<textarea>` 编辑，没有任何格式化能力。对于公众号图文（需要标题层级、加粗、分割线）、小红书内容（需要 emoji、短段落、标签）等内容类型，纯文本编辑完全不够用。

### 问题 2：与原始 Brief 缺乏对照

编辑草稿时，右侧信息面板（`DraftEditor.tsx:265-342`）显示的是：
- 草稿信息（状态、更新时间、所属计划/任务）
- Agent 来源 / 关联上下文

但**不会展示原始任务 Brief**，用户需要凭记忆或来回切换页面来对比生成内容和原始需求。对于审核场景（"这段内容是否符合 Brief 要求？"），对照能力非常重要。

### 问题 3：重新生成的路径过长

**文件：** `DraftEditor.tsx:107-118` + `server/routes/data.ts` request-regeneration handler

当前"重新生成"流程：
1. DraftEditor 点击"重新生成" → 填写修改说明
2. 任务状态回到 `queued`
3. 跳转到任务详情页 `/plans/:planId/tasks/:taskId`
4. 再次点击"启动 Agent 执行"

整个过程需要多次页面跳转，且重新启动 Agent 后生成的是全新的内容，之前的修改全部丢失。

### 问题 4：发布是模拟的

**文件：** `server/publishers/simulatedPublisher.ts`

```typescript
// 创建一条 PublishRecord 模拟发布
```

Publish 功能只创建一条 `PublishRecord` 记录 + 更新任务状态为 `published`，不会实际推送到任何平台（微信公众号、小红书、抖音等）。

"发布成功"的提示与实际效果之间完全脱节，所有发布后的内容仍需用户手动复制到对应平台。

### 问题 5：单个草稿查看成本高

`Drafts` 列表页（`Drafts.tsx`）只显示标题、平台、状态，没有内容预览。用户必须点击进入完整的 `DraftEditor` 页面才能看到草稿的实际内容。对于审核场景（快速浏览多个草稿），查看成本过高。

### 问题 6：缺乏版本历史

Agent 多次执行、用户手动编辑、重新生成——草稿的多个版本会在生命周期中产生，但没有任何版本记录或 diff 比较能力。用户无法回溯到之前的版本。

---

## 八、架构与全局问题

### 问题 1："全量刷新"状态管理模式

**文件：** `src/context/AppContext.tsx:154-166`

```typescript
const runMutation = useCallback(async <T>(action: () => Promise<T>) => {
  const result = await action();
  await refresh();  // 全量拉取 8+ 个 API
  return result;
}, [refresh]);
```

每次 `runMutation()` 之后都会调用 `refresh()`，发起 8+ 个并行 API 请求重新拉取全部数据。任何小改动（如保存草稿、删除知识条目）都会触发全量状态更新，导致：
- 不必要的组件重渲染
- UI 闪烁（短暂显示旧数据 → 加载 → 显示新数据）
- 网络流量浪费

### 问题 2：缺少乐观更新

所有写操作都是"先调 API，再刷新全部数据"，没有乐观更新（optimistic update）。用户点击"保存"后，UI 不会立即反映变化，而是等待服务器返回 + 全量刷新。在网络较慢时，用户感知的响应延迟明显。

### 问题 3：页面跳转频繁、缺少向导

用户的完整路径是 10+ 个页面跳转，没有任何端到端向导或"新手引导"。每个页面都是独立的存在，没有"下一步"的行动指引。

Dashboard 展示了统计数据（活跃计划数、任务数、草稿数），但没有告诉用户"你现在应该做什么"。新用户进入 Dashboard 后不知道从哪里开始。

### 问题 4：缺少面包屑导航

大部分页面没有面包屑。例如：
- `DraftEditor` 只显示"返回草稿箱"，没有显示所属计划/任务的路径
- `AgentRunDetails` 没有链接回对应的 Task
- `TaskDetails` 有"返回计划详情"但没有到顶层 Plans 的路径

### 问题 5：数据存储是单文件 JSON

**文件：** `server/store.ts`

所有数据（品牌、计划、任务、草稿、Agent 运行记录、知识条目、配置）存储在单个 `data.json` 文件中。原子写入通过 `tmp + rename` 实现。

这在原型阶段没问题，但：
- 没有并发安全保证（虽然有队列串行化，但单文件写入仍是瓶颈）
- 没有数据备份/恢复机制
- 无法水平扩展
- 数据损坏会影响所有模块

### 问题 6：LLM 只支持 DeepSeek 兼容协议

**文件：** `server/llm/deepseek.ts`

LLM 层虽然抽象了 `getLlmProvider()`，但实际只对接了 DeepSeek 兼容的 chat completions 接口。不像图片生成和 Settings 页面那样有 provider 选择。

用户无法在 UI 上切换 LLM provider——必须通过修改代码或 `.env` 来更换。

### 问题 7：缺乏数据导出/导入

用户投入大量时间配置的品牌档案、计划、任务、知识库，全部存储在 `data.json` 中。但没有导出/导入功能，用户无法：
- 备份自己的数据
- 迁移到另一台设备
- 分享品牌配置给团队成员

### 问题 8：认证是单用户模式

只有一对 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 硬编码在 `.env` 中。没有多用户、角色权限、团队协作能力。但内容运营通常是一个团队工作。

---

## 改进优先级建议

### 第一优先级：降低启动门槛（减少用户在"见到 AI 价值"前的配置步骤）

| 序号 | 改进项 | 影响范围 |
|------|--------|----------|
| 1 | **Onboarding AI 辅助填写**：品牌档案用 AI 辅助生成，用户只需输入品牌名称和行业，其余字段由 AI 建议并允许修改 | 前端 |
| 2 | **API 配置内置默认值**：提供预置的 API 代理或一键使用内置模型，免除用户自行获取 API Key | 后端 + 前端 |
| 3 | **端到端新用户向导**：3-5 步完成 品牌→素材→计划→任务，每步有示例和默认值 | 前端 |
| 4 | **Settings 增加连通性测试按钮**：配置后一键验证 API 是否可用 | 前端 + 后端 |

### 第二优先级：简化核心工作流

| 序号 | 改进项 | 影响范围 |
|------|--------|----------|
| 5 | **Brief AI 辅助写作**：输入关键词，AI 扩展为完整 Brief；提供 Brief 模板库 | 前端 + 后端 |
| 6 | **Task 创建精简**：渠道和内容类型支持自定义；减少必填字段；增加复制任务功能 | 前端 |
| 7 | **素材库批量知识化**：支持多选素材一键加入品牌知识库 | 前端 |
| 8 | **素材库浏览器兼容**：增加非 Chrome 浏览器的 fallback 上传方案 | 前端 |

### 第三优先级：Agent 体验透明化

| 序号 | 改进项 | 影响范围 |
|------|--------|----------|
| 9 | **Agent 执行异步化 + 实时进度**：WebSocket 或 SSE 推送步骤进度 | 后端 + 前端 |
| 10 | **Prompt 可视化**：执行前可预览完整 prompt；执行后可查看实际发送的 prompt | 前端 |
| 11 | **Agent 行为定制**：支持调整语气、长度、生成数量等参数 | 前端 + 后端 |
| 12 | **LLM provider 多选**：Settings 中的 provider 选择扩展到 LLM 模块 | 前端 + 后端 |

### 第四优先级：编辑与发布体验

| 序号 | 改进项 | 影响范围 |
|------|--------|----------|
| 13 | **富文本编辑器**：替换 textarea 为支持基本格式化的编辑器 | 前端 |
| 14 | **审核对照视图**：编辑草稿时并排展示原始 Brief | 前端 |
| 15 | **版本历史**：记录每次编辑和重新生成的历史版本 | 后端 + 前端 |

### 第五优先级：架构与基础设施

| 序号 | 改进项 | 影响范围 |
|------|--------|----------|
| 16 | **状态管理优化**：实现乐观更新 + 增量数据刷新 | 前端 |
| 17 | **数据导出/导入**：支持品牌配置和内容的备份与迁移 | 后端 + 前端 |
| 18 | **多用户支持**：团队协作、角色权限 | 后端 + 前端 |
| 19 | **数据库迁移**：从单文件 JSON 迁移到 SQLite 或 PostgreSQL | 后端 |

---

> **注：** 本文档基于 2026-04-28 的代码状态编写，文件路径和行号以当时的代码为准，后续变更可能导致偏差。
