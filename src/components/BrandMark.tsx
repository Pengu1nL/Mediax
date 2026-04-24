import React from 'react';

export default function BrandMark({
  name,
  size = 'large',
}: {
  name: string;
  size?: 'large' | 'compact';
}) {
  const initials = name.trim().slice(0, 2) || 'MX';
  const sizeClass = size === 'compact' ? 'h-32 w-32' : 'h-72 w-72 md:h-80 md:w-80';
  const textClass = size === 'compact' ? 'text-2xl' : 'text-5xl';

  return (
    <div
      className={`${sizeClass} relative overflow-hidden rounded-full bg-lifted-cream shadow-2xl border-[10px] border-white`}
      aria-label={`${name} 品牌标识`}
      role="img"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(243,115,56,0.28),transparent_28%),radial-gradient(circle_at_70%_72%,rgba(20,20,19,0.12),transparent_36%)]" />
      <div className="absolute -left-8 top-10 h-28 w-[120%] rotate-[-18deg] rounded-full bg-ink-black/90" />
      <div className="absolute right-[-18%] bottom-8 h-28 w-52 rotate-[26deg] rounded-full bg-signal-orange" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${textClass} h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/90 shadow-xl flex items-center justify-center font-black leading-none whitespace-nowrap text-signal-orange`}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
