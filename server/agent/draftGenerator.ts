import type { DraftStatus } from '../../src/types';
import type { AgentTaskContext } from './types';

export interface CreateDraftInput {
  planId: string;
  taskId: string;
  agentRunId: string;
  platform: string;
  group: string;
  status: DraftStatus;
  title: string;
  excerpt: string;
  content: string;
}

export function createDraftFromTaskContext(context: AgentTaskContext): CreateDraftInput {
  const tone = context.brand.toneOfVoice || '专业、清晰';
  return {
    planId: context.plan.id,
    taskId: context.task.id,
    agentRunId: context.agentRunId,
    platform: context.task.channel || '微信公众号',
    group: context.task.contentType || '未分组',
    status: 'review',
    title: context.task.title,
    excerpt: (context.task.brief || context.task.title).slice(0, 80),
    content: `以${tone}的语气，为${context.brand.name}创作：\n\n${context.task.brief || context.task.title}`,
  };
}
