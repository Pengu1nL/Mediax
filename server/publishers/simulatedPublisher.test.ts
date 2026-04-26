import { describe, expect, it } from 'vitest';
import { resolveReviewPolicy, simulatePublish, exportDraft } from './simulatedPublisher';
import type { Draft } from '../../src/types';

const baseDraft: Draft = {
  id: 'draft-1',
  planId: 'plan-1',
  taskId: 'task-1',
  platform: '微信公众号',
  group: '图文',
  status: 'ready',
  title: '测试草稿',
  excerpt: '摘要',
  content: '正文内容',
  updatedAt: '2026-04-26T10:00:00Z',
};

describe('resolveReviewPolicy', () => {
  it('returns task policy when set', () => {
    expect(resolveReviewPolicy({
      taskPolicy: 'auto_publish',
      planPolicy: 'manual_required',
      brandPolicy: 'manual_required',
    })).toBe('auto_publish');
  });

  it('falls back to plan policy when task policy is not set', () => {
    expect(resolveReviewPolicy({
      planPolicy: 'auto_if_low_risk',
      brandPolicy: 'manual_required',
    })).toBe('auto_if_low_risk');
  });

  it('falls back to brand policy as last resort', () => {
    expect(resolveReviewPolicy({
      brandPolicy: 'manual_required',
    })).toBe('manual_required');
  });
});

describe('simulatePublish', () => {
  it('creates a publish record and returns published task status', () => {
    const result = simulatePublish({
      draft: baseDraft,
      brandReviewPolicy: 'manual_required',
    });

    expect(result.record.id).toMatch(/^pub-/);
    expect(result.record.draftId).toBe('draft-1');
    expect(result.record.platform).toBe('微信公众号');
    expect(result.record.status).toBe('published');
    expect(result.record.publishedAt).toBeTruthy();
    expect(result.taskStatus).toBe('published');
  });

  it('rejects publishing a non-ready draft', () => {
    expect(() => simulatePublish({
      draft: { ...baseDraft, status: 'draft' },
      brandReviewPolicy: 'manual_required',
    })).toThrow('只有已批准的草稿才能发布');
  });
});

describe('exportDraft', () => {
  it('returns an export package with platform note', () => {
    const pkg = exportDraft({
      draft: baseDraft,
      brandReviewPolicy: 'manual_required',
    });

    expect(pkg.title).toBe('测试草稿');
    expect(pkg.platform).toBe('微信公众号');
    expect(pkg.content).toBe('正文内容');
    expect(pkg.platformNote).toContain('微信公众号后台');
    expect(pkg.assets).toEqual([]);
  });
});
