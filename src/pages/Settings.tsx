import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, ExternalLink, Image, Info, Loader2, Save, Video } from 'lucide-react';
import { InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import type { ConfigStatusEntry, SystemConfig, LlmConfig, ImageGenConfig } from '../types';

const LLM_PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
};

function LlmForm({ value, onChange }: { value: LlmConfig; onChange: (v: LlmConfig) => void }) {
  const llmDefaults = LLM_PROVIDER_DEFAULTS[value.provider];
  const modelPlaceholder = llmDefaults?.model ?? 'deepseek-v4-pro';
  const baseUrlPlaceholder = llmDefaults?.baseUrl ?? 'https://api.deepseek.com/v1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <select value={value.provider} onChange={(e) => {
            const provider = e.target.value;
            const defaults = LLM_PROVIDER_DEFAULTS[provider];
            onChange({
              ...value,
              provider,
              ...(defaults ? {
                baseUrl: value.baseUrl || defaults.baseUrl,
                model: value.model || defaults.model,
              } : {}),
            });
          }} className="input">
            <option value="">未配置</option>
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义</option>
          </select>
        </Field>
        <Field label="Model">
          <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="input" placeholder={modelPlaceholder} />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input type="password" value={value.apiKey} onChange={(e) => onChange({ ...value, apiKey: e.target.value })} className="input" placeholder="请输入您的 API Key" />
        </Field>
        <Field label="Base URL">
          <input type="text" value={value.baseUrl} onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} className="input" placeholder={baseUrlPlaceholder} />
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
  const imgDefaults = IMAGE_GEN_PROVIDER_DEFAULTS[value.provider];
  const modelPlaceholder = imgDefaults?.model ?? 'gpt-image-2';
  const baseUrlPlaceholder = imgDefaults?.baseUrl ?? 'https://api.openai.com/v1';

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
              ...(defaults ? {
                baseUrl: value.baseUrl || defaults.baseUrl,
                model: value.model || defaults.model,
              } : {}),
            });
          }} className="input">
            <option value="">未配置</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义</option>
          </select>
        </Field>
        <Field label="Model">
          <input type="text" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="input" placeholder={modelPlaceholder} />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input type="password" value={value.apiKey} onChange={(e) => onChange({ ...value, apiKey: e.target.value })} className="input" placeholder="请输入您的 API Key" />
        </Field>
        <Field label="Base URL">
          <input type="text" value={value.baseUrl} onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} className="input" placeholder={baseUrlPlaceholder} />
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

interface ProviderGuide {
  name: string;
  registerUrl: string;
  defaultBaseUrl: string;
  recommendedModel: string;
  docsUrl?: string;
  deprecationNote?: string;
}

const LLM_PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  deepseek: {
    name: 'DeepSeek',
    registerUrl: 'platform.deepseek.com',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    recommendedModel: 'deepseek-v4-pro（高质量）/ deepseek-v4-flash（快速）',
    docsUrl: 'https://api-docs.deepseek.com/zh-cn/',
    deprecationNote: 'deepseek-chat / deepseek-reasoner 于 2026-07-24 退役，请使用新模型名',
  },
  openai: {
    name: 'OpenAI',
    registerUrl: 'platform.openai.com/api-keys',
    defaultBaseUrl: 'https://api.openai.com/v1',
    recommendedModel: 'gpt-4o',
    docsUrl: 'https://platform.openai.com/docs',
  },
  openrouter: {
    name: 'OpenRouter',
    registerUrl: 'openrouter.ai/keys',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    recommendedModel: 'openai/gpt-4o',
    docsUrl: 'https://openrouter.ai/docs',
  },
};

const IMAGE_GEN_PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  openai: {
    name: 'OpenAI',
    registerUrl: 'platform.openai.com/api-keys',
    defaultBaseUrl: 'https://api.openai.com/v1',
    recommendedModel: 'dall-e-3 / gpt-image-2',
    docsUrl: 'https://platform.openai.com/docs/guides/images',
  },
  openrouter: {
    name: 'OpenRouter',
    registerUrl: 'openrouter.ai/keys',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    recommendedModel: 'gpt-image-2',
    docsUrl: 'https://openrouter.ai/docs',
  },
};

