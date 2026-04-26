import { describe, expect, it, vi } from 'vitest';
import type { AppData } from '../../src/types';

const storeMocks = vi.hoisted(() => ({
  loadData: vi.fn(),
  updateData: vi.fn(),
}));

vi.mock('../store', () => ({
  loadData: storeMocks.loadData,
  updateData: storeMocks.updateData,
}));

import { runAgentTask } from './runAgentTask';

function seedData(): AppData {
  return {
    brand: {
      id: 'brand-1',
      name: '建桥融高',
      industry: '教育',
      keywords: ['融合教育'],
      summary: '品牌简介',
      audience: '学生家庭',
      positioning: '融合教育品牌',
      toneOfVoice: '专业、温暖、可信',
      doAndDonts: ['不夸大升学结果'],
      defaultReviewPolicy: 'manual_required',
      setupComplete: true,
      channels: [],
    },
    assets: [],
    knowledgeItems: [
      {
        id: 'k1',
        brandId: 'brand-1',
        sourceType: 'manual_note' as const,
        sourceName: '招生话术',
        contentType: 'text' as const,
        status: 'ready' as const,
        summary: '招生传播应专业可信。',
        tags: ['招生'],
        assetIds: [],
        confidence: 0.9,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
      },
    ],
    plans: [
      {
        id: 'plan-1',
        title: '秋季招生计划',
        status: 'active' as const,
        startDate: '2026-09-01',
        endDate: '2026-10-15',
        category: '招生季',
        brandId: 'brand-1',
      },
    ],
    planTasks: [
      {
        id: 'task-1',
        planId: 'plan-1',
        title: '公众号招生海报',
        executionType: 'single' as const,
        schedule: '2026-09-01 10:00',
        status: 'draft' as const,
        brandId: 'brand-1',
        brief: '发布秋季招生主视觉海报，突出融合教育理念。',
        channel: '微信公众号',
        contentType: '图文',
        requirements: ['使用品牌视觉规范'],
        researchInstructions: '调研招生季热门话题',
        reviewPolicy: 'manual_required' as const,
      },
    ],
    drafts: [],
    agentRuns: [],
    publishRecords: [],
  };
}

describe('runAgentTask', () => {
  it('creates a draft linked to taskId, planId, brandId and agentRunId', async () => {
    let storedDraft: unknown = null;
    let storedAgentRun: unknown = null;

    storeMocks.updateData.mockImplementation(async (fn: (data: AppData) => { data: AppData; result: unknown }) => {
      const cloned = JSON.parse(JSON.stringify(seedData())) as AppData;
      const next = fn(cloned);
      storedDraft = next.data.drafts[0];
      storedAgentRun = next.data.agentRuns[0];
      return next.result;
    });

    const agentRun = await runAgentTask('task-1');

    // Verify agent run record
    expect(agentRun.status).toBe('waiting_for_review');
    expect(agentRun.brandId).toBe('brand-1');
    expect(agentRun.taskId).toBe('task-1');
    expect(agentRun.steps).toHaveLength(3);
    expect(agentRun.usedKnowledgeItemIds).toEqual(['k1']);
    expect(agentRun.outputDraftId).toBeTruthy();

    // Verify draft is linked to task, plan, brand, and agent run
    const draft = storedDraft as Record<string, unknown> | null;
    expect(draft).toBeTruthy();
    expect(draft!.taskId).toBe('task-1');
    expect(draft!.planId).toBe('plan-1');
    expect(draft!.platform).toBe('微信公众号');
    expect(draft!.group).toBe('图文');
    expect(draft!.status).toBe('review');
    expect(draft!.title).toBe('公众号招生海报');
    expect(draft!.content).toContain('建桥融高');

    // Verify task is updated
    const storedRun = storedAgentRun as Record<string, unknown> | null;
    expect(storedRun).toBeTruthy();
    expect(storedRun!.outputDraftId).toBe(draft!.id);
  });
});
