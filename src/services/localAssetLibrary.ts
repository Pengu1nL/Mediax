export type LocalAssetType = 'image' | 'video' | 'pdf' | 'document';

export interface LocalAssetFile {
  id: string;
  name: string;
  type: LocalAssetType;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  updatedAt: string;
  relativePath: string;
  parentPath: string;
  fileHandle: FileSystemFileHandle;
  parentHandle: FileSystemDirectoryHandle;
}

export interface DirectoryNode {
  name: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  children: DirectoryNode[];
  fileCount: number;
}

export interface SkippedAsset {
  name: string;
  path: string;
  reason: string;
}

export interface AssetScanResult {
  root: DirectoryNode;
  files: LocalAssetFile[];
  skipped: SkippedAsset[];
}

export interface WriteFilesResult {
  written: string[];
  skipped: string[];
}

type DirectoryEntryHandle = FileSystemDirectoryHandle | FileSystemFileHandle;
type PermissionMode = 'read' | 'readwrite';
type PermissionDescriptor = { mode?: PermissionMode };

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: PermissionMode }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemHandle {
    queryPermission?: (descriptor?: PermissionDescriptor) => Promise<PermissionState>;
    requestPermission?: (descriptor?: PermissionDescriptor) => Promise<PermissionState>;
  }

  interface FileSystemDirectoryHandle {
    entries?: () => AsyncIterableIterator<[string, DirectoryEntryHandle]>;
    getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
    getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandle>;
    removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
  }

}

const DB_NAME = 'mediax.local-asset-library.v1';
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root-directory';

export const MAX_ASSET_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_ASSET_FILE_SIZE_LABEL = '50MB';
export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.rtf',
] as const;

const SUPPORTED_DOCUMENT_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/rtf',
  'text/rtf',
]);
const IGNORED_SYSTEM_ENTRY_NAMES = new Set([
  '.ds_store',
  '.localized',
  '.spotlight-v100',
  '.trashes',
  '.fseventsd',
  'desktop.ini',
  'thumbs.db',
  '__macosx',
]);

function joinPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function getBaseName(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(0, index) : name;
}

function shouldIgnoreSystemEntry(name: string): boolean {
  const normalized = name.toLowerCase();
  return IGNORED_SYSTEM_ENTRY_NAMES.has(normalized) || normalized.startsWith('._');
}

function normalizeNamePart(name: string): string {
  return name.trim().replace(/[\\/]/g, '-');
}

function normalizePathSegment(name: string): string {
  const normalized = normalizeNamePart(name);
  if (normalized === '.' || normalized === '..') {
    return normalized.replace(/\./g, '-');
  }
  return normalized;
}

function getAssetType(file: File): LocalAssetType | null {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  if (file.type === 'application/pdf') {
    return 'pdf';
  }
  if (SUPPORTED_DOCUMENT_MIME_TYPES.has(file.type) || SUPPORTED_DOCUMENT_EXTENSIONS.includes(getExtension(file.name).toLowerCase() as typeof SUPPORTED_DOCUMENT_EXTENSIONS[number])) {
    return 'document';
  }
  return null;
}

export function getAssetTypeFromNameOrMime(name: string, mimeType: string): LocalAssetType | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (SUPPORTED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return 'document';
  }

  const extension = getExtension(name).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'].includes(extension)) {
    return 'image';
  }
  if (['.mp4', '.mov', '.webm', '.m4v'].includes(extension)) {
    return 'video';
  }
  if (extension === '.pdf') {
    return 'pdf';
  }
  if (SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension as typeof SUPPORTED_DOCUMENT_EXTENSIONS[number])) {
    return 'document';
  }
  return null;
}

export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function formatUpdatedAt(lastModified: number): string {
  return new Date(lastModified).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getEntries(directoryHandle: FileSystemDirectoryHandle): Promise<[string, DirectoryEntryHandle][]> {
  if (!directoryHandle.entries) {
    return [];
  }

  const entries: [string, DirectoryEntryHandle][] = [];
  for await (const entry of directoryHandle.entries()) {
    entries.push(entry);
  }
  return entries.sort(([leftName], [rightName]) => leftName.localeCompare(rightName, 'zh-CN'));
}

async function scanDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  name: string,
  path: string,
  files: LocalAssetFile[],
  skipped: SkippedAsset[],
): Promise<DirectoryNode> {
  const node: DirectoryNode = {
    name,
    path,
    handle: directoryHandle,
    children: [],
    fileCount: 0,
  };

  const entries = await getEntries(directoryHandle);

  for (const [entryName, entryHandle] of entries) {
    const entryPath = joinPath(path, entryName);

    if (shouldIgnoreSystemEntry(entryName)) {
      continue;
    }

    if (entryHandle.kind === 'directory') {
      const child = await scanDirectory(entryHandle, entryName, entryPath, files, skipped);
      node.children.push(child);
      node.fileCount += child.fileCount;
      continue;
    }

    try {
      const file = await entryHandle.getFile();
      const type = getAssetTypeFromNameOrMime(entryName, file.type);

      if (file.size > MAX_ASSET_FILE_SIZE_BYTES) {
        skipped.push({
          name: entryName,
          path: entryPath,
          reason: `文件超过 ${MAX_ASSET_FILE_SIZE_LABEL} 上限`,
        });
        continue;
      }

      if (!type) {
        skipped.push({
          name: entryName,
          path: entryPath,
          reason: '暂不支持此文件类型',
        });
        continue;
      }

      files.push({
        id: entryPath,
        name: entryName,
        type,
        mimeType: file.type,
        sizeBytes: file.size,
        sizeLabel: formatFileSize(file.size),
        updatedAt: formatUpdatedAt(file.lastModified),
        relativePath: entryPath,
        parentPath: path,
        fileHandle: entryHandle,
        parentHandle: directoryHandle,
      });
      node.fileCount += 1;
    } catch {
      skipped.push({
        name: entryName,
        path: entryPath,
        reason: '无法读取此文件',
      });
    }
  }

  return node;
}

