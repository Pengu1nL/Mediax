import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Loader, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { NotFoundState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import type { AgentRun } from '../types';

const STEP_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={18} className="text-emerald-500" />,
  running: <Loader size={18} className="text-signal-orange animate-spin" />,
  failed: <XCircle size={18} className="text-red-500" />,
  queued: <span className="w-[18px] h-[18px] rounded-full border-2 border-zinc-200" />,
};

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '执行中',
  waiting_for_review: '等待审核',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export default function AgentRunDetails() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const { plans, planTasks, drafts } = useAppStore();
  const [agentRun, setAgentRun] = useState<AgentRun | undefined>();
  const [loading, setLoading] = useState(true);

  // Fetch agent run: try API first, fall back to localStorage
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    async function fetchRun() {
      try {
        const run = await apiClient.get<AgentRun>(`/agent-runs/${runId}`);
        if (!cancelled) setAgentRun(run);
      } catch {
        // Fallback to localStorage for offline/test use
        try {
          const raw = window.localStorage.getItem('mediax.app-data.v1');
          if (raw) {
            const data = JSON.parse(raw);
            if (data.agentRuns) {
              const found = data.agentRuns.find((r: AgentRun) => r.id === runId);
              if (!cancelled) setAgentRun(found);
            }
          }
        } catch {
          // silent
        }
      }
      if (!cancelled) setLoading(false);
    }

    fetchRun();
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size={32} className="animate-spin text-signal-orange" />
      </div>
    );
  }

  if (!agentRun) {
    return (
      <NotFoundState
        title="未找到 Agent 执行记录"
        description="这个执行记录可能尚未创建，或者已经被移除。"
        backTo="/dashboard"
        backLabel="返回 Dashboard"
      />
    );
  }

  const task = planTasks.find((t) => t.id === agentRun.taskId);
  const plan = plans.find((p) => p.id === task?.planId);
  const outputDraft = agentRun.outputDraftId ? drafts.find((d) => d.id === agentRun.outputDraftId) : undefined;

  return (
    <div className="pb-20 space-y-10">
      <button
        type="button"
        onClick={() => task ? navigate(`/plans/${task.planId}/tasks/${task.id}`) : navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-ink-black transition-colors"
      >
        <ArrowLeft size={18} />
        {task ? `返回任务 ${task.title}` : '返回 Dashboard'}
      </button>

      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border ${
            agentRun.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            agentRun.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
            agentRun.status === 'waiting_for_review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
            'bg-blue-50 text-blue-700 border-blue-100'
          }`}>
            {RUN_STATUS_LABEL[agentRun.status] || agentRun.status}
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-ink-black">
          Agent 执行记录
        </h1>
        {task ? (
          <p className="text-slate-gray font-medium">
            任务：{task.title}
          </p>
        ) : null}
        <p className="text-sm font-medium text-zinc-400">
          开始时间：{new Date(agentRun.startedAt).toLocaleString('zh-CN')}
        </p>
      </header>

      {/* Steps */}
      <section className="bento-card p-8">
        <h2 className="text-lg font-black text-ink-black mb-6">执行步骤</h2>
        <div className="space-y-4">
          {agentRun.steps.map((step, idx) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="mt-0.5">
                  {STEP_STATUS_ICON[step.status] || STEP_STATUS_ICON.queued}
                </div>
                {idx < agentRun.steps.length - 1 ? (
                  <div className={`w-0.5 flex-1 min-h-[24px] my-1 ${
                    step.status === 'completed' ? 'bg-emerald-200' : 'bg-zinc-100'
                  }`} />
                ) : null}
              </div>
              <div className="flex-1 pb-4">
                <p className="font-black text-ink-black">{step.label}</p>
                <p className="text-sm font-medium text-slate-gray mt-1">{step.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Used Knowledge */}
      {agentRun.usedKnowledgeItemIds.length > 0 ? (
        <section className="bento-card p-8">
          <h2 className="text-lg font-black text-ink-black mb-4">使用的品牌知识</h2>
          <p className="text-sm font-medium text-slate-gray">
            共引用 {agentRun.usedKnowledgeItemIds.length} 条品牌知识条目
          </p>
        </section>
      ) : null}

      {/* Output Draft */}
      {outputDraft ? (
        <section className="bento-card p-8">
          <h2 className="text-lg font-black text-ink-black mb-4 flex items-center gap-3">
            <FileText size={20} className="text-signal-orange" />
            生成草稿
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/drafts/${outputDraft.id}`)}
            className="w-full text-left p-5 rounded-2xl border border-zinc-100 hover:border-signal-orange transition-colors group"
          >
            <p className="font-black text-ink-black group-hover:text-signal-orange transition-colors">
              {outputDraft.title}
            </p>
            <p className="text-sm font-medium text-slate-gray mt-2">{outputDraft.excerpt}</p>
            <p className="text-xs font-medium text-zinc-400 mt-1">
              平台：{outputDraft.platform} · {outputDraft.group}
            </p>
          </button>
        </section>
      ) : null}

      {/* Error */}
      {agentRun.error ? (
        <section className="bento-card p-8 border-red-200 bg-red-50/50">
          <h2 className="text-lg font-black text-red-700 mb-2">错误信息</h2>
          <p className="text-sm font-medium text-red-600">{agentRun.error}</p>
        </section>
      ) : null}
    </div>
  );
}
