import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Download, FileText, RotateCcw, Save, Send, ThumbsDown, ThumbsUp, Trash2, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InlineAlert, NotFoundState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import { DraftStatus } from '../types';
import { draftStatusLabel, formatRelativeTimestamp } from '../utils/presentation';

const REVIEW_STATUS_LABEL: Record<string, string> = {
  not_required: '无需审核',
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
  changes_requested: '需修改',
};

export default function DraftEditor() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const { drafts, plans, planTasks, agentRuns, updateDraft, approveDraft, rejectDraft, requestRegeneration, deleteDraft, publishDraft, exportDraft, generateCover } = useAppStore();
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<DraftStatus>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [regenSize, setRegenSize] = useState('');

  const draft = drafts.find((item) => item.id === draftId);
  const plan = draft?.planId ? plans.find((item) => item.id === draft.planId) : null;
  const task = draft?.taskId ? planTasks.find((item) => item.id === draft.taskId) : null;
  const agentRun = draft?.agentRunId ? agentRuns.find((r) => r.id === draft.agentRunId) : null;

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setPlatform(draft.platform);
    setGroup(draft.group);
    setStatus(draft.status);
    setExcerpt(draft.excerpt);
    setContent(draft.content);
    setReviewNote('');
  }, [draft]);

  if (!draft || !draftId) {
    return (
      <NotFoundState
        title="这篇草稿不存在了"
        description="它可能还没有被创建成功，或者已经被移除。"
        backTo="/drafts"
        backLabel="返回草稿箱"
      />
    );
  }

  const reviewState = draft.reviewState;
  const isFromAgent = Boolean(draft.agentRunId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');

    if (!title.trim() || !platform.trim() || !group.trim() || !content.trim()) {
      setNotice('请补全标题、平台、分组和正文。');
      return;
    }

    setSaving(true);
    const savedDraft = await updateDraft(draft.id, {
      title: title.trim(),
      platform: platform.trim(),
      group: group.trim(),
      status,
      excerpt: excerpt.trim(),
      content: content.trim(),
    });
    setSaving(false);

    if (savedDraft) {
      setNotice('草稿已保存。');
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    const result = await approveDraft(draft.id, reviewNote.trim() || undefined);
    setSaving(false);
    if (result) setNotice('草稿已批准，可进入发布流程。');
  };

  const handleReject = async () => {
    if (!reviewNote.trim()) {
      setNotice('请填写拒绝原因。');
      return;
    }
    setSaving(true);
    const result = await rejectDraft(draft.id, reviewNote.trim());
    setSaving(false);
    if (result) setNotice('已拒绝草稿，任务回到待审核状态。');
  };

  const handleRegenerate = async () => {
    if (!reviewNote.trim()) {
      setNotice('请说明需要修改的内容。');
      return;
    }
    setSaving(true);
    const result = await requestRegeneration(draft.id, reviewNote.trim());
    setSaving(false);
    if (result) {
      setNotice('已要求重新生成，任务回到排队状态。');
      if (task) navigate(`/plans/${task.planId}/tasks/${task.id}`);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const result = await publishDraft(draft.id);
      if (result) setNotice('发布成功！任务已标记为已发布。');
    } catch {
      setNotice('发布失败，请确认草稿已被批准。');
    }
    setSaving(false);
  };

  const handleExport = async () => {
    setSaving(true);
    const result = await exportDraft(draft.id);
    setSaving(false);
    if (result) {
      const pkg = result as Record<string, unknown>;
      const record = pkg.record as Record<string, unknown> | undefined;
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `draft-${draft.id}-export.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`已导出发布包${record?.id ? `（发布记录 ${record.id}）` : ''}，同时已下载 JSON 文件。`);
    }
  };

  const handleRegenerateCover = async () => {
    setSaving(true);
    const result = await generateCover(
      draft.id,
      regenPrompt || draft.coverImage?.prompt || '',
      regenSize || draft.coverImage?.size || '1024x1024',
    );
    setSaving(false);
    if (result) {
      setNotice('配图已重新生成。');
      setShowRegenDialog(false);
    }
  };

  return (
    <div className="pb-20 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/drafts" className="inline-flex items-center gap-2 text-sm font-bold text-slate-gray hover:text-ink-black transition-colors">
            <ArrowLeft size={16} />
            返回草稿箱
          </Link>
          <h1 className="text-5xl font-black tracking-tighter text-ink-black mt-4">草稿编辑器</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('删除草稿后无法恢复。确认继续吗？')) return;
              await deleteDraft(draft.id);
              navigate('/drafts');
            }}
            className="px-5 py-4 rounded-full text-sm font-bold text-zinc-400 border border-zinc-200 hover:text-red-600 hover:border-red-200 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            删除
          </button>
          <button
            type="submit"
            form="draft-editor-form"
            disabled={saving}
            className="bg-ink-black text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存草稿'}
          </button>
        </div>
      </div>

      {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main editing area */}
        <div className="lg:col-span-7 bento-card p-8">
          <form id="draft-editor-form" className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">标题</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-4 text-xl font-black"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="平台">
                <input
                  type="text"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
                />
              </Field>
              <Field label="分组">
                <input
                  type="text"
                  value={group}
                  onChange={(event) => setGroup(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
                />
              </Field>
              <Field label="状态">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DraftStatus)}
                  className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
                >
                  <option value="draft">草稿中</option>
                  <option value="review">待审核</option>
                  <option value="ready">可发布</option>
                </select>
              </Field>
            </div>

            <Field label="摘要">
              <textarea
                rows={3}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                className="w-full rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-4 font-bold resize-none"
              />
            </Field>

            <Field label="正文">
              <textarea
                rows={16}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="w-full rounded-[32px] border border-zinc-100 bg-zinc-50 px-6 py-5 text-base font-medium leading-8 resize-none"
              />
            </Field>
          </form>
        </div>

        {/* Right sidebar: Info + Review panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Panel */}
          <div className="bento-card p-8">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">草稿信息</div>
            <div className="mt-5 space-y-4">
              <MetaRow label="当前状态" value={draftStatusLabel(status)} />
              <MetaRow label="最近更新" value={formatRelativeTimestamp(draft.updatedAt)} />
              <MetaRow label="所属计划" value={plan?.title || '未关联计划'} />
              <MetaRow label="所属任务" value={task?.title || '未关联任务'} />
            </div>
          </div>

          {/* Agent Source Panel - only if from agent */}
          {isFromAgent ? (
            <div className="bento-card p-8 bg-lifted-cream">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">Agent 来源</div>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <FileText size={18} className="text-signal-orange mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-ink-black">由 Agent 生成</p>
                    <p className="text-sm text-slate-gray font-medium mt-1">
                      内容类型：{draft.contentType || task?.contentType || '未指定'}
                    </p>
                  </div>
                </div>
                {task?.brief ? (
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-zinc-300 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-ink-black">任务 Brief</p>
                      <p className="text-sm text-slate-gray font-medium mt-1">{task.brief}</p>
                    </div>
                  </div>
                ) : null}
                {agentRun ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/agent-runs/${agentRun.id}`)}
                    className="inline-flex mt-2 text-sm font-bold text-signal-orange hover:text-light-orange transition-colors"
                  >
                    查看 Agent 执行记录
                  </button>
                ) : null}
                {plan ? (
                  <Link to={`/plans/${plan.id}`} className="inline-flex mt-2 text-sm font-bold text-signal-orange hover:text-light-orange transition-colors ml-4">
                    返回计划详情
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bento-card p-8 bg-lifted-cream">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">关联上下文</div>
              <div className="space-y-4 mt-5">
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-zinc-300 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-ink-black">计划上下文</p>
                    <p className="text-sm text-slate-gray font-medium mt-1">{plan?.category || '未分类计划'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText size={18} className="text-zinc-300 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-ink-black">任务说明</p>
                    <p className="text-sm text-slate-gray font-medium mt-1">{task?.subtitle || '暂无任务补充说明。'}</p>
                  </div>
                </div>
                {plan ? (
                  <Link to={`/plans/${plan.id}`} className="inline-flex mt-2 text-sm font-bold text-signal-orange hover:text-light-orange transition-colors">
                    返回计划详情
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          {/* Cover Image Preview */}
          {draft.coverImage ? (
            <div className="bento-card p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">配图预览</div>
              <div className="mt-4">
                <img
                  src={`data:image/${draft.coverImage.format || 'png'};base64,${draft.coverImage.base64}`}
                  alt="Cover"
                  className="w-full rounded-2xl border border-zinc-100"
                />
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-zinc-400">
                    尺寸：{draft.coverImage.size} | 生成时间：{formatRelativeTimestamp(draft.coverImage.generatedAt)}
                  </p>
                  <p className="text-xs text-zinc-400 line-clamp-2">Prompt: {draft.coverImage.prompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegenPrompt(draft.coverImage?.prompt || '');
                    setRegenSize(draft.coverImage?.size || '1024x1024');
                    setShowRegenDialog(true);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <RotateCcw size={14} />
                  重新生成配图
                </button>
              </div>
            </div>
          ) : null}

          {/* Review Panel */}
          <div className="bento-card p-8 border-2 border-zinc-200">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">审核操作</div>

            {reviewState && reviewState.status !== 'not_required' ? (
              <div className={`mt-4 p-4 rounded-2xl border ${
                reviewState.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                reviewState.status === 'rejected' ? 'bg-red-50 border-red-100' :
                reviewState.status === 'changes_requested' ? 'bg-amber-50 border-amber-100' :
                'bg-zinc-50 border-zinc-100'
              }`}>
                <div className="flex items-center gap-2">
                  {reviewState.status === 'approved' ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                   reviewState.status === 'rejected' ? <XCircle size={16} className="text-red-600" /> :
                   <RotateCcw size={16} className="text-amber-600" />}
                  <span className="text-xs font-black">
                    {REVIEW_STATUS_LABEL[reviewState.status]}
                  </span>
                </div>
                {reviewState.reviewerNote ? (
                  <p className="text-sm font-medium text-slate-gray mt-2">{reviewState.reviewerNote}</p>
                ) : null}
                {reviewState.reviewedAt ? (
                  <p className="text-xs text-zinc-400 mt-1">{formatRelativeTimestamp(reviewState.reviewedAt)}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-gray mt-3">尚未审核，请检查内容后进行审核。</p>
            )}

            <div className="mt-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">审核备注</label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 font-bold text-sm resize-none"
                placeholder="可选：添加审核意见或修改建议..."
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <ThumbsUp size={18} />
                批准发布
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-2xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown size={16} />
                  拒绝
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-3 rounded-2xl font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  重新生成
                </button>
              </div>
            </div>

            {/* Publish & Export */}
            <div className="mt-6 pt-5 border-t border-zinc-200">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-4">发布与导出</div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-signal-orange text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-light-orange transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                  {draft.publishState === 'published' ? '已发布' : '发布'}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-white text-ink-black border-2 border-zinc-200 px-6 py-3.5 rounded-2xl font-bold hover:border-signal-orange hover:text-signal-orange transition-colors disabled:opacity-50"
                >
                  <Download size={18} />
                  导出发布包
                </button>
              </div>
              {draft.publishState === 'published' ? (
                <p className="text-xs font-medium text-emerald-600 mt-3">此草稿已发布。</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {showRegenDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink-black/40 backdrop-blur-sm" onClick={() => setShowRegenDialog(false)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-black text-ink-black mb-6">重新生成配图</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">图片 Prompt</label>
                <textarea
                  rows={3}
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 font-medium text-sm resize-none mt-2"
                  placeholder={draft.coverImage?.prompt || '描述你想要的配图...'}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">尺寸 (WxH)</label>
                <input
                  type="text"
                  value={regenSize}
                  onChange={(e) => setRegenSize(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold text-sm mt-2"
                  placeholder={draft.coverImage?.size || '1024x1024'}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowRegenDialog(false)}
                className="flex-1 px-4 py-3 rounded-2xl font-bold border-2 border-zinc-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRegenerateCover}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-2xl font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? '生成中...' : '开始生成'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-widest text-ink-black">{label}</label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">{label}</div>
      <div className="text-sm font-bold text-ink-black mt-2 leading-relaxed">{value}</div>
    </div>
  );
}
