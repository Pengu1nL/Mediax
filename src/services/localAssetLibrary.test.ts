import { describe, expect, it, vi } from 'vitest';
import {
  MAX_ASSET_FILE_SIZE_BYTES,
  deleteLocalAsset,
  renameLocalAsset,
  scanAssetDirectory,
  writeFilesToDirectory,
  writeFileTreeToDirectory,
  type DirectoryNode,
} from './localAssetLibrary';

class FakeFileHandle {
  readonly kind = 'file';

  constructor(
    public name: string,
    private file: File,
  ) {}

  async getFile() {
    return this.file;
  }
}

class FakeDirectoryHandle {
  readonly kind = 'directory';
  entriesMap = new Map<string, FakeDirectoryHandle | FakeFileHandle>();
  removed: string[] = [];

  constructor(public name: string) {}

  async *entries() {
    for (const entry of this.entriesMap.entries()) {
      yield entry;
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existing = this.entriesMap.get(name);
    if (existing instanceof FakeFileHandle) {
      return existing;
    }

    if (!options?.create) {
      throw new DOMException('File not found', 'NotFoundError');
    }

    const handle = new WritableFakeFileHandle(name, new File([''], name, { type: 'application/octet-stream' }));
    this.entriesMap.set(name, handle);
    return handle;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existing = this.entriesMap.get(name);
    if (existing instanceof FakeDirectoryHandle) {
      return existing;
    }

    if (!options?.create) {
      throw new DOMException('Directory not found', 'NotFoundError');
    }

    const handle = new FakeDirectoryHandle(name);
    this.entriesMap.set(name, handle);
    return handle;
  }

  async removeEntry(name: string) {
    if (!this.entriesMap.has(name)) {
      throw new DOMException('File not found', 'NotFoundError');
    }

    this.entriesMap.delete(name);
    this.removed.push(name);
  }
}

class WritableFakeFileHandle extends FakeFileHandle {
  written: Blob | null = null;

  async createWritable() {
    return {
      write: async (blob: Blob) => {
        this.written = blob;
      },
      close: async () => undefined,
    };
  }
}

function fileHandle(name: string, file: File) {
  return new FakeFileHandle(name, file);
}

function dir(name: string, entries: Record<string, FakeDirectoryHandle | FakeFileHandle> = {}) {
  const handle = new FakeDirectoryHandle(name);
  for (const [entryName, entryHandle] of Object.entries(entries)) {
    handle.entriesMap.set(entryName, entryHandle);
  }
  return handle;
}

function childPaths(node: DirectoryNode): string[] {
  return node.children.flatMap((child) => [child.path, ...childPaths(child)]);
}

function folderFile(content: string, name: string, relativePath: string, type: string) {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: relativePath,
  });
  return file;
}

