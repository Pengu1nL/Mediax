import React from 'react';

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-ink-black/40 backdrop-blur-sm overflow-y-auto px-4 py-8">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="flex items-start justify-center min-h-full">
        <div
          role="dialog"
          aria-modal="true"
          className="relative bg-white rounded-[32px] shadow-2xl border border-black/5 max-w-2xl w-full p-8 md:p-10 max-h-[90vh] overflow-y-auto"
        >
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">{title}</h2>
            {description ? <p className="text-slate-gray font-medium mt-2">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-zinc-400 hover:text-ink-black transition-colors"
          >
            关闭
          </button>
        </div>
        {children}
        </div>
      </div>
    </div>
  );
}
