import { BrandProfile, BrandKnowledgeItem, Plan, PlanTask } from '../../src/types';

export interface AgentTaskContext {
  brand: BrandProfile;
  plan: Plan;
  task: PlanTask;
  knowledgeItems: BrandKnowledgeItem[];
  agentRunId: string;
}
