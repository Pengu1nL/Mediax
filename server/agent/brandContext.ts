import type { AppData } from '../../src/types';
import type { AgentTaskContext } from './types';

export function loadAgentTaskContext(
  data: AppData,
  taskId: string,
  agentRunId: string,
): AgentTaskContext {
  const task = data.planTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('未找到对应的任务。');

  const plan = data.plans.find((p) => p.id === task.planId);
  if (!plan) throw new Error('未找到关联的计划。');

  const brand = data.brand;
  const knowledgeEntries = data.knowledgeEntries.filter((k) => k.brandId === brand.id);

  return { brand, plan, task, knowledgeEntries, agentRunId };
}
