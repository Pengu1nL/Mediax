import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadData, saveData, updateData } from './store';
import type { AppData, Plan } from '../src/types';

function emptyData(): AppData {
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
    drafts: [],
    agentRuns: [],
    publishRecords: [],
    config: { llm: { provider: '', apiKey: '', baseUrl: '', model: '' }, imageGen: { provider: '', apiKey: '', baseUrl: '', model: '' }, videoGen: { provider: '', apiKey: '', baseUrl: '', model: '' } },
  };
}

function plan(id: string, title: string): Plan {
  return {
    id,
    title,
    status: 'draft',
    startDate: '2026-04-01',
    endDate: '2026-04-02',
  };
}

describe('server data store', () => {
  let tempDir = '';
  let previousDataPath: string | undefined;

  beforeEach(async () => {
    previousDataPath = process.env.MEDIAX_DATA_PATH;
    tempDir = await mkdtemp(join(tmpdir(), 'mediax-store-'));
    process.env.MEDIAX_DATA_PATH = join(tempDir, 'data.json');
    await saveData(emptyData());
  });

  afterEach(async () => {
    if (previousDataPath === undefined) {
      delete process.env.MEDIAX_DATA_PATH;
    } else {
      process.env.MEDIAX_DATA_PATH = previousDataPath;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it('serializes overlapping updates so both writes are preserved', async () => {
    await Promise.all([
      updateData((data) => {
        const nextPlan = plan('plan-a', 'A');
        data.plans.push(nextPlan);
        return { data, result: nextPlan };
      }),
      updateData((data) => {
        const nextPlan = plan('plan-b', 'B');
        data.plans.push(nextPlan);
        return { data, result: nextPlan };
      }),
    ]);

    const result = await loadData();

    expect(result.plans.map((item) => item.id).sort()).toEqual(['plan-a', 'plan-b']);
  });
});
