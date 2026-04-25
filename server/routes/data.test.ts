import { describe, expect, it, vi } from 'vitest';
import type { AppData } from '../../src/types';
import { createDataRouter } from './data';

const storeMocks = vi.hoisted(() => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
}));

vi.mock('../store', () => ({
  loadData: storeMocks.loadData,
  saveData: storeMocks.saveData,
}));

function dataWithDraft(): AppData {
  return {
    brand: {
      id: 'brand-1',
      name: 'Mediax',
      industry: 'content',
      keywords: [],
      summary: '',
      defaultReviewPolicy: 'manual_required',
      setupComplete: false,
      channels: [],
    },
    assets: [],
    plans: [],
    planTasks: [],
    drafts: [
      {
        id: 'draft-1',
        platform: '微信公众号',
        group: '品牌宣传',
        status: 'draft',
        title: '招生文案',
        excerpt: '摘要',
        content: '正文',
        updatedAt: '2026-04-24T12:00:00.000Z',
      },
    ],
  };
}

describe('data API routes', () => {
  it('returns a single draft by id for the API repository', async () => {
    storeMocks.loadData.mockResolvedValue(dataWithDraft());
    storeMocks.saveData.mockResolvedValue(undefined);

    const router = createDataRouter();
    const hasDraftDetailRoute = router.stack.some((layer) => {
      const route = layer.route as { path?: unknown; methods?: Record<string, boolean> } | undefined;
      return route?.path === '/drafts/:draftId' && route.methods?.get;
    });

    expect(hasDraftDetailRoute).toBe(true);
  });
});
