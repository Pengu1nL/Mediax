import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createSeedAppData } from '../constants';
import {
  createLocalStorageRepositories,
  type AppRepositories,
  type CreateDraftInput,
  type CreateKnowledgeItemInput,
  type CreatePlanInput,
  type CreatePlanTaskInput,
  type UpdateDraftInput,
  type UpdatePlanInput,
  type UpdatePlanTaskInput,
} from '../repositories/localStorageRepositories';
import {
  createApiSessionRepository,
  createApiDataRepositories,
} from '../repositories/apiRepositories';
import {
  AgentRun,
  AppData,
  BrandKnowledgeItem,
  BrandProfile,
  Draft,
  LoginCredentials,
  Plan,
  PlanTask,
  SessionUser,
} from '../types';

interface AppSnapshot extends AppData {
  currentUser: SessionUser | null;
}

interface AppContextValue extends AppSnapshot {
  ready: boolean;
  error: string | null;
  clearError: () => void;
  login: (credentials: LoginCredentials) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  saveBrandProfile: (profile: BrandProfile) => Promise<BrandProfile | undefined>;
  createPlan: (input: CreatePlanInput) => Promise<Plan | undefined>;
  updatePlan: (planId: string, input: UpdatePlanInput) => Promise<Plan | undefined>;
  deletePlan: (planId: string) => Promise<void>;
  createTask: (
    planId: string,
    input: CreatePlanTaskInput,
  ) => Promise<PlanTask | undefined>;
  updateTask: (
    planId: string,
    taskId: string,
    input: UpdatePlanTaskInput,
  ) => Promise<PlanTask | undefined>;
  deleteTask: (planId: string, taskId: string) => Promise<void>;
  createDraft: (input: CreateDraftInput) => Promise<Draft | undefined>;
  updateDraft: (
    draftId: string,
    input: UpdateDraftInput,
  ) => Promise<Draft | undefined>;
  createKnowledgeItem: (input: CreateKnowledgeItemInput) => Promise<BrandKnowledgeItem | undefined>;
  startAgentRun: (taskId: string) => Promise<AgentRun | undefined>;
  approveDraft: (draftId: string, note?: string) => Promise<Draft | undefined>;
  rejectDraft: (draftId: string, note: string) => Promise<Draft | undefined>;
  requestRegeneration: (draftId: string, note: string) => Promise<Draft | undefined>;
  deleteDraft: (draftId: string) => Promise<void>;
}

const seed = createSeedAppData();

const AppContext = createContext<AppContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '出现了未预期的错误，请稍后重试。';
}

function createInitialSnapshot(): AppSnapshot {
  return {
    ...seed,
    currentUser: null,
  };
}

export function AppProvider({
  children,
  repositories: testRepos,
}: {
  children: React.ReactNode;
  repositories?: AppRepositories;
}) {
  const apiDataRepos = useMemo(() => createApiDataRepositories(), []);
  const apiSession = useMemo(() => createApiSessionRepository(), []);

  // In tests: use injected localStorage repos for everything.
  // In production: use API session + API data repos.
  const session = testRepos ? testRepos.session : apiSession;
  const dataRepos = testRepos ? testRepos : apiDataRepos;

  const [snapshot, setSnapshot] = useState<AppSnapshot>(createInitialSnapshot);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [currentUser, brand, assets, plans, planTasks, drafts, agentRuns] = await Promise.all([
        session.getCurrentUser(),
        dataRepos.brand.getProfile(),
        dataRepos.assets.getAssets(),
        dataRepos.plans.getPlans(),
        dataRepos.plans.getAllTasks(),
        dataRepos.drafts.getDrafts(),
        dataRepos.agentRuns.getAgentRunsByTaskId('__all__').catch(() => [] as AgentRun[]),
      ]);
      const knowledgeItems = await dataRepos.knowledge.getKnowledgeItems(brand.id).catch(() => []);
      setSnapshot({ brand, assets, knowledgeItems, plans, planTasks, drafts, agentRuns, currentUser });
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setReady(true);
    }
  }, [dataRepos, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle auth expiry events from the API client
  useEffect(() => {
    const onAuthExpired = () => {
      setSnapshot((prev) => ({ ...prev, currentUser: null }));
      setReady(true);
    };
    window.addEventListener('mediax:auth-expired', onAuthExpired);
    return () => window.removeEventListener('mediax:auth-expired', onAuthExpired);
  }, []);

  const runMutation = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        return undefined;
      }
    },
    [refresh],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...snapshot,
      ready,
      error,
      clearError: () => setError(null),
      login: async (credentials) => {
        try {
          await session.login(credentials);
          await refresh();
          return { ok: true };
        } catch (nextError) {
          const message = getErrorMessage(nextError);
          setError(message);
          return { ok: false, message };
        }
      },
      logout: async () => {
        await session.logout();
        await refresh();
      },
      saveBrandProfile: (profile) => runMutation(() => dataRepos.brand.saveProfile(profile)),
      createPlan: (input) => runMutation(() => dataRepos.plans.createPlan(input)),
      updatePlan: (planId, input) => runMutation(() => dataRepos.plans.updatePlan(planId, input)),
      deletePlan: (planId) => runMutation(() => dataRepos.plans.deletePlan(planId)),
      createTask: (planId, input) => runMutation(() => dataRepos.plans.createTask(planId, input)),
      updateTask: (planId, taskId, input) =>
        runMutation(() => dataRepos.plans.updateTask(planId, taskId, input)),
      deleteTask: (planId, taskId) => runMutation(() => dataRepos.plans.deleteTask(planId, taskId)),
      createDraft: (input) => runMutation(() => dataRepos.drafts.createDraft(input)),
      updateDraft: (draftId, input) => runMutation(() => dataRepos.drafts.updateDraft(draftId, input)),
      createKnowledgeItem: (input) => runMutation(() => dataRepos.knowledge.createKnowledgeItem(input)),
      startAgentRun: (taskId) => runMutation(() => dataRepos.agentRuns.startAgentRun(taskId)),
      approveDraft: (draftId, note) => runMutation(() => dataRepos.drafts.approveDraft(draftId, note)),
      rejectDraft: (draftId, note) => runMutation(() => dataRepos.drafts.rejectDraft(draftId, note)),
      requestRegeneration: (draftId, note) => runMutation(() => dataRepos.drafts.requestRegeneration(draftId, note)),
      deleteDraft: (draftId) => runMutation(() => dataRepos.drafts.deleteDraft(draftId)).then(() => undefined),
    }),
    [error, ready, refresh, dataRepos, session, runMutation, snapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
}
