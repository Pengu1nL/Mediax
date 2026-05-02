import { BrandProfile, KnowledgeEntry, Plan, PlanTask } from '../../src/types';

export interface AgentTaskContext {
  brand: BrandProfile;
  plan: Plan;
  task: PlanTask;
  knowledgeEntries: KnowledgeEntry[];
  agentRunId: string;
}
