import type { ReviewPolicy, PublishRecord } from '../../src/types';
import type { PublishInput, PublishResult, ExportPackage } from './types';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * 审核策略优先级：任务策略 > 计划策略 > 品牌默认策略
 */
export function resolveReviewPolicy(input: {
  taskPolicy?: ReviewPolicy;
  planPolicy?: ReviewPolicy;
  brandPolicy: ReviewPolicy;
}): ReviewPolicy {
  return input.taskPolicy ?? input.planPolicy ?? input.brandPolicy;
}

/**
 * 模拟发布：只记录发布结果，不调用外部平台
 */
export function simulatePublish(input: PublishInput): PublishResult {
  const now = new Date().toISOString();

  // 解析有效审核策略
  const effectivePolicy = resolveReviewPolicy({
    taskPolicy: input.taskReviewPolicy as ReviewPolicy | undefined,
    planPolicy: input.planReviewPolicy as ReviewPolicy | undefined,
    brandPolicy: input.brandReviewPolicy as ReviewPolicy,
  });

  // auto_if_low_risk 场景的自动发布判断
  // 当前模拟发布中直接允许；生产环境应检查 qualityChecks
  const canAutoPublish =
    effectivePolicy === 'auto_publish' ||
    effectivePolicy === 'auto_if_low_risk';

  if (input.draft.status !== 'ready' && !canAutoPublish) {
    throw new Error('只有已批准的草稿才能发布。');
  }

  const record: PublishRecord = {
    id: createId('pub'),
    draftId: input.draft.id,
    taskId: input.draft.taskId,
    planId: input.draft.planId,
    platform: input.draft.platform,
    status: 'published',
    title: input.draft.title,
    content: input.draft.content,
    excerpt: input.draft.excerpt,
    publishedAt: now,
  };

  return {
    record,
    taskStatus: 'published',
  };
}

/**
 * 导出草稿为发布包
 */
export function exportDraft(input: PublishInput): ExportPackage {
  const platformNotes: Record<string, string> = {
    '微信公众号': '建议通过微信公众号后台"素材管理"上传，设置定时发布。',
    '小红书': '建议通过小红书创作者中心发布，注意图片尺寸 3:4。',
    '抖音': '建议通过抖音创作者服务平台上传，选择合适的话题标签。',
    '视频号': '建议通过微信视频号助手发布。',
    '官方博客': '建议通过网站后台 CMS 发布。',
  };

  return {
    title: input.draft.title,
    platform: input.draft.platform,
    group: input.draft.group,
    excerpt: input.draft.excerpt,
    content: input.draft.content,
    publishedAt: new Date().toISOString(),
    assets: [],
    platformNote: platformNotes[input.draft.platform] || '请通过相应平台后台发布。',
  };
}
