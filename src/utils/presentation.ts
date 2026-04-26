import { AgentTaskStatus, DraftStatus, ExecutionType, PlanStatus } from '../types';

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date(value));
}

export function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })} - ${formatDate(
    endDate,
    { year: 'numeric', month: '2-digit', day: '2-digit' },
  )}`;
}

export function formatRelativeTimestamp(value: string) {
  const date = new Date(value);
  return formatDate(date.toISOString(), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function planStatusLabel(status: PlanStatus) {
  return {
    active: '进行中',
    draft: '草稿',
    completed: '已完成',
  }[status];
}

export function taskStatusLabel(status: AgentTaskStatus) {
  return {
    draft: '草稿',
    queued: '排队中',
    researching: '调研中',
    planning: '规划中',
    creating: '生成中',
    ready_for_review: '待审核',
    approved: '已批准',
    publishing: '发布中',
    published: '已发布',
    failed: '失败',
    cancelled: '已取消',
  }[status];
}

export function draftStatusLabel(status: DraftStatus) {
  return {
    draft: '草稿中',
    review: '待审核',
    ready: '可发布',
  }[status];
}

export function executionTypeLabel(type: ExecutionType) {
  return {
    single: '单次执行',
    recurring: '循环执行',
  }[type];
}

export function statusPillClass(status: PlanStatus | AgentTaskStatus | DraftStatus) {
  const mapping: Record<string, string> = {
    active: 'bg-blue-50 text-blue-700 border-blue-100',
    draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    queued: 'bg-sky-50 text-sky-700 border-sky-100',
    researching: 'bg-purple-50 text-purple-700 border-purple-100',
    planning: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    creating: 'bg-amber-50 text-amber-700 border-amber-100',
    ready_for_review: 'bg-orange-50 text-orange-700 border-orange-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    publishing: 'bg-blue-50 text-blue-700 border-blue-100',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    failed: 'bg-red-50 text-red-700 border-red-100',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    pending: 'bg-orange-50 text-orange-700 border-orange-100',
    review: 'bg-amber-50 text-amber-700 border-amber-100',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return mapping[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';
}
