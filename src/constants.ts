import { AppData, KnowledgeEntry, BrandProfile, Draft, Plan, PlanTask, SystemConfig } from './types';

export const DEFAULT_CONFIG: SystemConfig = {
  llm: {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  },
  imageGen: {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-image-2',
  },
  videoGen: {
    provider: '',
    apiKey: '',
    baseUrl: '',
    model: '',
  },
};

export const SEED_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [];

export const SEED_BRAND_PROFILE: BrandProfile = {
  id: 'brand-1',
  name: 'Mediax',
  industry: '传媒',
  keywords: ['AI 内容', '自动化运营', '品牌管理', '多平台发布'],
  summary:
    'Mediax 是一个 AI 驱动的内容运营平台，帮助品牌高效创建、管理和发布多平台内容。',
  audience: '新媒体运营团队、品牌经理、内容创作者',
  positioning: 'AI 驱动的内容运营自动化平台',
  toneOfVoice: '专业、简洁、有洞察力',
  doAndDonts: ['避免过度技术术语', '避免夸大AI能力', '避免贬低人工创作的价值'],
  defaultReviewPolicy: 'manual_required',
  setupComplete: false,
  channels: [
    { id: 'c1', name: '微信公众号', handle: '@Mediax', kind: 'wechat', active: true },
    { id: 'c2', name: '小红书', handle: '@Mediax', kind: 'xiaohongshu', active: true },
    { id: 'c3', name: '抖音', handle: '@Mediax', kind: 'douyin', active: true },
    { id: 'c4', name: '视频号', handle: '@Mediax', kind: 'video', active: true },
  ],
};

export const SEED_PLANS: Plan[] = [
  {
    id: 'p1',
    title: '2026 春季产品发布',
    status: 'active',
    startDate: '2026-05-10',
    endDate: '2026-06-10',
    category: '产品发布',
    brandId: 'brand-1',
  },
  {
    id: 'p2',
    title: '品牌周年庆活动',
    status: 'draft',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    category: '活动营销',
    brandId: 'brand-1',
  },
  {
    id: 'p3',
    title: 'Q2 日常内容日历',
    status: 'completed',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    category: '日常运营',
    brandId: 'brand-1',
  },
];

export const SEED_PLAN_TASKS: PlanTask[] = [
  {
    id: 't1',
    planId: 'p1',
    title: '产品功能介绍文章 - 微信公众号',
    subtitle: '新功能上线宣传',
    executionType: 'single',
    schedule: '2026-05-12 10:00',
    status: 'published',
    linkedDraftId: 'd1',
    brandId: 'brand-1',
    brief: '撰写一篇关于 Mediax 最新 Agent 功能的介绍文章，突出自动化内容生成和批量发布两大亮点，引导用户试用。',
    channel: '微信公众号',
    contentType: '图文',
    requirements: ['突出AI自动化优势', '包含实际使用场景', '附上注册链接'],
    reviewPolicy: 'manual_required',
    linkedDraftIds: ['d1'],
  },
  {
    id: 't2',
    planId: 'p1',
    title: 'AI 工具对比种草 - 小红书',
    subtitle: '标签：#AI工具 #内容创作 #效率提升',
    executionType: 'recurring',
    schedule: '2026-05-15 - 2026-05-30 (18:00)',
    status: 'queued',
    linkedDraftId: 'd2',
    brandId: 'brand-1',
    brief: '以内容创作者视角，对比传统内容运营方式和 Mediax AI 自动化运营的效率差异，真实展示节省的时间和提升的质量。',
    channel: '小红书',
    contentType: '图文',
    requirements: ['真实数据对比', '避免过度营销感', '自然露出品牌'],
    researchInstructions: '调研小红书内容创作类热门话题和标签',
    reviewPolicy: 'manual_required',
    linkedDraftIds: ['d2'],
  },
  {
    id: 't3',
    planId: 'p1',
    title: '直播产品演示 - 抖音',
    subtitle: '需要确认主播排期',
    executionType: 'single',
    schedule: '2026-05-20 20:00',
    status: 'draft',
    brandId: 'brand-1',
    brief: '举办抖音直播，由产品经理演示 Mediax 从创建品牌到一键发布的全流程，现场回答用户问题，收集反馈。',
    channel: '抖音',
    contentType: '直播',
    requirements: ['准备演示环境', '确认主播时间', '搭建直播设备'],
    researchInstructions: '收集用户常见问题准备 Q&A',
    reviewPolicy: 'manual_required',
  },
];

export const SEED_DRAFTS: Draft[] = [
  {
    id: 'd1',
    planId: 'p1',
    taskId: 't1',
    platform: '微信公众号',
    group: '产品宣传',
    status: 'ready',
    title: 'Mediax Agent 全面升级：AI 驱动的内容运营新时代',
    excerpt: 'Mediax 最新推出的 AI Agent 功能，让内容创作者从繁琐的日常运营中解放出来。',
    content:
      'Mediax 最新推出的 AI Agent 功能，让内容创作者从繁琐的日常运营中解放出来。自动生成、智能审核、一键发布到多平台——这一切现在只需要几分钟。',
    updatedAt: '2026-05-04T14:30:00+08:00',
  },
  {
    id: 'd2',
    planId: 'p1',
    taskId: 't2',
    platform: '小红书',
    group: '种草测评',
    status: 'review',
    title: '一个月的运营工作，AI 帮我 3 小时搞定',
    excerpt: '以前每天花 4 小时写内容、排版、发到各个平台，现在搭好 Mediax 之后每天只需要检查一下。',
    content:
      '以前每天花 4 小时写内容、排版、发到各个平台，现在搭好 Mediax 之后每天只需要检查一下。AI Agent 理解我的品牌调性，生成的内容质量出乎意料的高。',
    updatedAt: '2026-05-03T09:15:00+08:00',
  },
  {
    id: 'd3',
    planId: 'p2',
    platform: '官方博客',
    group: '行业洞察',
    status: 'draft',
    title: 'AI 内容运营的底层逻辑：从工具到 Agent 的演进',
    excerpt: '内容运营正在经历从手动工具到 AI Agent 的范式转移。',
    content:
      '内容运营正在经历从手动工具到 AI Agent 的范式转移。传统的编辑器、排期工具只是提高了执行效率，而 AI Agent 重新定义了谁在执行——人只需要决策和把关。',
    updatedAt: '2026-05-01T10:12:00+08:00',
  },
];

export function createSeedAppData(): AppData {
  return {
    brand: structuredClone(SEED_BRAND_PROFILE),
    knowledgeEntries: structuredClone(SEED_KNOWLEDGE_ENTRIES),
    plans: structuredClone(SEED_PLANS),
    planTasks: structuredClone(SEED_PLAN_TASKS),
    drafts: structuredClone(SEED_DRAFTS),
    agentRuns: [],
    publishRecords: [],
    config: structuredClone(DEFAULT_CONFIG),
  };
}
