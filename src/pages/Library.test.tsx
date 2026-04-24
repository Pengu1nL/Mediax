import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetScanResult, DirectoryNode, LocalAssetFile } from '../services/localAssetLibrary';
import Library from './Library';

const serviceMocks = vi.hoisted(() => ({
  clearRootDirectoryHandle: vi.fn(),
  createObjectUrl: vi.fn(),
  deleteLocalAsset: vi.fn(),
  ensureReadWritePermission: vi.fn(),
  getDisplayBaseName: vi.fn((name: string) => name.replace(/\.[^.]+$/, '')),
  getStoredRootDirectoryHandle: vi.fn(),
  isFileSystemAccessSupported: vi.fn(),
  pickAssetRootDirectory: vi.fn(),
  renameLocalAsset: vi.fn(),
  revokeObjectUrl: vi.fn(),
  saveRootDirectoryHandle: vi.fn(),
  scanAssetDirectory: vi.fn(),
  writeFilesToDirectory: vi.fn(),
  writeFileTreeToDirectory: vi.fn(),
}));

vi.mock('../services/localAssetLibrary', () => ({
  MAX_ASSET_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  SUPPORTED_DOCUMENT_EXTENSIONS: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf'],
  clearRootDirectoryHandle: serviceMocks.clearRootDirectoryHandle,
  createObjectUrl: serviceMocks.createObjectUrl,
  deleteLocalAsset: serviceMocks.deleteLocalAsset,
  ensureReadWritePermission: serviceMocks.ensureReadWritePermission,
  getDisplayBaseName: serviceMocks.getDisplayBaseName,
  getStoredRootDirectoryHandle: serviceMocks.getStoredRootDirectoryHandle,
  isFileSystemAccessSupported: serviceMocks.isFileSystemAccessSupported,
  pickAssetRootDirectory: serviceMocks.pickAssetRootDirectory,
  renameLocalAsset: serviceMocks.renameLocalAsset,
  revokeObjectUrl: serviceMocks.revokeObjectUrl,
  saveRootDirectoryHandle: serviceMocks.saveRootDirectoryHandle,
  scanAssetDirectory: serviceMocks.scanAssetDirectory,
  writeFilesToDirectory: serviceMocks.writeFilesToDirectory,
  writeFileTreeToDirectory: serviceMocks.writeFileTreeToDirectory,
}));

const rootHandle = { name: '素材库' } as FileSystemDirectoryHandle;
const campaignHandle = { name: 'campaign' } as FileSystemDirectoryHandle;
const docsHandle = { name: 'docs' } as FileSystemDirectoryHandle;

function directoryNode(
  name: string,
  path: string,
  handle: FileSystemDirectoryHandle,
  children: DirectoryNode[] = [],
  fileCount = 0,
): DirectoryNode {
  return { name, path, handle, children, fileCount };
}

function localAsset(overrides: Partial<LocalAssetFile> & Pick<LocalAssetFile, 'name' | 'relativePath'>): LocalAssetFile {
  const file = new File(['asset'], overrides.name, { type: overrides.mimeType ?? 'image/png' });
  return {
    id: overrides.relativePath,
    name: overrides.name,
    type: overrides.type ?? 'image',
    mimeType: overrides.mimeType ?? 'image/png',
    sizeBytes: overrides.sizeBytes ?? file.size,
    sizeLabel: overrides.sizeLabel ?? '5 B',
    updatedAt: overrides.updatedAt ?? '04/24 10:00',
    relativePath: overrides.relativePath,
    parentPath: overrides.parentPath ?? '',
    fileHandle:
      overrides.fileHandle ??
      ({
        getFile: async () => file,
      } as unknown as FileSystemFileHandle),
    parentHandle: overrides.parentHandle ?? rootHandle,
  };
}

