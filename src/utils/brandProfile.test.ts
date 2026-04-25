import { describe, expect, it } from 'vitest';
import { getBrandProfileCompleteness } from './brandProfile';
import type { BrandProfile } from '../types';

const baseBrand: BrandProfile = {
  id: 'brand-1',
  name: '建桥融高',
  industry: '教育',
  keywords: ['融合教育'],
  summary: '品牌简介',
  audience: '学生家庭',
  positioning: '融合教育品牌',
  toneOfVoice: '专业、温暖',
  doAndDonts: ['不夸大升学结果'],
  defaultReviewPolicy: 'manual_required',
  setupComplete: true,
  channels: [],
};

describe('getBrandProfileCompleteness', () => {
  it('returns 100 when core brand context is complete', () => {
    expect(getBrandProfileCompleteness(baseBrand)).toBe(100);
  });

  it('returns a lower score when strategic context is missing', () => {
    expect(getBrandProfileCompleteness({ ...baseBrand, audience: '', toneOfVoice: '' })).toBe(75);
  });
});
