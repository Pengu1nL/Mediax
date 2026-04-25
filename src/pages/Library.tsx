import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import {
  MAX_ASSET_FILE_SIZE_BYTES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  createObjectUrl,
  deleteLocalAsset,
  ensureReadWritePermission,
  getDisplayBaseName,
  getStoredRootDirectoryHandle,
  isFileSystemAccessSupported,
  pickAssetRootDirectory,
  renameLocalAsset,
  revokeObjectUrl,
  saveRootDirectoryHandle,
  scanAssetDirectory,
  writeFilesToDirectory,
  writeFileTreeToDirectory,
  type AssetScanResult,
  type DirectoryNode,
  type LocalAssetFile,
} from '../services/localAssetLibrary';
import { createKnowledgeSummaryFromText, inferKnowledgeTags } from '../services/knowledgeExtraction';

type ViewMode = 'grid' | 'list';
type LibraryStatus = 'checking' | 'unsupported' | 'unbound' | 'permission' | 'scanning' | 'ready' | 'error';
type LibraryDisplayItem =
  | { kind: 'directory'; directory: DirectoryNode }
  | { kind: 'asset'; asset: LocalAssetFile };

interface Notice {
  tone: 'success' | 'warning' | 'error';
  message: string;
}

const MAX_FILE_SIZE_MB = Math.round(MAX_ASSET_FILE_SIZE_BYTES / 1024 / 1024);
const UPLOAD_ACCEPT = [
  'image/*',
  'video/*',
  'application/pdf',
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
].join(',');
const FOLDER_INPUT_DIRECTORY_ATTRIBUTES = {
  webkitdirectory: '',
  directory: '',
} as React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory: string;
  directory: string;
};

