import React, { useMemo, useState } from 'react';
import { Calendar, FileText, MoreHorizontal, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { EmptyState, InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import { Plan, PlanStatus } from '../types';
import { formatDateRange, planStatusLabel, statusPillClass } from '../utils/presentation';

interface PlanFormState {
  title: string;
  category: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
}

const defaultFormState: PlanFormState = {
  title: '',
  category: '',
  status: 'draft',
  startDate: '',
  endDate: '',
};

export default function Plans() {
  const navigate = useNavigate();
  const { plans, drafts, createPlan, updatePlan, deletePlan } = useAppStore();
  const [formState, setFormState] = useState<PlanFormState>(defaultFormState);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const draftCounts = useMemo(
    () =>
      drafts.reduce<Record<string, number>>((accumulator, draft) => {
        if (!draft.planId) {
          return accumulator;
        }
        accumulator[draft.planId] = (accumulator[draft.planId] ?? 0) + 1;
        return accumulator;
      }, {}),
    [drafts],
  );
  const activePlans = plans.filter((plan) => plan.status === 'active').length;
  const draftPlans = plans.filter((plan) => plan.status === 'draft').length;
  const completedPlans = plans.filter((plan) => plan.status === 'completed').length;
  const linkedDrafts = drafts.filter((draft) => draft.planId).length;

  const openCreateDialog = () => {
    setNotice('');
    setEditingPlanId(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setNotice('');
    setEditingPlanId(plan.id);
    setFormState({
      title: plan.title,
      category: plan.category || '',
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim() || !formState.startDate || !formState.endDate) {
      setNotice('请补全计划标题与起止时间。');
      return;
    }

    if (formState.endDate < formState.startDate) {
      setNotice('结束时间不能早于开始时间。');
      return;
    }

    const payload = {
      title: formState.title.trim(),
      category: formState.category.trim() || undefined,
      status: formState.status,
      startDate: formState.startDate,
      endDate: formState.endDate,
    };

    const plan = editingPlanId ? updatePlan(editingPlanId, payload) : createPlan(payload);
    if (plan) {
      setDialogOpen(false);
      setFormState(defaultFormState);
    }
  };

  const handleDelete = (planId: string) => {
    if (!window.confirm('删除计划后，关联任务会移除，草稿会保留但不再挂在计划下。确认继续吗？')) {
      return;
    }

    deletePlan(planId);
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-ink-black">发布计划</h1>
          <p className="text-slate-gray mt-2 font-medium">管理和追踪您的所有内容发布时间表。</p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="bg-signal-orange text-white px-8 py-3.5 rounded-full font-bold shadow-xl hover:bg-light-orange transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} />
          新建计划
        </button>
      </header>

      {plans.length === 0 ? (
        <EmptyState
          title="还没有发布计划"
          description="先创建一个计划，再进入计划详情编排任务和关联草稿。"
          actionLabel="创建第一个计划"
          onAction={openCreateDialog}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PlanMetric label="进行中" value={activePlans} />
            <PlanMetric label="草稿计划" value={draftPlans} />
            <PlanMetric label="已完成" value={completedPlans} />
            <PlanMetric label="关联草稿" value={linkedDrafts} />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => navigate(`/plans/${plan.id}`)}
                className="bento-card p-8 relative overflow-hidden group cursor-pointer hover:translate-y-[-6px] transition-all duration-300"
              >
                <div
                  className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full -z-0 opacity-10 transition-transform group-hover:scale-110 ${
                    plan.status === 'active'
                      ? 'bg-signal-orange'
                      : plan.status === 'draft'
                        ? 'bg-ink-black'
                        : 'bg-slate-gray'
                  }`}
                />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${statusPillClass(
                      plan.status,
                    )}`}
                  >
                    {planStatusLabel(plan.status)}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditDialog(plan);
                    }}
                    className="text-zinc-300 hover:text-ink-black transition-colors"
                    aria-label={`编辑 ${plan.title}`}
                  >
                    <MoreHorizontal size={24} />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-ink-black mb-6 leading-tight group-hover:text-signal-orange transition-colors">
                  {plan.title}
                </h3>

                <div className="space-y-4 text-slate-gray font-medium text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-300" />
                    <span>{formatDateRange(plan.startDate, plan.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-zinc-300" />
                    <span>包含 {draftCounts[plan.id] ?? 0} 篇关联草稿</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8 relative z-10">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditDialog(plan);
                    }}
                    className="px-4 py-2 border border-zinc-200 rounded-full text-xs font-bold text-zinc-500 hover:text-ink-black hover:border-zinc-300 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    className="px-4 py-2 border border-zinc-200 rounded-full text-xs font-bold text-zinc-500 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <section className="bento-card p-6 hidden lg:block">
            <div className="flex items-end justify-between gap-6 border-b border-zinc-100 pb-5">
              <div>
                <h2 className="text-2xl font-black text-ink-black">计划排期视图</h2>
                <p className="mt-1 text-sm font-medium text-slate-gray">按时间、状态与草稿挂载关系快速扫描。</p>
              </div>
              <button
                type="button"
                onClick={openCreateDialog}
                className="rounded-full border border-zinc-200 px-5 py-2 text-xs font-black text-zinc-500 transition-colors hover:border-signal-orange hover:text-signal-orange"
              >
                添加排期
              </button>
            </div>

            <div className="mt-2 divide-y divide-zinc-100">
              {plans.map((plan) => (
                <div key={`schedule-${plan.id}`} className="grid grid-cols-12 items-center gap-4 py-5">
                  <div className="col-span-4">
                    <p className="text-base font-black text-ink-black">{plan.title}</p>
                    <p className="mt-1 text-xs font-bold text-zinc-400">{plan.category || '未分类'}</p>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusPillClass(
                        plan.status,
                      )}`}
                    >
                      {planStatusLabel(plan.status)}
                    </span>
                  </div>
                  <div className="col-span-3 text-sm font-bold text-slate-gray">
                    {formatDateRange(plan.startDate, plan.endDate)}
                  </div>
                  <div className="col-span-1 text-sm font-black text-ink-black">{draftCounts[plan.id] ?? 0}</div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`/plans/${plan.id}`)}
                      className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-black text-ink-black transition-colors hover:bg-ink-black hover:text-white"
                    >
                      进入详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Modal
        open={dialogOpen}
        title={editingPlanId ? '编辑发布计划' : '创建发布计划'}
        description="保留现有原型风格，同时把计划信息持久化到本地工作台。"
        onClose={() => setDialogOpen(false)}
      >
        {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-ink-black">计划标题</label>
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              placeholder="例如：2026 春季开放日传播"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">计划分类</label>
              <input
                type="text"
                value={formState.category}
                onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
                placeholder="例如：招生季"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">状态</label>
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, status: event.target.value as PlanStatus }))
                }
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              >
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">开始日期</label>
              <input
                type="date"
                value={formState.startDate}
                onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-ink-black">结束日期</label>
              <input
                type="date"
                value={formState.endDate}
                onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 font-bold"
              />
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
              {editingPlanId ? '保存计划' : '创建计划'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bento-card px-6 py-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink-black">{value}</p>
    </div>
  );
}
