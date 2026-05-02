import { writeFile, readFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { AppData } from '../src/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
let storeQueue: Promise<void> = Promise.resolve();

// Run this module to get the data.json path relative to the project root
function dataPath(): string {
  if (process.env.MEDIAX_DATA_PATH) {
    return process.env.MEDIAX_DATA_PATH;
  }
  // In both dev and prod, data.json lives at the project root (next to package.json)
  return `${__dirname}/../data.json`;
}

function defaultData(): AppData {
  return {
    brand: {
      id: 'brand-1',
      name: 'Mediax',
      industry: '媒体与出版',
      keywords: ['AI 内容创作', '自媒体运营', 'Agent 驱动', '多平台发布'],
      summary:
        'Mediax 是一个 AI Agent 驱动的全自动自媒体运营平台，帮助内容创作者从重复劳动中解放，专注于创意和策略。',
      audience: '内容创作者、自媒体运营者、品牌营销人员',
      positioning: 'AI 驱动的一站式自媒体运营平台',
      toneOfVoice: '专业、简洁、有洞察力',
      doAndDonts: ['夸大宣传', '过度承诺', '标题党', '信息焦虑'],
      defaultReviewPolicy: 'manual_required',
      setupComplete: false,
      channels: [
        { id: 'c1', name: '微信公众号', handle: '@Mediax', kind: 'wechat', active: true },
        { id: 'c2', name: '小红书', handle: '@Mediax', kind: 'xiaohongshu', active: true },
        { id: 'c3', name: '抖音', handle: '@Mediax', kind: 'douyin', active: true },
        { id: 'c4', name: '视频号', handle: '@Mediax', kind: 'video', active: true },
      ],
    },
    knowledgeEntries: [],
    agentRuns: [],
    publishRecords: [],
    config: {
      llm: { provider: 'deepseek', apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
      imageGen: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-2' },
      videoGen: { provider: '', apiKey: '', baseUrl: '', model: '' },
    },
    plans: [
      { id: 'p1', title: '2024 秋季招生全案宣发', status: 'active', startDate: '2026-09-01', endDate: '2026-10-15', category: '招生季', brandId: 'brand-1', objective: '通过全渠道内容宣发，提升建桥融高在秋季招生季的品牌曝光和生源转化。', audience: '初高中学生家长', channels: ['微信公众号', '小红书', '抖音'], successMetrics: ['公众号阅读量 > 5000', '招生咨询量提升 30%'], automationLevel: 'agent_draft', reviewPolicy: 'manual_required' },
      { id: 'p2', title: '建桥融高一周年校庆策划', status: 'draft', startDate: '2026-01-05', endDate: '2026-01-20', category: '校庆', brandId: 'brand-1', objective: '通过校庆内容传播，强化品牌认知度和社区影响力。', audience: '在校生家长、潜在生源家庭', channels: ['微信公众号', '视频号'], successMetrics: ['校庆活动报名人数 > 200'], automationLevel: 'assistive', reviewPolicy: 'manual_required' },
      { id: 'p3', title: '临港教育创新峰会展示', status: 'completed', startDate: '2025-06-01', endDate: '2025-08-31', category: '峰会', brandId: 'brand-1', objective: '在行业峰会展示建桥融高教育创新成果。', audience: '教育行业从业者', channels: ['微信公众号'], automationLevel: 'assistive', reviewPolicy: 'manual_required' },
    ],
    planTasks: [
      { id: 't1', planId: 'p1', title: '主视觉海报发布 - 微信公众号', subtitle: '关联 KV 视觉规范', executionType: 'single', schedule: '2026-09-01 10:00', status: 'published', linkedDraftId: 'd1', brandId: 'brand-1', brief: '发布秋季招生主视觉海报，突出融合教育理念和临港校区环境，配合招生简章下载入口。', channel: '微信公众号', contentType: '图文', requirements: ['使用品牌视觉识别规范', '包含招生简章下载二维码'], reviewPolicy: 'manual_required', linkedDraftIds: ['d1'] },
      { id: 't2', planId: 'p1', title: '小红书达人预热种草', subtitle: '标签：#秋招 #校园生活', executionType: 'recurring', schedule: '2026-09-05 - 2026-09-15 (18:00)', status: 'queued', linkedDraftId: 'd2', brandId: 'brand-1', brief: '邀请小红书教育类达人发布校园生活种草内容，展示融高学子的日常学习和社团活动。', channel: '小红书', contentType: '图文', requirements: ['达人粉丝量 > 1万', '自然露出品牌元素'], researchInstructions: '调研小红书教育类热门话题和标签', reviewPolicy: 'manual_required', linkedDraftIds: ['d2'] },
      { id: 't3', planId: 'p1', title: '抖音直播专场 - 品牌日', subtitle: '需要确认直播排期', executionType: 'single', schedule: '2026-09-20 20:00', status: 'draft', brandId: 'brand-1', brief: '举办抖音品牌日直播，由校长和教学主任介绍融合教育理念和招生政策，设置互动问答环节。', channel: '抖音', contentType: '直播', requirements: ['准备直播脚本', '确认嘉宾时间', '搭建直播间'], researchInstructions: '收集常见家长问题准备 Q&A', reviewPolicy: 'manual_required' },
    ],
    drafts: [
      { id: 'd1', planId: 'p1', taskId: 't1', platform: '微信公众号', group: '品牌宣传', status: 'ready', title: '【走进融高】在临港，打造一所与世界同步的高中', excerpt: '建桥融高坚持"融中西之长，导自主之行"的办学理念，为学生提供个性化的学术发展路径。', content: '建桥融高坚持"融中西之长，导自主之行"的办学理念，为学生提供个性化的学术发展路径。我们的课程体系紧扣时代脉搏，也尊重每位学生的成长节奏。', updatedAt: '2026-04-23T14:30:00+08:00' },
      { id: 'd2', planId: 'p1', taskId: 't2', platform: '小红书', group: '校园生活', status: 'review', title: '魔都绝美校园打卡：在建桥融高的日常是怎样的？', excerpt: '从极简主义的建筑设计到充满活力的多元社团，融高的每一角都充满了惊喜。', content: '从极简主义的建筑设计到充满活力的多元社团，融高的每一角都充满了惊喜。今天带大家深入体验融高学子的 24 小时。', updatedAt: '2026-04-22T09:15:00+08:00' },
      { id: 'd3', planId: 'p2', platform: '官方博客', group: '校长专栏', status: 'draft', title: '教育的本质是点燃：浅谈融合教育的底层逻辑', excerpt: '在这个瞬息万变的时代，教育不应只是知识的灌输。', content: '在这个瞬息万变的时代，教育不应只是知识的灌输。真正的教育，需要帮助学生建立对世界的理解力、对自我的驱动力，以及面对复杂问题的韧性。', updatedAt: '2026-04-20T10:12:00+08:00' },
    ],
  };
}

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    knowledgeEntries: data.knowledgeEntries ?? [],
    agentRuns: data.agentRuns ?? [],
    publishRecords: data.publishRecords ?? [],
    config: data.config ?? {
      llm: { provider: 'deepseek', apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
      imageGen: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-2' },
      videoGen: { provider: '', apiKey: '', baseUrl: '', model: '' },
    },
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await readFile(dataPath(), 'utf-8');
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    // First run: write seed data
    const seeded = defaultData();
    await saveData(seeded);
    return seeded;
  }
}

export async function saveData(data: AppData): Promise<void> {
  const target = dataPath();
  const tmp = `${target}.tmp`;

  // Ensure directory exists
  await mkdir(dirname(target), { recursive: true });

  const json = JSON.stringify(data, null, 2);
  await writeFile(tmp, json, 'utf-8');
  await rename(tmp, target);
}

export async function updateData<T>(
  fn: (data: AppData) => { data: AppData; result: T },
): Promise<T> {
  const operation = storeQueue.then(async () => {
    const current = await loadData();
    const cloned = JSON.parse(JSON.stringify(current)) as AppData;
    const { data, result } = fn(cloned);
    await saveData(data);
    return result;
  });

  storeQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}
