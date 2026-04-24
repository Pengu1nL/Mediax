import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, Newspaper, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';
import { getIndustryNews } from '../data/industryNews';
import { planStatusLabel } from '../utils/presentation';

export default function Dashboard() {
  const { brand, plans, planTasks, drafts } = useAppStore();

  const activePlans = plans.filter((plan) => plan.status === 'active').length;
  const activeTasks = planTasks.filter((task) => task.status === 'active').length;
  const readyDrafts = drafts.filter((draft) => draft.status === 'ready').length;
  const liveChannels = brand.channels.filter((channel) => channel.active).length;
  const recentPlans = plans.slice(0, 4);
  const industryNews = getIndustryNews(brand.industry);

  return (
    <div className="space-y-12 pb-20">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
          <div className="relative w-64 h-64 md:w-80 md:h-80">
            <div className="absolute inset-0 rounded-full shadow-2xl bg-white p-2">
              <div className="w-full h-full rounded-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800"
                  alt="AI Placeholder"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -right-4 top-1/2 w-4 h-4 rounded-full bg-signal-orange shadow-lg"
            />
          </div>
          <div className="mt-8 text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-ink-black">校区运营全景</h1>
            <p className="text-slate-gray mt-2 font-medium">{brand.name} 品牌主理台</p>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="进行中的计划"
            value={`${activePlans}`}
            growth={`${plans.length} 个计划已归档到本地工作台`}
            icon={<Users size={20} />}
            color="bg-orange-100 text-signal-orange"
          />
          <StatCard
            title="可发布草稿"
            value={`${readyDrafts}`}
            growth={`${drafts.length} 篇草稿处于持续追踪中`}
            icon={<FileText size={20} />}
            color="bg-zinc-100 text-ink-black"
          />
          <div className="md:col-span-2 bg-ink-black rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between text-white overflow-hidden relative group">
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">工作台联动状态</span>
              <h2 className="text-3xl font-bold mt-2">已接通 {activeTasks} 项执行中的任务</h2>
            </div>
            <div className="relative z-10 flex items-center gap-6 mt-6 md:mt-0">
              <div className="text-right">
                <p className="text-sm text-zinc-400">已绑定渠道</p>
                <p className="text-2xl font-bold text-light-orange">{liveChannels}</p>
              </div>
              <Link
                to="/plans"
                className="w-14 h-14 bg-white text-ink-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ArrowRight size={24} />
              </Link>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-signal-orange/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bento-card p-8 min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">近期宣发计划</h3>
            <Link to="/plans" className="text-signal-orange text-sm font-semibold">
              查看全部
            </Link>
          </div>
          <div className="space-y-6">
            {recentPlans.map((plan, index) => (
              <GanttRow
                key={plan.id}
                label={plan.title}
                progress={Math.max(25, 85 - index * 15)}
                color={index % 2 === 0 ? 'bg-ink-black' : 'bg-signal-orange'}
              />
            ))}
          </div>
        </div>

        <div className="bento-card p-8 min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-xl font-bold">行业新闻</h3>
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-xs font-bold text-slate-gray">
              <Newspaper size={14} />
              <span>{brand.industry}</span>
            </div>
          </div>
          <div className="space-y-4">
            {industryNews.map((news) => (
              <article key={news.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black text-signal-orange">
                    {news.tag}
                  </span>
                  <time className="text-xs font-bold text-zinc-400" dateTime={news.publishedAt}>
                    {news.publishedAt}
                  </time>
                </div>
                <h4 className="mt-3 text-base font-black leading-snug text-ink-black">{news.title}</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-gray">{news.summary}</p>
                <p className="mt-3 text-xs font-bold text-zinc-400">{news.source}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bento-card p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-zinc-100 pb-6">
          <div>
            <h2 className="text-2xl font-bold">当前闭环状态</h2>
            <p className="text-slate-gray mt-1">计划、任务、草稿已经进入本地可持久化工作流。</p>
          </div>
          <button
            type="button"
            title="关键词管理将在真实外部数据接入后上线"
            className="px-6 py-2 border-2 border-zinc-200 rounded-2xl font-bold text-sm text-zinc-400 cursor-not-allowed"
          >
            关键词管理
          </button>
        </div>
        <div className="divide-y divide-zinc-100">
          {recentPlans.map((plan) => (
            <div
              key={plan.id}
              className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-zinc-50 -mx-8 px-8 transition-colors"
            >
              <div>
                <h4 className="text-lg font-bold group-hover:text-signal-orange transition-colors">{plan.title}</h4>
                <p className="text-sm text-slate-gray mt-1">{plan.category || '未分类活动'}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-500 whitespace-nowrap">
                  {planStatusLabel(plan.status)}
                </span>
                <Link
                  to={`/plans/${plan.id}`}
                  className="px-4 py-2 bg-ink-black text-white rounded-full text-xs font-bold"
                >
                  查看计划
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  growth,
  icon,
  color,
}: {
  title: string;
  value: string;
  growth: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bento-card p-8 hover:translate-y-[-4px] transition-transform cursor-pointer">
      <div className="flex justify-between items-start mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div>
        <div className="text-5xl font-black text-ink-black tracking-tighter">{value}</div>
        <div className="text-sm font-medium mt-2 flex items-center gap-1">
          <TrendingUp size={16} />
          {growth}
        </div>
      </div>
    </div>
  );
}

function GanttRow({
  label,
  progress,
  color,
  offset = 0,
}: {
  key?: React.Key;
  label: string;
  progress: number;
  color: string;
  offset?: number;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center group">
      <div className="col-span-4 text-sm font-bold text-ink-black truncate">{label}</div>
      <div className="col-span-8 h-8 bg-zinc-100 rounded-full relative overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%`, left: `${offset}%` }}
          className={`absolute h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
