import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import type { KnowledgeEntry, KnowledgeSourceType } from '../types';

type UploadFile = {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  error?: string;
};

const SOURCE_TYPE_ICON: Record<KnowledgeSourceType, React.ReactNode> = {
  image: <ImageIcon size={20} />,
  pdf: <FileText size={20} />,
  document: <FileText size={20} />,
  text: <FileText size={20} />,
  video: <FileText size={20} />,
};

const SOURCE_TYPE_LABEL: Record<KnowledgeSourceType, string> = {
  image: '图片',
  pdf: 'PDF',
  document: '文档',
  text: '文本',
  video: '视频',
};

const FILTER_TABS: { key: 'all' | KnowledgeSourceType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'pdf', label: 'PDF' },
  { key: 'document', label: '文档' },
  { key: 'text', label: '文本' },
  { key: 'video', label: '视频' },
];

const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown', 'text/csv',
  'video/mp4', 'video/webm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const { brand, knowledgeEntries, deleteKnowledgeEntry, uploadKnowledge } = useAppStore();
  const [filter, setFilter] = useState<'all' | KnowledgeSourceType>('all');
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [queueFiles, setQueueFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const filteredEntries = useMemo(() => {
    let list = knowledgeEntries.filter((e) => e.brandId === brand.id);
    if (filter !== 'all') list = list.filter((e) => e.sourceType === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.originalName.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [knowledgeEntries, brand.id, filter, search]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newQueue: UploadFile[] = [];
    const rejected: string[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} — 超过 50MB 限制`);
        continue;
      }
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (ext === '.doc') {
        rejected.push(`${file.name} — .doc 格式暂不支持，请转换为 .docx`);
        continue;
      }
      if (newQueue.length >= MAX_FILES) {
        rejected.push('一次最多上传 10 个文件');
        break;
      }
      newQueue.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        status: 'pending',
      });
    }

    if (rejected.length > 0) {
      setNotice({ tone: 'error', message: rejected.join('；') });
    }

    setQueueFiles((prev) => {
      const combined = [...prev, ...newQueue].slice(0, MAX_FILES);
      return combined;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToQueue(e.dataTransfer.files);
      }
    },
    [addFilesToQueue],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFilesToQueue(e.target.files);
      }
      e.target.value = '';
    },
    [addFilesToQueue],
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueueFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    const pending = queueFiles.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setUploading(true);
    setQueueFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' as const } : f)),
    );

    const files = pending.map((f) => f.file);
    try {
      const result = await uploadKnowledge(files);

      setQueueFiles((prev) =>
        prev.map((f) => {
          const err = result.errors.find((e: any) => e.fileName === f.file.name);
          if (err) return { ...f, status: 'failed' as const, error: err.reason };
          return { ...f, status: 'done' as const };
        }),
      );

      if (result.entries.length > 0) {
        setNotice({ tone: 'success', message: `成功处理 ${result.entries.length} 个文件` });
      }

      setTimeout(() => setQueueFiles([]), 2000);
    } catch (err) {
      setNotice({
        tone: 'error',
        message: `上传失败：${err instanceof Error ? err.message : '未知错误'}`,
      });
      setQueueFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading' ? { ...f, status: 'failed' as const, error: '网络错误' } : f,
        ),
      );
    } finally {
      setUploading(false);
    }
  }, [queueFiles, uploadKnowledge]);

  const handleDelete = useCallback(
    async (entryId: string) => {
      await deleteKnowledgeEntry(entryId);
    },
    [deleteKnowledgeEntry],
  );

  const pendingCount = queueFiles.filter((f) => f.status === 'pending').length;
  const showQueue = queueFiles.length > 0;

  return (
    <div
      className="pb-20 space-y-8"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDragging ? (
        <div className="fixed inset-0 z-50 bg-ink-black/20 backdrop-blur-sm flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-12 text-center shadow-2xl border-2 border-dashed border-signal-orange"
          >
            <Upload size={48} className="mx-auto mb-4 text-signal-orange" />
            <h2 className="text-2xl font-black text-ink-black mb-2">松开以添加素材</h2>
            <p className="text-sm font-medium text-zinc-400">
              支持图片（PNG/JPG/WebP）、PDF、Word（.docx）、文本文件
            </p>
          </motion.div>
        </div>
      ) : null}

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-ink-black">知识库</h1>
          <p className="text-slate-gray font-medium mt-2">
            上传品牌素材，AI 自动解析生成结构化知识文档
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-6 py-3 bg-ink-black text-white rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors active:scale-95"
        >
          <Upload size={18} />
          上传文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
      </header>

      {/* Notice */}
      {notice ? (
        <div
          className={`bento-card p-4 flex items-center justify-between ${
            notice.tone === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {notice.tone === 'success' ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <AlertTriangle size={18} className="text-red-600" />
            )}
            <span className="text-sm font-bold text-ink-black">{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 text-zinc-400 hover:text-ink-black"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {/* Filter + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                filter === tab.key
                  ? 'bg-ink-black text-white'
                  : 'text-zinc-500 hover:text-ink-black hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索知识条目..."
            className="pl-9 pr-4 py-2 rounded-full border border-zinc-200 text-sm font-medium focus:outline-none focus:border-signal-orange w-56"
          />
        </div>
      </div>

      {/* Empty state or Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bento-card p-16 text-center">
          <Upload size={48} className="mx-auto mb-4 text-zinc-300" />
          <h3 className="text-lg font-black text-ink-black mb-2">知识库为空</h3>
          <p className="text-sm font-medium text-zinc-400 max-w-md mx-auto">
            上传品牌素材文件（图片、PDF、Word、文本），AI
            将自动解析内容并生成结构化知识文档供 Agent 参考。
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-signal-orange text-white rounded-full text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            <Upload size={16} />
            上传第一批素材
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bento-card p-5 group hover:border-signal-orange transition-colors relative"
            >
              {/* Migrated badge */}
              {entry.migratedFromLegacy ? (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-400">
                  历史迁移
                </span>
              ) : null}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 shrink-0">
                  {SOURCE_TYPE_ICON[entry.sourceType]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink-black text-sm truncate">{entry.originalName}</p>
                  <p className="text-xs font-medium text-zinc-400 mt-0.5">
                    {SOURCE_TYPE_LABEL[entry.sourceType]} · {formatSize(entry.originalSizeBytes)}
                  </p>
                  {entry.status === 'failed' ? (
                    <p className="text-xs text-red-500 mt-1">{entry.extractionError}</p>
                  ) : (
                    <p className="text-xs text-slate-gray mt-1 line-clamp-2">{entry.summary}</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {entry.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-3">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors ml-auto"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Queue Panel */}
      <AnimatePresence>
        {showQueue ? (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 p-6 z-40"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-ink-black">上传队列 ({queueFiles.length} 个文件)</h3>
              <button
                type="button"
                onClick={handleUpload}
                disabled={pendingCount === 0 || uploading}
                className="px-4 py-1.5 bg-signal-orange text-white rounded-full text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? '上传中...' : '全部上传'}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueFiles.map((qf) => (
                <div
                  key={qf.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    qf.status === 'failed' ? 'bg-red-50' : 'bg-zinc-50'
                  }`}
                >
                  <span className="text-lg shrink-0">
                    {qf.status === 'done'
                      ? '✅'
                      : qf.status === 'uploading'
                        ? '🔄'
                        : qf.status === 'failed'
                          ? '❌'
                          : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-black truncate">{qf.file.name}</p>
                    <p className="text-xs text-zinc-400">{formatSize(qf.file.size)}</p>
                    {qf.error ? <p className="text-xs text-red-500 mt-0.5">{qf.error}</p> : null}
                  </div>
                  {qf.status === 'uploading' ? (
                    <Loader2 size={16} className="animate-spin text-signal-orange shrink-0" />
                  ) : null}
                  {qf.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => removeFromQueue(qf.id)}
                      className="p-1 text-zinc-400 hover:text-red-500 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
