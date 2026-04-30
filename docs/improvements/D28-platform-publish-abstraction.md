# D28：真实平台对接方案

> 状态：方案已产出  
> 涉及范围：全栈  
> 依赖：D24（富文本编辑器输出 HTML）

---

## 一、问题回顾

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 发布是模拟的，不实际推送到任何平台，用户仍需手动复制 | 高 |
| 2 | 导出包是通用 JSON，各平台格式差异大，用户需自行调整 | 中 |
| 3 | 无平台接入凭证管理，无法对接真实 API | 中 |

### 现实约束

微信、小红书、抖音等平台 API 接入需要公网服务器、开发者资质、应用审核，与 Mediax 当前本地优先的架构不兼容。**当前阶段不做真实 API 推送**，但设计好抽象层 + 平台感知导出 + 凭证管理基础。

---

## 二、方案设计

### 2.1 Publisher 抽象层

```typescript
// server/publishers/types.ts

interface PlatformPublisher {
  /** 平台标识 */
  readonly platform: string;

  /** 导出为平台格式 */
  export(draft: Draft): PlatformExport;

  /** 测试连接（未来真实 API 对接时使用） */
  testConnection?(credentials: PlatformCredentials): Promise<{ ok: boolean; error?: string }>;
}

interface PlatformExport {
  platform: string;
  title: string;
  content: string;         // 平台格式化后的内容
  excerpt: string;
  format: 'html' | 'text' | 'markdown';
  assets: string[];
  publishGuide: string;    // 发布指引：告诉用户如何手动发布
  platformNote: string;    // 平台特定注意事项
}

interface PlatformCredentials {
  // 为未来真实 API 预留
  appId?: string;
  appSecret?: string;
  accessToken?: string;
}
```

### 2.2 平台感知导出

每个平台实现自己的格式化逻辑：

| 平台 | 格式 | 处理逻辑 |
|------|------|---------|
| 微信公众号 | HTML | 富文本 → 过滤不兼容标签 → 保持格式 |
| 小红书 | 纯文本 | HTML → 纯文本 + emoji 保留 + `#标签` 自动添加 |
| 抖音 | 纯文本 | 提取标题+描述，截断到平台字数限制 |
| 视频号 | 纯文本 | 类似微信，适配视频号描述格式 |
| 官方博客 | Markdown | HTML → Markdown，适合 CMS 粘贴 |

### 2.3 导出体验改进

DraftEditor "发布与导出"区域改造：

```
发布与导出

[发布（记录）]               ← 创建 PublishRecord（追踪用）
[复制到微信公众号]            ← 一键复制格式化后内容
[复制到小红书]               ← 自动加标签 + emoji
[下载导出包]                 ← 包含所有平台格式

⚠️ 当前为模拟发布，内容需手动粘贴到对应平台后台。
```

- "复制到{平台}" → 根据任务 channel 显示对应平台的按钮
- 复制后显示 toast "已复制，请粘贴到微信公众号后台"
- 平台发布指引链接（如"打开微信公众平台"）

### 2.4 平台处理示例

**微信公众号导出：**
- TipTap HTML → 过滤掉 WeChat 不支持的标签（如某些 CSS）
- 图片转 base64 内联或提供替换提示
- 保留 B/I/U/标题层级，移除不兼容格式

**小红书导出：**
- HTML → 纯文本
- 保留 emoji
- 根据 D18 的 requirements 自动提取或建议标签
- 分段之间加空行

### 2.5 Settings 新增平台接入（占位）

Settings 页面新增"平台接入"区块：

```
┌──────────────────────────────────────────┐
│  🔌  平台接入                              │
│                                           │
│  当前阶段通过导出 + 手动粘贴方式发布。       │
│  未来版本将支持 API 直连推送。              │
│                                           │
│  微信公众号  [导出]  API 接入即将上线         │
│  小红书      [导出]  API 接入即将上线         │
│  抖音        [导出]  API 接入即将上线         │
└──────────────────────────────────────────┘
```

不提供凭证输入框（因为还未对接），但预留 UI 位置。

---

## 三、改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/publishers/types.ts` | 修改 | 新增 `PlatformPublisher` 接口 + `PlatformExport` 类型 |
| `server/publishers/wechat.ts` | 新增 | 微信公众号格式化 publisher |
| `server/publishers/xiaohongshu.ts` | 新增 | 小红书格式化 publisher |
| `server/publishers/douyin.ts` | 新增 | 抖音格式化 publisher |
| `server/publishers/index.ts` | 新增 | `getPublisher(platform)` 工厂函数 |
| `src/pages/DraftEditor.tsx` | 修改 | 发布/导出区域改造为"复制到{平台}"（约 +30 行） |
| `src/pages/Settings.tsx` | 修改 | 新增"平台接入"占位区块（约 +20 行） |

---

## 四、验收标准

- [ ] `PlatformPublisher` 接口定义完整
- [ ] 微信公众号导出为过滤后的 HTML 格式
- [ ] 小红书导出为纯文本 + emoji + 自动标签
- [ ] "复制到{平台}"一键复制格式化内容到剪贴板
- [ ] 复制后显示 toast 确认 + 平台发布指引
- [ ] 导出包包含所有平台格式
- [ ] Settings 有平台接入占位区块
- [ ] 现有"发布（记录）"功能不变