export async function scanAssetDirectory(rootHandle: FileSystemDirectoryHandle): Promise<AssetScanResult> {
  const files: LocalAssetFile[] = [];
  const skipped: SkippedAsset[] = [];
  const root = await scanDirectory(rootHandle, rootHandle.name || '素材库', '', files, skipped);

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'));
  skipped.sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'));

  return {
    root,
    files,
    skipped,
  };
}

export async function renameLocalAsset(asset: LocalAssetFile, nextBaseName: string): Promise<string> {
  const normalizedBase = normalizeNamePart(nextBaseName);
  if (!normalizedBase) {
    throw new Error('请输入新的文件名。');
  }

  const extension = getExtension(asset.name);
  const nextName = `${normalizedBase}${extension}`;

  if (nextName === asset.name) {
    return asset.name;
  }

  try {
    await asset.parentHandle.getFileHandle(nextName);
    throw new Error('同名文件已存在。');
  } catch (error) {
    if (error instanceof Error && error.message === '同名文件已存在。') {
      throw error;
    }
  }

  const file = await asset.fileHandle.getFile();
  const nextHandle = await asset.parentHandle.getFileHandle(nextName, { create: true });
  const writable = await nextHandle.createWritable?.();

  if (!writable) {
    throw new Error('当前浏览器不支持写入文件。');
  }

  await writable.write(file);
  await writable.close();
  await asset.parentHandle.removeEntry(asset.name);
  return nextName;
}

export async function deleteLocalAsset(asset: LocalAssetFile): Promise<void> {
  await asset.parentHandle.removeEntry(asset.name);
}

export async function writeFilesToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  files: File[],
  confirmOverwrite: (message: string) => boolean = window.confirm,
): Promise<WriteFilesResult> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    await writeSingleFile(directoryHandle, file, file.name, file.name, confirmOverwrite, written, skipped);
  }

  return { written, skipped };
}

export async function writeFileTreeToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  files: File[],
  confirmOverwrite: (message: string) => boolean = window.confirm,
): Promise<WriteFilesResult> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const segments = getUploadPathSegments(file);
    const fileName = segments.at(-1) ?? file.name;
    const directorySegments = segments.slice(0, -1);
    const uploadPath = [...directorySegments, fileName].join('/');
    let targetDirectory = directoryHandle;

    for (const segment of directorySegments) {
      targetDirectory = await targetDirectory.getDirectoryHandle(segment, { create: true });
    }

    await writeSingleFile(targetDirectory, file, fileName, uploadPath, confirmOverwrite, written, skipped);
  }

  return { written, skipped };
}

async function writeSingleFile(
  directoryHandle: FileSystemDirectoryHandle,
  file: File,
  targetName: string,
  displayPath: string,
  confirmOverwrite: (message: string) => boolean,
  written: string[],
  skipped: string[],
): Promise<void> {
  const type = getAssetType(file);
  if (!type || file.size > MAX_ASSET_FILE_SIZE_BYTES) {
    skipped.push(displayPath);
    return;
  }

  let shouldWrite = true;
  try {
    await directoryHandle.getFileHandle(targetName);
    shouldWrite = confirmOverwrite(`当前目录已存在「${displayPath}」，是否覆盖？`);
  } catch {
    shouldWrite = true;
  }

  if (!shouldWrite) {
    skipped.push(displayPath);
    return;
  }

  const fileHandle = await directoryHandle.getFileHandle(targetName, { create: true });
  const writable = await fileHandle.createWritable?.();
  if (!writable) {
    skipped.push(displayPath);
    return;
  }

  await writable.write(file);
  await writable.close();
  written.push(displayPath);
}

function getUploadPathSegments(file: File): string[] {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const rawPath = relativePath?.trim() || file.name;
  const segments = rawPath
    .replace(/\\/g, '/')
    .split('/')
    .map(normalizePathSegment)
    .filter(Boolean);

  return segments.length > 0 ? segments : [normalizePathSegment(file.name)];
}

export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function getDisplayBaseName(name: string): string {
  return getBaseName(name);
}

export function isFileSystemAccessSupported(view: Window = window): boolean {
  return typeof view.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
}

export async function pickAssetRootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持本地文件夹访问。');
  }
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

export async function ensureReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const descriptor = { mode: 'readwrite' } as const;
  const current = await handle.queryPermission(descriptor);
  if (current === 'granted') {
    return true;
  }

  const next = await handle.requestPermission(descriptor);
  return next === 'granted';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开素材库本地数据库。'));
  });
}

function runHandleStoreTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('素材库本地数据库操作失败。'));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error('素材库本地数据库事务失败。'));
        };
      }),
  );
}

export async function saveRootDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await runHandleStoreTransaction('readwrite', (store) => store.put(handle, ROOT_HANDLE_KEY));
}

export async function getStoredRootDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await runHandleStoreTransaction<FileSystemDirectoryHandle | undefined>('readonly', (store) =>
    store.get(ROOT_HANDLE_KEY),
  );
  return handle ?? null;
}

export async function clearRootDirectoryHandle(): Promise<void> {
  await runHandleStoreTransaction('readwrite', (store) => store.delete(ROOT_HANDLE_KEY));
}
