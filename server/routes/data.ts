import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth';
import { loadData, updateData } from '../store';
import { runAgentTask } from '../agent/runAgentTask';
import { simulatePublish, exportDraft } from '../publishers/simulatedPublisher';
import { getImageGenerator } from '../media/imageGen';
import { getProxyDispatcher } from '../fetchProxy';
import { getLlmProvider } from '../llm';
import multer from 'multer';
import { processFile } from '../knowledge/processor';
import {
  BrandProfile,
  Draft,
  DraftStatus,
  ExecutionType,
  KnowledgeSourceType,
  Plan,
  PlanStatus,
  PlanTask,
  AgentTaskStatus,
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

  // ---- Brand AI Optimize ----

  router.post('/brand/suggest', async (req: Request, res: Response) => {
    try {
      const { field, current, name, industry } = req.body as {
        field?: string;
        current?: string;
        name?: string;
        industry?: string;
      };

      if (!field?.trim() || !current?.trim()) {
        res.status(400).json({ error: '字段名和待优化内容不能为空。' });
        return;
      }

      const data = await loadData();
      const llm = getLlmProvider(data.config?.llm);
      if (!llm) {
        res.status(400).json({ error: 'AI 接口未配置，请在 Settings 中配置 API 密钥。' });
        return;
      }

      const fieldMeta: Record<string, { label: string; format: string; example: string }> = {
        summary: {
          label: '品牌简介',
          format: '优化为 2-4 句流畅的品牌描述，业务感强、可读性高。',
          example: 'Mediax 是一个 AI 驱动的自媒体运营平台，帮助创作者高效完成内容生产与多平台发布。',
        },
        toneOfVoice: {
          label: '品牌语气',
          format: '输出逗号分隔的形容词列表（3-5 个），不要写成句子。',
          example: '专业、简洁、有洞察力、亲和',
        },
        audience: {
          label: '目标受众',
          format: '优化为 1-2 句精准的受众描述。',
          example: '内容创作者、自媒体运营者、品牌营销人员',
        },
        positioning: {
          label: '品牌定位',
          format: '优化为 1 句简练的差异化定位陈述。',
          example: 'AI 驱动的一站式自媒体运营平台',
        },
        doAndDonts: {
          label: '禁用表达',
          format: '这是一个逗号分隔的禁用内容列表。你需要保持列表格式，仅补充或合并同类项，每条 2-6 字，逗号分隔，不要写成句子或段落。',
          example: '夸大宣传、过度承诺、标题党、虚假数据',
        },
        keywords: {
          label: '核心关键词',
          format: '输出逗号分隔的关键词列表（5-8 个），不要写成句子。',
          example: 'AI 内容创作、自媒体运营、多平台发布、Agent 驱动',
        },
      };

      const meta = fieldMeta[field] || { label: field, format: '优化内容。', example: '' };
      const brandContext = name?.trim() && industry?.trim()
        ? `\n品牌名称：${name.trim()}\n所属行业：${industry.trim()}`
        : '';

      const systemPrompt = `你是一个专业的品牌内容编辑。用户会提供一段"${meta.label}"的草稿，请你对其进行优化。

要求：
1. 输出必须是合法的 JSON 格式：{"${field}": "优化后的内容"}
2. 所有输出使用中文
3. ${meta.format}
4. 必须保持原文的核心意图，仅做优化，不要引入无关的新信息
5. 输出格式参考："${meta.example}"${brandContext ? '\n6. 参考品牌的行业背景进行针对性优化' : ''}`;

      const userPrompt = `请优化以下${meta.label}内容：

${current.trim()}${brandContext}`;

      const rawOutput = await llm.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1024,
      });

      // Try to extract JSON from the output
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'AI 返回内容无法解析，请重试。' });
        return;
      }

      const result = JSON.parse(jsonMatch[0]);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: '优化失败，请稍后重试。' });
    }
  });

  // ---- Knowledge Entries ----

  router.get('/knowledge', async (req: Request, res: Response) => {
    try {
      const brandId = String(req.query.brandId ?? '');
      const data = await loadData();
      res.json(data.knowledgeEntries.filter((entry) => entry.brandId === brandId));
    } catch {
      res.status(500).json({ error: '读取品牌知识失败。' });
    }
  });

  router.get('/knowledge/:entryId', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const data = await loadData();
      const entry = data.knowledgeEntries.find((e) => e.id === entryId);
      if (!entry) {
        res.status(404).json({ error: '知识条目不存在。' });
        return;
      }
      const full = req.query.full === 'true';
      if (full) {
        const { readKnowledgeMd } = await import('../knowledge/storage');
        const mdContent = await readKnowledgeMd(entryId);
        res.json({ ...entry, mdContent });
      } else {
        res.json(entry);
      }
    } catch {
      res.status(500).json({ error: '读取知识条目失败。' });
    }
  });

  router.delete('/knowledge/:entryId', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const { deleteKnowledgeDir } = await import('../knowledge/storage');
      await deleteKnowledgeDir(entryId);
      await updateData((data) => {
        data.knowledgeEntries = data.knowledgeEntries.filter((e) => e.id !== entryId);
        return { data, result: undefined };
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: '删除知识条目失败。' });
    }
  });

  // ---- Knowledge Upload ----

  const knowledgeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  }).array('files', 10);

  function detectSourceTypeFromFile(file: Express.Multer.File): 'image' | 'pdf' | 'document' | 'text' | 'video' {
    const mime = file.mimetype;
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'document';
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx') return 'document';
    return 'text';
  }

  router.post('/knowledge/upload', (req: Request, res: Response, next: NextFunction) => {
    knowledgeUpload(req, res, (err) => {
      if (err) {
        if ((err as any).code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: '文件超过 50MB 限制。' });
          return;
        }
        if ((err as any).code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({ error: '一次最多上传 10 个文件。' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: '未选择文件。' });
        return;
      }

      const brandId = (req as any).body?.brandId as string;
      if (!brandId) {
        res.status(400).json({ error: '缺少 brandId。' });
        return;
      }

      const unsupportedExts = new Set(['.doc', '.exe', '.dmg', '.apk']);
      const rejected: { fileName: string; reason: string }[] = [];
      const validFiles: Express.Multer.File[] = [];

      for (const file of files) {
        const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '');
        if (unsupportedExts.has(ext)) {
          rejected.push({ fileName: file.originalname, reason: `.${ext} 格式暂不支持` });
        } else {
          validFiles.push(file);
        }
      }

      const data = await loadData();
      const storedConfig = data.config;

      const entries = [];
      const errors = [...rejected];

      for (const file of validFiles) {
        try {
          const entryId = createId('entry');
          const processed = await processFile(
            entryId, brandId,
            { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype },
            storedConfig?.llm,
          );
          const now = new Date().toISOString();
          const entry = {
            id: processed.id, brandId, sourceType: processed.sourceType,
            originalName: processed.originalName, originalMimeType: file.mimetype,
            originalSizeBytes: file.size, status: processed.status,
            summary: processed.summary, tags: processed.tags,
            mdFilePath: `knowledge/${processed.id}/summary.md`,
            extractionConfidence: processed.extractionConfidence,
            extractionError: processed.extractionError, createdAt: now, updatedAt: now,
          };
          await updateData((current) => {
            current.knowledgeEntries.unshift(entry as any);
            return { data: current, result: undefined };
          });
          entries.push(entry);
        } catch (err) {
          errors.push({
            fileName: file.originalname,
            reason: err instanceof Error ? err.message : '处理失败',
          });
        }
      }

      res.status(201).json({ entries, errors });
    } catch {
      res.status(500).json({ error: '上传处理失败。' });
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

  router.post('/drafts/:draftId/generate-cover', async (req: Request, res: Response) => {
    try {
      const { draftId } = req.params;
      const { prompt, size } = (req.body || {}) as { prompt: string; size?: string };

      const data = await loadData();
      const imageGen = getImageGenerator(data.config?.imageGen);
      if (!imageGen) {
        res.status(400).json({ error: '未配置图片生成服务。' });
        return;
      }

      const result = await imageGen.generate({
        prompt: prompt || 'Generate a cover image',
        size: size || '1024x1024',
        n: 1,
        quality: 'medium',
      });

      if (!result.images.length || !result.images[0].base64) {
        res.status(500).json({ error: '图片生成返回空结果。' });
        return;
      }

      const coverImage = {
        base64: result.images[0].base64,
        prompt: prompt || '',
        size: size || '1024x1024',
        format: 'png' as const,
        generatedAt: new Date().toISOString(),
      };

      const updated = await updateData((current) => {
        const draft = current.drafts.find((d) => d.id === draftId);
        if (!draft) throw new Error('未找到对应的草稿。');
        draft.coverImage = coverImage;
        draft.updatedAt = new Date().toISOString();
        return { data: current, result: draft };
      });

      res.json(updated);
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

  // ---- Config Test ----

  function mapHttpError(status: number): string {
    switch (status) {
      case 401: return 'API Key 无效，请检查是否填写正确';
      case 403: return 'API Key 无权限，请检查账户余额和接口权限';
      case 404: return 'Base URL 或 Model 名称错误';
      default: return `API 返回错误 (${status})`;
    }
  }

  router.post('/config/test-llm', async (req: Request, res: Response) => {
    const { apiKey, baseUrl, model } = req.body as { apiKey?: string; baseUrl?: string; model?: string };

    if (!apiKey?.trim()) {
      res.status(400).json({ ok: false, error: '请先填写 API Key' });
      return;
    }
    if (!baseUrl?.trim()) {
      res.status(400).json({ ok: false, error: '请先填写 Base URL' });
      return;
    }

    // HTTP headers require ASCII-only values
    const nonAscii = /[^\x00-\x7F]/;
    if (nonAscii.test(apiKey)) {
      res.status(400).json({ ok: false, error: 'API Key 包含非英文字符，请检查是否复制粘贴时混入了中文' });
      return;
    }
    if (nonAscii.test(baseUrl)) {
      res.status(400).json({ ok: false, error: 'Base URL 包含非英文字符，请检查是否复制粘贴时混入了中文' });
      return;
    }
    if (model && nonAscii.test(model)) {
      res.status(400).json({ ok: false, error: 'Model 名称包含非英文字符' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'deepseek-v4-pro',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
          stream: false,
        }),
        signal: controller.signal,
        ...getProxyDispatcher(),
      });
      clearTimeout(timer);

      const latency = Date.now() - start;

      if (!response.ok) {
        let detail = '';
        try {
          const errBody = await response.text();
          detail = ` — ${errBody.slice(0, 200)}`;
        } catch { /* ignore */ }
        res.json({ ok: false, error: mapHttpError(response.status) + detail });
        return;
      }

      res.json({ ok: true, latency });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        res.json({ ok: false, error: '连接超时（15 秒），请检查 Base URL 是否正确、网络是否可达' });
      } else {
        const msg = err?.message || err?.cause?.message || '';
        if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
          res.json({ ok: false, error: '域名解析失败，请检查 Base URL 中的域名是否正确' });
        } else if (msg.includes('ECONNREFUSED')) {
          res.json({ ok: false, error: '连接被拒绝，请检查 Base URL 和端口是否正确' });
        } else if (msg.includes('CERT') || msg.includes('SSL') || msg.includes('TLS')) {
          res.json({ ok: false, error: 'TLS/SSL 证书验证失败，请检查 Base URL 协议是否正确' });
        } else if (msg.includes('fetch failed') || msg.includes('UND_ERR')) {
          res.json({ ok: false, error: '无法连接目标服务器，可能被网络防火墙拦截，请检查代理设置或更换 Provider' });
        } else {
          res.json({ ok: false, error: `连接失败：${msg || '未知网络错误'}` });
        }
      }
    }
  });

  router.post('/config/test-image-gen', async (req: Request, res: Response) => {
    const { apiKey, baseUrl, model } = req.body as { apiKey?: string; baseUrl?: string; model?: string };

    if (!apiKey?.trim()) {
      res.status(400).json({ ok: false, error: '请先填写 API Key' });
      return;
    }
    if (!baseUrl?.trim()) {
      res.status(400).json({ ok: false, error: '请先填写 Base URL' });
      return;
    }

    const nonAscii = /[^\x00-\x7F]/;
    if (nonAscii.test(apiKey)) {
      res.status(400).json({ ok: false, error: 'API Key 包含非英文字符，请检查是否复制粘贴时混入了中文' });
      return;
    }
    if (nonAscii.test(baseUrl)) {
      res.status(400).json({ ok: false, error: 'Base URL 包含非英文字符，请检查是否复制粘贴时混入了中文' });
      return;
    }
    if (model && nonAscii.test(model)) {
      res.status(400).json({ ok: false, error: 'Model 名称包含非英文字符' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-image-2',
          prompt: 'test',
          n: 1,
          size: '256x256',
          response_format: 'b64_json',
        }),
        signal: controller.signal,
        ...getProxyDispatcher(),
      });
      clearTimeout(timer);

      const latency = Date.now() - start;

      if (!response.ok) {
        let detail = '';
        try {
          const errBody = await response.text();
          detail = ` — ${errBody.slice(0, 200)}`;
        } catch { /* ignore */ }
        res.json({ ok: false, error: mapHttpError(response.status) + detail });
        return;
      }

      res.json({ ok: true, latency });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        res.json({ ok: false, error: '连接超时（15 秒），请检查 Base URL 是否正确、网络是否可达' });
      } else {
        const msg = err?.message || err?.cause?.message || '';
        if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
          res.json({ ok: false, error: '域名解析失败，请检查 Base URL 中的域名是否正确' });
        } else if (msg.includes('ECONNREFUSED')) {
          res.json({ ok: false, error: '连接被拒绝，请检查 Base URL 和端口是否正确' });
        } else if (msg.includes('CERT') || msg.includes('SSL') || msg.includes('TLS')) {
          res.json({ ok: false, error: 'TLS/SSL 证书验证失败，请检查 Base URL 协议是否正确' });
        } else if (msg.includes('fetch failed') || msg.includes('UND_ERR')) {
          res.json({ ok: false, error: '无法连接目标服务器，可能被网络防火墙拦截，请检查代理设置或更换 Provider' });
        } else {
          res.json({ ok: false, error: `连接失败：${msg || '未知网络错误'}` });
        }
      }
    }
  });

  // ---- Config Status ----

  router.get('/config/status', async (_req: Request, res: Response) => {
    const data = await loadData();
    const stored = data.config;

    function getLlmStatus() {
      const apiKey = stored.llm?.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
      const provider = stored.llm?.provider || 'deepseek';
      const model = stored.llm?.model?.trim() || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
      const source = stored.llm?.apiKey?.trim() ? 'stored' : process.env.DEEPSEEK_API_KEY?.trim() ? 'env' : 'none';
      return {
        configured: !!apiKey,
        source: apiKey ? source : 'none',
        hasApiKey: !!apiKey,
        provider,
        model,
      };
    }

    function getImageGenStatus() {
      const apiKey = stored.imageGen?.apiKey?.trim() || process.env.IMAGE_GEN_API_KEY?.trim();
      const provider = stored.imageGen?.provider || '';
      const model = stored.imageGen?.model?.trim() || process.env.IMAGE_GEN_MODEL || 'gpt-image-2';
      const source = stored.imageGen?.apiKey?.trim() ? 'stored' : process.env.IMAGE_GEN_API_KEY?.trim() ? 'env' : 'none';
      return {
        configured: !!apiKey,
        source: apiKey ? source : 'none',
        hasApiKey: !!apiKey,
        provider,
        model,
      };
    }

    res.json({
      llm: getLlmStatus(),
      imageGen: getImageGenStatus(),
    });
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
          planReviewPolicy: undefined,
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
        planReviewPolicy: undefined,
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
