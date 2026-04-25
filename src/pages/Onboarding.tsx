import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import type { ReviewPolicy } from '../types';

export default function Onboarding() {
  const navigate = useNavigate();
  const { brand, error, clearError, saveBrandProfile } = useAppStore();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState('');
  const [summary, setSummary] = useState('');
  const [audience, setAudience] = useState('');
  const [positioning, setPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [doAndDonts, setDoAndDonts] = useState('');
  const [defaultReviewPolicy, setDefaultReviewPolicy] = useState<ReviewPolicy>('manual_required');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setName(brand.name);
    setIndustry(brand.industry);
    setKeywords(brand.keywords.join(', '));
    setSummary(brand.summary);
    setAudience(brand.audience ?? '');
    setPositioning(brand.positioning ?? '');
    setToneOfVoice(brand.toneOfVoice ?? '');
    setDoAndDonts((brand.doAndDonts ?? []).join(', '));
    setDefaultReviewPolicy(brand.defaultReviewPolicy ?? 'manual_required');
  }, [brand]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!name.trim() || !industry.trim() || !summary.trim()) {
      setFormError('请先补全品牌名称、行业和简介。');
      return;
    }

    const savedProfile = await saveBrandProfile({
      ...brand,
      name: name.trim(),
      industry: industry.trim(),
      summary: summary.trim(),
      keywords: keywords
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      audience: audience.trim(),
      positioning: positioning.trim(),
      toneOfVoice: toneOfVoice.trim(),
      doAndDonts: doAndDonts
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      defaultReviewPolicy,
      setupComplete: true,
    });

    if (savedProfile) {
      navigate('/brand');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-canvas-cream relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-signal-orange/10 rounded-full blur-[100px] select-none pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-light-orange/10 rounded-full blur-[100px] select-none pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl relative z-10">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-gray hover:text-ink-black transition-colors font-bold text-sm mb-10 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          返回
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-signal-orange to-light-orange" />

          <div className="mb-12">
            <span className="text-xs font-black text-signal-orange tracking-[0.3em] uppercase">Step 1 OF 3</span>
            <h1 className="text-5xl font-black tracking-tighter text-ink-black mt-4">定义您的品牌</h1>
            <p className="text-slate-gray mt-4 font-medium text-lg leading-relaxed">
              请提供基本信息，我们会把它持久化到本地工作台，供 Brand、Plans 与 Drafts 模块共享。
            </p>
          </div>

          {formError ? <InlineAlert message={formError} onDismiss={() => setFormError('')} /> : null}
          {error ? <InlineAlert message={error} onDismiss={clearError} /> : null}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="brand-name" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                品牌名称
              </label>
              <input
                id="brand-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：Mediax Studios"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="brand-industry" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                所属行业
              </label>
              <div className="relative">
                <select
                  id="brand-industry"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold appearance-none focus:ring-2 focus:ring-signal-orange cursor-pointer"
                >
                  <option value="" disabled>
                    选择最贴近的行业
                  </option>
                  <option>教育 / 民办高中</option>
                  <option>科技与软件</option>
                  <option>媒体与出版</option>
                  <option>设计与创意服务</option>
                </select>
                <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={24} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-4">
                <label htmlFor="brand-keywords" className="text-xs font-black uppercase tracking-widest text-ink-black">
                  核心关键词
                </label>
                <span className="text-[10px] font-bold text-zinc-300 uppercase italic">逗号分隔</span>
              </div>
              <input
                id="brand-keywords"
                type="text"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="例如：专业, 极简, 创新"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange transition-all"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="brand-summary" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                品牌简介
              </label>
              <textarea
                id="brand-summary"
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="简述品牌愿景、目标受众及核心价值..."
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold resize-none focus:ring-2 focus:ring-signal-orange transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label htmlFor="brand-audience" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                  目标受众
                </label>
                <input
                  id="brand-audience"
                  type="text"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="例如：学生家庭、校友、合作伙伴"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="brand-positioning" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                  品牌定位
                </label>
                <input
                  id="brand-positioning"
                  type="text"
                  value={positioning}
                  onChange={(event) => setPositioning(event.target.value)}
                  placeholder="例如：临港融合教育品牌"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="brand-tone" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                品牌语气
              </label>
              <input
                id="brand-tone"
                type="text"
                value={toneOfVoice}
                onChange={(event) => setToneOfVoice(event.target.value)}
                placeholder="例如：专业、温暖、可信"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-4">
                <label htmlFor="brand-do-and-donts" className="text-xs font-black uppercase tracking-widest text-ink-black">
                  禁用表达
                </label>
                <span className="text-[10px] font-bold text-zinc-300 uppercase italic">逗号分隔</span>
              </div>
              <input
                id="brand-do-and-donts"
                type="text"
                value={doAndDonts}
                onChange={(event) => setDoAndDonts(event.target.value)}
                placeholder="例如：不夸大升学结果, 不制造焦虑"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="brand-review-policy" className="text-xs font-black uppercase tracking-widest text-ink-black ml-4">
                默认审核策略
              </label>
              <div className="relative">
                <select
                  id="brand-review-policy"
                  value={defaultReviewPolicy}
                  onChange={(event) => setDefaultReviewPolicy(event.target.value as ReviewPolicy)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold appearance-none focus:ring-2 focus:ring-signal-orange cursor-pointer"
                >
                  <option value="manual_required">必须人工审核</option>
                  <option value="auto_if_low_risk">低风险自动通过</option>
                  <option value="auto_publish">自动发布</option>
                </select>
                <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={24} />
              </div>
            </div>

            <div className="pt-6 flex flex-col md:flex-row items-center justify-end gap-6 border-t border-zinc-50">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full md:w-auto text-ink-black font-bold text-sm px-8 py-4 rounded-2xl hover:bg-zinc-50 transition-colors"
              >
                稍后完善
              </button>
              <button
                type="submit"
                className="w-full md:w-auto bg-ink-black text-white font-bold text-sm px-10 py-5 rounded-3xl shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 group"
              >
                保存并进入品牌页
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
