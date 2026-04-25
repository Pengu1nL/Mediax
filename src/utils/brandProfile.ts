import type { BrandProfile } from '../types';

const REQUIRED_CONTEXT_FIELDS: Array<keyof BrandProfile> = [
  'name',
  'industry',
  'summary',
  'audience',
  'positioning',
  'toneOfVoice',
  'doAndDonts',
  'keywords',
];

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

export function getBrandProfileCompleteness(brand: BrandProfile): number {
  const completed = REQUIRED_CONTEXT_FIELDS.filter((field) => hasValue(brand[field])).length;
  return Math.round((completed / REQUIRED_CONTEXT_FIELDS.length) * 100);
}
