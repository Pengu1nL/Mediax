import { createSeedAppData } from '../constants';
import {
  AppData,
  Asset,
  BrandKnowledgeItem,
  BrandProfile,
  Draft,
  DraftStatus,
  ExecutionType,
  KnowledgeContentType,
  KnowledgeSourceType,
  LoginCredentials,
  Plan,
  PlanStatus,
  PlanTask,
  AgentTaskStatus,
  SessionUser,
  AutomationLevel,
  ReviewPolicy,
} from '../types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CreatePlanInput {
  title: string;
  category?: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  brandId?: string;
  objective?: string;
  audience?: string;
  channels?: string[];
  successMetrics?: string[];
  automationLevel?: AutomationLevel;
  reviewPolicy?: ReviewPolicy;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {}

export interface CreatePlanTaskInput {
  title: string;
  subtitle?: string;
  executionType: ExecutionType;
  schedule: string;
  status: AgentTaskStatus;
  linkedDraftId?: string;
  brandId?: string;
  brief?: string;
  channel?: string;
  contentType?: string;
  requirements?: string[];
  researchInstructions?: string;
  assetScope?: string[];
  reviewPolicy?: ReviewPolicy;
  publishPolicy?: ReviewPolicy;
  linkedDraftIds?: string[];
  agentRunId?: string;
  publishSchedule?: string;
}

export interface UpdatePlanTaskInput extends Partial<CreatePlanTaskInput> {}

export interface CreateDraftInput {
  planId?: string;
  taskId?: string;
  platform: string;
  group: string;
  status: DraftStatus;
  title: string;
  excerpt: string;
  content: string;
}

export interface UpdateDraftInput extends Partial<CreateDraftInput> {}

export interface CreateKnowledgeItemInput {
  brandId: string;
  sourceType: KnowledgeSourceType;
  sourceName: string;
  sourceUri?: string;
  contentType: KnowledgeContentType;
  summary: string;
  tags: string[];
  extractedText?: string;
  assetIds: string[];
  confidence: number;
}

export interface BrandRepository {
  getProfile(): Promise<BrandProfile>;
  saveProfile(profile: BrandProfile): Promise<BrandProfile>;
}

export interface AssetRepository {
  getAssets(): Promise<Asset[]>;
}

export interface PlanRepository {
  getPlans(): Promise<Plan[]>;
  getPlanById(planId: string): Promise<Plan | undefined>;
  getAllTasks(): Promise<PlanTask[]>;
  getTasksByPlanId(planId: string): Promise<PlanTask[]>;
  createPlan(input: CreatePlanInput): Promise<Plan>;
  updatePlan(planId: string, input: UpdatePlanInput): Promise<Plan>;
  deletePlan(planId: string): Promise<void>;
  createTask(planId: string, input: CreatePlanTaskInput): Promise<PlanTask>;
  updateTask(planId: string, taskId: string, input: UpdatePlanTaskInput): Promise<PlanTask>;
  deleteTask(planId: string, taskId: string): Promise<void>;
}

export interface DraftRepository {
  getDrafts(): Promise<Draft[]>;
  getDraftById(draftId: string): Promise<Draft | undefined>;
  createDraft(input: CreateDraftInput): Promise<Draft>;
  updateDraft(draftId: string, input: UpdateDraftInput): Promise<Draft>;
}

export interface KnowledgeRepository {
  getKnowledgeItems(brandId: string): Promise<BrandKnowledgeItem[]>;
  createKnowledgeItem(input: CreateKnowledgeItemInput): Promise<BrandKnowledgeItem>;
}

export interface SessionRepository {
  getCurrentUser(): Promise<SessionUser | null>;
  login(credentials: LoginCredentials): Promise<SessionUser>;
  logout(): Promise<void>;
}

export interface AppRepositories {
  brand: BrandRepository;
  assets: AssetRepository;
  knowledge: KnowledgeRepository;
  plans: PlanRepository;
  drafts: DraftRepository;
  session: SessionRepository;
}

const DATA_KEY = 'mediax.app-data.v1';
const SESSION_KEY = 'mediax.session.v1';

