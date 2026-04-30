import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Image, Save, Video } from 'lucide-react';
import { InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import type { SystemConfig, LlmConfig, ImageGenConfig, VideoGenConfig } from '../types';

function LlmForm({ value, onChange }: { value: LlmConfig; onChange: (v: LlmConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <select value={value.provider} onChange={(e) => onChange({ ...value, provider: e.target.value })} className="input">
            <option value="">未配置</option>
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义</option>
          </select>
        </Field>
        <Field label="Model">
          <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="input" placeholder="deepseek-chat" />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input type="password" value={value.apiKey} onChange={(e) => onChange({ ...value, apiKey: e.target.value })} className="input" placeholder="sk-..." />
        </Field>
        <Field label="Base URL">
          <input type="text" value={value.baseUrl} onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} className="input" placeholder="https://api.deepseek.com/v1" />
        </Field>
      </div>
    </div>
  );
}

const IMAGE_GEN_PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'dall-e-3' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'gpt-image-2' },
};

function ImageForm({ value, onChange }: { value: ImageGenConfig; onChange: (v: ImageGenConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <select value={value.provider} onChange={(e) => {
            const provider = e.target.value;
            const defaults = IMAGE_GEN_PROVIDER_DEFAULTS[provider];
            onChange({
              ...value,
              provider,
              ...(defaults ? { baseUrl: defaults.baseUrl, model: defaults.model } : {}),
            });
          }} className="input">
            <option value="">未配置</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义</option>
          </select>
        </Field>
        <Field label="Model">
          <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="input" placeholder="gpt-image-2" />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input type="password" value={value.apiKey} onChange={(e) => onChange({ ...value, apiKey: e.target.value })} className="input" placeholder="sk-..." />
        </Field>
        <Field label="Base URL">
          <input type="text" value={value.baseUrl} onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} className="input" placeholder="https://api.openai.com/v1" />
        </Field>
      </div>
    </div>
  );
}

function VideoForm({ value, onChange }: { value: VideoGenConfig; onChange: (v: VideoGenConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <select value={value.provider} onChange={(e) => onChange({ ...value, provider: e.target.value })} className="input">
            <option value="">未配置</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义</option>
          </select>
        </Field>
        <Field label="Model">
          <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="input" placeholder="即将支持" disabled />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input type="password" value={value.apiKey} onChange={(e) => onChange({ ...value, apiKey: e.target.value })} className="input" placeholder="即将支持" disabled />
        </Field>
        <Field label="Base URL">
          <input type="text" value={value.baseUrl} onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} className="input" placeholder="https://openrouter.ai/api/v1" disabled />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { config, saveConfig } = useAppStore();
  const [form, setForm] = useState<SystemConfig>(config);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(config); }, [config]);

  const handleSave = async () => {
    setSaving(true);
    const saved = await saveConfig(form);
    setSaving(false);
    if (saved) setNotice('配置已保存。');
  };

  return (
    <div className="pb-20 space-y-12">
      <header>
        <h1 className="text-5xl font-black tracking-tighter text-ink-black">设置</h1>
        <p className="text-slate-gray mt-3 font-medium">配置 AI 模型参数，Agent 执行时会自动使用。</p>
      </header>

      {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}

      <div className="space-y-8">
        {/* 文本生成 */}
        <section className="bento-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Cpu size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-xl font-black text-ink-black">文本生成</h2>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">用于 Agent 内容创作</p>
            </div>
          </div>
          <LlmForm value={form.llm} onChange={(v) => setForm((f) => ({ ...f, llm: v }))} />
        </section>

        {/* 图片生成 */}
        <section className="bento-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center"><Image size={20} className="text-purple-600" /></div>
            <div>
              <h2 className="text-xl font-black text-ink-black">图片生成</h2>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">用于自动配图（图文、海报、短视频封面）</p>
            </div>
          </div>
          <ImageForm value={form.imageGen} onChange={(v) => setForm((f) => ({ ...f, imageGen: v }))} />
        </section>

        {/* 视频生成（预留） */}
        <section className="bento-card p-8 opacity-60">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><Video size={20} className="text-zinc-400" /></div>
            <div>
              <h2 className="text-xl font-black text-ink-black">视频生成</h2>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">即将支持 · 预留配置</p>
            </div>
          </div>
          <VideoForm value={form.videoGen} onChange={(v) => setForm((f) => ({ ...f, videoGen: v }))} />
        </section>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving}
          className="bg-ink-black text-white px-10 py-4 rounded-full font-bold shadow-xl hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
          <Save size={18} />
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}
