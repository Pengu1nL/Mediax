import React, { useState } from 'react';
import { Camera, Edit3, Globe, MoreHorizontal, Share2, Trash2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useAppStore } from '../context/AppContext';
import { getBrandProfileCompleteness } from '../utils/brandProfile';
import type { BrandKnowledgeItem } from '../types';

const KNOWLEDGE_SOURCE_LABEL: Record<string, string> = {
  asset: '素材',
  website: '网站',
  manual_note: '人工录入',
  historic_content: '历史内容',
};

export default function Brand() {
  const { brand, knowledgeItems, deleteKnowledgeItem } = useAppStore();
  const completeness = getBrandProfileCompleteness(brand);

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
              <BrandMark name={brand.name} />
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">品牌理解完整度</p>
                <p className="text-lg font-black text-ink-black">{completeness}%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">品牌知识条目</p>
                <p className="text-lg font-black text-ink-black">{knowledgeItems.length}</p>
              </div>
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

          {/* 品牌知识库 */}
          <div className="bento-card p-10 space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-6">
              <h3 className="text-2xl font-bold">品牌知识库</h3>
              <span className="text-sm font-bold text-zinc-400">{knowledgeItems.length} 条</span>
            </div>
            {knowledgeItems.length === 0 ? (
              <p className="text-sm text-zinc-400 font-medium py-4">暂无知识条目。在素材库中将文件"加入品牌知识"即可。</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {knowledgeItems.map((item) => (
                  <KnowledgeRow item={item} onDelete={() => deleteKnowledgeItem(item.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeRow({ item, onDelete }: { key?: React.Key; item: BrandKnowledgeItem; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-white rounded-2xl border border-zinc-100">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink-black truncate">{item.sourceName}</p>
        <p className="text-xs font-medium text-slate-gray mt-1 line-clamp-2">{item.summary}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500">
            {KNOWLEDGE_SOURCE_LABEL[item.sourceType] || item.sourceType}
          </span>
          {item.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-orange-50 text-[10px] font-bold text-signal-orange">{tag}</span>
          ))}
        </div>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          className="h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-ink-black transition-colors"
          aria-label="知识操作"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 min-w-[120px] z-50">
            <button
              type="button"
              onMouseDown={() => { onDelete(); setMenuOpen(false); }}
              className="w-full text-left px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              删除
            </button>
          </div>
        ) : null}
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
