import React from 'react';
import { Camera, Edit3, Globe, Share2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';

export default function Brand() {
  const { brand } = useAppStore();

  return (
    <div className="relative pb-20">
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] border border-signal-orange/10 rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start mt-12">
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start relative">
          <div className="hidden lg:block absolute -top-8 -left-8 text-[120px] font-black text-zinc-100/50 pointer-events-none uppercase -z-10 tracking-widest">
            MEDIAX
          </div>
          <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full glass-nav p-6 shadow-2xl">
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-4">
              <img
                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800"
                alt="AI Generated Brand Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <Link
              to="/onboarding"
              className="absolute bottom-6 right-6 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border border-zinc-100 group hover:scale-110 transition-transform"
            >
              <Edit3 size={24} className="group-hover:text-signal-orange transition-colors" />
            </Link>
          </div>

          <div className="mt-16 text-center lg:text-left">
            <h1 className="text-6xl font-black tracking-tighter text-ink-black mb-4">{brand.name}</h1>
            <p className="text-lg font-bold text-signal-orange uppercase tracking-[0.2em] mb-8">{brand.industry}</p>
            <p className="text-slate-gray font-medium leading-relaxed max-w-lg">{brand.summary}</p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-10">
          <div className="bento-card p-10 space-y-8">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-6">
              <h3 className="text-2xl font-bold">品牌档案</h3>
              <Link to="/onboarding" className="text-signal-orange text-sm font-bold hover:underline">
                更新资料
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">成立时间</p>
                <p className="text-lg font-black text-ink-black">{brand.establishedAt || '待补充'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">核心关键词</p>
                <p className="text-lg font-black text-ink-black">{brand.keywords.join(' / ')}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">官方网站</p>
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Globe size={18} />
                  {brand.website?.replace(/^https?:\/\//, '') || '待补充'}
                </a>
              </div>
            </div>
          </div>

          <div className="bento-card p-10 space-y-8 bg-lifted-cream">
            <h3 className="text-2xl font-bold">关联账号</h3>
            <div className="space-y-4">
              {brand.channels.map((channel) => (
                <AccountRow
                  key={channel.id}
                  icon={channel.kind === 'wechat' ? <Share2 size={20} /> : channel.kind === 'xiaohongshu' ? <Camera size={20} /> : <Video size={20} />}
                  name={channel.name}
                  handle={channel.handle}
                  active={channel.active}
                />
              ))}
              <button
                type="button"
                title="新账号绑定将在真实平台集成后上线"
                className="w-full py-6 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-3 text-zinc-400 cursor-not-allowed font-bold"
              >
                账号绑定即将上线
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountRow({
  icon,
  name,
  handle,
  active,
}: {
  key?: React.Key;
  icon: React.ReactNode;
  name: string;
  handle: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-ink-black">{icon}</div>
        <div>
          <p className="font-black text-ink-black">{name}</p>
          <p className="text-sm font-bold text-zinc-400">{handle}</p>
        </div>
      </div>
      <span className="px-4 py-1.5 bg-zinc-100 rounded-full text-[10px] font-black uppercase tracking-widest text-ink-black">
        {active ? '已绑定' : '待接入'}
      </span>
    </div>
  );
}
