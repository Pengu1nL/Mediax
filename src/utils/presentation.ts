import { DraftStatus, ExecutionType, PlanStatus, PlanTaskStatus } from '../types';

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

export function taskStatusLabel(status: PlanTaskStatus) {
  return {
    completed: '已完成',
    active: '执行中',
    pending: '待执行',
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

export function statusPillClass(status: PlanStatus | PlanTaskStatus | DraftStatus) {
  const mapping: Record<string, string> = {
    active: 'bg-blue-50 text-blue-700 border-blue-100',
    draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pending: 'bg-orange-50 text-orange-700 border-orange-100',
    review: 'bg-amber-50 text-amber-700 border-amber-100',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return mapping[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';
}
