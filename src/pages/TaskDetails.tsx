import React, { useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, FileText, Globe, Layers, Play, ShieldCheck, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { NotFoundState } from '../components/PageState';
import RunAgentDialog from '../components/RunAgentDialog';
import { useAppStore } from '../context/AppContext';
import { AgentTaskStatus } from '../types';
import { executionTypeLabel, taskStatusLabel, statusPillClass } from '../utils/presentation';

function isTaskReadyForAgent(brief?: string, channel?: string, contentType?: string, reviewPolicy?: string): boolean {
  return Boolean(
    brief?.trim() &&
    channel?.trim() &&
    contentType?.trim() &&
    reviewPolicy,
  );
}

export default function TaskDetails() {
  const navigate = useNavigate();
  const { planId, taskId } = useParams();
  const { plans, planTasks, drafts, startAgentRun } = useAppStore();
  const [agentLoading, setAgentLoading] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);

  const plan = plans.find((p) => p.id === planId);
  const task = planTasks.find((t) => t.id === taskId && t.planId === planId);
  const linkedDrafts = drafts.filter((d) => task?.linkedDraftIds?.includes(d.id) || (task?.linkedDraftId && d.id === task.linkedDraftId));

  if (!plan || !task) {
    return (
      <NotFoundState
        title="这个任务不存在了"
        description="它可能尚未创建完成，或者已经被移除。"
        backTo={`/plans/${planId}`}
        backLabel="返回计划详情"
      />
    );
  }

  const taskReady = isTaskReadyForAgent(task.brief, task.channel, task.contentType, task.reviewPolicy);

  const handleStartAgent = () => {
    if (!taskReady || agentLoading) return;
    setShowAgentDialog(true);
  };

  const handleConfirmRun = async (options: { generateImage: boolean; imageSize?: string }) => {
    setShowAgentDialog(false);
    setAgentLoading(true);
    try {
      const run = await startAgentRun(task.id, options);
      if (run) {
        navigate(`/agent-runs/${run.id}`);
      }
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div className="pb-20 space-y-10">
      <button
        type="button"
        onClick={() => navigate(`/plans/${planId}`)}
        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-ink-black transition-colors"
      >
        <ArrowLeft size={18} />
        返回 {plan.title}
      </button>

      <header className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-ink-black mb-4">{task.title}</h1>
            {task.subtitle ? (
              <p className="text-slate-gray font-medium text-lg">{task.subtitle}</p>
            ) : null}
          </div>
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black border whitespace-nowrap ${statusPillClass(task.status)}`}>
            {taskStatusLabel(task.status)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-gray">
            <Calendar size={16} className="text-zinc-300" />
            {task.schedule}
          </span>
          <span className="text-sm font-bold text-slate-gray">
            {executionTypeLabel(task.executionType)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoCard
          icon={<Globe size={20} />}
          label="发布渠道"
          value={task.channel || '未设置'}
          muted={!task.channel}
        />
        <InfoCard
          icon={<Layers size={20} />}
          label="内容类型"
          value={task.contentType || '未设置'}
          muted={!task.contentType}
        />
        <InfoCard
          icon={<ShieldCheck size={20} />}
          label="审核策略"
          value={
            task.reviewPolicy === 'manual_required'
              ? '必须人工审核'
              : task.reviewPolicy === 'auto_if_low_risk'
                ? '低风险自动发布'
                : task.reviewPolicy === 'auto_publish'
                  ? '自动发布'
                  : '未设置'
          }
          muted={!task.reviewPolicy}
        />
      </div>

      <section className="bento-card p-8">
        <h2 className="text-lg font-black text-ink-black mb-4 flex items-center gap-3">
          <FileText size={20} className="text-signal-orange" />
          任务 Brief
        </h2>
        <p className="text-slate-gray font-medium leading-relaxed whitespace-pre-wrap">
          {task.brief || '暂无 brief，请在编辑任务时补充。'}
        </p>
      </section>

      {task.requirements && task.requirements.length > 0 ? (
        <section className="bento-card p-8">
          <h2 className="text-lg font-black text-ink-black mb-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-signal-orange" />
            执行要求
          </h2>
          <ul className="space-y-2">
            {task.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-gray font-medium">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-signal-orange shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {task.researchInstructions ? (
        <section className="bento-card p-8">
          <h2 className="text-lg font-black text-ink-black mb-4">调研指令</h2>
          <p className="text-slate-gray font-medium">{task.researchInstructions}</p>
        </section>
      ) : null}

      <section className="bento-card p-8">
        <h2 className="text-lg font-black text-ink-black mb-4 flex items-center gap-3">
          <Tag size={20} className="text-signal-orange" />
          Agent 执行准备状态
        </h2>
        <div className="flex items-center gap-4">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black border ${
              taskReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-orange-50 text-orange-700 border-orange-100'
            }`}
          >
            {taskReady ? '就绪' : '未就绪'}
          </span>
          <p className="text-sm font-medium text-slate-gray">
            {taskReady
              ? '任务 brief、渠道、内容类型和审核策略均已配置，可启动 Agent 执行。'
              : '请确保任务已配置 brief、渠道、内容类型和审核策略。'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <CheckItem label="任务 Brief" checked={Boolean(task.brief?.trim())} />
          <CheckItem label="发布渠道" checked={Boolean(task.channel?.trim())} />
          <CheckItem label="内容类型" checked={Boolean(task.contentType?.trim())} />
          <CheckItem label="审核策略" checked={Boolean(task.reviewPolicy)} />
        </div>

        {taskReady ? (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleStartAgent}
              disabled={agentLoading}
              className="inline-flex items-center gap-3 bg-signal-orange text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-light-orange transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={20} />
              {agentLoading ? 'Agent 执行中...' : '启动 Agent 执行'}
            </button>
            {task.agentRunId ? (
              <button
                type="button"
                onClick={() => navigate(`/agent-runs/${task.agentRunId}`)}
                className="ml-4 inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold border border-zinc-200 text-ink-black hover:border-signal-orange transition-colors text-sm"
              >
                查看上次执行记录
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {linkedDrafts.length > 0 ? (
        <section className="bento-card p-8">
          <h2 className="text-lg font-black text-ink-black mb-4">关联草稿</h2>
          <div className="space-y-3">
            {linkedDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => navigate(`/drafts/${draft.id}`)}
                className="w-full text-left p-4 rounded-2xl border border-zinc-100 hover:border-signal-orange transition-colors group"
              >
                <p className="font-black text-ink-black group-hover:text-signal-orange transition-colors">{draft.title}</p>
                <p className="text-sm font-medium text-slate-gray mt-1">{draft.excerpt}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {showAgentDialog ? (
        <RunAgentDialog
          task={task}
          onConfirm={handleConfirmRun}
          onCancel={() => setShowAgentDialog(false)}
        />
      ) : null}
    </div>
  );
}

function InfoCard({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-signal-orange">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
      </div>
      <p className={`text-lg font-black ${muted ? 'text-zinc-300' : 'text-ink-black'}`}>{value}</p>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
        checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 text-transparent'
      }`}>
        <CheckCircle2 size={12} />
      </span>
      <span className={`text-sm font-bold ${checked ? 'text-ink-black' : 'text-zinc-300'}`}>{label}</span>
    </div>
  );
}
