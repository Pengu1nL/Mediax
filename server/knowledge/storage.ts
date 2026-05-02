import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { KnowledgeEntry } from '../../src/types';

const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || join(process.cwd(), 'knowledge');

export function entryDir(entryId: string): string {
  return join(KNOWLEDGE_DIR, entryId);
}

async function ensureEntryDir(entryId: string): Promise<string> {
  const dir = entryDir(entryId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeKnowledgeFiles(
  entryId: string,
  originalBuffer: Buffer,
  summaryMd: string,
  meta: Omit<KnowledgeEntry, 'id' | 'summary' | 'tags' | 'mdFilePath'>,
): Promise<string> {
  const dir = await ensureEntryDir(entryId);
  const ext = meta.originalName.split('.').pop() || 'bin';
  await writeFile(join(dir, `original.${ext}`), originalBuffer);
  await writeFile(join(dir, 'summary.md'), summaryMd, 'utf-8');
  await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  return `knowledge/${entryId}/summary.md`;
}

export async function readKnowledgeMd(entryId: string): Promise<string> {
  try {
    return await readFile(join(entryDir(entryId), 'summary.md'), 'utf-8');
  } catch {
    return '';
  }
}

export async function deleteKnowledgeDir(entryId: string): Promise<void> {
  await rm(entryDir(entryId), { recursive: true, force: true });
}

export async function writeMigrationFiles(
  entryId: string,
  summaryMd: string,
  meta: Record<string, unknown>,
): Promise<string> {
  const dir = await ensureEntryDir(entryId);
  await writeFile(join(dir, 'summary.md'), summaryMd, 'utf-8');
  await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  return `knowledge/${entryId}/summary.md`;
}
