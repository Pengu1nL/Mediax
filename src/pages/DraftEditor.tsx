import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, FileText, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineAlert, NotFoundState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import { DraftStatus } from '../types';
import { draftStatusLabel, formatRelativeTimestamp } from '../utils/presentation';

export default function DraftEditor() {
  const { draftId } = useParams();
  const { drafts, plans, planTasks, updateDraft } = useAppStore();
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<DraftStatus>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');

  const draft = drafts.find((item) => item.id === draftId);
  const plan = draft?.planId ? plans.find((item) => item.id === draft.planId) : null;
  const task = draft?.taskId ? planTasks.find((item) => item.id === draft.taskId) : null;

  useEffect(() => {
    if (!draft) {
      return;
    }

    setTitle(draft.title);
    setPlatform(draft.platform);
    setGroup(draft.group);
    setStatus(draft.status);
    setExcerpt(draft.excerpt);
    setContent(draft.content);
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');

    if (!title.trim() || !platform.trim() || !group.trim() || !content.trim()) {
      setNotice('请补全标题、平台、分组和正文。');
      return;
    }

    const savedDraft = updateDraft(draft.id, {
      title: title.trim(),
      platform: platform.trim(),
      group: group.trim(),
      status,
      excerpt: excerpt.trim(),
      content: content.trim(),
    });

    if (savedDraft) {
      setNotice('草稿已保存，列表页与计划详情会立即同步。');
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
          <p className="text-slate-gray mt-3 font-medium">保留当前原型视觉，只补齐真实编辑与保存流程。</p>
        </div>
        <button
          type="submit"
          form="draft-editor-form"
          className="bg-ink-black text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
        >
          <Save size={18} />
          保存草稿
        </button>
      </div>

      {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bento-card p-8">
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
                placeholder="不填也可以，系统会根据正文自动生成。"
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

        <div className="lg:col-span-4 space-y-6">
          <div className="bento-card p-8">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">状态面板</div>
            <div className="mt-5 space-y-4">
              <MetaRow label="当前状态" value={draftStatusLabel(status)} />
              <MetaRow label="最近更新" value={formatRelativeTimestamp(draft.updatedAt)} />
              <MetaRow label="所属计划" value={plan?.title || '未关联计划'} />
              <MetaRow label="所属任务" value={task?.title || '未关联任务'} />
            </div>
          </div>

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
        </div>
      </section>
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
