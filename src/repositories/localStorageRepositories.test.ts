import { describe, expect, it, beforeEach } from 'vitest';
import {
  createLocalStorageRepositories,
  type CreateDraftInput,
  type CreatePlanInput,
  type CreatePlanTaskInput,
} from './localStorageRepositories';

describe('localStorage repositories', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates seed data only once and preserves later edits', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    const originalBrand = await repositories.brand.getProfile();
    expect(originalBrand.name).toBe('上海建桥融高');

    await repositories.brand.saveProfile({
      ...originalBrand,
      name: 'Mediax 实验品牌',
    });

    const nextRepositories = createLocalStorageRepositories(window.localStorage);
    expect((await nextRepositories.brand.getProfile()).name).toBe('Mediax 实验品牌');
  });

  it('persists login session and clears it on logout', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    expect(await repositories.session.getCurrentUser()).toBeNull();

    await repositories.session.login({
      email: 'admin@mediax.local',
      password: 'mediax2026',
    });

    expect(await repositories.session.getCurrentUser()).toMatchObject({
      name: 'Mediax Admin',
      role: 'admin',
    });

    await repositories.session.logout();

    expect(await repositories.session.getCurrentUser()).toBeNull();
  });

  it('creates a plan, task and linked draft as a single persisted workflow', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    const plan = await repositories.plans.createPlan({
      title: '2026 春季开放日传播',
      category: '开放日',
      status: 'draft',
      startDate: '2026-03-01',
      endDate: '2026-03-30',
    } satisfies CreatePlanInput);

    const task = await repositories.plans.createTask(plan.id, {
      title: '公众号预热头图发布',
      executionType: 'single',
      schedule: '2026-03-02 10:00',
      status: 'pending',
    } satisfies CreatePlanTaskInput);

    const draft = await repositories.drafts.createDraft({
      planId: plan.id,
      taskId: task.id,
      platform: '微信公众号',
      group: '开放日',
      status: 'draft',
      title: '开放日报名启动',
      excerpt: '报名通道正式开启',
      content: '这里是正文',
    } satisfies CreateDraftInput);

    await repositories.plans.updateTask(plan.id, task.id, {
      linkedDraftId: draft.id,
      status: 'active',
    });

    const hydratedRepositories = createLocalStorageRepositories(window.localStorage);
    const hydratedPlan = await hydratedRepositories.plans.getPlanById(plan.id);
    const hydratedTasks = await hydratedRepositories.plans.getTasksByPlanId(plan.id);
    const hydratedTask = hydratedTasks[0];
    const hydratedDraft = await hydratedRepositories.drafts.getDraftById(draft.id);

    expect(hydratedPlan?.title).toBe('2026 春季开放日传播');
    expect(hydratedTask).toMatchObject({
      title: '公众号预热头图发布',
      linkedDraftId: draft.id,
      status: 'active',
    });
    expect(hydratedDraft).toMatchObject({
      planId: plan.id,
      taskId: task.id,
      title: '开放日报名启动',
    });
  });
});
