import { createSeedAppData, DEFAULT_ADMIN_CREDENTIALS } from '../constants';
import {
  AppData,
  Asset,
  BrandProfile,
  Draft,
  DraftStatus,
  ExecutionType,
  LoginCredentials,
  Plan,
  PlanStatus,
  PlanTask,
  PlanTaskStatus,
  SessionUser,
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
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {}

export interface CreatePlanTaskInput {
  title: string;
  subtitle?: string;
  executionType: ExecutionType;
  schedule: string;
  status: PlanTaskStatus;
  linkedDraftId?: string;
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

export interface BrandRepository {
  getProfile(): BrandProfile;
  saveProfile(profile: BrandProfile): BrandProfile;
}

export interface AssetRepository {
  getAssets(): Asset[];
}

export interface PlanRepository {
  getPlans(): Plan[];
  getPlanById(planId: string): Plan | undefined;
  getAllTasks(): PlanTask[];
  getTasksByPlanId(planId: string): PlanTask[];
  createPlan(input: CreatePlanInput): Plan;
  updatePlan(planId: string, input: UpdatePlanInput): Plan;
  deletePlan(planId: string): void;
  createTask(planId: string, input: CreatePlanTaskInput): PlanTask;
  updateTask(planId: string, taskId: string, input: UpdatePlanTaskInput): PlanTask;
  deleteTask(planId: string, taskId: string): void;
}

export interface DraftRepository {
  getDrafts(): Draft[];
  getDraftById(draftId: string): Draft | undefined;
  createDraft(input: CreateDraftInput): Draft;
  updateDraft(draftId: string, input: UpdateDraftInput): Draft;
}

export interface SessionRepository {
  getCurrentUser(): SessionUser | null;
  login(credentials: LoginCredentials): SessionUser;
  logout(): void;
}

export interface AppRepositories {
  brand: BrandRepository;
  assets: AssetRepository;
  plans: PlanRepository;
  drafts: DraftRepository;
  session: SessionRepository;
}

const DATA_KEY = 'mediax.app-data.v1';
const SESSION_KEY = 'mediax.session.v1';

const ADMIN_USER: SessionUser = {
  id: 'admin-1',
  name: 'Mediax Admin',
  email: DEFAULT_ADMIN_CREDENTIALS.email,
  role: 'admin',
};

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
      return existing;
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
      getProfile() {
        return clone(store.readData().brand);
      },
      saveProfile(profile) {
        return store.updateData((current) => {
          current.brand = clone(profile);
          return { next: current, result: current.brand };
        });
      },
    },
    assets: {
      getAssets() {
        return clone(store.readData().assets);
      },
    },
    plans: {
      getPlans() {
        return clone(store.readData().plans);
      },
      getPlanById(planId) {
        return clone(store.readData().plans.find((plan) => plan.id === planId));
      },
      getAllTasks() {
        return clone(store.readData().planTasks);
      },
      getTasksByPlanId(planId) {
        return clone(store.readData().planTasks.filter((task) => task.planId === planId));
      },
      createPlan(input) {
        return store.updateData((current) => {
          const plan: Plan = {
            id: createId('plan'),
            title: input.title,
            category: input.category,
            status: input.status,
            startDate: input.startDate,
            endDate: input.endDate,
          };
          current.plans.unshift(plan);
          return { next: current, result: plan };
        });
      },
      updatePlan(planId, input) {
        return store.updateData((current) => {
          const plan = current.plans.find((item) => item.id === planId);
          if (!plan) {
            throw new Error('未找到对应的发布计划。');
          }

          Object.assign(plan, input);
          return { next: current, result: plan };
        });
      },
      deletePlan(planId) {
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
      createTask(planId, input) {
        return store.updateData((current) => {
          const planExists = current.plans.some((plan) => plan.id === planId);
          if (!planExists) {
            throw new Error('无法为不存在的计划创建任务。');
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
          };

          current.planTasks.push(task);
          return { next: current, result: task };
        });
      },
      updateTask(planId, taskId, input) {
        return store.updateData((current) => {
          const task = current.planTasks.find((item) => item.id === taskId && item.planId === planId);
          if (!task) {
            throw new Error('未找到对应的任务。');
          }

          Object.assign(task, input);
          return { next: current, result: task };
        });
      },
      deleteTask(planId, taskId) {
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
      getDrafts() {
        return clone(store.readData().drafts).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      },
      getDraftById(draftId) {
        return clone(store.readData().drafts.find((draft) => draft.id === draftId));
      },
      createDraft(input) {
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
      updateDraft(draftId, input) {
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
      getCurrentUser() {
        return clone(store.readSession());
      },
      login(credentials) {
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password.trim();

        if (
          email !== DEFAULT_ADMIN_CREDENTIALS.email ||
          password !== DEFAULT_ADMIN_CREDENTIALS.password
        ) {
          throw new Error('邮箱或密码不正确。');
        }

        store.writeSession(ADMIN_USER);
        return clone(ADMIN_USER);
      },
      logout() {
        store.writeSession(null);
      },
    },
  };
}
