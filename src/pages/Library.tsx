import React, { useMemo, useState } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { EmptyState } from '../components/PageState';
import { useAppStore } from '../context/AppContext';

export default function Library() {
  const { assets } = useAppStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => asset.name.toLowerCase().includes(search.trim().toLowerCase())),
    [assets, search],
  );

  return (
    <div className="flex gap-8 min-h-[700px] pb-20">
      <aside className="w-64 flex-shrink-0 space-y-8">
        <h2 className="text-2xl font-bold">索引</h2>
        <div className="space-y-1">
          <SidebarItem icon={<FolderOpen size={18} />} label="所有素材" active />
          <SidebarItem icon={<Folder size={18} />} label="2024 春季活动" indent={1} />
          <SidebarItem icon={<Folder size={18} />} label="产品图片" indent={1} />
          <SidebarItem icon={<Folder size={18} />} label="未修图原片" indent={2} />
          <SidebarItem icon={<Folder size={18} />} label="社交媒体素材" indent={1} />
          <div className="pt-4">
            <SidebarItem icon={<Trash2 size={18} />} label="回收站" />
          </div>
        </div>
      </aside>

      <section className="flex-grow bento-card p-8 flex flex-col">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold">所有素材</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray" size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索文件..."
                className="bg-zinc-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-signal-orange w-64"
              />
            </div>
            <div className="bg-zinc-100 p-1 rounded-full flex">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-ink-black' : 'text-slate-gray'
                }`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-ink-black' : 'text-slate-gray'
                }`}
              >
                <List size={18} />
              </button>
            </div>
            <button
              type="button"
              title="上传功能将在真实对象存储接入后上线"
              className="bg-zinc-200 text-zinc-500 px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold cursor-not-allowed"
            >
              <Upload size={18} />
              上传即将上线
            </button>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <EmptyState
            title="没有找到匹配的素材"
            description="当前搜索只会在已内置的演示资产中匹配名称。真实上传会在后续对象存储阶段接入。"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-8 gap-y-12">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="py-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                    {asset.type === 'folder' ? (
                      <Folder size={28} className="text-signal-orange" />
                    ) : asset.type === 'pdf' ? (
                      <FileText size={28} className="text-zinc-400" />
                    ) : (
                      <Video size={28} className="text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-ink-black">{asset.name}</p>
                    <p className="text-sm text-slate-gray font-medium">{asset.updatedAt}</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-zinc-400">{asset.size || asset.type}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  indent = 0,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  indent?: number;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        active ? 'bg-white shadow-sm border border-zinc-100 text-ink-black font-bold' : 'text-slate-gray'
      }`}
      style={{ paddingLeft: `${indent * 1.5 + 0.75}rem` }}
    >
      <span className={active ? 'text-signal-orange' : ''}>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function AssetCard({
  asset,
}: {
  key?: React.Key;
  asset: ReturnType<typeof useAppStore>['assets'][number];
}) {
  const isFolder = asset.type === 'folder';
  const hasThumbnail = Boolean(asset.thumbnail);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const showRemoteThumbnail = hasThumbnail && !thumbnailFailed;

  return (
    <div className="relative flex flex-col items-center group cursor-default">
      <div className="w-full aspect-square bg-zinc-50 rounded-3xl border border-black/5 shadow-sm overflow-hidden mb-3 relative group-hover:shadow-md group-hover:border-signal-orange/20 transition-all duration-300">
        <AssetFallbackCover asset={asset} />
        {showRemoteThumbnail ? (
          <>
            <img
              src={asset.thumbnail}
              alt={asset.name}
              onError={() => setThumbnailFailed(true)}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            {isFolder ? (
              <div className="absolute left-3 top-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-signal-orange shadow-sm">
                <Folder size={20} strokeWidth={1.8} />
              </div>
            ) : null}
          </>
        ) : !hasThumbnail ? (
          <div className={`w-full h-full flex items-center justify-center ${isFolder ? 'bg-zinc-50' : 'bg-zinc-100'}`}>
            {isFolder ? (
              <Folder size={56} className="text-signal-orange" strokeWidth={1.5} fill="currentColor" fillOpacity={0.1} />
            ) : asset.type === 'pdf' ? (
              <FileText size={48} className="text-zinc-300" />
            ) : (
              <Video size={48} className="text-zinc-300" />
            )}
          </div>
        ) : null}
      </div>
      <div className="text-center px-1 w-full">
        <p className="text-[13px] font-bold text-ink-black truncate">{asset.name}</p>
        <p className="text-[11px] font-medium text-slate-gray mt-0.5 opacity-60">
          {isFolder ? asset.size : asset.updatedAt}
        </p>
      </div>
    </div>
  );
}

function AssetFallbackCover({
  asset,
}: {
  asset: ReturnType<typeof useAppStore>['assets'][number];
}) {
  const label = asset.name.replace(/\s+/g, '').slice(0, 2) || 'MX';

  return (
    <div className="absolute inset-0 bg-lifted-cream">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(207,69,0,0.16),transparent_30%),radial-gradient(circle_at_70%_78%,rgba(20,20,19,0.10),transparent_36%)]" />
      <div className="absolute -left-8 top-7 h-16 w-[130%] rotate-[-16deg] rounded-full bg-white/80" />
      <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-white/85 px-4 py-2 text-lg font-black text-signal-orange shadow-sm">
                {label}
              </span>
      </div>
    </div>
  );
}
