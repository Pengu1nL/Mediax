# D4：品牌设定效果预览

> 状态：方案已产出  
> 涉及范围：前端 + 后端  
> 依赖：D1（Step 3 预览占位区域）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 填写品牌档案后无法预览 AI 生成效果 | 高 |
| 2 | 验证品牌设定的唯一路径：填完 → 配 API → 建计划 → 建任务 → 跑 Agent → 看到效果 | 高 |
| 3 | 效果不理想需回到 Onboarding 修改，再重复完整流程 | 高 |
| 4 | 形成低效试错循环，用户在见到 AI 价值前就可能流失 | 中 |

---

## 二、方案设计

### 2.1 整体思路

在 Onboarding Step 3 的品牌档案总览卡片下方，提供**一键预览 AI 生成效果**的能力。用当前填写的品牌设定，让 LLM 生成一篇示例内容。用户无需创建 Plan/Task 即可直观感受品牌设定对 AI 产出的影响。

### 2.2 交互设计

#### 位置

D1 Step 3 — 品牌档案总览卡片下方。

#### 布局

```
┌──────────────────────────────────────────────────┐
│  📱 预览 AI 生成效果                               │
│                                                   │
│  选择内容类型：  [微信公众号图文]  [小红书帖子]      │
│                                                   │
│  [✨ 生成预览]                                     │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │  预览结果（生成后展示）                      │   │
│  │  ────────────────────────────────          │   │
│  │  标题：xxx                                 │   │
│  │  正文：xxx...                              │   │
│  │  摘要：xxx                                 │   │
│  │  ────────────────────────────────          │   │
│  │  生成依据：                                │   │
│  │  品牌语气 → {toneOfVoice}                  │   │
│  │  品牌定位 → {positioning}                  │   │
│  │  目标受众 → {audience}                     │   │
│  │  禁用表达 → {doAndDonts}                   │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

#### 交互流程

1. 进入 Step 3，看到预览区块
2. 默认选中"微信公众号图文"
3. 点击"生成预览" → 按钮 loading 态 → 结果卡片展开
4. 可切换内容类型重新生成
5. 返回 Step 1/2 修改字段后回到 Step 3 → 预览结果标为"已过期"

#### 状态处理

| 状态 | UI |
|------|-----|
| name/industry/summary 未填 | 按钮 disabled，tooltip "请先完善品牌基本信息" |
| API Key 未配置 | 按钮 disabled，tooltip "请先在 Settings 配置 AI 接口密钥" |
| 生成中 | 按钮 loading + 骨架屏 |
| 生成成功 | 结果卡片淡入展开 |
| 生成失败 | InlineAlert 错误提示 |
| 品牌设定变更 | 结果卡片上方黄色提示条"设定已变更"，卡片灰化 |

### 2.3 API 设计

```
POST /api/brand/preview
```

**请求体：**

```typescript
{
  brand: {
    name: string;          // 必填
    industry: string;      // 必填
    summary: string;       // 必填
    toneOfVoice?: string;
    audience?: string;
    positioning?: string;
    doAndDonts?: string[];
    keywords?: string[];
  };
  contentType: 'wechat_article' | 'xiaohongshu_post';
}
```

**响应体：**

```typescript
{
  title: string;
  content: string;
  excerpt: string;
}
```

**后端流程：**

1. 校验 `name`、`summary` 非空
2. 获取 `getLlmProvider()`
3. LLM 不可用 → 返回 400 `{ error: "LLM_NOT_CONFIGURED" }`
4. 构建 system prompt（品牌创作助手，注入品牌字段）
5. 构建 user prompt（生成示例内容，附带内容类型格式要求）
6. 调用 `llm.generate()`
7. 解析输出 → 返回 title/content/excerpt
8. **全程不写 data.json**，纯读操作 + LLM 调用

### 2.4 Prompt 设计

#### System Prompt

```
你是品牌"{name}"的内容创作助手。

【品牌信息】
- 名称：{name}
- 行业：{industry}
- 品牌定位：{positioning}
- 品牌语气：{toneOfVoice}
- 目标受众：{audience}
- 品牌简介：{summary}

【表达规范】
{doAndDonts 逐条列出}

【创作要求】
- 严格遵循品牌语气
- 内容真实、有说服力、不编造不存在的产品
- 标题吸引目标受众，正文结构清晰
```

#### User Prompt

```
请为品牌"{name}"创作一篇示例内容，用于预览品牌设定效果。

内容类型：{微信公众号图文 / 小红书帖子}

要求：
- 微信公众号图文：标题 15-25 字，正文 150-300 字，结构完整
- 小红书帖子：标题带 emoji，正文 100-200 字，分段短小，带 3-5 个标签

请按照以下格式输出：

【标题】
（标题）

【正文】
（正文）

【摘要】
（一句话摘要，不超过 80 字）
```

---

## 三、改动清单

### 3.1 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/routes/data.ts` | 修改 | 新增 `POST /api/brand/preview` 路由（约 70 行） |
| `src/pages/Onboarding.tsx` | 修改 | Step 3 新增预览区块 + 状态管理（约 +80 行） |
| `src/repositories/apiRepositories.ts` | 修改 | 新增 `brand.preview()` 方法（约 10 行） |
| `src/context/AppContext.tsx` | 修改 | 暴露 `previewBrandContent` 到 store（约 +15 行） |

### 3.2 不影响

- 不创建 Draft、Plan、Task 等持久化数据
- 不修改 Agent 执行流程
- 不依赖素材库或知识库

---

## 四、与其他课题的关系

| 课题 | 关系 |
|------|------|
| **D1** | 依赖 Step 3 的预览占位区域 |
| **D2** | 与 AI 辅助填写形成闭环：AI 建议 → 手动调整 → 预览验证 |
| **D5** | 未配 API Key 时预览不可用，引导到 Settings |
| **D19** | 预览是 Agent 执行的轻量版：复用 prompt 模式，省略持久化 |

---

## 五、验收标准

- [ ] Step 3 展示"预览 AI 生成效果"区块
- [ ] 支持切换微信公众号图文 / 小红书帖子两种内容类型
- [ ] 点击"生成预览"展示标题、正文、摘要
- [ ] 结果卡片底部展示影响生成的关键品牌设定字段及当前值
- [ ] name/industry/summary 任一缺失时按钮 disabled
- [ ] API Key 未配置时按钮 disabled + tooltip 引导配置
- [ ] 返回 Step 1/2 修改字段后，预览结果标注"已过期"
- [ ] 生成失败时 InlineAlert 提示，不影响已填内容
- [ ] 预览不产生任何持久化数据
