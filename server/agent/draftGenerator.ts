import type { DraftStatus, LlmConfig } from '../../src/types';
import type { AgentTaskContext } from './types';
import { getLlmProvider } from '../llm';

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

function buildSystemPrompt(context: AgentTaskContext): string {
  const brand = context.brand;
  const task = context.task;
  const knowledge = context.knowledgeItems;

  const parts = [
    `你是品牌"${brand.name}"的内容创作助手。`,
    '',
    `【品牌信息】`,
    `- 名称：${brand.name}`,
    `- 行业：${brand.industry}`,
    brand.positioning ? `- 品牌定位：${brand.positioning}` : '',
    brand.toneOfVoice ? `- 品牌语气：${brand.toneOfVoice}` : '',
    brand.audience ? `- 目标受众：${brand.audience}` : '',
    brand.summary ? `- 品牌简介：${brand.summary}` : '',
  ];

  if (brand.doAndDonts && brand.doAndDonts.length > 0) {
    parts.push('');
    parts.push('【表达规范】');
    brand.doAndDonts.forEach((rule) => parts.push(`- ${rule}`));
  }

  if (knowledge.length > 0) {
    parts.push('');
    parts.push('【品牌知识库】');
    knowledge.forEach((k) => parts.push(`- ${k.summary}`));
  }

  parts.push('');
  parts.push('【创作要求】');
  parts.push(`- 严格遵循品牌语气${brand.toneOfVoice ? `（${brand.toneOfVoice}）` : ''}`);
  parts.push(`- 内容适合发布到${task.channel || '指定平台'}，格式为${task.contentType || '通用内容'}`);
  parts.push('- 标题需要吸引目标受众，正文结构清晰、有可读性');
  if (task.requirements && task.requirements.length > 0) {
    task.requirements.forEach((r) => parts.push(`- ${r}`));
  }

  return parts.filter(Boolean).join('\n');
}

function buildUserPrompt(context: AgentTaskContext): string {
  const task = context.task;
  const lines = [
    `请为以下任务创作内容：`,
    '',
    `任务标题：${task.title}`,
    `任务 Brief：${task.brief || task.title}`,
    `发布渠道：${task.channel || '未指定'}`,
    `内容类型：${task.contentType || '未指定'}`,
    '',
    `请按照以下格式输出：`,
    ``,
    `【标题】`,
    `（一个吸引人的标题）`,
    ``,
    `【正文】`,
    `（完整的内容正文）`,
    ``,
    `【摘要】`,
    `（一句话摘要，不超过80字）`,
  ];

  if (task.researchInstructions) {
    lines.push('');
    lines.push(`参考以下调研信息：${task.researchInstructions}`);
  }

  return lines.join('\n');
}

interface ParsedOutput {
  title: string;
  content: string;
  excerpt: string;
}

function parseLlmOutput(raw: string): ParsedOutput {
  // Remove ​ thinking tags if present (DeepSeek R1 style)
  const cleaned = raw.replace(/<思考>[\s\S]*?<\/思考>/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const titleMatch = cleaned.match(/【标题】\s*(.+?)(?=\n【正文】|\n【摘要】|$)/s);
  const contentMatch = cleaned.match(/【正文】\s*([\s\S]*?)(?=\n【摘要】|$)/);
  const excerptMatch = cleaned.match(/【摘要】\s*(.+?)$/s);

  return {
    title: titleMatch?.[1]?.trim() || '未生成标题',
    content: contentMatch?.[1]?.trim() || cleaned,
    excerpt: excerptMatch?.[1]?.trim().slice(0, 80) || (contentMatch?.[1]?.trim().slice(0, 80) || ''),
  };
}

/**
 * 从 AgentTaskContext 生成内容草稿。
 * 如果配置了 LLM（DeepSeek），则调用 API 生成；
 * 否则使用确定性模板作为 fallback。
 */
export async function createDraftFromTaskContext(context: AgentTaskContext, llmConfig?: LlmConfig): Promise<CreateDraftInput> {
  const llm = getLlmProvider(llmConfig);

  let title: string;
  let content: string;
  let excerpt: string;

  if (llm) {
    try {
      const systemPrompt = buildSystemPrompt(context);
      const userPrompt = buildUserPrompt(context);

      const rawOutput = await llm.generate({
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
        temperature: 0.7,
      });

      const parsed = parseLlmOutput(rawOutput);
      title = parsed.title;
      content = parsed.content;
      excerpt = parsed.excerpt;
    } catch (err) {
      // LLM 调用失败时回退到确定性生成
      console.error('LLM 生成失败，使用 fallback:', err);
      const fallback = createFallbackDraft(context);
      title = fallback.title;
      content = fallback.content;
      excerpt = fallback.excerpt;
    }
  } else {
    const fallback = createFallbackDraft(context);
    title = fallback.title;
    content = fallback.content;
    excerpt = fallback.excerpt;
  }

  return {
    planId: context.plan.id,
    taskId: context.task.id,
    agentRunId: context.agentRunId,
    platform: context.task.channel || '微信公众号',
    group: context.task.contentType || '未分组',
    status: 'review',
    title,
    excerpt,
    content,
  };
}

/** 确定性 fallback：当 LLM 不可用时使用 */
function createFallbackDraft(context: AgentTaskContext): { title: string; content: string; excerpt: string } {
  const tone = context.brand.toneOfVoice || '专业、清晰';
  return {
    title: context.task.title,
    excerpt: (context.task.brief || context.task.title).slice(0, 80),
    content: `以${tone}的语气，为${context.brand.name}创作：\n\n${context.task.brief || context.task.title}`,
  };
}