function scanResult(): AssetScanResult {
  const campaign = directoryNode('campaign', 'campaign', campaignHandle, [], 1);
  const docs = directoryNode('docs', 'docs', docsHandle, [], 1);

  return {
    root: directoryNode('素材库', '', rootHandle, [campaign, docs], 3),
    files: [
      localAsset({
        name: 'poster.png',
        relativePath: 'campaign/poster.png',
        parentPath: 'campaign',
        parentHandle: campaignHandle,
      }),
      localAsset({
        name: 'brief.pdf',
        relativePath: 'docs/brief.pdf',
        parentPath: 'docs',
        parentHandle: docsHandle,
        type: 'pdf',
        mimeType: 'application/pdf',
      }),
      localAsset({
        name: 'teaser.mp4',
        relativePath: 'teaser.mp4',
        parentPath: '',
        type: 'video',
        mimeType: 'video/mp4',
      }),
    ],
    skipped: [],
  };
}

describe('Library page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    serviceMocks.clearRootDirectoryHandle.mockReset();
    serviceMocks.createObjectUrl.mockReset().mockImplementation((file: File) => `blob:${file.name}`);
    serviceMocks.deleteLocalAsset.mockReset().mockResolvedValue(undefined);
    serviceMocks.ensureReadWritePermission.mockReset().mockResolvedValue(true);
    serviceMocks.getStoredRootDirectoryHandle.mockReset().mockResolvedValue(null);
    serviceMocks.isFileSystemAccessSupported.mockReset().mockReturnValue(true);
    serviceMocks.pickAssetRootDirectory.mockReset().mockResolvedValue(rootHandle);
    serviceMocks.renameLocalAsset.mockReset().mockResolvedValue('renamed.png');
    serviceMocks.revokeObjectUrl.mockReset();
    serviceMocks.saveRootDirectoryHandle.mockReset().mockResolvedValue(undefined);
    serviceMocks.scanAssetDirectory.mockReset().mockResolvedValue(scanResult());
    serviceMocks.writeFilesToDirectory.mockReset().mockResolvedValue({ written: ['new.png'], skipped: [] });
    serviceMocks.writeFileTreeToDirectory.mockReset().mockResolvedValue({
      written: ['Campaign/poster.png'],
      skipped: [],
    });
  });

  it('shows a browser support message when local folder access is unavailable', async () => {
    serviceMocks.isFileSystemAccessSupported.mockReturnValue(false);

    render(<Library />);

    expect(await screen.findByText('当前浏览器不支持本地文件夹访问')).toBeInTheDocument();
    expect(screen.getByText('请使用 Chrome 或 Edge 打开 Mediax，再绑定本地素材文件夹。')).toBeInTheDocument();
  });

  it('starts empty and lets the user bind a local asset folder', async () => {
    const user = userEvent.setup();

    render(<Library />);

    expect(await screen.findByRole('heading', { name: '绑定本地素材文件夹' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '绑定本地素材文件夹' }));

    expect(serviceMocks.pickAssetRootDirectory).toHaveBeenCalledTimes(1);
    expect(serviceMocks.saveRootDirectoryHandle).toHaveBeenCalledWith(rootHandle);
    expect(await screen.findByTestId('directory-card-campaign')).toBeInTheDocument();
    expect(screen.getByText('teaser.mp4')).toBeInTheDocument();
    expect(screen.queryByText('poster.png')).not.toBeInTheDocument();
  });

  it('filters assets by directory navigation and global search', async () => {
    const user = userEvent.setup();
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    expect(await screen.findByText('teaser.mp4')).toBeInTheDocument();
    expect(screen.queryByText('poster.png')).not.toBeInTheDocument();
    expect(screen.getByTestId('directory-card-campaign')).toBeInTheDocument();

    await user.click(within(screen.getByTestId('directory-card-docs')).getByRole('button', { name: '打开文件夹 docs' }));

    await waitFor(() => expect(screen.queryByText('poster.png')).not.toBeInTheDocument());
    expect(screen.getByText('brief.pdf')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('搜索文件或路径...'));
    await user.type(screen.getByPlaceholderText('搜索文件或路径...'), 'teaser');

    expect(screen.getByText('teaser.mp4')).toBeInTheDocument();
    expect(screen.queryByText('brief.pdf')).not.toBeInTheDocument();
  });

  it('opens child folders from the content area and shows only direct children', async () => {
    const user = userEvent.setup();
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    const campaignFolder = await screen.findByTestId('directory-card-campaign');
    expect(screen.getByText('teaser.mp4')).toBeInTheDocument();
    expect(screen.queryByText('poster.png')).not.toBeInTheDocument();

    await user.click(within(campaignFolder).getByRole('button', { name: '打开文件夹 campaign' }));

    expect(await screen.findByText('poster.png')).toBeInTheDocument();
    expect(screen.queryByText('teaser.mp4')).not.toBeInTheDocument();
    expect(screen.queryByText('brief.pdf')).not.toBeInTheDocument();
  });

  it('renames and deletes local files after confirmation', async () => {
    const user = userEvent.setup();
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('招生主视觉');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Library />);

    const campaignFolder = await screen.findByTestId('directory-card-campaign');
    await user.click(within(campaignFolder).getByRole('button', { name: '打开文件夹 campaign' }));

    const posterCard = await screen.findByTestId('asset-card-campaign/poster.png');

    await user.click(within(posterCard).getByRole('button', { name: '重命名 poster.png' }));

    expect(prompt).toHaveBeenCalledWith('输入新的文件名（会保留原扩展名）', 'poster');
    expect(serviceMocks.renameLocalAsset).toHaveBeenCalledWith(expect.objectContaining({ name: 'poster.png' }), '招生主视觉');

    await user.click(within(posterCard).getByRole('button', { name: '删除 poster.png' }));

    expect(confirm).toHaveBeenCalledWith('删除后会移除本地文件「poster.png」，确认继续吗？');
    expect(serviceMocks.deleteLocalAsset).toHaveBeenCalledWith(expect.objectContaining({ name: 'poster.png' }));
    await waitFor(() => expect(serviceMocks.scanAssetDirectory).toHaveBeenCalledTimes(3));
  });

  it('allows common document formats in the upload chooser', async () => {
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    const input = await screen.findByLabelText('选择要上传的素材');

    expect(input).toHaveAttribute(
      'accept',
      expect.stringContaining('.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.rtf'),
    );
  });

  it('uploads a selected folder into the current directory', async () => {
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    const input = await screen.findByLabelText('选择要上传的文件夹');
    const file = new File(['image'], 'poster.png', { type: 'image/png' });
    Object.defineProperty(file, 'webkitRelativePath', {
      value: 'Campaign/poster.png',
    });

    await waitFor(() => expect(input).toHaveAttribute('webkitdirectory'));

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(serviceMocks.writeFileTreeToDirectory).toHaveBeenCalledWith(rootHandle, [file], expect.any(Function)),
    );
    expect(await screen.findByText('已写入 1 个文件夹内文件。')).toBeInTheDocument();
  });

  it('keeps the library header controls in one row aligned to the edges', async () => {
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    const header = await screen.findByTestId('library-toolbar-header');
    const controls = await screen.findByTestId('library-toolbar-controls');

    expect(header).toHaveClass('items-center', 'justify-between');
    expect(controls).toHaveClass('flex-nowrap', 'justify-end');
    expect(controls).not.toHaveClass('flex-wrap');
  });

  it('clips long title metadata before it can overlap toolbar controls', async () => {
    serviceMocks.getStoredRootDirectoryHandle.mockResolvedValue(rootHandle);

    render(<Library />);

    const titleBlock = await screen.findByTestId('library-toolbar-title');
    const metadata = await screen.findByTestId('library-toolbar-metadata');

    expect(titleBlock).toHaveClass('overflow-hidden');
    expect(metadata).toHaveClass('truncate');
  });
});
