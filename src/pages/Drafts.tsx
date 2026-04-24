import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowRight, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import { DraftStatus } from '../types';
import { draftStatusLabel, formatRelativeTimestamp, statusPillClass } from '../utils/presentation';

export default function Drafts() {
  const { drafts, plans, planTasks } = useAppStore();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [group, setGroup] = useState('all');
  const [status, setStatus] = useState<'all' | DraftStatus>('all');
  const deferredSearch = useDeferredValue(search);

  const platformOptions = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.platform))), [drafts]);
  const groupOptions = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.group))), [drafts]);

  const filteredDrafts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return drafts.filter((draft) => {
      const matchesSearch =
        !query ||
        draft.title.toLowerCase().includes(query) ||
        draft.excerpt.toLowerCase().includes(query);

      const matchesPlatform = platform === 'all' || draft.platform === platform;
      const matchesGroup = group === 'all' || draft.group === group;
      const matchesStatus = status === 'all' || draft.status === status;

      return matchesSearch && matchesPlatform && matchesGroup && matchesStatus;
    });
  }, [deferredSearch, drafts, group, platform, status]);

  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const taskMap = useMemo(() => new Map(planTasks.map((task) => [task.id, task])), [planTasks]);

  return (
    <div className="w-full pb-20">
      <header className="mb-16 flex flex-col md:flex-row justify-between gap-6 md:items-end">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-ink-black">草稿箱</h1>
          <p className="text-slate-gray mt-4 font-medium max-w-md">
            管理并完善您正在创作的编辑内容，准备就绪后即可进入发布流程。
          </p>
        </div>
        <div className="text-zinc-300 font-bold uppercase tracking-[0.2em] text-[10px]">
          {filteredDrafts.length} 项内容
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-4 mb-12 items-start xl:items-center justify-between">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索草稿标题或内容..."
            className="w-full bg-white border border-zinc-100 rounded-full py-4 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-signal-orange"
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <FilterSelect label="平台" value={platform} onChange={setPlatform} options={platformOptions} />
          <FilterSelect label="分组" value={group} onChange={setGroup} options={groupOptions} />
          <FilterSelect
            label="状态"
            value={status}
            onChange={(value) => setStatus(value as 'all' | DraftStatus)}
            options={['draft', 'review', 'ready']}
            labelMap={{
              draft: '草稿中',
              review: '待审核',
              ready: '可发布',
            }}
          />
        </div>
      </div>

      {filteredDrafts.length === 0 ? (
        <EmptyState
          title="当前筛选条件下没有草稿"
          description="试试放宽筛选条件，或者先到计划详情里创建一条任务草稿。"
          actionLabel="查看发布计划"
          actionTo="/plans"
        />
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft, index) => {
            const plan = draft.planId ? planMap.get(draft.planId) : null;
            const task = draft.taskId ? taskMap.get(draft.taskId) : null;

            return (
              <div
                key={draft.id}
                className={`group relative bg-white rounded-3xl p-8 border border-zinc-100 hover:border-signal-orange/20 transition-all duration-500 shadow-sm hover:shadow-xl flex flex-col md:flex-row gap-8 items-center overflow-hidden ${
                  index === 2 ? 'opacity-80' : ''
                }`}
              >
                <div className="absolute -left-12 -top-12 w-32 h-32 rounded-full border border-signal-orange/5" />

                <div className="flex-grow z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="bg-zinc-100 py-1 px-3 rounded-full text-[10px] font-black uppercase tracking-wider text-ink-black">
                      {draft.platform}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">{draft.group}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusPillClass(draft.status)}`}>
                      {draftStatusLabel(draft.status)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-ink-black mb-3 group-hover:text-signal-orange transition-colors">
                    {draft.title}
                  </h3>
                  <p className="text-slate-gray text-sm font-medium line-clamp-2 leading-relaxed">{draft.excerpt}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {plan ? (
                      <span className="px-3 py-1 rounded-full bg-orange-50 text-signal-orange text-xs font-bold">
                        计划：{plan.title}
                      </span>
                    ) : null}
                    {task ? (
                      <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-xs font-bold">
                        任务：{task.title}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center min-w-[180px] z-10 border-t md:border-t-0 md:border-l border-zinc-100 pt-6 md:pt-0 md:pl-8 w-full md:w-auto">
                  <div className="text-zinc-400 font-bold text-xs flex items-center gap-2 mb-3">
                    <Clock size={14} />
                    {formatRelativeTimestamp(draft.updatedAt)}
                  </div>
                  <Link
                    to={`/drafts/${draft.id}`}
                    className="text-ink-black hover:text-signal-orange transition-colors flex items-center gap-1 font-bold text-sm"
                  >
                    继续编辑 <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-16 flex justify-center">
        <button
          type="button"
          disabled
          className="px-10 py-4 border-2 border-zinc-200 rounded-full text-sm font-black text-zinc-400 cursor-not-allowed"
        >
          已显示全部草稿
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labelMap,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labelMap?: Record<string, string>;
}) {
  return (
    <label className="flex items-center gap-2 bg-white border border-zinc-100 rounded-full px-5 py-3 shadow-sm whitespace-nowrap text-sm font-bold text-zinc-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent outline-none cursor-pointer text-ink-black"
      >
        <option value="all">全部</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap?.[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}
