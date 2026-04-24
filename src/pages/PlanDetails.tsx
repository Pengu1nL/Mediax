import React, { useMemo, useState } from 'react';
import {
  Calendar,
  FileText,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Repeat,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import { EmptyState, InlineAlert, NotFoundState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import { ExecutionType, PlanTask, PlanTaskStatus } from '../types';
import {
  executionTypeLabel,
  formatDateRange,
  planStatusLabel,
  statusPillClass,
  taskStatusLabel,
} from '../utils/presentation';

interface TaskFormState {
  title: string;
  subtitle: string;
  executionType: ExecutionType;
  schedule: string;
  status: PlanTaskStatus;
}

const defaultTaskForm: TaskFormState = {
  title: '',
  subtitle: '',
  executionType: 'single',
  schedule: '',
  status: 'pending',
};

export default function PlanDetails() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { plans, planTasks, drafts, createDraft, createTask, updateTask, deleteTask } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(defaultTaskForm);
  const [notice, setNotice] = useState('');

  const plan = plans.find((item) => item.id === planId);
  const tasks = useMemo(() => planTasks.filter((task) => task.planId === planId), [planId, planTasks]);
  const linkedDrafts = useMemo(() => drafts.filter((draft) => draft.planId === planId), [drafts, planId]);

  if (!plan || !planId) {
    return (
      <NotFoundState
        title="这个计划不存在了"
        description="它可能尚未创建完成，或者已经被移除。"
        backTo="/plans"
        backLabel="返回计划列表"
      />
    );
  }

  const openCreateDialog = () => {
    setNotice('');
    setEditingTaskId(null);
    setFormState(defaultTaskForm);
    setDialogOpen(true);
  };

  const openEditDialog = (task: PlanTask) => {
    setNotice('');
    setEditingTaskId(task.id);
    setFormState({
      title: task.title,
      subtitle: task.subtitle || '',
      executionType: task.executionType,
      schedule: task.schedule,
      status: task.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim() || !formState.schedule.trim()) {
      setNotice('请补全任务名称与执行时间。');
      return;
    }

    const payload = {
      title: formState.title.trim(),
      subtitle: formState.subtitle.trim() || undefined,
      executionType: formState.executionType,
      schedule: formState.schedule.trim(),
      status: formState.status,
    };

    const task = editingTaskId
      ? updateTask(plan.id, editingTaskId, payload)
      : createTask(plan.id, payload);

    if (task) {
      setDialogOpen(false);
      setFormState(defaultTaskForm);
    }
  };

  const handleDraftAction = (task: PlanTask) => {
    if (task.linkedDraftId) {
      navigate(`/drafts/${task.linkedDraftId}`);
      return;
    }

    const draft = createDraft({
      planId: plan.id,
      taskId: task.id,
      platform: '微信公众号',
      group: plan.category || '未分组',
      status: 'draft',
      title: task.title,
      excerpt: task.subtitle || task.title,
      content: `${task.title}\n\n请在这里补充正文内容。`,
    });

    if (draft) {
      updateTask(plan.id, task.id, {
        linkedDraftId: draft.id,
        status: task.status === 'pending' ? 'active' : task.status,
      });
      navigate(`/drafts/${draft.id}`);
    }
  };

  return (
    <div className="pb-20 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="text-[10px] font-black text-signal-orange uppercase tracking-[0.4em] mb-3">
            {plan.category || '内容战役'}
          </p>
          <h1 className="text-6xl font-black tracking-tighter text-ink-black mb-6 leading-none">{plan.title}</h1>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-slate-gray font-bold text-sm">
            <span className="flex items-center gap-2">
              <Calendar size={18} className="text-zinc-300" />
              {formatDateRange(plan.startDate, plan.endDate)}
            </span>
            <span className="flex items-center gap-2">
              <Users size={18} className="text-zinc-300" />
              单管理员运营流
            </span>
            <span className={`px-5 py-1.5 rounded-full text-xs border ${statusPillClass(plan.status)}`}>
              {planStatusLabel(plan.status)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="bg-signal-orange text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-light-orange transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          创建任务
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="任务数量" value={`${tasks.length}`} subtitle="挂在当前计划下的执行项" />
        <SummaryCard title="关联草稿" value={`${linkedDrafts.length}`} subtitle="已经挂到 Drafts 的内容" />
        <SummaryCard
          title="执行中"
          value={`${tasks.filter((task) => task.status === 'active').length}`}
          subtitle="会在列表与详情页同步更新"
        />
      </section>

      {tasks.length === 0 ? (
        <EmptyState
          title="这个计划还没有任务"
          description="先创建第一条任务，再从任务进入草稿编辑。"
          actionLabel="新建任务"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="py-8 px-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-[35%]">
                    任务名称
                  </th>
                  <th className="py-8 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">执行类型</th>
                  <th className="py-8 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">时间安排</th>
                  <th className="py-8 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">状态</th>
                  <th className="py-8 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">草稿</th>
                  <th className="py-8 px-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={() => openEditDialog(task)}
                    onDelete={() => deleteTask(plan.id, task.id)}
                    onOpenDraft={() => handleDraftAction(task)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={dialogOpen}
        title={editingTaskId ? '编辑任务' : '创建任务'}
        description="任务创建后可以直接生成并关联草稿。"
        onClose={() => setDialogOpen(false)}
      >
        {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-ink-black">任务名称</label>
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              placeholder="例如：公众号预热头图发布"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-ink-black">补充说明</label>
            <input
              type="text"
              value={formState.subtitle}
              onChange={(event) => setFormState((current) => ({ ...current, subtitle: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              placeholder="例如：关联资产、直播时间或标签"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">执行类型</label>
              <select
                value={formState.executionType}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, executionType: event.target.value as ExecutionType }))
                }
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="single">单次执行</option>
                <option value="recurring">循环执行</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">时间安排</label>
              <input
                type="text"
                value={formState.schedule}
                onChange={(event) => setFormState((current) => ({ ...current, schedule: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
                placeholder="例如：2026-03-02 10:00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-ink-black">状态</label>
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((current) => ({ ...current, status: event.target.value as PlanTaskStatus }))
              }
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
            >
              <option value="pending">待执行</option>
              <option value="active">执行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="px-6 py-3 rounded-full text-sm font-bold text-zinc-500 border border-zinc-200"
            >
              取消
            </button>
            <button type="submit" className="px-6 py-3 rounded-full text-sm font-bold bg-ink-black text-white">
              {editingTaskId ? '保存任务' : '创建任务'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bento-card p-8">
      <div className="text-xs font-black uppercase tracking-widest text-zinc-400">{title}</div>
      <div className="text-5xl font-black tracking-tighter mt-4">{value}</div>
      <p className="text-sm font-medium text-slate-gray mt-3">{subtitle}</p>
    </div>
  );
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onOpenDraft,
}: {
  key?: React.Key;
  task: PlanTask;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDraft: () => void;
}) {
  return (
    <tr className="hover:bg-zinc-50/80 transition-colors group">
      <td className="py-8 px-10">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-ink-black group-hover:scale-110 transition-transform">
            {task.executionType === 'single' ? <PlayCircle size={20} /> : <Repeat size={20} />}
          </div>
          <div>
            <div className="font-black text-ink-black text-base">{task.title}</div>
            <div className="text-sm font-medium text-slate-gray mt-1">{task.subtitle || '暂无补充说明'}</div>
          </div>
        </div>
      </td>
      <td className="py-8 px-6 text-sm font-bold text-ink-black">{executionTypeLabel(task.executionType)}</td>
      <td className="py-8 px-6 text-sm font-bold text-ink-black">{task.schedule}</td>
      <td className="py-8 px-6">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border ${statusPillClass(task.status)}`}>
          {taskStatusLabel(task.status)}
        </span>
      </td>
      <td className="py-8 px-6">
        <button
          type="button"
          onClick={onOpenDraft}
          className="text-sm font-bold text-signal-orange hover:text-light-orange transition-colors"
        >
          {task.linkedDraftId ? '编辑草稿' : '创建草稿'}
        </button>
      </td>
      <td className="py-8 px-10 text-right">
        <div className="inline-flex items-center gap-3">
          <button type="button" onClick={onEdit} className="text-zinc-300 hover:text-signal-orange transition-colors p-2">
            <MoreHorizontal size={20} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-bold text-zinc-400 hover:text-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}
