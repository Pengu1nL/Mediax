import { AppData, Asset, BrandProfile, Draft, Plan, PlanTask } from './types';

export const SEED_ASSETS: Asset[] = [
  {
    id: 'f1',
    name: '2024 春季营销中心',
    type: 'folder',
    size: '124 项目',
    updatedAt: '1小时前',
    thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f2',
    name: '品牌核心资源库',
    type: 'folder',
    size: '45 项目',
    updatedAt: '昨天',
    thumbnail: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f3',
    name: '小红书投放素材',
    type: 'folder',
    size: '89 项目',
    updatedAt: '2天前',
    thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f4',
    name: '极简视觉指南',
    type: 'folder',
    size: '12 项目',
    updatedAt: '3天前',
    thumbnail: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f5',
    name: '未修图原片',
    type: 'folder',
    size: '234 项目',
    updatedAt: '4天前',
    thumbnail: 'https://images.unsplash.com/photo-1492691523567-627a92ad1ab?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f6',
    name: '视频剪辑素材',
    type: 'folder',
    size: '18 项目',
    updatedAt: '5天前',
    thumbnail: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f7',
    name: '字体与排版',
    type: 'folder',
    size: '67 项目',
    updatedAt: '1周前',
    thumbnail: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'f8',
    name: '归档资产 2023',
    type: 'folder',
    size: '512 项目',
    updatedAt: '1周前',
    thumbnail: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&q=80&w=400',
  },
];

export const SEED_BRAND_PROFILE: BrandProfile = {
  id: 'brand-1',
  name: '上海建桥融高',
  industry: '教育 / 民办高中',
  website: 'http://www.jianqiaosh.com',
  establishedAt: '2022年',
  keywords: ['融合教育', '国际视野', '临港', '民办高中'],
  summary:
    '上海建桥融高是一所位于上海市临港的民办高中，致力于融合世界先进教育理念，培养具有家国情怀、国际视野、身心健康、学业优异的复合型人才。',
  audience: '关注融合教育和国际化升学路径的学生家庭',
  positioning: '临港区域融合教育品牌',
  toneOfVoice: '专业、可信、温暖、有教育理想',
  doAndDonts: ['避免制造升学焦虑', '避免未经证实的升学承诺'],
  defaultReviewPolicy: 'manual_required',
  setupComplete: false,
  channels: [
    { id: 'c1', name: '微信公众号', handle: '@建桥融高', kind: 'wechat', active: true },
    { id: 'c2', name: '小红书', handle: '@建桥融高', kind: 'xiaohongshu', active: true },
    { id: 'c3', name: '抖音', handle: '@建桥融高', kind: 'douyin', active: true },
    { id: 'c4', name: '视频号', handle: '@建桥融高Plus', kind: 'video', active: true },
  ],
};

export const SEED_PLANS: Plan[] = [
  {
    id: 'p1',
    title: '2024 秋季招生全案宣发',
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    category: '招生季',
  },
  {
    id: 'p2',
    title: '建桥融高一周年校庆策划',
    status: 'draft',
    startDate: '2026-01-05',
    endDate: '2026-01-20',
    category: '校庆',
  },
  {
    id: 'p3',
    title: '临港教育创新峰会展示',
    status: 'completed',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    category: '峰会',
  },
];

export const SEED_PLAN_TASKS: PlanTask[] = [
  {
    id: 't1',
    planId: 'p1',
    title: '主视觉海报发布 - 微信公众号',
    subtitle: '关联 KV 视觉规范',
    executionType: 'single',
    schedule: '2026-09-01 10:00',
    status: 'completed',
    linkedDraftId: 'd1',
  },
  {
    id: 't2',
    planId: 'p1',
    title: '小红书达人预热种草',
    subtitle: '标签：#秋招 #校园生活',
    executionType: 'recurring',
    schedule: '2026-09-05 - 2026-09-15 (18:00)',
    status: 'active',
    linkedDraftId: 'd2',
  },
  {
    id: 't3',
    planId: 'p1',
    title: '抖音直播专场 - 品牌日',
    subtitle: '需要确认直播排期',
    executionType: 'single',
    schedule: '2026-09-20 20:00',
    status: 'pending',
  },
];

export const SEED_DRAFTS: Draft[] = [
  {
    id: 'd1',
    planId: 'p1',
    taskId: 't1',
    platform: '微信公众号',
    group: '品牌宣传',
    status: 'ready',
    title: '【走进融高】在临港，打造一所与世界同步的高中',
    excerpt: '建桥融高坚持“融中西之长，导自主之行”的办学理念，为学生提供个性化的学术发展路径。',
    content:
      '建桥融高坚持“融中西之长，导自主之行”的办学理念，为学生提供个性化的学术发展路径。我们的课程体系紧扣时代脉搏，也尊重每位学生的成长节奏。',
    updatedAt: '2026-04-23T14:30:00+08:00',
  },
  {
    id: 'd2',
    planId: 'p1',
    taskId: 't2',
    platform: '小红书',
    group: '校园生活',
    status: 'review',
    title: '魔都绝美校园打卡：在建桥融高的日常是怎样的？',
    excerpt: '从极简主义的建筑设计到充满活力的多元社团，融高的每一角都充满了惊喜。',
    content:
      '从极简主义的建筑设计到充满活力的多元社团，融高的每一角都充满了惊喜。今天带大家深入体验融高学子的 24 小时。',
    updatedAt: '2026-04-22T09:15:00+08:00',
  },
  {
    id: 'd3',
    planId: 'p2',
    platform: '官方博客',
    group: '校长专栏',
    status: 'draft',
    title: '教育的本质是点燃：浅谈融合教育的底层逻辑',
    excerpt: '在这个瞬息万变的时代，教育不应只是知识的灌输。',
    content:
      '在这个瞬息万变的时代，教育不应只是知识的灌输。真正的教育，需要帮助学生建立对世界的理解力、对自我的驱动力，以及面对复杂问题的韧性。',
    updatedAt: '2026-04-20T10:12:00+08:00',
  },
];

export function createSeedAppData(): AppData {
  return {
    brand: structuredClone(SEED_BRAND_PROFILE),
    assets: structuredClone(SEED_ASSETS),
    plans: structuredClone(SEED_PLANS),
    planTasks: structuredClone(SEED_PLAN_TASKS),
    drafts: structuredClone(SEED_DRAFTS),
  };
}
