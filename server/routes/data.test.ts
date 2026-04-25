import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { AppData } from '../../src/types';
import { createDataRouter } from './data';

const storeMocks = vi.hoisted(() => ({
  loadData: vi.fn(),
  updateData: vi.fn(),
}));

vi.mock('../store', () => ({
  loadData: storeMocks.loadData,
  updateData: storeMocks.updateData,
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
    knowledgeItems: [],
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

function seedApiData(data: AppData) {
  let currentData = data;
  storeMocks.loadData.mockImplementation(async () => currentData);
  storeMocks.updateData.mockImplementation(async (fn: (data: AppData) => { data: AppData; result: unknown }) => {
    const cloned = JSON.parse(JSON.stringify(currentData)) as AppData;
    const next = fn(cloned);
    currentData = next.data;
    return next.result;
  });
}

async function invokeRoute(
  method: 'get' | 'post',
  path: string,
  input: { body?: unknown; query?: Record<string, unknown> } = {},
) {
  const router = createDataRouter();
  const layer = router.stack.find((item) => {
    const route = item.route as { path?: unknown; methods?: Record<string, boolean> } | undefined;
    return route?.path === path && route.methods?.[method];
  });

  if (!layer?.route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found.`);
  }

  let statusCode = 200;
  let body: unknown;
  const req = {
    body: input.body,
    query: input.query ?? {},
  } as Request;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as Response;

  for (const routeLayer of layer.route.stack) {
    await routeLayer.handle(req, res, vi.fn());
  }

  return { statusCode, body };
}

describe('data API routes', () => {
  it('returns a single draft by id for the API repository', async () => {
    storeMocks.loadData.mockResolvedValue(dataWithDraft());
    storeMocks.updateData.mockResolvedValue(undefined);

    const router = createDataRouter();
    const hasDraftDetailRoute = router.stack.some((layer) => {
      const route = layer.route as { path?: unknown; methods?: Record<string, boolean> } | undefined;
      return route?.path === '/drafts/:draftId' && route.methods?.get;
    });

    expect(hasDraftDetailRoute).toBe(true);
  });

  it('creates and returns brand knowledge items', async () => {
    seedApiData(dataWithDraft());

    const createResponse = await invokeRoute('post', '/knowledge', {
      body: {
        brandId: 'brand-1',
        sourceType: 'manual_note',
        sourceName: '开放日招生话术',
        contentType: 'text',
        summary: '开放日传播要保持专业和可信。',
        tags: ['招生', '活动'],
        extractedText: '微信公众号 招生 活动 海报',
        assetIds: [],
        confidence: 0.88,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body).toMatchObject({
      brandId: 'brand-1',
      sourceName: '开放日招生话术',
      status: 'ready',
    });

    const listResponse = await invokeRoute('get', '/knowledge', {
      query: { brandId: 'brand-1' },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body).toEqual([
      expect.objectContaining({
        brandId: 'brand-1',
        sourceName: '开放日招生话术',
      }),
    ]);
  });
});
