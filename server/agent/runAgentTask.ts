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

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function runAgentTask(taskId: string): Promise<AgentRun> {
  const runId = createId('agent-run');

  // Step 1: Load context and generate draft (may call LLM — do this OUTSIDE updateData)
  const currentData = await loadData();
  const context = loadAgentTaskContext(currentData, taskId, runId);

  const now = new Date().toISOString();
  const knowledge = context.knowledgeItems;
  const llmAvailable = Boolean(getLlmProvider());

  const step1: AgentRunStep = {
    id: createId('step'),
    label: '加载品牌上下文',
    status: 'completed',
    message: `已加载品牌"${context.brand.name}"（${context.brand.industry}）、计划"${context.plan.title}"和 ${knowledge.length} 条品牌知识。`,
    startedAt: now,
    completedAt: now,
  };

  const requirements = context.task.requirements?.length
    ? `执行要求：${context.task.requirements.join('；')}。`
    : '';
  const research = context.task.researchInstructions
    ? `调研指令：${context.task.researchInstructions}。`
    : '';
  const step2: AgentRunStep = {
    id: createId('step'),
    label: '分析任务 Brief',
    status: 'completed',
    message: [
      `目标渠道：${context.task.channel || '未指定'}`,
      `内容类型：${context.task.contentType || '未指定'}`,
      requirements,
      research,
    ].filter(Boolean).join('；'),
    startedAt: now,
    completedAt: now,
  };

  // Generate draft (async — calls LLM if configured)
  const draftInput = await createDraftFromTaskContext(context);

  const step3: AgentRunStep = {
    id: createId('step'),
    label: '生成内容草稿',
    status: 'completed',
    message: llmAvailable
      ? `已通过 LLM 生成${context.task.contentType || '内容'}草稿"${draftInput.title}"。`
      : `基于品牌语气"${context.brand.toneOfVoice || '专业、清晰'}"生成${context.task.contentType || '内容'}草稿"${draftInput.title}"（未配置 LLM，使用模板）。`,
    startedAt: now,
    completedAt: now,
  };

  // Step 2: Persist everything atomically
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
      sources: [{
        type: llmAvailable ? 'agent' : 'manual',
        agentRunId: runId,
        description: llmAvailable
          ? '由 DeepSeek LLM 生成'
          : '由确定性模板生成（未配置 LLM）',
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
      currentStep: '生成内容草稿',
      steps: [step1, step2, step3],
      usedKnowledgeItemIds: knowledge.map((k) => k.id),
      usedAssetIds: [],
      outputDraftId: draft.id,
      startedAt: now,
    };

    current.agentRuns.push(agentRun);

    return { data: current, result: agentRun };
  });

  return result;
}
