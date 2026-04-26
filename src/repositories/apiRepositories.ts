import {
  AgentRun,
  AppData,
  Asset,
  BrandKnowledgeItem,
  BrandProfile,
  Draft,
  LoginCredentials,
  Plan,
  PlanTask,
  SessionUser,
} from '../types';
import { apiClient } from '../api/client';
import type {
  CreateDraftInput,
  CreateKnowledgeItemInput,
  CreatePlanInput,
  CreatePlanTaskInput,
  UpdateDraftInput,
  UpdatePlanInput,
  UpdatePlanTaskInput,
} from './localStorageRepositories';

export interface ApiSessionRepository {
  getCurrentUser(): Promise<SessionUser | null>;
  login(credentials: LoginCredentials): Promise<SessionUser>;
  logout(): Promise<void>;
}

export interface ApiBrandRepository {
  getProfile(): Promise<BrandProfile>;
  saveProfile(profile: BrandProfile): Promise<BrandProfile>;
}

export interface ApiAssetRepository {
  getAssets(): Promise<Asset[]>;
}

export interface ApiKnowledgeRepository {
  getKnowledgeItems(brandId: string): Promise<BrandKnowledgeItem[]>;
  createKnowledgeItem(input: CreateKnowledgeItemInput): Promise<BrandKnowledgeItem>;
}

export interface ApiPlanRepository {
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

export interface ApiDraftRepository {
  getDrafts(): Promise<Draft[]>;
  getDraftById(draftId: string): Promise<Draft | undefined>;
  createDraft(input: CreateDraftInput): Promise<Draft>;
  updateDraft(draftId: string, input: UpdateDraftInput): Promise<Draft>;
  approveDraft(draftId: string, note?: string): Promise<Draft>;
  rejectDraft(draftId: string, note: string): Promise<Draft>;
  requestRegeneration(draftId: string, note: string): Promise<Draft>;
  deleteDraft(draftId: string): Promise<void>;
  publishDraft(draftId: string): Promise<Draft>;
  exportDraft(draftId: string): Promise<unknown>;
}

export interface ApiAgentRunRepository {
  getAgentRunById(runId: string): Promise<AgentRun | undefined>;
  getAgentRunsByTaskId(taskId: string): Promise<AgentRun[]>;
  startAgentRun(taskId: string): Promise<AgentRun>;
}

export interface ApiDataRepositories {
  brand: ApiBrandRepository;
  assets: ApiAssetRepository;
  knowledge: ApiKnowledgeRepository;
  plans: ApiPlanRepository;
  drafts: ApiDraftRepository;
  agentRuns: ApiAgentRunRepository;
}

export function createApiSessionRepository(): ApiSessionRepository {
  return {
    async getCurrentUser(): Promise<SessionUser | null> {
      if (!localStorage.getItem('mediax.auth-token.v1')) {
        return null;
      }
      try {
        const { user } = await apiClient.get<{ user: SessionUser }>('/auth/me');
        return user;
      } catch {
        return null;
      }
    },
    async login(credentials: LoginCredentials): Promise<SessionUser> {
      const { token, user } = await apiClient.post<{ token: string; user: SessionUser }>(
        '/auth/login',
        credentials,
      );
      localStorage.setItem('mediax.auth-token.v1', token);
      return user;
    },
    async logout(): Promise<void> {
      localStorage.removeItem('mediax.auth-token.v1');
    },
  };
}

export function createApiDataRepositories(): ApiDataRepositories {
  async function fetchData(): Promise<AppData> {
    const data = await apiClient.get<AppData>('/data');
    return data;
  }

  return {
    brand: {
      async getProfile() {
        const data = await fetchData();
        return data.brand;
      },
      async saveProfile(profile) {
        return apiClient.put<BrandProfile>('/brand', profile);
      },
    },
    assets: {
      async getAssets() {
        const data = await fetchData();
        return data.assets;
      },
    },
    knowledge: {
      async getKnowledgeItems(brandId) {
        return apiClient.get<BrandKnowledgeItem[]>(`/knowledge?brandId=${encodeURIComponent(brandId)}`);
      },
      async createKnowledgeItem(input) {
        return apiClient.post<BrandKnowledgeItem>('/knowledge', input);
      },
    },
    plans: {
      async getPlans() {
        const data = await fetchData();
        return data.plans;
      },
      async getPlanById(planId) {
        const data = await fetchData();
        return data.plans.find((p) => p.id === planId);
      },
      async getAllTasks() {
        const data = await fetchData();
        return data.planTasks;
      },
      async getTasksByPlanId(planId) {
        const data = await fetchData();
        return data.planTasks.filter((t) => t.planId === planId);
      },
      async createPlan(input) {
        return apiClient.post<Plan>('/plans', input);
      },
      async updatePlan(planId, input) {
        return apiClient.put<Plan>(`/plans/${planId}`, input);
      },
      async deletePlan(planId) {
        await apiClient.delete(`/plans/${planId}`);
      },
      async createTask(planId, input) {
        return apiClient.post<PlanTask>(`/plans/${planId}/tasks`, input);
      },
      async updateTask(planId, taskId, input) {
        return apiClient.put<PlanTask>(`/plans/${planId}/tasks/${taskId}`, input);
      },
      async deleteTask(planId, taskId) {
        await apiClient.delete(`/plans/${planId}/tasks/${taskId}`);
      },
    },
    drafts: {
      async getDrafts() {
        return apiClient.get<Draft[]>('/drafts');
      },
      async getDraftById(draftId) {
        return apiClient.get<Draft | undefined>(`/drafts/${draftId}`).catch(() => undefined);
      },
      async createDraft(input) {
        return apiClient.post<Draft>('/drafts', input);
      },
      async updateDraft(draftId, input) {
        return apiClient.put<Draft>(`/drafts/${draftId}`, input);
      },
      async approveDraft(draftId, note) {
        return apiClient.post<Draft>(`/drafts/${draftId}/approve`, { note });
      },
      async rejectDraft(draftId, note) {
        return apiClient.post<Draft>(`/drafts/${draftId}/reject`, { note });
      },
      async requestRegeneration(draftId, note) {
        return apiClient.post<Draft>(`/drafts/${draftId}/request-regeneration`, { note });
      },
      async deleteDraft(draftId) {
        await apiClient.delete(`/drafts/${draftId}`);
      },
      async publishDraft(draftId) {
        return apiClient.post<Draft>(`/drafts/${draftId}/publish`);
      },
      async exportDraft(draftId) {
        return apiClient.post(`/drafts/${draftId}/export`);
      },
    },
    agentRuns: {
      async getAgentRunById(runId) {
        return apiClient.get<AgentRun | undefined>(`/agent-runs/${runId}`).catch(() => undefined);
      },
      async getAgentRunsByTaskId(taskId) {
        return apiClient.get<AgentRun[]>(`/agent-runs?taskId=${encodeURIComponent(taskId)}`).catch(() => []);
      },
      async startAgentRun(taskId) {
        return apiClient.post<AgentRun>(`/tasks/${taskId}/agent-runs`);
      },
    },
  };
}
