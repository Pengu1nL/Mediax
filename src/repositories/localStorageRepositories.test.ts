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
    expect(originalBrand.name).toBe('Mediax');
    expect(originalBrand.defaultReviewPolicy).toBe('manual_required');
    expect(originalBrand.setupComplete).toBe(false);

    await repositories.brand.saveProfile({
      ...originalBrand,
      name: 'Mediax 实验品牌',
    });

    const nextRepositories = createLocalStorageRepositories(window.localStorage);
    expect((await nextRepositories.brand.getProfile()).name).toBe('Mediax 实验品牌');
  });

  it('persists the extended brand context fields', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    await repositories.brand.saveProfile({
      id: 'brand-1',
      name: 'Mediax Test Brand',
      industry: '教育',
      website: 'https://example.com',
      establishedAt: '2026',
      keywords: ['融合教育', '国际视野'],
      summary: '用于验证品牌上下文持久化。',
      audience: '初高中学生家长',
      positioning: '面向未来的融合教育品牌',
      toneOfVoice: '可信、温暖、清晰',
      doAndDonts: ['不夸大升学结果', '不使用焦虑营销'],
      defaultReviewPolicy: 'manual_required',
      setupComplete: true,
      channels: [],
    });

    const saved = await repositories.brand.getProfile();

    expect(saved.audience).toBe('初高中学生家长');
    expect(saved.positioning).toBe('面向未来的融合教育品牌');
    expect(saved.toneOfVoice).toBe('可信、温暖、清晰');
    expect(saved.doAndDonts).toEqual(['不夸大升学结果', '不使用焦虑营销']);
    expect(saved.defaultReviewPolicy).toBe('manual_required');
    expect(saved.setupComplete).toBe(true);
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
      status: 'draft',
      brief: '发布公众号预热头图，传达开放日核心信息。',
      channel: '微信公众号',
      contentType: '图文',
      reviewPolicy: 'manual_required',
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
      status: 'queued',
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
      status: 'queued',
      brief: '发布公众号预热头图，传达开放日核心信息。',
      channel: '微信公众号',
      contentType: '图文',
    });
    expect(hydratedDraft).toMatchObject({
      planId: plan.id,
      taskId: task.id,
      title: '开放日报名启动',
    });
  });

  it('creates and reads brand knowledge items', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    const item = await repositories.knowledge.createKnowledgeItem({
      brandId: 'brand-1',
      sourceType: 'manual_note',
      sourceName: '招生文案禁用表达',
      contentType: 'text',
      summary: '招生传播不夸大升学结果。',
      tags: ['招生', '品牌语气'],
      extractedText: '品牌表达应专业、可信、温暖。避免夸大升学结果。',
      assetIds: [],
      confidence: 0.92,
    });

    await repositories.knowledge.createKnowledgeItem({
      brandId: 'brand-2',
      sourceType: 'manual_note',
      sourceName: '其他品牌知识',
      contentType: 'text',
      summary: '不应出现在 brand-1 结果中。',
      tags: [],
      assetIds: [],
      confidence: 0.5,
    });

    const items = await repositories.knowledge.getKnowledgeItems('brand-1');

    expect(item.status).toBe('ready');
    expect(item.id).toMatch(/^knowledge-/);
    expect(item.createdAt).toBeTruthy();
    expect(item.updatedAt).toBe(item.createdAt);
    expect(items).toEqual([expect.objectContaining({
      brandId: 'brand-1',
      sourceName: '招生文案禁用表达',
      summary: '招生传播不夸大升学结果。',
    })]);
  });

  it('starts an agent run, creates a draft, and links them together', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    // Set up brand with complete context
    const brand = await repositories.brand.getProfile();
    await repositories.brand.saveProfile({
      ...brand,
      toneOfVoice: '专业、温暖、可信',
    });

    // Create plan
    const plan = await repositories.plans.createPlan({
      title: 'Agent 测试计划',
      category: '测试',
      status: 'active',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      brandId: brand.id,
    });

    // Create task
    const task = await repositories.plans.createTask(plan.id, {
      title: 'Agent 测试任务',
      executionType: 'single',
      schedule: '2026-04-15 10:00',
      status: 'draft',
      brief: '这是一个由 Agent 执行的测试任务。',
      channel: '微信公众号',
      contentType: '图文',
      reviewPolicy: 'manual_required',
      brandId: brand.id,
    });

    // Start agent run
    const agentRun = await repositories.agentRuns.startAgentRun(task.id);

    // Verify agent run
    expect(agentRun.id).toMatch(/^agent-run-/);
    expect(agentRun.status).toBe('waiting_for_review');
    expect(agentRun.brandId).toBe(brand.id);
    expect(agentRun.taskId).toBe(task.id);
    expect(agentRun.steps).toHaveLength(3);
    expect(agentRun.outputDraftId).toBeTruthy();

    // Verify draft was created and linked
    const draft = await repositories.drafts.getDraftById(agentRun.outputDraftId!);
    expect(draft).toBeTruthy();
    expect(draft!.taskId).toBe(task.id);
    expect(draft!.planId).toBe(plan.id);
    expect(draft!.platform).toBe('微信公众号');
    expect(draft!.title).toBe('Agent 测试任务');

    // Verify task was updated
    const tasks = await repositories.plans.getTasksByPlanId(plan.id);
    const updatedTask = tasks.find((t) => t.id === task.id);
    expect(updatedTask).toBeTruthy();
    expect(updatedTask!.status).toBe('ready_for_review');
    expect(updatedTask!.linkedDraftId).toBe(draft!.id);
    expect(updatedTask!.agentRunId).toBe(agentRun.id);

    // Verify agent run is persisted
    const fetchedRun = await repositories.agentRuns.getAgentRunById(agentRun.id);
    expect(fetchedRun).toBeTruthy();
    expect(fetchedRun!.id).toBe(agentRun.id);
  });

  it('approves, rejects, and requests regeneration of a draft', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    // Create a draft via agent run (has taskId for status sync)
    const brand = await repositories.brand.getProfile();
    await repositories.brand.saveProfile({ ...brand, toneOfVoice: '专业' });
    const plan = await repositories.plans.createPlan({
      title: '审核测试计划', status: 'active', startDate: '2026-04-01', endDate: '2026-04-30',
    });
    const task = await repositories.plans.createTask(plan.id, {
      title: '审核测试任务', executionType: 'single', schedule: '2026-04-15 10:00',
      status: 'draft', brief: '测试审核流转。', channel: '微信公众号', contentType: '图文', reviewPolicy: 'manual_required',
    });
    const agentRun = await repositories.agentRuns.startAgentRun(task.id);
    const draftId = agentRun.outputDraftId!;

    // Verify initial state: task should be 'ready_for_review'
    let tasks = await repositories.plans.getTasksByPlanId(plan.id);
    expect(tasks[0].status).toBe('ready_for_review');

    // Reject
    const rejected = await repositories.drafts.rejectDraft(draftId, '品牌语气不够专业');
    expect(rejected.reviewState?.status).toBe('rejected');
    expect(rejected.reviewState?.reviewerNote).toBe('品牌语气不够专业');
    expect(rejected.status).toBe('review');
    tasks = await repositories.plans.getTasksByPlanId(plan.id);
    expect(tasks[0].status).toBe('ready_for_review');

    // Request regeneration
    const regenerated = await repositories.drafts.requestRegeneration(draftId, '请加入更多数据支撑');
    expect(regenerated.reviewState?.status).toBe('changes_requested');
    expect(regenerated.status).toBe('draft');
    tasks = await repositories.plans.getTasksByPlanId(plan.id);
    expect(tasks[0].status).toBe('queued');

    // Approve
    const approved = await repositories.drafts.approveDraft(draftId, '内容质量优秀');
    expect(approved.reviewState?.status).toBe('approved');
    expect(approved.status).toBe('ready');
    tasks = await repositories.plans.getTasksByPlanId(plan.id);
    expect(tasks[0].status).toBe('approved');
  });

  it('publishes and exports approved drafts', async () => {
    const repositories = createLocalStorageRepositories(window.localStorage);

    const plan = await repositories.plans.createPlan({
      title: '发布测试计划', status: 'active', startDate: '2026-04-01', endDate: '2026-04-30',
    });
    const task = await repositories.plans.createTask(plan.id, {
      title: '发布测试任务', executionType: 'single', schedule: '2026-04-15 10:00',
      status: 'draft', brief: '测试发布。', channel: '微信公众号', contentType: '图文', reviewPolicy: 'manual_required',
    });
    const agentRun = await repositories.agentRuns.startAgentRun(task.id);
    const draftId = agentRun.outputDraftId!;

    // Approve first
    await repositories.drafts.approveDraft(draftId);

    // Publish
    const published = await repositories.drafts.publishDraft(draftId);
    expect(published.publishState).toBe('published');

    // Verify task status
    const tasks = await repositories.plans.getTasksByPlanId(plan.id);
    expect(tasks[0].status).toBe('published');

    // Export another draft
    const draft2 = await repositories.drafts.createDraft({
      planId: plan.id, taskId: task.id, platform: '微信公众号', group: '图文',
      status: 'draft', title: '导出测试', excerpt: '导出', content: '正文',
    });
    const exported = await repositories.drafts.exportDraft(draft2.id) as Record<string, unknown>;
    expect(exported.title).toBe('导出测试');
    expect(exported.platform).toBe('微信公众号');
    expect(exported.platformNote).toBeTruthy();
    expect(exported.record).toBeTruthy();
  });
});
