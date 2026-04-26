import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider, useAppStore } from './AppContext';
import type { AppRepositories } from '../repositories/localStorageRepositories';
import type { BrandProfile, Draft, SessionUser } from '../types';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const brand: BrandProfile = {
  id: 'brand-1',
  name: 'Mediax',
  industry: 'content',
  keywords: [],
  summary: '',
  defaultReviewPolicy: 'manual_required',
  setupComplete: false,
  channels: [],
};

const user: SessionUser = {
  id: 'admin-1',
  name: 'Mediax Admin',
  email: 'admin@mediax.local',
  role: 'admin',
};

const draft: Draft = {
  id: 'draft-1',
  platform: '微信公众号',
  group: '品牌宣传',
  status: 'draft',
  title: '招生文案',
  excerpt: '摘要',
  content: '正文',
  updatedAt: '2026-04-24T12:00:00.000Z',
};

function createRepositories(refreshDrafts: Promise<Draft[]>): AppRepositories {
  return {
    brand: {
      getProfile: vi.fn(async () => brand),
      saveProfile: vi.fn(async (profile) => profile),
    },
    assets: {
      getAssets: vi.fn(async () => []),
    },
    knowledge: {
      getKnowledgeItems: vi.fn(async () => []),
      createKnowledgeItem: vi.fn(),
    },
    plans: {
      getPlans: vi.fn(async () => []),
      getPlanById: vi.fn(async () => undefined),
      getAllTasks: vi.fn(async () => []),
      getTasksByPlanId: vi.fn(async () => []),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(async () => undefined),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(async () => undefined),
    },
    drafts: {
      getDrafts: vi.fn().mockResolvedValueOnce([]).mockImplementationOnce(() => refreshDrafts),
      getDraftById: vi.fn(async () => undefined),
      createDraft: vi.fn(async () => draft),
      updateDraft: vi.fn(async () => draft),
    },
    agentRuns: {
      getAgentRunById: vi.fn(async () => undefined),
      getAgentRunsByTaskId: vi.fn(async () => []),
      startAgentRun: vi.fn(),
    },
    session: {
      getCurrentUser: vi.fn(async () => user),
      login: vi.fn(async () => user),
      logout: vi.fn(async () => undefined),
    },
  };
}

function createLoginRepositories(knowledgeError: Error): AppRepositories {
  return {
    brand: {
      getProfile: vi.fn(async () => ({ ...brand, setupComplete: true })),
      saveProfile: vi.fn(async (profile) => profile),
    },
    assets: {
      getAssets: vi.fn(async () => []),
    },
    knowledge: {
      getKnowledgeItems: vi.fn(async () => {
        throw knowledgeError;
      }),
      createKnowledgeItem: vi.fn(),
    },
    plans: {
      getPlans: vi.fn(async () => []),
      getPlanById: vi.fn(async () => undefined),
      getAllTasks: vi.fn(async () => []),
      getTasksByPlanId: vi.fn(async () => []),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(async () => undefined),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(async () => undefined),
    },
    drafts: {
      getDrafts: vi.fn(async () => []),
      getDraftById: vi.fn(async () => undefined),
      createDraft: vi.fn(async () => draft),
      updateDraft: vi.fn(async () => draft),
    },
    agentRuns: {
      getAgentRunById: vi.fn(async () => undefined),
      getAgentRunsByTaskId: vi.fn(async () => []),
      startAgentRun: vi.fn(),
    },
    session: {
      getCurrentUser: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(user),
      login: vi.fn(async () => user),
      logout: vi.fn(async () => undefined),
    },
  };
}

function MutationProbe() {
  const { ready, createDraft } = useAppStore();
  const [state, setState] = useState('idle');

  if (!ready) {
    return <div>loading</div>;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await createDraft({
          platform: draft.platform,
          group: draft.group,
          status: draft.status,
          title: draft.title,
          excerpt: draft.excerpt,
          content: draft.content,
        });
        setState('resolved');
      }}
    >
      {state}
    </button>
  );
}

function LoginProbe() {
  const { ready, currentUser, login } = useAppStore();
  const [state, setState] = useState('idle');

  if (!ready) {
    return <div>loading</div>;
  }

  return (
    <div>
      <div>{currentUser?.name ?? 'anonymous'}</div>
      <button
        type="button"
        onClick={async () => {
          const result = await login({
            email: 'admin@mediax.local',
            password: 'mediax2026',
          });
          setState(result.ok ? 'accepted' : 'rejected');
        }}
      >
        {state}
      </button>
    </div>
  );
}

describe('AppProvider mutations', () => {
  it('waits for the refreshed snapshot before resolving a mutation', async () => {
    const user = userEvent.setup();
    const refreshedDrafts = createDeferred<Draft[]>();
    const repositories = createRepositories(refreshedDrafts.promise);

    render(
      <AppProvider repositories={repositories}>
        <MutationProbe />
      </AppProvider>,
    );

    await screen.findByRole('button', { name: 'idle' });

    await user.click(screen.getByRole('button', { name: 'idle' }));

    await waitFor(() => expect(repositories.drafts.getDrafts).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'idle' })).toBeInTheDocument();

    refreshedDrafts.resolve([draft]);

    expect(await screen.findByRole('button', { name: 'resolved' })).toBeInTheDocument();
  });

  it('does not reject login when optional knowledge refresh fails', async () => {
    const user = userEvent.setup();
    const repositories = createLoginRepositories(new Error('请求失败 (404)'));

    render(
      <AppProvider repositories={repositories}>
        <LoginProbe />
      </AppProvider>,
    );

    await screen.findByRole('button', { name: 'idle' });

    await user.click(screen.getByRole('button', { name: 'idle' }));

    expect(await screen.findByRole('button', { name: 'accepted' })).toBeInTheDocument();
    expect(await screen.findByText('Mediax Admin')).toBeInTheDocument();
  });
});
