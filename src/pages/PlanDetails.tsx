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
import { AgentTaskStatus, ExecutionType, PlanTask, ReviewPolicy } from '../types';
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
  publishSchedule: string;
  status: AgentTaskStatus;
  brief: string;
  channel: string;
  contentType: string;
  reviewPolicy: ReviewPolicy;
}

const defaultTaskForm: TaskFormState = {
  title: '',
  subtitle: '',
  executionType: 'single',
  schedule: '',
  publishSchedule: '',
  status: 'draft',
  brief: '',
  channel: '',
  contentType: '',
  reviewPolicy: 'manual_required',
};

export default function PlanDetails() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { plans, planTasks, drafts, createDraft, createTask, updateTask, deleteTask } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(defaultTaskForm);
  const [notice, setNotice] = useState('');

  // 循环执行调度
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringTime, setRecurringTime] = useState('');
  const [recurringPublishTime, setRecurringPublishTime] = useState('');

  const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  function buildRecurringSchedule(days: number[], time: string): string {
    if (days.length === 0 || !time) return '';
    const dayLabels = days.sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]);
    return `每${dayLabels.join('、')} ${time}`;
  }

  function parseRecurringSchedule(schedule: string): { days: number[]; time: string } {
    const match = schedule.match(/每(.+?)\s+(\d{2}:\d{2})/);
    if (match) {
      const dayPart = match[1];
      const time = match[2];
      const days: number[] = [];
      WEEKDAY_LABELS.forEach((label, idx) => {
        if (dayPart.includes(label)) days.push(idx);
      });
      return { days, time };
    }
    return { days: [], time: '' };
  }

  function toggleRecurringDay(day: number) {
    setRecurringDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

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
    setRecurringDays([]);
    setRecurringTime('');
    setRecurringPublishTime('');
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
      publishSchedule: task.publishSchedule || '',
      status: task.status,
      brief: task.brief || '',
      channel: task.channel || '',
      contentType: task.contentType || '',
      reviewPolicy: task.reviewPolicy || 'manual_required',
    });
    if (task.executionType === 'recurring') {
      const parsed = parseRecurringSchedule(task.schedule);
      setRecurringDays(parsed.days);
      setRecurringTime(parsed.time);
      setRecurringPublishTime(task.publishSchedule || '');
    } else {
      setRecurringDays([]);
      setRecurringTime('');
      setRecurringPublishTime('');
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim() || !formState.schedule.trim()) {
      setNotice('请补全任务名称与执行时间。');
      return;
    }

    if (!formState.brief.trim()) {
      setNotice('任务 brief 不能为空。');
      return;
    }
    if (!formState.channel.trim()) {
      setNotice('任务渠道不能为空。');
      return;
    }
    if (!formState.contentType.trim()) {
      setNotice('任务内容类型不能为空。');
      return;
    }

    const isSingle = formState.executionType === 'single';

    const schedule = isSingle
      ? formState.schedule.trim()
      : buildRecurringSchedule(recurringDays, recurringTime);

    if (!isSingle && !schedule) {
      setNotice('请至少选择一个执行日并设置执行时间。');
      return;
    }

    const payload = {
      title: formState.title.trim(),
      subtitle: formState.subtitle.trim() || undefined,
      executionType: formState.executionType,
      schedule,
      publishSchedule: isSingle ? undefined : (recurringPublishTime || undefined),
      status: formState.status,
      brief: formState.brief.trim(),
      channel: formState.channel.trim(),
      contentType: formState.contentType.trim(),
      reviewPolicy: formState.reviewPolicy,
    };

    const task = editingTaskId
      ? await updateTask(plan.id, editingTaskId, payload)
      : await createTask(plan.id, payload);

    if (task) {
      setDialogOpen(false);
      setFormState(defaultTaskForm);

      // 单次执行：保存后立即创建草稿并跳转到草稿编辑页
      if (!editingTaskId && isSingle) {
        const draft = await createDraft({
          planId: plan.id,
          taskId: task.id,
          platform: formState.channel.trim(),
          group: plan.category || '未分组',
          status: 'draft',
          title: task.title,
          excerpt: task.brief || task.subtitle || task.title,
          content: `${task.title}\n\n---\n\n${task.brief || ''}`,
        });

        if (draft) {
          await updateTask(plan.id, task.id, {
            linkedDraftId: draft.id,
            linkedDraftIds: [draft.id],
            status: 'queued',
          });
          navigate(`/drafts/${draft.id}`);
        }
      }
    }
  };

  const handleDraftAction = async (task: PlanTask) => {
    if (task.linkedDraftId) {
      navigate(`/drafts/${task.linkedDraftId}`);
      return;
    }

    const draft = await createDraft({
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
      await updateTask(plan.id, task.id, {
        linkedDraftId: draft.id,
        status: task.status === 'draft' ? 'queued' : task.status,
      });
      navigate(`/drafts/${draft.id}`);
    }
  };

  const handleDeleteTask = async (task: PlanTask) => {
    if (!window.confirm('删除任务后，关联草稿会保留但不再挂在任务下。确认继续吗？')) {
      return;
    }

    await deleteTask(plan.id, task.id);
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
          title="Agent 就绪"
          value={`${tasks.filter((t) => t.brief?.trim() && t.channel?.trim() && t.contentType?.trim() && t.reviewPolicy).length}`}
          subtitle="brief、渠道、内容类型和审核策略均已配置"
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
                    planId={plan.id}
                    onEdit={() => openEditDialog(task)}
                    onDelete={() => handleDeleteTask(task)}
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
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* 任务名称 */}
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-xs font-black uppercase tracking-widest text-ink-black">任务名称</label>
            <input
              id="task-title"
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              placeholder="例如：公众号预热头图发布"
            />
          </div>

          {/* 任务 Brief */}
          <div className="space-y-2">
            <label htmlFor="task-brief" className="text-xs font-black uppercase tracking-widest text-ink-black">
              任务 Brief <span className="text-signal-orange">*</span>
            </label>
            <textarea
              id="task-brief"
              value={formState.brief}
              onChange={(event) => setFormState((current) => ({ ...current, brief: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold resize-none"
              rows={3}
              placeholder="描述任务目标、受众和核心信息点，Agent 将以此为依据执行内容生成。"
            />
          </div>

          {/* 发布渠道 + 内容类型 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="task-channel" className="text-xs font-black uppercase tracking-widest text-ink-black">
                发布渠道 <span className="text-signal-orange">*</span>
              </label>
              <select
                id="task-channel"
                value={formState.channel}
                onChange={(event) => setFormState((current) => ({ ...current, channel: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="">选择渠道</option>
                <option value="微信公众号">微信公众号</option>
                <option value="小红书">小红书</option>
                <option value="抖音">抖音</option>
                <option value="视频号">视频号</option>
                <option value="官方博客">官方博客</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="task-content-type" className="text-xs font-black uppercase tracking-widest text-ink-black">
                内容类型 <span className="text-signal-orange">*</span>
              </label>
              <select
                id="task-content-type"
                value={formState.contentType}
                onChange={(event) => setFormState((current) => ({ ...current, contentType: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="">选择内容类型</option>
                <option value="图文">图文</option>
                <option value="短视频">短视频</option>
                <option value="直播">直播</option>
                <option value="长文章">长文章</option>
                <option value="海报">海报</option>
              </select>
            </div>
          </div>

          {/* 调度区 */}
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-ink-black text-white flex items-center justify-center text-xs font-black">1</span>
              <label htmlFor="task-execution-type" className="text-sm font-black uppercase tracking-widest text-ink-black">执行类型</label>
              <select
                id="task-execution-type"
                value={formState.executionType}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, executionType: event.target.value as ExecutionType }))
                }
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-3 font-bold text-sm"
              >
                <option value="single">单次执行 · 保存后立即生成草稿</option>
                <option value="recurring">循环执行 · 按周期自动产出</option>
              </select>
            </div>

            {formState.executionType === 'single' ? (
              <div className="flex items-center gap-3 pl-11">
                <span className="w-8 h-8 rounded-full bg-zinc-200 text-ink-black flex items-center justify-center text-xs font-black">2</span>
                <label htmlFor="task-schedule" className="text-sm font-black uppercase tracking-widest text-ink-black whitespace-nowrap">计划发布时间</label>
                <input
                  id="task-schedule"
                  type="datetime-local"
                  value={formState.schedule}
                  onChange={(event) => setFormState((current) => ({ ...current, schedule: event.target.value }))}
                  className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-3 font-bold text-sm"
                />
              </div>
            ) : (
              <>
                <div className="pl-11 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-200 text-ink-black flex items-center justify-center text-xs font-black">2</span>
                    <span className="text-sm font-black uppercase tracking-widest text-ink-black">执行周期</span>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-11">
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleRecurringDay(idx)}
                        className={`min-w-[3.5rem] px-4 py-2.5 rounded-full text-sm font-bold border transition-all ${
                          recurringDays.includes(idx)
                            ? 'bg-ink-black text-white border-ink-black'
                            : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-11">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-200 text-ink-black flex items-center justify-center text-xs font-black">3</span>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="recurring-time" className="text-xs font-black uppercase tracking-widest text-zinc-400">执行时间</label>
                      <input
                        id="recurring-time"
                        type="time"
                        value={recurringTime}
                        onChange={(event) => setRecurringTime(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-200 text-ink-black flex items-center justify-center text-xs font-black">4</span>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="task-publish-schedule" className="text-xs font-black uppercase tracking-widest text-zinc-400">计划发布时间</label>
                      <input
                        id="task-publish-schedule"
                        type="time"
                        value={recurringPublishTime}
                        onChange={(event) => setRecurringPublishTime(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 补充说明 */}
          <div className="space-y-2">
            <label htmlFor="task-subtitle" className="text-xs font-black uppercase tracking-widest text-ink-black">补充说明</label>
            <input
              id="task-subtitle"
              type="text"
              value={formState.subtitle}
              onChange={(event) => setFormState((current) => ({ ...current, subtitle: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              placeholder="例如：关联资产、直播时间或标签"
            />
          </div>

          {/* 状态 + 审核策略 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="task-status" className="text-xs font-black uppercase tracking-widest text-ink-black">状态</label>
              <select
                id="task-status"
                value={formState.status}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, status: event.target.value as AgentTaskStatus }))
                }
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="draft">草稿</option>
                <option value="queued">排队中</option>
                <option value="ready_for_review">待审核</option>
                <option value="approved">已批准</option>
                <option value="published">已发布</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="task-review-policy" className="text-xs font-black uppercase tracking-widest text-ink-black">审核策略</label>
              <select
                id="task-review-policy"
                value={formState.reviewPolicy}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, reviewPolicy: event.target.value as ReviewPolicy }))
                }
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="manual_required">必须人工审核</option>
                <option value="auto_if_low_risk">低风险自动发布</option>
                <option value="auto_publish">自动发布</option>
              </select>
            </div>
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
  planId,
  onEdit,
  onDelete,
  onOpenDraft,
}: {
  key?: React.Key;
  task: PlanTask;
  planId: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDraft: () => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr className="hover:bg-zinc-50/80 transition-colors group">
      <td className="py-8 px-10">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-ink-black group-hover:scale-110 transition-transform">
            {task.executionType === 'single' ? <PlayCircle size={20} /> : <Repeat size={20} />}
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate(`/plans/${planId}/tasks/${task.id}`)}
              className="font-black text-ink-black text-base text-left hover:text-signal-orange transition-colors"
            >
              {task.title}
            </button>
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
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="text-zinc-300 hover:text-ink-black transition-colors p-2"
            aria-label="任务操作"
          >
            <MoreHorizontal size={20} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 min-w-[120px] z-50">
              <button
                type="button"
                onMouseDown={() => { onEdit(); setMenuOpen(false); }}
                className="w-full text-left px-5 py-2.5 text-sm font-bold text-ink-black hover:bg-zinc-50 transition-colors"
              >
                编辑
              </button>
              <button
                type="button"
                onMouseDown={() => { onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                删除
              </button>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
