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
  type CreatePlanInput,
  type CreatePlanTaskInput,
  type UpdateDraftInput,
  type UpdatePlanInput,
  type UpdatePlanTaskInput,
} from '../repositories/localStorageRepositories';
import { AppData, BrandProfile, LoginCredentials, SessionUser } from '../types';

interface AppSnapshot extends AppData {
  currentUser: SessionUser | null;
}

interface AppContextValue extends AppSnapshot {
  ready: boolean;
  error: string | null;
  clearError: () => void;
  login: (credentials: LoginCredentials) => { ok: boolean; message?: string };
  logout: () => void;
  saveBrandProfile: (profile: BrandProfile) => BrandProfile | undefined;
  createPlan: (input: CreatePlanInput) => ReturnType<AppRepositories['plans']['createPlan']> | undefined;
  updatePlan: (planId: string, input: UpdatePlanInput) => ReturnType<AppRepositories['plans']['updatePlan']> | undefined;
  deletePlan: (planId: string) => void;
  createTask: (
    planId: string,
    input: CreatePlanTaskInput,
  ) => ReturnType<AppRepositories['plans']['createTask']> | undefined;
  updateTask: (
    planId: string,
    taskId: string,
    input: UpdatePlanTaskInput,
  ) => ReturnType<AppRepositories['plans']['updateTask']> | undefined;
  deleteTask: (planId: string, taskId: string) => void;
  createDraft: (input: CreateDraftInput) => ReturnType<AppRepositories['drafts']['createDraft']> | undefined;
  updateDraft: (
    draftId: string,
    input: UpdateDraftInput,
  ) => ReturnType<AppRepositories['drafts']['updateDraft']> | undefined;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const repositories = useMemo(() => createLocalStorageRepositories(window.localStorage), []);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(createInitialSnapshot);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setSnapshot({
        brand: repositories.brand.getProfile(),
        assets: repositories.assets.getAssets(),
        plans: repositories.plans.getPlans(),
        planTasks: repositories.plans.getAllTasks(),
        drafts: repositories.drafts.getDrafts(),
        currentUser: repositories.session.getCurrentUser(),
      });
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setReady(true);
    }
  }, [repositories]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runMutation = useCallback(
    <T,>(action: () => T): T | undefined => {
      try {
        const result = action();
        refresh();
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
      login: (credentials) => {
        try {
          repositories.session.login(credentials);
          refresh();
          return { ok: true };
        } catch (nextError) {
          const message = getErrorMessage(nextError);
          setError(message);
          return { ok: false, message };
        }
      },
      logout: () => {
        repositories.session.logout();
        refresh();
      },
      saveBrandProfile: (profile) => runMutation(() => repositories.brand.saveProfile(profile)),
      createPlan: (input) => runMutation(() => repositories.plans.createPlan(input)),
      updatePlan: (planId, input) => runMutation(() => repositories.plans.updatePlan(planId, input)),
      deletePlan: (planId) => {
        runMutation(() => repositories.plans.deletePlan(planId));
      },
      createTask: (planId, input) => runMutation(() => repositories.plans.createTask(planId, input)),
      updateTask: (planId, taskId, input) =>
        runMutation(() => repositories.plans.updateTask(planId, taskId, input)),
      deleteTask: (planId, taskId) => {
        runMutation(() => repositories.plans.deleteTask(planId, taskId));
      },
      createDraft: (input) => runMutation(() => repositories.drafts.createDraft(input)),
      updateDraft: (draftId, input) => runMutation(() => repositories.drafts.updateDraft(draftId, input)),
    }),
    [error, ready, refresh, repositories, runMutation, snapshot],
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
