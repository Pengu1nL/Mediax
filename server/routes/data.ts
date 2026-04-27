import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { loadData, updateData } from '../store';
import { runAgentTask } from '../agent/runAgentTask';
import { simulatePublish, exportDraft } from '../publishers/simulatedPublisher';
import {
  BrandProfile,
  BrandKnowledgeItem,
  Draft,
  DraftStatus,
  ExecutionType,
  KnowledgeContentType,
  KnowledgeSourceType,
  Plan,
  PlanStatus,
  PlanTask,
  AgentTaskStatus,
  AutomationLevel,
  ReviewPolicy,
} from '../../src/types';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeExcerpt(input: { excerpt: string; content: string }): string {
  const excerpt = input.excerpt.trim();
  return excerpt || input.content.trim().slice(0, 80);
}

interface CreateKnowledgeItemInput {
  brandId: string;
  sourceType: KnowledgeSourceType;
  sourceName: string;
  sourceUri?: string;
  contentType: KnowledgeContentType;
  summary: string;
  tags?: string[];
  extractedText?: string;
  assetIds?: string[];
  confidence?: number;
}

export function createDataRouter(): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // GET /api/data — full snapshot for client initialization
  router.get('/data', async (_req: Request, res: Response) => {
    try {
      const data = await loadData();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: '读取数据失败。' });
    }
  });

  // ---- Brand ----

  router.put('/brand', async (req: Request, res: Response) => {
    try {
      const profile = req.body as BrandProfile;
      if (!profile || !profile.id) {
        res.status(400).json({ error: '品牌信息无效。' });
        return;
      }
      await updateData((data) => {
        data.brand = profile;
        return { data, result: data.brand };
      });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: '保存品牌信息失败。' });
    }
  });

  // ---- Brand Knowledge ----

  router.get('/knowledge', async (req: Request, res: Response) => {
    try {
      const brandId = String(req.query.brandId ?? '');
      const data = await loadData();
      res.json(data.knowledgeItems.filter((item) => item.brandId === brandId));
    } catch {
      res.status(500).json({ error: '读取品牌知识失败。' });
    }
  });

  router.delete('/knowledge/:itemId', async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      await updateData((data) => {
        data.knowledgeItems = data.knowledgeItems.filter((k) => k.id !== itemId);
        return { data, result: undefined };
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: '删除品牌知识失败。' });
    }
  });

  router.post('/knowledge', async (req: Request, res: Response) => {
    try {
      const input = req.body as CreateKnowledgeItemInput;
      if (!input.brandId || !input.sourceType || !input.sourceName || !input.contentType || !input.summary) {
        res.status(400).json({ error: '品牌知识信息不完整。' });
        return;
      }

      const item = await updateData((data) => {
        const now = new Date().toISOString();
        const knowledgeItem: BrandKnowledgeItem = {
          id: createId('knowledge'),
          brandId: input.brandId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceUri: input.sourceUri,
          contentType: input.contentType,
          status: 'ready',
          summary: input.summary,
          tags: input.tags ?? [],
          extractedText: input.extractedText,
          assetIds: input.assetIds ?? [],
          confidence: input.confidence ?? 1,
          createdAt: now,
          updatedAt: now,
        };

        data.knowledgeItems.unshift(knowledgeItem);
        return { data, result: knowledgeItem };
      });

      res.status(201).json(item);
    } catch {
      res.status(500).json({ error: '创建品牌知识失败。' });
    }
  });

  // ---- Plans ----

  router.get('/plans', async (_req: Request, res: Response) => {
    try {
      const data = await loadData();
      res.json(data.plans);
    } catch {
      res.status(500).json({ error: '读取计划失败。' });
    }
  });

  router.post('/plans', async (req: Request, res: Response) => {
    try {
      const input = req.body as {
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
      };
      if (!input.title || !input.status || !input.startDate || !input.endDate) {
        res.status(400).json({ error: '计划信息不完整。' });
        return;
      }
      const plan = await updateData((data) => {
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
        data.plans.unshift(plan);
        return { data, result: plan };
      });
      res.status(201).json(plan);
    } catch {
      res.status(500).json({ error: '创建计划失败。' });
    }
  });

  router.put('/plans/:planId', async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const input = req.body as Partial<{
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
      }>;
      const plan = await updateData((data) => {
        const plan = data.plans.find((p) => p.id === planId);
        if (!plan) throw new Error('未找到对应的发布计划。');
        Object.assign(plan, input);
        return { data, result: plan };
      });
      res.json(plan);
    } catch (err: any) {
      res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
    }
  });

  router.delete('/plans/:planId', async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      await updateData((data) => {
        const taskIds = data.planTasks
          .filter((task) => task.planId === planId)
          .map((task) => task.id);

        data.plans = data.plans.filter((plan) => plan.id !== planId);
        data.planTasks = data.planTasks.filter((task) => task.planId !== planId);
        data.drafts = data.drafts.map((draft) =>
          taskIds.includes(draft.taskId ?? '') || draft.planId === planId
            ? { ...draft, planId: undefined, taskId: undefined }
            : draft,
        );
        return { data, result: undefined };
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: '删除计划失败。' });
    }
  });

  // ---- Plan Tasks ----

  router.get('/plans/:planId/tasks', async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const data = await loadData();
      res.json(data.planTasks.filter((t) => t.planId === planId));
    } catch {
      res.status(500).json({ error: '读取任务失败。' });
    }
  });

  router.post('/plans/:planId/tasks', async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const input = req.body as {
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
      };
      if (!input.title || !input.executionType || !input.schedule || !input.status) {
        res.status(400).json({ error: '任务信息不完整。' });
        return;
      }
      if (!input.brief?.trim()) {
        res.status(400).json({ error: '任务 brief 不能为空。' });
        return;
      }
      if (!input.channel?.trim()) {
        res.status(400).json({ error: '任务渠道不能为空。' });
        return;
      }
      if (!input.contentType?.trim()) {
        res.status(400).json({ error: '任务内容类型不能为空。' });
        return;
      }
      const task = await updateData((data) => {
        const planExists = data.plans.some((p) => p.id === planId);
        if (!planExists) throw new Error('无法为不存在的计划创建任务。');
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
        data.planTasks.push(task);
        return { data, result: task };
      });
      res.status(201).json(task);
    } catch (err: any) {
      res.status(err.message.includes('不存在') ? 404 : 500).json({ error: err.message });
    }
  });

  router.put('/plans/:planId/tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const { planId, taskId } = req.params;
      const input = req.body as Partial<{
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
      }>;
      const task = await updateData((data) => {
        const task = data.planTasks.find((t) => t.id === taskId && t.planId === planId);
        if (!task) throw new Error('未找到对应的任务。');
        Object.assign(task, input);
        return { data, result: task };
      });
      res.json(task);
    } catch (err: any) {
      res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
    }
  });

  router.delete('/plans/:planId/tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const { planId, taskId } = req.params;
      await updateData((data) => {
        data.planTasks = data.planTasks.filter(
          (t) => !(t.id === taskId && t.planId === planId),
        );
        data.drafts = data.drafts.map((draft) =>
          draft.taskId === taskId ? { ...draft, taskId: undefined } : draft,
        );
        return { data, result: undefined };
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: '删除任务失败。' });
    }
  });

  // ---- Drafts ----

  router.get('/drafts', async (_req: Request, res: Response) => {
    try {
      const data = await loadData();
      const sorted = [...data.drafts].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      );
      res.json(sorted);
    } catch {
      res.status(500).json({ error: '读取草稿失败。' });
    }
  });

  router.get('/drafts/:draftId', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      const data = await loadData();
      const draft = data.drafts.find((item) => item.id === draftId);
      if (!draft) {
        res.status(404).json({ error: '未找到对应的草稿。' });
        return;
      }
      res.json(draft);
    } catch {
      res.status(500).json({ error: '读取草稿失败。' });
    }
  });

  router.post('/drafts', async (req: Request, res: Response) => {
    try {
      const input = req.body as {
        planId?: string;
        taskId?: string;
        platform: string;
        group: string;
        status: DraftStatus;
        title: string;
        excerpt: string;
        content: string;
      };
      if (!input.platform || !input.group || !input.status || !input.title) {
        res.status(400).json({ error: '草稿信息不完整。' });
        return;
      }
      const draft = await updateData((data) => {
        const draft: Draft = {
          id: createId('draft'),
          planId: input.planId,
          taskId: input.taskId,
          platform: input.platform,
          group: input.group,
          status: input.status,
          title: input.title,
          excerpt: normalizeExcerpt(input),
          content: input.content ?? '',
          updatedAt: new Date().toISOString(),
        };
        data.drafts.unshift(draft);
        return { data, result: draft };
      });
      res.status(201).json(draft);
    } catch {
      res.status(500).json({ error: '创建草稿失败。' });
    }
  });

  router.put('/drafts/:draftId', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      const input = req.body as Partial<{
        planId?: string;
        taskId?: string;
        platform: string;
        group: string;
        status: DraftStatus;
        title: string;
        excerpt: string;
        content: string;
      }>;
      const draft = await updateData((data) => {
        const draft = data.drafts.find((d) => d.id === draftId);
        if (!draft) throw new Error('未找到对应的草稿。');
        Object.assign(draft, input);
        draft.excerpt = normalizeExcerpt({ excerpt: draft.excerpt, content: draft.content });
        draft.updatedAt = new Date().toISOString();
        return { data, result: draft };
      });
      res.json(draft);
    } catch (err: any) {
      res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
    }
  });

  // ---- Draft Delete ----

  router.delete('/drafts/:draftId', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      await updateData((data) => {
        const draft = data.drafts.find((d) => d.id === draftId);
        if (!draft) throw new Error('未找到对应的草稿。');

        // 解除关联任务的引用
        if (draft.taskId) {
          const task = data.planTasks.find((t) => t.id === draft.taskId);
          if (task) {
            if (task.linkedDraftId === draftId) {
              task.linkedDraftId = undefined;
            }
            if (task.linkedDraftIds) {
              task.linkedDraftIds = task.linkedDraftIds.filter((id) => id !== draftId);
            }
          }
        }

        data.drafts = data.drafts.filter((d) => d.id !== draftId);
        return { data, result: undefined };
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
    }
  });

  // ---- Draft Review ----

  const reviewDraft = async (
    req: Request,
    res: Response,
    action: 'approve' | 'reject' | 'request_regeneration',
  ) => {
    try {
      const { draftId } = req.params;
      const note = (req.body as { note?: string }).note;
      const now = new Date().toISOString();

      const draft = await updateData((data) => {
        const draft = data.drafts.find((d) => d.id === draftId);
        if (!draft) throw new Error('未找到对应的草稿。');

        draft.reviewState = {
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
          reviewerNote: note,
          reviewedAt: now,
        };
        draft.updatedAt = now;

        if (action === 'approve') {
          draft.status = 'ready';
        } else if (action === 'reject') {
          draft.status = 'review';
        } else {
          draft.status = 'draft';
        }

        // 同步关联任务状态
        if (draft.taskId) {
          const task = data.planTasks.find((t) => t.id === draft.taskId);
          if (task) {
            if (action === 'approve') {
              task.status = 'approved';
            } else if (action === 'reject') {
              task.status = 'ready_for_review';
            } else {
              task.status = 'queued';
            }
          }
        }

        return { data, result: draft };
      });

      res.json(draft);
    } catch (err: any) {
      res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
    }
  };

  router.post('/drafts/:draftId/approve', (req, res) => reviewDraft(req, res, 'approve'));
  router.post('/drafts/:draftId/reject', (req, res) => reviewDraft(req, res, 'reject'));
  router.post('/drafts/:draftId/request-regeneration', (req, res) => reviewDraft(req, res, 'request_regeneration'));

  // ---- Agent Runs ----

  router.get('/agent-runs', async (req: Request, res: Response) => {
    try {
      const taskId = req.query.taskId ? String(req.query.taskId) : '';
      const data = await loadData();
      if (taskId && taskId !== '__all__') {
        res.json(data.agentRuns.filter((run) => run.taskId === taskId));
      } else {
        res.json(data.agentRuns);
      }
    } catch {
      res.status(500).json({ error: '读取 Agent 执行记录失败。' });
    }
  });

  router.get('/agent-runs/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const data = await loadData();
      const agentRun = data.agentRuns.find((run) => run.id === runId);
      if (!agentRun) {
        res.status(404).json({ error: '未找到对应的 Agent 执行记录。' });
        return;
      }
      res.json(agentRun);
    } catch {
      res.status(500).json({ error: '读取 Agent 执行记录失败。' });
    }
  });

  router.post('/tasks/:taskId/agent-runs', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { generateImage, imageSize } = (req.body || {}) as {
        generateImage?: boolean;
        imageSize?: string;
      };
      const agentRun = await runAgentTask(taskId, { generateImage, imageSize });
      res.status(201).json(agentRun);
    } catch (err: any) {
      const status = err.message.includes('未找到') ? 404 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  // ---- Config ----

  router.get('/config', async (_req: Request, res: Response) => {
    try {
      const data = await loadData();
      res.json(data.config);
    } catch {
      res.status(500).json({ error: '读取配置失败。' });
    }
  });

  router.put('/config', async (req: Request, res: Response) => {
    try {
      const input = req.body;
      const config = await updateData((data) => {
        data.config = { ...data.config, ...input };
        return { data, result: data.config };
      });
      res.json(config);
    } catch {
      res.status(500).json({ error: '保存配置失败。' });
    }
  });

  // ---- Publish ----

  router.post('/drafts/:draftId/publish', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      const now = new Date().toISOString();

      const result = await updateData((data) => {
        const draft = data.drafts.find((d) => d.id === draftId);
        if (!draft) throw new Error('未找到对应的草稿。');

        if (draft.status !== 'ready') {
          throw new Error('只有已批准的草稿才能发布。');
        }

        const plan = draft.planId ? data.plans.find((p) => p.id === draft.planId) : null;
        const task = draft.taskId ? data.planTasks.find((t) => t.id === draft.taskId) : null;

        const { record, taskStatus } = simulatePublish({
          draft,
          taskReviewPolicy: task?.reviewPolicy ?? task?.publishPolicy,
          planReviewPolicy: plan?.reviewPolicy,
          brandReviewPolicy: data.brand.defaultReviewPolicy,
        });

        // 更新草稿状态
        draft.status = 'ready';
        draft.publishState = 'published';
        draft.updatedAt = now;

        // 更新任务状态
        if (task) {
          task.status = taskStatus as typeof task.status;
        }

        data.publishRecords.push(record);

        return { data, result: { record, draft } };
      });

      res.status(200).json(result);
    } catch (err: any) {
      const status = err.message.includes('未找到') ? 404 : err.message.includes('批准') ? 400 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  router.post('/drafts/:draftId/export', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      const data = await loadData();
      const draft = data.drafts.find((d) => d.id === draftId);
      if (!draft) {
        res.status(404).json({ error: '未找到对应的草稿。' });
        return;
      }

      const plan = draft.planId ? data.plans.find((p) => p.id === draft.planId) : null;
      const task = draft.taskId ? data.planTasks.find((t) => t.id === draft.taskId) : null;

      const pkg = exportDraft({
        draft,
        taskReviewPolicy: task?.reviewPolicy ?? task?.publishPolicy,
        planReviewPolicy: plan?.reviewPolicy,
        brandReviewPolicy: data.brand.defaultReviewPolicy,
      });

      // 创建导出发布记录
      const now = new Date().toISOString();
      const record = {
        id: `pub-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        draftId: draft.id,
        taskId: draft.taskId,
        planId: draft.planId,
        platform: draft.platform,
        status: 'exported' as const,
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        publishedAt: now,
      };
      data.publishRecords.push(record);

      res.json({ ...pkg, record });
    } catch {
      res.status(500).json({ error: '导出失败。' });
    }
  });

  return router;
}