export default function Library() {
  const { brand, createKnowledgeItem } = useAppStore();
  const [status, setStatus] = useState<LibraryStatus>('checking');
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [scanResult, setScanResult] = useState<AssetScanResult | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refreshDirectory = useCallback(async (handle: FileSystemDirectoryHandle, nextSelectedPath = '') => {
    setStatus('scanning');
    setNotice(null);

    try {
      const nextScan = await scanAssetDirectory(handle);
      setRootHandle(handle);
      setScanResult(nextScan);
      setSelectedPath(findDirectoryNode(nextScan.root, nextSelectedPath) ? nextSelectedPath : '');
      setStatus('ready');

      if (nextScan.skipped.length > 0) {
        setNotice({
          tone: 'warning',
          message: `已跳过 ${nextScan.skipped.length} 个不支持或超过 ${MAX_FILE_SIZE_MB}MB 的文件。`,
        });
      }
    } catch (error) {
      setStatus('error');
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStoredDirectory() {
      if (!isFileSystemAccessSupported()) {
        if (active) {
          setStatus('unsupported');
        }
        return;
      }

      try {
        const storedHandle = await getStoredRootDirectoryHandle();
        if (!active) {
          return;
        }

        if (!storedHandle) {
          setStatus('unbound');
          return;
        }

        setRootHandle(storedHandle);
        const allowed = await ensureReadWritePermission(storedHandle);
        if (!active) {
          return;
        }

        if (!allowed) {
          setStatus('permission');
          return;
        }

        await refreshDirectory(storedHandle, '');
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus('error');
        setNotice({
          tone: 'error',
          message: getErrorMessage(error),
        });
      }
    }

    loadStoredDirectory();

    return () => {
      active = false;
    };
  }, [refreshDirectory]);

  const currentDirectory = useMemo(() => {
    if (!scanResult) {
      return null;
    }
    return findDirectoryNode(scanResult.root, selectedPath) ?? scanResult.root;
  }, [scanResult, selectedPath]);

  const displayedItems = useMemo<LibraryDisplayItem[]>(() => {
    if (!scanResult || !currentDirectory) {
      return [];
    }

    const term = search.trim().toLowerCase();
    if (term) {
      const matchingDirectories = flattenDirectoryNodes(scanResult.root)
        .filter((directory) => directoryMatchesSearch(directory, term))
        .map((directory) => ({ kind: 'directory' as const, directory }));
      const matchingAssets = scanResult.files
        .filter((asset) => assetMatchesSearch(asset, term))
        .map((asset) => ({ kind: 'asset' as const, asset }));

      return [...matchingDirectories, ...matchingAssets];
    }

    const directDirectories = currentDirectory.children.map((directory) => ({
      kind: 'directory' as const,
      directory,
    }));
    const directAssets = scanResult.files
      .filter((asset) => asset.parentPath === selectedPath)
      .map((asset) => ({ kind: 'asset' as const, asset }));

    return [...directDirectories, ...directAssets];
  }, [currentDirectory, scanResult, search, selectedPath]);

  const displayedAssets = useMemo(
    () => displayedItems.flatMap((item) => (item.kind === 'asset' ? [item.asset] : [])),
    [displayedItems],
  );

  const directFileCount = useMemo(() => {
    if (!scanResult) {
      return 0;
    }
    return scanResult.files.filter((asset) => asset.parentPath === selectedPath).length;
  }, [scanResult, selectedPath]);

  const handleSelectDirectory = useCallback((path: string) => {
    setSelectedPath(path);
    setSearch('');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    async function loadImageUrls() {
      const nextUrls: Record<string, string> = {};
      const imageAssets = displayedAssets.filter((asset) => asset.type === 'image');

      await Promise.all(
        imageAssets.map(async (asset) => {
          try {
            const file = await asset.fileHandle.getFile();
            const url = createObjectUrl(file);
            createdUrls.push(url);
            nextUrls[asset.id] = url;
          } catch {
            nextUrls[asset.id] = '';
          }
        }),
      );

      if (!cancelled) {
        setImageUrls(nextUrls);
      }
    }

    loadImageUrls();

    return () => {
      cancelled = true;
      for (const url of createdUrls) {
        revokeObjectUrl(url);
      }
    };
  }, [displayedAssets]);

  const handleBindDirectory = async () => {
    try {
      const handle = await pickAssetRootDirectory();
      const allowed = await ensureReadWritePermission(handle);
      if (!allowed) {
        setRootHandle(handle);
        setStatus('permission');
        setNotice({
          tone: 'error',
          message: '需要允许读写权限后才能管理本地素材文件夹。',
        });
        return;
      }

      await saveRootDirectoryHandle(handle);
      await refreshDirectory(handle, '');
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setStatus('error');
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleReauthorize = async () => {
    if (!rootHandle) {
      await handleBindDirectory();
      return;
    }

    const allowed = await ensureReadWritePermission(rootHandle);
    if (!allowed) {
      setNotice({
        tone: 'error',
        message: '仍未获得本地文件夹读写权限。',
      });
      return;
    }

    await refreshDirectory(rootHandle, selectedPath);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []) as File[];
    event.currentTarget.value = '';

    if (!currentDirectory || selectedFiles.length === 0) {
      return;
    }

    try {
      const result = await writeFilesToDirectory(currentDirectory.handle, selectedFiles, window.confirm);
      const nextNotice: Notice = {
        tone: result.skipped.length > 0 ? 'warning' : 'success',
        message:
          result.skipped.length > 0
            ? `已写入 ${result.written.length} 个文件，跳过 ${result.skipped.length} 个文件。`
            : `已写入 ${result.written.length} 个文件。`,
      };
      if (rootHandle) {
        await refreshDirectory(rootHandle, selectedPath);
      }
      setNotice(nextNotice);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []) as File[];
    event.currentTarget.value = '';

    if (!currentDirectory || selectedFiles.length === 0) {
      return;
    }

    try {
      const result = await writeFileTreeToDirectory(currentDirectory.handle, selectedFiles, window.confirm);
      const nextNotice: Notice = {
        tone: result.skipped.length > 0 ? 'warning' : 'success',
        message:
          result.skipped.length > 0
            ? `已写入 ${result.written.length} 个文件夹内文件，跳过 ${result.skipped.length} 个文件。`
            : `已写入 ${result.written.length} 个文件夹内文件。`,
      };
      if (rootHandle) {
        await refreshDirectory(rootHandle, selectedPath);
      }
      setNotice(nextNotice);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleRename = async (asset: LocalAssetFile) => {
    const nextName = window.prompt('输入新的文件名（会保留原扩展名）', getDisplayBaseName(asset.name));
    if (nextName === null) {
      return;
    }

    try {
      const renamed = await renameLocalAsset(asset, nextName);
      setNotice({
        tone: 'success',
        message: `已重命名为「${renamed}」。`,
      });
      if (rootHandle) {
        await refreshDirectory(rootHandle, selectedPath);
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleDelete = async (asset: LocalAssetFile) => {
    const confirmed = window.confirm(`删除后会移除本地文件「${asset.name}」，确认继续吗？`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteLocalAsset(asset);
      setNotice({
        tone: 'success',
        message: `已删除「${asset.name}」。`,
      });
      if (rootHandle) {
        await refreshDirectory(rootHandle, selectedPath);
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handlePreview = async (asset: LocalAssetFile) => {
    try {
      const file = await asset.fileHandle.getFile();
      const url = createObjectUrl(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => revokeObjectUrl(url), 30_000);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleDownload = async (asset: LocalAssetFile) => {
    try {
      const file = await asset.fileHandle.getFile();
      const url = createObjectUrl(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = asset.name;
      anchor.click();
      window.setTimeout(() => revokeObjectUrl(url), 1_000);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleCreateKnowledge = async (asset: LocalAssetFile) => {
    const sourceText = [
      asset.name,
      asset.relativePath,
      asset.type,
      asset.mimeType,
      asset.sizeLabel,
      getAssetLocationLabel(asset),
    ].join(' ');
    const summary = createKnowledgeSummaryFromText(
      `${asset.name} 位于 ${getAssetLocationLabel(asset)}，类型为 ${asset.type}，大小 ${asset.sizeLabel}。`,
    );
    const created = await createKnowledgeItem({
      brandId: brand.id,
      sourceType: 'asset',
      sourceName: asset.name,
      sourceUri: asset.relativePath,
      contentType: asset.type,
      summary,
      tags: inferKnowledgeTags(sourceText),
      extractedText: sourceText,
      assetIds: [asset.id],
      confidence: 0.8,
    });

    if (created) {
      setNotice({
        tone: 'success',
        message: `已将「${asset.name}」加入品牌知识库。`,
      });
      return;
    }

    setNotice({
      tone: 'error',
      message: `无法将「${asset.name}」加入品牌知识库。`,
    });
  };

  if (status === 'unsupported') {
    return (
      <LibraryState
        icon={<AlertTriangle size={28} />}
        eyebrow="浏览器能力"
        title="当前浏览器不支持本地文件夹访问"
        description="请使用 Chrome 或 Edge 打开 Mediax，再绑定本地素材文件夹。"
      />
    );
  }

  if (status === 'checking') {
    return (
      <LibraryState
        icon={<HardDrive size={28} />}
        eyebrow="本地素材库"
        title="正在检查本地素材库"
        description="正在读取浏览器中的本地目录授权状态。"
      />
    );
  }

  if (status === 'unbound') {
    return (
      <LibraryState
        icon={<FolderOpen size={28} />}
        eyebrow="本地素材库"
        title="绑定本地素材文件夹"
        description="选择一个本机目录后，Mediax 会递归扫描其中的图片、PDF、视频和常见文档素材。"
        actionLabel="绑定本地素材文件夹"
        onAction={handleBindDirectory}
      />
    );
  }

  if (status === 'permission') {
    return (
      <LibraryState
        icon={<HardDrive size={28} />}
        eyebrow="需要授权"
        title="重新授权本地素材文件夹"
        description="浏览器没有当前素材目录的读写权限。重新授权后即可继续管理本地文件。"
        actionLabel="重新授权"
        onAction={handleReauthorize}
      />
    );
  }

  if (status === 'error' && !scanResult) {
    return (
      <LibraryState
        icon={<AlertTriangle size={28} />}
        eyebrow="素材库错误"
        title="无法打开本地素材库"
        description={notice?.message ?? '请重新绑定本地素材文件夹。'}
        actionLabel="重新绑定文件夹"
        onAction={handleBindDirectory}
      />
    );
  }

  return (
    <div className="flex gap-8 min-h-[700px] pb-20">
      <aside className="w-72 flex-shrink-0 space-y-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-signal-orange">Library</div>
          <h2 className="text-2xl font-black tracking-tight mt-2">本地目录</h2>
        </div>

        {scanResult ? (
          <div className="space-y-2">
            <DirectoryTree
              node={scanResult.root}
              selectedPath={selectedPath}
              onSelect={handleSelectDirectory}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-black/5 bg-white px-5 py-6 text-sm font-semibold text-slate-gray">
            正在读取目录...
          </div>
        )}

        {scanResult?.skipped.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs font-semibold text-amber-800">
            <p>扫描时跳过 {scanResult.skipped.length} 个文件。</p>
            <p className="mt-1 text-amber-700">
              仅支持图片、PDF、视频和常见文档，且单文件不超过 {MAX_FILE_SIZE_MB}MB。
            </p>
          </div>
        ) : null}
      </aside>

      <section className="flex-grow bento-card p-8 flex flex-col">
        <div
          data-testid="library-toolbar-header"
          className="flex items-center justify-between gap-6 mb-7"
        >
          <div
            data-testid="library-toolbar-title"
            className="min-w-0 max-w-[320px] flex-shrink-0 overflow-hidden"
          >
            <h1 className="truncate text-3xl font-black tracking-tight">{currentDirectory?.name ?? '所有素材'}</h1>
            <p data-testid="library-toolbar-metadata" className="truncate text-sm font-semibold text-slate-gray mt-2">
              {search.trim()
                ? `全局搜索：${displayedItems.length} 个结果`
                : `${currentDirectory?.children.length ?? 0} 个文件夹 · ${directFileCount} 个文件 · ${selectedPath || '根目录'}`}
            </p>
          </div>

          <div
            data-testid="library-toolbar-controls"
            className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto hide-scrollbar"
          >
            <div className="relative flex-shrink min-w-[240px] max-w-[380px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray" size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索文件或路径..."
                className="bg-zinc-100 border-none rounded-full py-2.5 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-signal-orange w-full"
              />
            </div>

            <div className="bg-zinc-100 p-1 rounded-full flex flex-shrink-0">
              <IconButton
                label="网格视图"
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={18} />
              </IconButton>
              <IconButton
                label="列表视图"
                active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </IconButton>
            </div>

            <button
              type="button"
              onClick={() => rootHandle && refreshDirectory(rootHandle, selectedPath)}
              disabled={!rootHandle || status === 'scanning'}
              className="h-10 w-10 flex-shrink-0 rounded-full bg-zinc-100 text-slate-gray hover:text-ink-black hover:bg-white border border-transparent hover:border-black/5 transition-colors disabled:opacity-50"
              aria-label="重新扫描"
              title="重新扫描"
            >
              <RefreshCw size={18} className="mx-auto" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="选择要上传的素材"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleUpload}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              {...FOLDER_INPUT_DIRECTORY_ATTRIBUTES}
              aria-label="选择要上传的文件夹"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleFolderUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!currentDirectory || status === 'scanning'}
              className="bg-ink-black text-white px-5 py-2.5 rounded-full flex flex-shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <Upload size={18} />
              上传文件
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={!currentDirectory || status === 'scanning'}
              className="bg-white text-ink-black px-5 py-2.5 rounded-full border border-black/10 flex flex-shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap hover:border-signal-orange/30 hover:text-signal-orange transition-colors disabled:cursor-not-allowed disabled:text-zinc-300 disabled:border-zinc-100"
            >
              <FolderOpen size={18} />
              上传文件夹
            </button>
          </div>
        </div>

        {notice ? <NoticeBanner notice={notice} /> : null}

        {status === 'scanning' ? (
          <div className="flex-1 flex items-center justify-center py-24 text-sm font-bold text-slate-gray">
            正在扫描本地素材...
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-24 text-center">
            <div className="max-w-md">
              <div className="h-14 w-14 rounded-full bg-zinc-100 text-slate-gray flex items-center justify-center mx-auto">
                <FolderOpen size={28} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-5">这里还没有内容</h2>
              <p className="text-slate-gray font-medium mt-3 leading-relaxed">
                上传图片、PDF、视频或常见文档到当前目录，或切换左侧目录查看其它内容。
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {displayedItems.map((item) => (
              item.kind === 'directory' ? (
                <DirectoryCard key={item.directory.path} directory={item.directory} onOpen={handleSelectDirectory} />
              ) : (
                <AssetCard
                  key={item.asset.id}
                  asset={item.asset}
                  imageUrl={imageUrls[item.asset.id]}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onCreateKnowledge={handleCreateKnowledge}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              )
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {displayedItems.map((item) => (
              item.kind === 'directory' ? (
                <DirectoryRow key={item.directory.path} directory={item.directory} onOpen={handleSelectDirectory} />
              ) : (
                <AssetRow
                  key={item.asset.id}
                  asset={item.asset}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onCreateKnowledge={handleCreateKnowledge}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              )
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryState({
  icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="min-h-[640px] pb-20 flex items-center justify-center">
      <section className="bento-card max-w-2xl w-full px-8 py-14 text-center">
        <div className="h-16 w-16 rounded-full bg-zinc-100 text-signal-orange flex items-center justify-center mx-auto">
          {icon}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-signal-orange mt-7">{eyebrow}</div>
        <h1 className="text-3xl font-black tracking-tight mt-4">{title}</h1>
        <p className="text-slate-gray font-medium mt-4 leading-relaxed">{description}</p>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 mt-8 bg-ink-black text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors"
          >
            <FolderOpen size={18} />
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function DirectoryTree({
  node,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  key?: React.Key;
  node: DirectoryNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const active = node.path === selectedPath;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
          active ? 'bg-white shadow-sm border border-zinc-100 text-ink-black' : 'text-slate-gray hover:bg-white/60'
        }`}
        style={{ paddingLeft: `${depth * 1.15 + 0.75}rem` }}
      >
        <span className={active ? 'text-signal-orange' : 'text-zinc-400'}>
          {active ? <FolderOpen size={18} /> : <Folder size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black truncate">{node.path ? node.name : '所有素材'}</span>
          <span className="block text-[11px] font-bold text-zinc-400">{node.fileCount} 个文件</span>
        </span>
      </button>
      {node.children.map((child) => (
        <DirectoryTree
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function DirectoryCard({
  directory,
  onOpen,
}: {
  key?: React.Key;
  directory: DirectoryNode;
  onOpen: (path: string) => void;
}) {
  return (
    <article className="group" data-testid={`directory-card-${directory.path}`}>
      <button
        type="button"
        onClick={() => onOpen(directory.path)}
        aria-label={`打开文件夹 ${directory.name}`}
        className="block w-full text-left"
      >
        <div className="relative aspect-square rounded-2xl border border-black/5 bg-zinc-50 shadow-sm overflow-hidden mb-3 transition-colors group-hover:border-signal-orange/25 group-hover:bg-lifted-cream">
          <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black text-slate-gray shadow-sm">
            {directory.fileCount} 个文件
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-signal-orange">
            <FolderOpen size={58} strokeWidth={1.5} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-ink-black truncate">{directory.name}</p>
          <p className="text-[11px] font-bold text-slate-gray/70 truncate mt-0.5">
            {directory.children.length} 个子文件夹
          </p>
        </div>
      </button>
    </article>
  );
}

function DirectoryRow({
  directory,
  onOpen,
}: {
  key?: React.Key;
  directory: DirectoryNode;
  onOpen: (path: string) => void;
}) {
  return (
    <article data-testid={`directory-card-${directory.path}`}>
      <button
        type="button"
        onClick={() => onOpen(directory.path)}
        aria-label={`打开文件夹 ${directory.name}`}
        className="w-full py-5 flex items-center justify-between gap-6 text-left"
      >
        <div className="min-w-0 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-lifted-cream text-signal-orange flex items-center justify-center flex-shrink-0">
            <FolderOpen size={30} strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-ink-black truncate">{directory.name}</p>
            <p className="text-sm text-slate-gray font-medium truncate">{directory.path || '根目录'}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-black text-zinc-400">{directory.fileCount} 个文件</p>
          <p className="text-xs font-bold text-zinc-300">{directory.children.length} 个子文件夹</p>
        </div>
      </button>
    </article>
  );
}

function AssetCard({
  asset,
  imageUrl,
  onPreview,
  onDownload,
  onCreateKnowledge,
  onRename,
  onDelete,
}: {
  key?: React.Key;
  asset: LocalAssetFile;
  imageUrl?: string;
  onPreview: (asset: LocalAssetFile) => void;
  onDownload: (asset: LocalAssetFile) => void;
  onCreateKnowledge: (asset: LocalAssetFile) => void;
  onRename: (asset: LocalAssetFile) => void;
  onDelete: (asset: LocalAssetFile) => void;
}) {
  return (
    <article className="group" data-testid={`asset-card-${asset.id}`}>
      <div className="relative aspect-square rounded-2xl border border-black/5 bg-zinc-50 shadow-sm overflow-hidden mb-3">
        {asset.type === 'image' && imageUrl ? (
          <img src={imageUrl} alt={asset.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <AssetFallback asset={asset} />
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <AssetActions
            asset={asset}
            compact
            onPreview={onPreview}
            onDownload={onDownload}
            onCreateKnowledge={onCreateKnowledge}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-black text-ink-black truncate">{asset.name}</p>
        <p className="text-[11px] font-bold text-slate-gray/70 truncate mt-0.5">{getAssetLocationLabel(asset)}</p>
      </div>
    </article>
  );
}

function AssetRow({
  asset,
  onPreview,
  onDownload,
  onCreateKnowledge,
  onRename,
  onDelete,
}: {
  key?: React.Key;
  asset: LocalAssetFile;
  onPreview: (asset: LocalAssetFile) => void;
  onDownload: (asset: LocalAssetFile) => void;
  onCreateKnowledge: (asset: LocalAssetFile) => void;
  onRename: (asset: LocalAssetFile) => void;
  onDelete: (asset: LocalAssetFile) => void;
}) {
  return (
    <article className="py-5 flex items-center justify-between gap-6" data-testid={`asset-card-${asset.id}`}>
      <div className="min-w-0 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <AssetTypeIcon asset={asset} size={28} />
        </div>
        <div className="min-w-0">
          <p className="font-black text-ink-black truncate">{asset.name}</p>
          <p className="text-sm text-slate-gray font-medium truncate">{getAssetLocationLabel(asset)}</p>
        </div>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-black text-zinc-400">{asset.sizeLabel}</p>
          <p className="text-xs font-bold text-zinc-300">{asset.updatedAt}</p>
        </div>
        <AssetActions
          asset={asset}
          onPreview={onPreview}
          onDownload={onDownload}
          onCreateKnowledge={onCreateKnowledge}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function AssetActions({
  asset,
  compact = false,
  onPreview,
  onDownload,
  onCreateKnowledge,
  onRename,
  onDelete,
}: {
  asset: LocalAssetFile;
  compact?: boolean;
  onPreview: (asset: LocalAssetFile) => void;
  onDownload: (asset: LocalAssetFile) => void;
  onCreateKnowledge: (asset: LocalAssetFile) => void;
  onRename: (asset: LocalAssetFile) => void;
  onDelete: (asset: LocalAssetFile) => void;
}) {
  const buttonClass = compact
    ? 'h-9 w-9 rounded-full bg-white/95 text-slate-gray shadow-sm hover:text-ink-black transition-colors'
    : 'h-9 w-9 rounded-full bg-zinc-100 text-slate-gray hover:text-ink-black hover:bg-white border border-transparent hover:border-black/5 transition-colors';

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={buttonClass} onClick={() => onPreview(asset)} aria-label={`预览 ${asset.name}`}>
        <ExternalLink size={16} className="mx-auto" />
      </button>
      <button type="button" className={buttonClass} onClick={() => onDownload(asset)} aria-label={`下载 ${asset.name}`}>
        <Download size={16} className="mx-auto" />
      </button>
      <button type="button" className={buttonClass} onClick={() => onCreateKnowledge(asset)} aria-label={`加入品牌知识 ${asset.name}`}>
        <BookOpen size={16} className="mx-auto" />
      </button>
      <button type="button" className={buttonClass} onClick={() => onRename(asset)} aria-label={`重命名 ${asset.name}`}>
        <Edit3 size={16} className="mx-auto" />
      </button>
      <button
        type="button"
        className={`${buttonClass} hover:text-red-600`}
        onClick={() => onDelete(asset)}
        aria-label={`删除 ${asset.name}`}
      >
        <Trash2 size={16} className="mx-auto" />
      </button>
    </div>
  );
}

function AssetFallback({ asset }: { asset: LocalAssetFile }) {
  return (
    <div className="absolute inset-0 bg-lifted-cream">
      <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black text-slate-gray shadow-sm">
        {asset.sizeLabel}
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-signal-orange">
        <AssetTypeIcon asset={asset} size={52} />
      </div>
    </div>
  );
}

function AssetTypeIcon({ asset, size }: { asset: LocalAssetFile; size: number }) {
  if (asset.type === 'pdf' || asset.type === 'document') {
    return <FileText size={size} strokeWidth={1.6} />;
  }
  if (asset.type === 'video') {
    return <Video size={size} strokeWidth={1.6} />;
  }
  return <ImageIcon size={size} strokeWidth={1.6} />;
}

function IconButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        active ? 'bg-white shadow-sm text-ink-black' : 'text-slate-gray hover:text-ink-black'
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const toneClass = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    error: 'border-red-100 bg-red-50 text-red-700',
  }[notice.tone];
  const Icon = notice.tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`mb-6 rounded-2xl border px-5 py-4 flex items-start gap-3 text-sm font-bold ${toneClass}`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <p>{notice.message}</p>
    </div>
  );
}

function findDirectoryNode(node: DirectoryNode, path: string): DirectoryNode | null {
  if (node.path === path) {
    return node;
  }

  for (const child of node.children) {
    const found = findDirectoryNode(child, path);
    if (found) {
      return found;
    }
  }

  return null;
}

function flattenDirectoryNodes(root: DirectoryNode): DirectoryNode[] {
  return root.children.flatMap((child) => [child, ...flattenDirectoryNodes(child)]);
}

function directoryMatchesSearch(directory: DirectoryNode, term: string): boolean {
  return directory.name.toLowerCase().includes(term) || directory.path.toLowerCase().includes(term);
}

function assetMatchesSearch(asset: LocalAssetFile, term: string): boolean {
  return asset.name.toLowerCase().includes(term) || asset.relativePath.toLowerCase().includes(term);
}

function getAssetLocationLabel(asset: LocalAssetFile): string {
  return asset.parentPath || '根目录';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '素材库操作失败，请稍后重试。';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
