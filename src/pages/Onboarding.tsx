import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronDown, Edit3, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';
import type { ReviewPolicy } from '../types';

type Step = 0 | 1 | 2;

const STEP_LABELS = ['品牌身份', '品牌声音', '审核确认'] as const;

const INDUSTRY_PRESETS = [
  '教育 / 民办高中',
  '科技与软件',
  '传媒',
  '设计与创意服务',
  '餐饮与食品',
  '零售与电商',
  '金融服务',
  '医疗健康',
  '制造业',
  '房地产与建筑',
  '旅游与酒店',
  '文化娱乐',
  '教育培训',
  '农业与食品加工',
  '交通运输与物流',
  '能源与环保',
] as const;

const CUSTOM_INDUSTRY = '__custom__';

const stepVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { brand, error, clearError, saveBrandProfile, suggestBrandFields } = useAppStore();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [keywords, setKeywords] = useState('');
  const [summary, setSummary] = useState('');
  const [audience, setAudience] = useState('');
  const [positioning, setPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [doAndDonts, setDoAndDonts] = useState('');
  const [defaultReviewPolicy, setDefaultReviewPolicy] = useState<ReviewPolicy>('manual_required');
  const [formError, setFormError] = useState('');
  const [direction, setDirection] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratingField, setAiGeneratingField] = useState<string | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setName(brand.name);
    if (brand.industry && !INDUSTRY_PRESETS.includes(brand.industry as typeof INDUSTRY_PRESETS[number])) {
      setSelectedIndustry(CUSTOM_INDUSTRY);
      setCustomIndustry(brand.industry);
    } else {
      setSelectedIndustry(brand.industry);
      setCustomIndustry('');
    }
    setKeywords(brand.keywords.join(', '));
    setSummary(brand.summary);
    setAudience(brand.audience ?? '');
    setPositioning(brand.positioning ?? '');
    setToneOfVoice(brand.toneOfVoice ?? '');
    setDoAndDonts((brand.doAndDonts ?? []).join(', '));
    setDefaultReviewPolicy(brand.defaultReviewPolicy ?? 'manual_required');
  }, [brand]);

  const industry = selectedIndustry === CUSTOM_INDUSTRY ? customIndustry : selectedIndustry;

  const goToStep = (step: Step) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < 2) {
      goToStep((currentStep + 1) as Step);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep((currentStep - 1) as Step);
    }
  };

  const triggerHighlight = useCallback((fields: string[]) => {
    // Clear previous timers
    highlightTimers.current.forEach(clearTimeout);
    highlightTimers.current = [];

    const newHighlights = new Set(fields);
    setHighlightedFields(newHighlights);

    const timer = setTimeout(() => {
      setHighlightedFields(new Set());
    }, 1500);
    highlightTimers.current = [timer];
  }, []);

  const handleAISuggestField = useCallback(async (fieldName: string, fieldLabel: string, currentValue: string) => {
    if (!currentValue.trim() || aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    setAiGeneratingField(fieldName);

    try {
      const result = await suggestBrandFields({
        field: fieldName,
        current: currentValue.trim(),
        name: name.trim() || undefined,
        industry: industry.trim() || undefined,
      });
      if (result) {
        const value = result[fieldName as keyof typeof result];
        if (value) {
          switch (fieldName) {
            case 'summary': setSummary(value); break;
            case 'toneOfVoice': setToneOfVoice(value); break;
            case 'audience': setAudience(value); break;
            case 'positioning': setPositioning(value); break;
            case 'doAndDonts': setDoAndDonts(value); break;
            default: break;
          }
          triggerHighlight([fieldLabel]);
        }
      } else {
        setAiError('AI 功能暂不可用，请检查 API 配置。');
      }
    } catch {
      setAiError('AI 优化失败，请稍后重试。');
    } finally {
      setAiLoading(false);
      setAiGeneratingField(null);
    }
  }, [name, industry, aiLoading, suggestBrandFields, triggerHighlight]);

  useEffect(() => {
    return () => {
      highlightTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleSubmit = async () => {
    setFormError('');

    if (!name.trim() || !industry.trim() || !summary.trim()) {
      setFormError('请先补全品牌名称、行业和简介。');
      // Jump to the first step with a missing field
      if (!name.trim() || !industry.trim()) {
        setCurrentStep(0);
      } else if (!summary.trim()) {
        setCurrentStep(1);
      }
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

  const brandProfileSummary = {
    品牌名称: name || '—',
    所属行业: industry || '—',
    核心关键词: keywords || '—',
    品牌简介: summary || '—',
    品牌语气: toneOfVoice || '—',
    目标受众: audience || '—',
    品牌定位: positioning || '—',
    禁用表达: doAndDonts || '—',
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

          {/* Step Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-center gap-0">
              {STEP_LABELS.map((label, index) => {
                const step = index as Step;
                const isCompleted = step < currentStep;
                const isCurrent = step === currentStep;
                const isClickable = isCompleted;

                return (
                  <React.Fragment key={label}>
                    {(() => {
                      const lineToLeft = step <= currentStep;
                      const lineOrange = step <= currentStep + 1;
                      return (
                        index > 0 && (
                          <div
                            className={`h-0 w-16 mx-2 border-t-2 ${
                              lineToLeft ? 'border-solid' : 'border-dashed'
                            } ${
                              lineOrange ? 'border-signal-orange' : 'border-zinc-200'
                            }`}
                          />
                        )
                      );
                    })()}
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && goToStep(step)}
                      className={`flex flex-col items-center gap-1.5 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isCompleted || isCurrent
                            ? 'bg-signal-orange text-white'
                            : 'bg-zinc-100 text-zinc-400'
                        } ${isClickable ? 'hover:scale-110' : ''}`}
                      >
                        {isCompleted ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`text-xs font-bold whitespace-nowrap ${
                          isCurrent ? 'text-signal-orange' : isCompleted ? 'text-ink-black' : 'text-zinc-300'
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Header */}
          <div className="mb-10">
            <span className="text-xs font-black text-signal-orange tracking-[0.3em] uppercase">
              Step {currentStep + 1} of 3
            </span>
            <h1 className="text-5xl font-black tracking-tighter text-ink-black mt-4">定义您的品牌</h1>
            <p className="text-slate-gray mt-4 font-medium text-lg leading-relaxed">
              请提供基本信息，我们会把它持久化到本地工作台，供 Brand、Plans 与 Drafts 模块共享。
            </p>
          </div>

          {formError ? <InlineAlert message={formError} onDismiss={() => setFormError('')} /> : null}
          {error ? <InlineAlert message={error} onDismiss={clearError} /> : null}

          <form
            className="space-y-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <AnimatePresence mode="wait" custom={direction}>
              {currentStep === 0 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  {/* Step 1: Brand Identity */}
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
                        value={selectedIndustry}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (val === CUSTOM_INDUSTRY) {
                            setSelectedIndustry(CUSTOM_INDUSTRY);
                          } else {
                            setSelectedIndustry(val);
                          }
                        }}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold appearance-none focus:ring-2 focus:ring-signal-orange cursor-pointer"
                      >
                        <option value="" disabled>
                          选择最贴近的行业
                        </option>
                        {INDUSTRY_PRESETS.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                        <option value={CUSTOM_INDUSTRY}>其他（自定义）</option>
                      </select>
                      <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={24} />
                    </div>
                    {selectedIndustry === CUSTOM_INDUSTRY && (
                      <input
                        id="brand-industry-custom"
                        type="text"
                        value={customIndustry}
                        onChange={(event) => setCustomIndustry(event.target.value)}
                        placeholder="请输入您的行业"
                        autoFocus
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all"
                      />
                    )}
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
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  {/* Step 2: Brand Voice */}
                  <div className="bg-light-orange/10 border border-light-orange/20 rounded-2xl px-6 py-4 mb-2">
                    <p className="text-sm font-bold text-ink-black">
                      以下信息将直接影响 AI 生成内容的风格和质量，填写越详细效果越好
                    </p>
                  </div>

                  {aiError ? <InlineAlert message={aiError} onDismiss={() => setAiError(null)} /> : null}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-4">
                      <label htmlFor="brand-summary" className="text-xs font-black uppercase tracking-widest text-ink-black">
                        品牌简介
                      </label>
                      <button
                        type="button"
                        disabled={aiLoading || !summary.trim()}
                        onClick={() => handleAISuggestField('summary', 'brand-summary', summary)}
                        title={
                          !summary.trim()
                            ? '请先输入内容再进行 AI 优化'
                            : 'AI 将优化润色当前内容'
                        }
                        className={`p-1 rounded-lg transition-all ${
                          aiGeneratingField === 'summary'
                            ? 'opacity-100'
                            : 'opacity-70 hover:opacity-100'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {aiGeneratingField === 'summary' ? (
                          <Loader2 size={14} className="text-signal-orange animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-signal-orange" />
                        )}
                      </button>
                    </div>
                    <textarea
                      id="brand-summary"
                      rows={4}
                      value={summary}
                      readOnly={aiLoading}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder="简述品牌愿景、目标受众及核心价值..."
                      className={`w-full bg-zinc-50 border rounded-3xl px-8 py-5 text-lg font-bold resize-none focus:ring-2 focus:ring-signal-orange transition-all ${
                        highlightedFields.has('brand-summary')
                          ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                          : 'border-zinc-100'
                      } ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-4">
                      <label htmlFor="brand-tone" className="text-xs font-black uppercase tracking-widest text-ink-black">
                        品牌语气
                      </label>
                      <button
                        type="button"
                        disabled={aiLoading || !toneOfVoice.trim()}
                        onClick={() => handleAISuggestField('toneOfVoice', 'brand-tone', toneOfVoice)}
                        title={
!toneOfVoice.trim()
                              ? '请先输入内容再进行 AI 优化'
                              : 'AI 将优化润色当前内容'
                        }
                        className={`p-1 rounded-lg transition-all ${
                          aiGeneratingField === 'toneOfVoice'
                            ? 'opacity-100'
                            : 'opacity-70 hover:opacity-100'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {aiGeneratingField === 'toneOfVoice' ? (
                          <Loader2 size={14} className="text-signal-orange animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-signal-orange" />
                        )}
                      </button>
                    </div>
                    <input
                      id="brand-tone"
                      type="text"
                      value={toneOfVoice}
                      readOnly={aiLoading}
                      onChange={(event) => setToneOfVoice(event.target.value)}
                      placeholder="例如：专业、温暖、可信"
                      className={`w-full bg-zinc-50 border rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all ${
                        highlightedFields.has('brand-tone')
                          ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                          : 'border-zinc-100'
                      } ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-4">
                      <label htmlFor="brand-audience" className="text-xs font-black uppercase tracking-widest text-ink-black">
                        目标受众
                      </label>
                      <button
                        type="button"
                        disabled={aiLoading || !audience.trim()}
                        onClick={() => handleAISuggestField('audience', 'brand-audience', audience)}
                        title={
!audience.trim()
                              ? '请先输入内容再进行 AI 优化'
                              : 'AI 将优化润色当前内容'
                        }
                        className={`p-1 rounded-lg transition-all ${
                          aiGeneratingField === 'audience'
                            ? 'opacity-100'
                            : 'opacity-70 hover:opacity-100'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {aiGeneratingField === 'audience' ? (
                          <Loader2 size={14} className="text-signal-orange animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-signal-orange" />
                        )}
                      </button>
                    </div>
                    <input
                      id="brand-audience"
                      type="text"
                      value={audience}
                      readOnly={aiLoading}
                      onChange={(event) => setAudience(event.target.value)}
                      placeholder="例如：内容创作者、自媒体运营、品牌营销人员"
                      className={`w-full bg-zinc-50 border rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all ${
                        highlightedFields.has('brand-audience')
                          ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                          : 'border-zinc-100'
                      } ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-4">
                      <label htmlFor="brand-positioning" className="text-xs font-black uppercase tracking-widest text-ink-black">
                        品牌定位
                      </label>
                      <button
                        type="button"
                        disabled={aiLoading || !positioning.trim()}
                        onClick={() => handleAISuggestField('positioning', 'brand-positioning', positioning)}
                        title={
!positioning.trim()
                              ? '请先输入内容再进行 AI 优化'
                              : 'AI 将优化润色当前内容'
                        }
                        className={`p-1 rounded-lg transition-all ${
                          aiGeneratingField === 'positioning'
                            ? 'opacity-100'
                            : 'opacity-70 hover:opacity-100'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {aiGeneratingField === 'positioning' ? (
                          <Loader2 size={14} className="text-signal-orange animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-signal-orange" />
                        )}
                      </button>
                    </div>
                    <input
                      id="brand-positioning"
                      type="text"
                      value={positioning}
                      readOnly={aiLoading}
                      onChange={(event) => setPositioning(event.target.value)}
                      placeholder="例如：AI 驱动的一站式自媒体运营平台"
                      className={`w-full bg-zinc-50 border rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all ${
                        highlightedFields.has('brand-positioning')
                          ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                          : 'border-zinc-100'
                      } ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-2">
                        <label htmlFor="brand-do-and-donts" className="text-xs font-black uppercase tracking-widest text-ink-black">
                          禁用表达
                        </label>
                        <button
                          type="button"
                          disabled={aiLoading || !doAndDonts.trim()}
                          onClick={() => handleAISuggestField('doAndDonts', 'brand-do-and-donts', doAndDonts)}
                          title={
!doAndDonts.trim()
                                ? '请先输入内容再进行 AI 优化'
                                : 'AI 将优化润色当前内容'
                          }
                          className={`p-1 rounded-lg transition-all ${
                            aiGeneratingField === 'doAndDonts'
                              ? 'opacity-100'
                              : 'opacity-70 hover:opacity-100'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {aiGeneratingField === 'doAndDonts' ? (
                            <Loader2 size={14} className="text-signal-orange animate-spin" />
                          ) : (
                            <Sparkles size={14} className="text-signal-orange" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300 uppercase italic">逗号分隔</span>
                    </div>
                    <input
                      id="brand-do-and-donts"
                      type="text"
                      value={doAndDonts}
                      readOnly={aiLoading}
                      onChange={(event) => setDoAndDonts(event.target.value)}
                      placeholder="例如：夸大宣传、过度承诺、标题党"
                      className={`w-full bg-zinc-50 border rounded-3xl px-8 py-5 text-lg font-bold focus:ring-2 focus:ring-signal-orange focus:border-transparent transition-all ${
                        highlightedFields.has('brand-do-and-donts')
                          ? 'border-yellow-400 bg-yellow-50 animate-pulse'
                          : 'border-zinc-100'
                      } ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  {/* Step 3: Review Policy + Brand Summary */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-ink-black ml-4 block mb-4">
                      默认审核策略
                    </label>
                    <div className="space-y-3">
                      {([
                        {
                          value: 'manual_required' as ReviewPolicy,
                          label: '必须人工审核',
                          desc: '每次 AI 生成内容后，需要你手动审核通过才会进入发布队列',
                        },
                        {
                          value: 'auto_if_low_risk' as ReviewPolicy,
                          label: '低风险自动通过',
                          desc: '常规内容自动发布，仅敏感内容需要审核',
                        },
                        {
                          value: 'auto_publish' as ReviewPolicy,
                          label: '自动发布',
                          desc: 'AI 生成后直接标记为已发布（适合熟悉平台后使用）',
                        },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDefaultReviewPolicy(option.value)}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                            defaultReviewPolicy === option.value
                              ? 'border-signal-orange bg-light-orange/5 ring-2 ring-signal-orange/20'
                              : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                defaultReviewPolicy === option.value
                                  ? 'border-signal-orange bg-signal-orange'
                                  : 'border-zinc-300'
                              }`}
                            >
                              {defaultReviewPolicy === option.value && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-ink-black">{option.label}</div>
                              <div className="text-sm text-slate-gray mt-0.5">{option.desc}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Profile Summary Card */}
                  <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink-black mb-4">
                      品牌档案总览
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(brandProfileSummary).map(([label, value]) => {
                        let targetStep: Step = 0;
                        if (['品牌简介', '品牌语气', '目标受众', '品牌定位', '禁用表达'].includes(label)) {
                          targetStep = 1;
                        }
                        return (
                          <div key={label} className="flex items-start gap-3">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">
                              {label}
                            </span>
                            <span className="text-sm font-bold text-ink-black flex-1">
                              {value}
                            </span>
                            {targetStep !== currentStep && (
                              <button
                                type="button"
                                onClick={() => goToStep(targetStep)}
                                className="p-1 text-zinc-300 hover:text-signal-orange transition-colors flex-shrink-0"
                                title={`编辑${label}`}
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Navigation */}
            <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-zinc-50">
              <div>
                {currentStep === 0 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await saveBrandProfile({
                        ...brand,
                        name: name.trim(),
                        industry: industry.trim(),
                        summary: summary.trim(),
                        keywords: keywords.split(',').map((s) => s.trim()).filter(Boolean),
                        audience: audience.trim(),
                        positioning: positioning.trim(),
                        toneOfVoice: toneOfVoice.trim(),
                        doAndDonts: doAndDonts.split(',').map((s) => s.trim()).filter(Boolean),
                        defaultReviewPolicy,
                        setupComplete: false,
                      });
                      navigate('/dashboard');
                    }}
                    className="text-ink-black font-bold text-sm px-8 py-4 rounded-2xl hover:bg-zinc-50 transition-colors"
                  >
                    稍后完善
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-2 text-ink-black font-bold text-sm px-8 py-4 rounded-2xl hover:bg-zinc-50 transition-colors group"
                  >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    上一步
                  </button>
                )}
              </div>
              <div>
                {currentStep < 2 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-ink-black text-white font-bold text-sm px-10 py-5 rounded-3xl shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 group"
                  >
                    下一步
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="bg-ink-black text-white font-bold text-sm px-10 py-5 rounded-3xl shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 group"
                  >
                    保存并进入品牌页
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
