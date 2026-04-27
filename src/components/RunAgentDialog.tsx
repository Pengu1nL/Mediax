import React, { useState } from 'react';
import { Image, Play, X } from 'lucide-react';
import { PlanTask } from '../types';
import { getImageSizeForPlatform, imageSizeToString, ImageSizePreset } from '../platformImageSizes';

const IMAGE_CONTENT_TYPES = ['图文', '海报', '短视频'];

interface RunAgentDialogProps {
  task: PlanTask;
  onConfirm: (options: { generateImage: boolean; imageSize?: string }) => void;
  onCancel: () => void;
}

export default function RunAgentDialog({ task, onConfirm, onCancel }: RunAgentDialogProps) {
  const supportsImage = IMAGE_CONTENT_TYPES.includes(task.contentType || '');
  const sizePreset: ImageSizePreset = getImageSizeForPlatform(
    task.channel || '',
    task.contentType || '',
  );
  const [generateImage, setGenerateImage] = useState(supportsImage);
  const [imageSize, setImageSize] = useState(imageSizeToString(sizePreset));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-[32px] p-10 max-w-lg w-full mx-4 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-6 right-6 text-zinc-400 hover:text-ink-black transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-signal-orange/10 flex items-center justify-center mx-auto mb-4">
            <Play size={28} className="text-signal-orange" />
          </div>
          <h2 className="text-2xl font-black text-ink-black">启动 Agent 执行</h2>
          <p className="text-slate-gray font-medium mt-2">确认执行参数后开始自动生成</p>
        </div>

        <div className="space-y-4 mb-8 p-5 bg-zinc-50 rounded-2xl">
          <Row label="任务" value={task.title} />
          <Row label="平台" value={task.channel || '未设置'} />
          <Row label="内容类型" value={task.contentType || '未设置'} />
          <Row label="推荐尺寸" value={sizePreset.label} sub={sizePreset.description} />
        </div>

        {supportsImage ? (
          <div className="p-5 bg-purple-50 rounded-2xl mb-8 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateImage}
                onChange={(e) => setGenerateImage(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-signal-orange focus:ring-signal-orange"
              />
              <Image size={20} className="text-purple-600" />
              <span className="text-sm font-black text-ink-black">自动生成配图</span>
            </label>

            {generateImage ? (
              <div className="pl-10">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">图片尺寸</label>
                <input
                  type="text"
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-sm"
                  placeholder="1024x1024"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-medium text-zinc-400 text-center mb-8">
            当前内容类型不支持配图生成
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-4 rounded-2xl font-bold border-2 border-zinc-200 text-ink-black hover:border-zinc-300 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              generateImage: supportsImage ? generateImage : false,
              imageSize: generateImage ? imageSize : undefined,
            })}
            className="flex-1 px-6 py-4 rounded-2xl font-bold bg-signal-orange text-white hover:bg-light-orange transition-colors"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs font-black uppercase tracking-widest text-zinc-400 shrink-0">{label}</span>
      <span className="text-sm font-bold text-ink-black text-right">
        {value}
        {sub ? <span className="block text-xs font-medium text-zinc-400">{sub}</span> : null}
      </span>
    </div>
  );
}
