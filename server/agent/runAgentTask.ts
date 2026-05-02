import {
  AgentRun,
  AgentRunStatus,
  AgentRunStep,
  AgentTaskStatus,
  Draft,
} from '../../src/types';
import { loadData, updateData } from '../store';
import { loadAgentTaskContext } from './brandContext';
import { createDraftFromTaskContext } from './draftGenerator';
import { getLlmProvider } from '../llm';
import { getImageGenerator } from '../media/imageGen';

const IMAGE_CONTENT_TYPES = ['图文', '海报', '短视频'];

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function runAgentTask(
  taskId: string,
  options?: { generateImage?: boolean; imageSize?: string },
): Promise<AgentRun> {
  const runId = createId('agent-run');

  // Step 1: Load context and generate draft (may call LLM — do this OUTSIDE updateData)
  const currentData = await loadData();
  const context = loadAgentTaskContext(currentData, taskId, runId);

  const now = new Date().toISOString();
  const knowledge = context.knowledgeEntries;
  const storedConfig = currentData.config;
  const llmAvailable = Boolean(getLlmProvider(storedConfig?.llm));
  const imageGen = getImageGenerator(storedConfig?.imageGen);
  const needsImage = IMAGE_CONTENT_TYPES.includes(context.task.contentType || '');

  const steps: AgentRunStep[] = [];

  // Step 1: Load brand context
  steps.push({
    id: createId('step'),
    label: '加载品牌上下文',
    status: 'completed',
    message: `已加载品牌"${context.brand.name}"（${context.brand.industry}）、计划"${context.plan.title}"和 ${knowledge.length} 条品牌知识。`,
    startedAt: now,
    completedAt: now,
  });

  // Step 2: Analyze task brief
  const requirements = context.task.requirements?.length
    ? `执行要求：${context.task.requirements.join('；')}。`
    : '';
  const research = context.task.researchInstructions
    ? `调研指令：${context.task.researchInstructions}。`
    : '';
  steps.push({
    id: createId('step'),
    label: '分析任务 Brief',
    status: 'completed',
    message: [
      `目标渠道：${context.task.channel || '未指定'}`,
      `内容类型：${context.task.contentType || '未指定'}`,
      requirements,
      research,
      imageGen && needsImage ? '将同时生成配图。' : '',
    ].filter(Boolean).join('；'),
    startedAt: now,
    completedAt: now,
  });

  // Step 3: Generate text draft
  const draftInput = await createDraftFromTaskContext(context, storedConfig?.llm);

  steps.push({
    id: createId('step'),
    label: '生成内容草稿',
    status: 'completed',
    message: llmAvailable
      ? `已通过 LLM 生成${context.task.contentType || '内容'}草稿"${draftInput.title}"。`
      : `基于品牌语气"${context.brand.toneOfVoice || '专业、清晰'}"生成${context.task.contentType || '内容'}草稿"${draftInput.title}"（未配置 LLM，使用模板）。`,
    startedAt: now,
    completedAt: now,
  });

  // Step 4: Generate cover image (if applicable)
  let imageBase64: string | undefined;
  let imageAssetId: string | undefined;
  const imagePrompt = [
    `为品牌"${context.brand.name}"的内容创作一张配图。`,
    `品牌定位：${context.brand.positioning || context.brand.summary}`,
    `品牌风格：${context.brand.toneOfVoice || '专业、清晰'}`,
    `内容主题：${draftInput.title}`,
    context.task.brief ? `内容简介：${context.task.brief}` : '',
    `发布平台：${context.task.channel || '通用'}`,
    `图片用途：${context.task.contentType || '配图'}`,
    `要求：高质量、符合品牌调性、视觉吸引力强。`,
  ].filter(Boolean).join('\n');

  if (imageGen && needsImage && options?.generateImage !== false) {
    try {
      const result = await imageGen.generate({
        prompt: imagePrompt,
        size: options?.imageSize || '1024x1024',
        n: 1,
        quality: 'medium',
      });

      if (result.images.length > 0 && result.images[0].base64) {
        imageBase64 = result.images[0].base64;
        imageAssetId = createId('img');
        steps.push({
          id: createId('step'),
          label: '生成配图',
          status: 'completed',
          message: `已为"${draftInput.title}"生成 AI 配图。`,
          startedAt: now,
          completedAt: now,
        });
      }
    } catch (err) {
      steps.push({
        id: createId('step'),
        label: '生成配图',
        status: 'failed',
        message: `图片生成失败：${err instanceof Error ? err.message : '未知错误'}`,
        startedAt: now,
        completedAt: now,
      });
    }
  }

  // Persist everything atomically
  const result = await updateData((current) => {
    const draft: Draft = {
      id: createId('draft'),
      planId: draftInput.planId,
      taskId: draftInput.taskId,
      platform: draftInput.platform,
      group: draftInput.group,
      status: draftInput.status,
      title: draftInput.title,
      excerpt: draftInput.excerpt,
      content: draftInput.content,
      updatedAt: now,
      agentRunId: runId,
      contentType: context.task.contentType,
      assets: imageAssetId ? [imageAssetId] : [],
      coverImage: imageBase64 ? {
        base64: imageBase64,
        prompt: imagePrompt,
        size: options?.imageSize || '1024x1024',
        format: 'png' as const,
        generatedAt: now,
      } : undefined,
      sources: [{
        type: llmAvailable ? 'agent' : 'manual',
        agentRunId: runId,
        description: [
          llmAvailable ? '由 DeepSeek LLM 生成' : '由确定性模板生成（未配置 LLM）',
          imageBase64 ? '已生成 AI 配图' : '',
        ].filter(Boolean).join('，'),
      }],
    };
    current.drafts.unshift(draft);

    // Update task
    const task = current.planTasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'ready_for_review' as AgentTaskStatus;
      task.linkedDraftId = draft.id;
      task.linkedDraftIds = [...(task.linkedDraftIds ?? []), draft.id];
      task.agentRunId = runId;
    }

    // Create agent run record
    const agentRun: AgentRun = {
      id: runId,
      brandId: context.brand.id,
      taskId: context.task.id,
      status: 'waiting_for_review' as AgentRunStatus,
      currentStep: imageBase64 ? '生成配图' : '生成内容草稿',
      steps,
      usedKnowledgeEntryIds: knowledge.map((k) => k.id),
      usedAssetIds: imageAssetId ? [imageAssetId] : [],
      outputDraftId: draft.id,
      startedAt: now,
    };

    current.agentRuns.push(agentRun);

    return { data: current, result: agentRun };
  });

  return result;
}
