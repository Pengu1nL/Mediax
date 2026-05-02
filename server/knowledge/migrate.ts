import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { KnowledgeEntry } from '../../src/types';

/** Legacy type used before D9 knowledge-base refactor for migration. */
interface BrandKnowledgeItem {
  id?: string;
  brandId: string;
  sourceName: string;
  sourceType: string;
  tags: string[];
  confidence: number;
  summary: string;
  createdAt: string;
}
import { writeMigrationFiles } from './storage';
import { loadData, saveData } from '../store';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function migrateKnowledgeItems(): Promise<number> {
  const data = await loadData();

  if (data.knowledgeEntries && data.knowledgeEntries.length > 0) {
    console.log('[migrate] knowledgeEntries already exist, skipping migration.');
    return 0;
  }

  const oldItems = (data as any).knowledgeItems as BrandKnowledgeItem[] | undefined;
  if (!oldItems || oldItems.length === 0) {
    console.log('[migrate] No legacy knowledgeItems to migrate.');
    return 0;
  }

  console.log(`[migrate] Found ${oldItems.length} legacy knowledgeItems. Starting migration...`);

  const dataPath = process.env.MEDIAX_DATA_PATH || join(process.cwd(), 'data.json');
  const backupPath = dataPath.replace('.json', '.pre-d9.bak');
  await copyFile(dataPath, backupPath);
  console.log(`[migrate] Backup saved to ${backupPath}`);

  const entries: KnowledgeEntry[] = [];
  const now = new Date().toISOString();

  for (const old of oldItems) {
    const entryId = old.id || createId('entry');
    const summaryMd = [
      `# ${old.sourceName}`,
      '',
      `**来源类型：** ${old.sourceType}`,
      `**标签：** ${old.tags.join(', ') || '无'}`,
      `**置信度：** ${old.confidence}`,
      '',
      old.summary || '无内容',
    ].join('\n');

    await writeMigrationFiles(entryId, summaryMd, {
      brandId: old.brandId,
      sourceType: mapLegacySourceType(old.sourceType),
      originalName: old.sourceName,
      originalMimeType: 'application/octet-stream',
      originalSizeBytes: 0,
      status: 'ready',
      extractionConfidence: old.confidence,
      migratedFromLegacy: true,
      createdAt: old.createdAt,
      updatedAt: now,
    });

    entries.push({
      id: entryId,
      brandId: old.brandId,
      sourceType: mapLegacySourceType(old.sourceType),
      originalName: old.sourceName,
      originalMimeType: 'application/octet-stream',
      originalSizeBytes: 0,
      status: 'ready',
      summary: old.summary.slice(0, 160),
      tags: old.tags,
      mdFilePath: `knowledge/${entryId}/summary.md`,
      extractionConfidence: old.confidence,
      migratedFromLegacy: true,
      createdAt: old.createdAt,
      updatedAt: now,
    });
  }

  const updated = { ...data, knowledgeEntries: entries };
  delete (updated as any).knowledgeItems;
  await saveData(updated);

  console.log(`[migrate] Migration complete. ${entries.length} entries migrated.`);
  return entries.length;
}

function mapLegacySourceType(sourceType: string): KnowledgeEntry['sourceType'] {
  switch (sourceType) {
    case 'asset': case 'image': return 'image';
    case 'website': return 'text';
    case 'manual_note': return 'text';
    case 'historic_content': return 'document';
    default: return 'text';
  }
}
