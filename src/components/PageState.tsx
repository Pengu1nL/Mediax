import { Link } from 'react-router-dom';

export function FullScreenLoader({ title = '正在载入工作台...' }: { title?: string }) {
  return (
    <div className="min-h-screen bg-canvas-cream flex items-center justify-center px-6">
      <div className="bg-white rounded-[36px] shadow-2xl px-10 py-12 text-center max-w-md w-full border border-black/5">
        <div className="w-14 h-14 rounded-full border-2 border-zinc-200 border-t-signal-orange mx-auto animate-spin" />
        <h1 className="text-2xl font-black tracking-tight mt-6">{title}</h1>
        <p className="text-slate-gray mt-3 font-medium">正在同步本地数据与登录状态。</p>
      </div>
    </div>
  );
}

export function InlineAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-8 rounded-3xl border border-red-100 bg-red-50 px-6 py-4 flex items-start justify-between gap-4">
      <p className="text-sm font-semibold text-red-700">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
          onClick={onDismiss}
        >
          关闭
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bento-card px-8 py-14 text-center">
      <div className="max-w-lg mx-auto">
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-signal-orange">Mediax</div>
        <h2 className="text-3xl font-black tracking-tight mt-4">{title}</h2>
        <p className="text-slate-gray font-medium mt-4 leading-relaxed">{description}</p>
        {actionLabel ? (
          actionTo ? (
            <Link
              to={actionTo}
              className="inline-flex mt-8 bg-ink-black text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex mt-8 bg-ink-black text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export function NotFoundState({
  title,
  description,
  backTo,
  backLabel,
}: {
  title: string;
  description: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center pb-20">
      <div className="bento-card max-w-xl w-full px-10 py-14 text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">404</div>
        <h1 className="text-4xl font-black tracking-tight mt-5">{title}</h1>
        <p className="text-slate-gray font-medium mt-4 leading-relaxed">{description}</p>
        <Link
          to={backTo}
          className="inline-flex mt-8 bg-signal-orange text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-light-orange transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