describe('local asset library service', () => {
  it('recursively scans supported local files and builds a directory tree', async () => {
    const root = dir('素材库', {
      'hero.jpg': fileHandle('hero.jpg', new File(['image'], 'hero.jpg', { type: 'image/jpeg' })),
      docs: dir('docs', {
        'guide.pdf': fileHandle('guide.pdf', new File(['pdf'], 'guide.pdf', { type: 'application/pdf' })),
        '招生简章.docx': fileHandle(
          '招生简章.docx',
          new File(['docx'], '招生简章.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ),
        '排期.csv': fileHandle('排期.csv', new File(['csv'], '排期.csv', { type: 'text/csv' })),
      }),
      video: dir('video', {
        'teaser.mp4': fileHandle('teaser.mp4', new File(['video'], 'teaser.mp4', { type: 'video/mp4' })),
      }),
    });

    const result = await scanAssetDirectory(root as unknown as FileSystemDirectoryHandle);

    expect(result.files.map((asset) => asset.relativePath)).toEqual([
      'docs/排期.csv',
      'docs/招生简章.docx',
      'docs/guide.pdf',
      'hero.jpg',
      'video/teaser.mp4',
    ]);
    expect(result.files.map((asset) => asset.type)).toEqual(['document', 'document', 'pdf', 'image', 'video']);
    expect(result.files.find((asset) => asset.name === 'guide.pdf')).toMatchObject({
      id: 'docs/guide.pdf',
      name: 'guide.pdf',
      parentPath: 'docs',
      sizeLabel: '3 B',
    });
    expect(childPaths(result.root)).toEqual(['docs', 'video']);
    expect(result.root.fileCount).toBe(5);
    expect(result.skipped).toEqual([]);
  });

  it('skips unsupported and oversized files without aborting the scan', async () => {
    const oversized = new File(['x'], 'large.mov', { type: 'video/quicktime' });
    Object.defineProperty(oversized, 'size', { value: MAX_ASSET_FILE_SIZE_BYTES + 1 });
    const root = dir('素材库', {
      'archive.zip': fileHandle('archive.zip', new File(['zip'], 'archive.zip', { type: 'application/zip' })),
      'large.mov': fileHandle('large.mov', oversized),
      'ok.png': fileHandle('ok.png', new File(['image'], 'ok.png', { type: 'image/png' })),
    });

    const result = await scanAssetDirectory(root as unknown as FileSystemDirectoryHandle);

    expect(result.files.map((asset) => asset.name)).toEqual(['ok.png']);
    expect(result.skipped).toEqual([
      { name: 'archive.zip', path: 'archive.zip', reason: '暂不支持此文件类型' },
      { name: 'large.mov', path: 'large.mov', reason: '文件超过 50MB 上限' },
    ]);
  });

  it('ignores OS metadata files without showing skipped warnings', async () => {
    const root = dir('素材库', {
      '.DS_Store': fileHandle('.DS_Store', new File(['finder'], '.DS_Store', { type: '' })),
      'Thumbs.db': fileHandle('Thumbs.db', new File(['windows'], 'Thumbs.db', { type: '' })),
      '.localized': fileHandle('.localized', new File(['localized'], '.localized', { type: '' })),
      '__MACOSX': dir('__MACOSX', {
        '._hero.jpg': fileHandle('._hero.jpg', new File(['resource fork'], '._hero.jpg', { type: '' })),
      }),
    });

    const result = await scanAssetDirectory(root as unknown as FileSystemDirectoryHandle);

    expect(result.files).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.root.children).toEqual([]);
  });

  it('renames a file by copying it to a new handle and removing the original entry', async () => {
    const image = new File(['image'], 'poster.png', { type: 'image/png' });
    const parent = dir('素材库', {
      'poster.png': fileHandle('poster.png', image),
    });
    const asset = (await scanAssetDirectory(parent as unknown as FileSystemDirectoryHandle)).files[0];

    const renamed = await renameLocalAsset(asset, '招生主视觉');

    expect(renamed).toBe('招生主视觉.png');
    expect(parent.removed).toEqual(['poster.png']);
    const newHandle = await parent.getFileHandle('招生主视觉.png');
    expect(newHandle).toBeInstanceOf(WritableFakeFileHandle);
    expect((newHandle as WritableFakeFileHandle).written).toBe(image);
  });

  it('prevents renaming when the target file already exists', async () => {
    const parent = dir('素材库', {
      'poster.png': fileHandle('poster.png', new File(['image'], 'poster.png', { type: 'image/png' })),
      'taken.png': fileHandle('taken.png', new File(['image'], 'taken.png', { type: 'image/png' })),
    });
    const asset = (await scanAssetDirectory(parent as unknown as FileSystemDirectoryHandle)).files.find(
      (item) => item.name === 'poster.png',
    );

    await expect(renameLocalAsset(asset!, 'taken')).rejects.toThrow('同名文件已存在。');
    expect(parent.removed).toEqual([]);
  });

  it('deletes a file from its parent directory', async () => {
    const parent = dir('素材库', {
      'poster.png': fileHandle('poster.png', new File(['image'], 'poster.png', { type: 'image/png' })),
    });
    const asset = (await scanAssetDirectory(parent as unknown as FileSystemDirectoryHandle)).files[0];

    await deleteLocalAsset(asset);

    expect(parent.removed).toEqual(['poster.png']);
    expect(parent.entriesMap.has('poster.png')).toBe(false);
  });

  it('writes selected files into the active directory and asks before overwriting', async () => {
    const confirm = vi.fn(() => false);
    const target = dir('素材库', {
      'poster.png': fileHandle('poster.png', new File(['old'], 'poster.png', { type: 'image/png' })),
    });

    const result = await writeFilesToDirectory(
      target as unknown as FileSystemDirectoryHandle,
      [
        new File(['new'], 'poster.png', { type: 'image/png' }),
        new File(['pdf'], 'guide.pdf', { type: 'application/pdf' }),
      ],
      confirm,
    );

    expect(result).toEqual({ written: ['guide.pdf'], skipped: ['poster.png'] });
    const guide = await target.getFileHandle('guide.pdf');
    expect((guide as WritableFakeFileHandle).written?.size).toBe(3);
  });

  it('writes a selected folder into the active directory while preserving nested paths', async () => {
    const target = dir('素材库');
    const files = [
      folderFile('image', 'poster.png', 'Campaign/kv/poster.png', 'image/png'),
      folderFile(
        'docx',
        '招生简章.docx',
        'Campaign/docs/招生简章.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ];

    const result = await writeFileTreeToDirectory(target as unknown as FileSystemDirectoryHandle, files, vi.fn());

    expect(result).toEqual({
      written: ['Campaign/kv/poster.png', 'Campaign/docs/招生简章.docx'],
      skipped: [],
    });

    const campaign = await target.getDirectoryHandle('Campaign');
    const kv = await campaign.getDirectoryHandle('kv');
    const docs = await campaign.getDirectoryHandle('docs');
    expect((await kv.getFileHandle('poster.png'))).toBeInstanceOf(WritableFakeFileHandle);
    expect((await docs.getFileHandle('招生简章.docx'))).toBeInstanceOf(WritableFakeFileHandle);
  });
});