function ConfigStatusRow({ label, icon, iconBg, iconColor, status }: {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  status: ConfigStatusEntry;
}) {
  const isEnv = status.source === 'env';
  const isConfigured = status.configured;
  const sourceLabel = status.source === 'stored' ? 'Settings' : status.source === 'env' ? '环境变量' : '未配置';
  const sourceStyle = status.source === 'stored'
    ? 'bg-green-50 text-green-700'
    : status.source === 'env'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700';

  return (
    <div className={`flex items-center justify-between py-1.5 ${isEnv ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>{icon}</div>
        <span className="text-sm font-bold text-ink-black">{label}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${sourceStyle}`}>{sourceLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        {isConfigured ? (
          <CheckCircle2 size={14} className="text-green-500" />
        ) : (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-red-300" />
        )}
        <code className="text-xs text-zinc-500">{status.model || '—'}</code>
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: ProviderGuide }) {
  return (
    <div className="bento-card p-5 mt-4 border border-zinc-200/60 bg-zinc-50/50">
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-blue-500" />
        <span className="text-sm font-black text-ink-black">{guide.name} 配置指南</span>
      </div>
      <ul className="space-y-1.5 text-sm text-zinc-600">
        <li>前往 <a href={`https://${guide.registerUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 font-medium hover:underline">{guide.registerUrl}<ExternalLink size={10} className="ml-0.5" /></a> 注册并获取 API Key</li>
        <li>默认 Base URL：<code className="text-xs bg-zinc-200 px-1.5 py-0.5 rounded">{guide.defaultBaseUrl}</code></li>
        <li>推荐 Model：<code className="text-xs bg-zinc-200 px-1.5 py-0.5 rounded">{guide.recommendedModel}</code></li>
        {guide.docsUrl ? (
          <li><a href={guide.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 font-medium hover:underline">API 文档<ExternalLink size={10} className="ml-0.5" /></a></li>
        ) : null}
      </ul>
      {guide.deprecationNote ? (
        <p className="mt-3 text-xs font-medium text-signal-orange bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          {guide.deprecationNote}
        </p>
      ) : null}
    </div>
  );
}

type TestState = 'idle' | 'testing' | 'success' | 'failure';

interface TestResult {
  latency?: number;
  error?: string;
}

export default function Settings() {
  const { config, configStatus, saveConfig } = useAppStore();
  const [form, setForm] = useState<SystemConfig>(config);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [testLlmState, setTestLlmState] = useState<TestState>('idle');
  const [testLlmResult, setTestLlmResult] = useState<TestResult>({});
  const [testImageState, setTestImageState] = useState<TestState>('idle');
  const [testImageResult, setTestImageResult] = useState<TestResult>({});

  useEffect(() => { setForm(config); }, [config]);

  const handleSave = async () => {
    setSaving(true);
    const saved = await saveConfig(form);
    setSaving(false);
    if (saved) setNotice('配置已保存。');
  };

  const handleTest = async (type: 'llm' | 'image-gen') => {
    const cfg = type === 'llm' ? form.llm : form.imageGen;
    const setState = type === 'llm' ? setTestLlmState : setTestImageState;
    const setResult = type === 'llm' ? setTestLlmResult : setTestImageResult;

    setState('testing');
    setResult({});

    const token = localStorage.getItem('mediax.auth-token.v1');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`/api/config/test-${type}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: cfg.provider,
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
        }),
      });
      const data = await res.json() as { ok: boolean; latency?: number; error?: string };
      setResult(data);
      setState(data.ok ? 'success' : 'failure');
      if (data.ok) {
        setTimeout(() => { setState('idle'); setResult({}); }, 3000);
      }
    } catch {
      setResult({ error: '无法连接服务器，请检查网络设置' });
      setState('failure');
    }
  };

  return (
    <div className="pb-20 space-y-12">
      <header>
        <h1 className="text-5xl font-black tracking-tighter text-ink-black">设置</h1>
        <p className="text-slate-gray mt-3 font-medium">配置 AI 模型参数，Agent 执行时会自动使用。</p>
      </header>

      {notice ? <InlineAlert message={notice} onDismiss={() => setNotice('')} /> : null}

      {configStatus?.llm && configStatus?.imageGen ? (
        <section className="bento-card p-6">
          <h3 className="text-sm font-black text-ink-black mb-4">配置状态</h3>
          <div className="space-y-3">
            <ConfigStatusRow
              label="文本生成"
              icon={<Cpu size={14} />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              status={configStatus.llm}
            />
            <ConfigStatusRow
              label="图片生成"
              icon={<Image size={14} />}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              status={configStatus.imageGen}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-4 pt-3 border-t border-zinc-100">
            Settings 页面中的配置优先于 .env 环境变量
          </p>
        </section>
      ) : null}

      <div className="space-y-8">
        {/* 文本生成 */}
        <section className="bento-card p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><Cpu size={20} className="text-blue-600" /></div>
              <div>
                <h2 className="text-xl font-black text-ink-black">文本生成</h2>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">用于 Agent 内容创作</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!form.llm.apiKey.trim() || testLlmState === 'testing'}
              onClick={() => handleTest('llm')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-ink-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={!form.llm.apiKey.trim() ? '请先填写 API Key' : '测试连接'}
            >
              {testLlmState === 'testing' ? (
                <><Loader2 size={12} className="animate-spin" />测试中...</>
              ) : testLlmState === 'success' ? (
                <><CheckCircle2 size={12} className="text-green-600" />连接成功 ({testLlmResult.latency}ms)</>
              ) : (
                <>测试连接</>
              )}
            </button>
          </div>
          {testLlmState === 'failure' ? (
            <InlineAlert message={testLlmResult.error ?? '连接失败'} onDismiss={() => { setTestLlmState('idle'); setTestLlmResult({}); }} />
          ) : null}
          <LlmForm value={form.llm} onChange={(v) => setForm((f) => ({ ...f, llm: v }))} />
          {form.llm.provider && form.llm.provider !== 'custom' && LLM_PROVIDER_GUIDES[form.llm.provider] ? (
            <GuideCard guide={LLM_PROVIDER_GUIDES[form.llm.provider]} />
          ) : null}
        </section>

        {/* 图片生成 */}
        <section className="bento-card p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center"><Image size={20} className="text-purple-600" /></div>
              <div>
                <h2 className="text-xl font-black text-ink-black">图片生成</h2>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">用于自动配图（图文、海报、短视频封面）</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!form.imageGen.apiKey.trim() || testImageState === 'testing'}
              onClick={() => handleTest('image-gen')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-ink-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={!form.imageGen.apiKey.trim() ? '请先填写 API Key' : '测试连接'}
            >
              {testImageState === 'testing' ? (
                <><Loader2 size={12} className="animate-spin" />测试中...</>
              ) : testImageState === 'success' ? (
                <><CheckCircle2 size={12} className="text-green-600" />连接成功 ({testImageResult.latency}ms)</>
              ) : (
                <>测试连接</>
              )}
            </button>
          </div>
          {testImageState === 'failure' ? (
            <InlineAlert message={testImageResult.error ?? '连接失败'} onDismiss={() => { setTestImageState('idle'); setTestImageResult({}); }} />
          ) : null}
          <ImageForm value={form.imageGen} onChange={(v) => setForm((f) => ({ ...f, imageGen: v }))} />
          {form.imageGen.provider && form.imageGen.provider !== 'custom' && IMAGE_GEN_PROVIDER_GUIDES[form.imageGen.provider] ? (
            <GuideCard guide={IMAGE_GEN_PROVIDER_GUIDES[form.imageGen.provider]} />
          ) : null}
        </section>

        {/* 视频生成（即将上线） */}
        <section className="bento-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center"><Video size={20} className="text-purple-600" /></div>
            <div>
              <h2 className="text-xl font-black text-ink-black">视频生成</h2>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">即将上线</p>
            </div>
          </div>
          <div className="border-2 border-dashed border-zinc-200 rounded-3xl py-12 px-8 text-center">
            <p className="text-4xl mb-4">🚀</p>
            <h3 className="text-lg font-black text-ink-black mb-2">即将上线</h3>
            <p className="text-sm font-medium text-zinc-400 max-w-md mx-auto leading-relaxed">
              AI 短视频生成功能正在开发中，届时将支持一键生成品牌宣传短视频。
            </p>
            <p className="text-xs font-medium text-zinc-300 mt-3">敬请期待</p>
          </div>
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