function clone<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeExcerpt(input: { excerpt: string; content: string }): string {
  const excerpt = input.excerpt.trim();
  if (excerpt) {
    return excerpt;
  }
  return input.content.trim().slice(0, 80);
}

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    knowledgeItems: data.knowledgeItems ?? [],
  };
}

function createStore(storage: StorageLike) {
  const read = <T>(key: string): T | null => {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  };

  const write = <T>(key: string, value: T) => {
    storage.setItem(key, JSON.stringify(value));
  };

  const readData = (): AppData => {
    const existing = read<AppData>(DATA_KEY);
    if (existing) {
      return normalizeData(existing);
    }

    const seeded = createSeedAppData();
    write(DATA_KEY, seeded);
    return seeded;
  };

  const updateData = <T>(updater: (current: AppData) => { next: AppData; result: T }): T => {
    const current = clone(readData());
    const { next, result } = updater(current);
    write(DATA_KEY, next);
    return result;
  };

  return {
    readData,
    updateData,
    readSession: () => read<SessionUser>(SESSION_KEY),
    writeSession: (user: SessionUser | null) => {
      if (user) {
        write(SESSION_KEY, user);
        return;
      }
      storage.removeItem(SESSION_KEY);
    },
  };
}

export function createLocalStorageRepositories(storage: StorageLike): AppRepositories {
  const store = createStore(storage);

  return {
    brand: {
      async getProfile() {
        return clone(store.readData().brand);
      },
      async saveProfile(profile) {
        return store.updateData((current) => {
          current.brand = clone(profile);
          return { next: current, result: current.brand };
        });
      },
    },
    assets: {
      async getAssets() {
        return clone(store.readData().assets);
      },
    },
    knowledge: {
      async getKnowledgeItems(brandId) {
        return clone(store.readData().knowledgeItems.filter((item) => item.brandId === brandId));
      },
      async createKnowledgeItem(input) {
        return store.updateData((current) => {
          const now = new Date().toISOString();
          const item: BrandKnowledgeItem = {
            id: createId('knowledge'),
            brandId: input.brandId,
            sourceType: input.sourceType,
            sourceName: input.sourceName,
            sourceUri: input.sourceUri,
            contentType: input.contentType,
            status: 'ready',
            summary: input.summary,
            tags: input.tags,
            extractedText: input.extractedText,
            assetIds: input.assetIds,
            confidence: input.confidence,
            createdAt: now,
            updatedAt: now,
          };

          current.knowledgeItems.unshift(item);
          return { next: current, result: item };
        });
      },
    },
    plans: {
      async getPlans() {
        return clone(store.readData().plans);
      },
      async getPlanById(planId) {
        return clone(store.readData().plans.find((plan) => plan.id === planId));
      },
      async getAllTasks() {
        return clone(store.readData().planTasks);
      },
      async getTasksByPlanId(planId) {
        return clone(store.readData().planTasks.filter((task) => task.planId === planId));
      },
      async createPlan(input) {
        return store.updateData((current) => {
          const plan: Plan = {
            id: createId('plan'),
            title: input.title,
            category: input.category,
            status: input.status,
            startDate: input.startDate,
            endDate: input.endDate,
            brandId: input.brandId,
            objective: input.objective,
            audience: input.audience,
            channels: input.channels,
            successMetrics: input.successMetrics,
            automationLevel: input.automationLevel,
            reviewPolicy: input.reviewPolicy,
          };
          current.plans.unshift(plan);
          return { next: current, result: plan };
        });
      },
      async updatePlan(planId, input) {
        return store.updateData((current) => {
          const plan = current.plans.find((item) => item.id === planId);
          if (!plan) {
            throw new Error('未找到对应的发布计划。');
          }

          Object.assign(plan, input);
          return { next: current, result: plan };
        });
      },
      async deletePlan(planId) {
        store.updateData((current) => {
          const taskIds = current.planTasks.filter((task) => task.planId === planId).map((task) => task.id);

          current.plans = current.plans.filter((plan) => plan.id !== planId);
          current.planTasks = current.planTasks.filter((task) => task.planId !== planId);
          current.drafts = current.drafts.map((draft) =>
            taskIds.includes(draft.taskId ?? '') || draft.planId === planId
              ? {
                  ...draft,
                  planId: undefined,
                  taskId: undefined,
                }
              : draft,
          );

          return { next: current, result: undefined };
        });
      },
      async createTask(planId, input) {
        return store.updateData((current) => {
          const planExists = current.plans.some((plan) => plan.id === planId);
          if (!planExists) {
            throw new Error('无法为不存在的计划创建任务。');
          }

          if (!input.brief?.trim()) {
            throw new Error('任务 brief 不能为空。');
          }
          if (!input.channel?.trim()) {
            throw new Error('任务渠道不能为空。');
          }
          if (!input.contentType?.trim()) {
            throw new Error('任务内容类型不能为空。');
          }

          const task: PlanTask = {
            id: createId('task'),
            planId,
            title: input.title,
            subtitle: input.subtitle,
            executionType: input.executionType,
            schedule: input.schedule,
            status: input.status,
            linkedDraftId: input.linkedDraftId,
            brandId: input.brandId,
            brief: input.brief,
            channel: input.channel,
            contentType: input.contentType,
            requirements: input.requirements,
            researchInstructions: input.researchInstructions,
            assetScope: input.assetScope,
            reviewPolicy: input.reviewPolicy,
            publishPolicy: input.publishPolicy,
            linkedDraftIds: input.linkedDraftIds,
            agentRunId: input.agentRunId,
            publishSchedule: input.publishSchedule,
          };

          current.planTasks.push(task);
          return { next: current, result: task };
        });
      },
      async updateTask(planId, taskId, input) {
        return store.updateData((current) => {
          const task = current.planTasks.find((item) => item.id === taskId && item.planId === planId);
          if (!task) {
            throw new Error('未找到对应的任务。');
          }

          Object.assign(task, input);
          return { next: current, result: task };
        });
      },
      async deleteTask(planId, taskId) {
        store.updateData((current) => {
          current.planTasks = current.planTasks.filter((task) => !(task.id === taskId && task.planId === planId));
          current.drafts = current.drafts.map((draft) =>
            draft.taskId === taskId
              ? {
                  ...draft,
                  taskId: undefined,
                }
              : draft,
          );
          return { next: current, result: undefined };
        });
      },
    },
    drafts: {
      async getDrafts() {
        return clone(store.readData().drafts).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      },
      async getDraftById(draftId) {
        return clone(store.readData().drafts.find((draft) => draft.id === draftId));
      },
      async createDraft(input) {
        return store.updateData((current) => {
          const draft: Draft = {
            id: createId('draft'),
            planId: input.planId,
            taskId: input.taskId,
            platform: input.platform,
            group: input.group,
            status: input.status,
            title: input.title,
            excerpt: normalizeExcerpt(input),
            content: input.content,
            updatedAt: new Date().toISOString(),
          };

          current.drafts.unshift(draft);
          return { next: current, result: draft };
        });
      },
      async updateDraft(draftId, input) {
        return store.updateData((current) => {
          const draft = current.drafts.find((item) => item.id === draftId);
          if (!draft) {
            throw new Error('未找到对应的草稿。');
          }

          Object.assign(draft, input);
          draft.excerpt = normalizeExcerpt({
            excerpt: draft.excerpt,
            content: draft.content,
          });
          draft.updatedAt = new Date().toISOString();
          return { next: current, result: draft };
        });
      },
    },
    session: {
      async getCurrentUser() {
        return clone(store.readSession());
      },
      // Stub: in production, auth is handled by the API server.
      // This is kept for test compatibility and accepts any credentials.
      async login(_credentials: LoginCredentials) {
        const user: SessionUser = {
          id: 'admin-1',
          name: 'Mediax Admin',
          email: 'admin@mediax.local',
          role: 'admin',
        };
        store.writeSession(user);
        return clone(user);
      },
      async logout() {
        store.writeSession(null);
      },
    },
  };
}
