import { describe, expect, it } from 'vitest';
import { createKnowledgeSummaryFromText, inferKnowledgeTags } from './knowledgeExtraction';

describe('knowledge extraction', () => {
  it('creates a concise summary from text', () => {
    const summary = createKnowledgeSummaryFromText('品牌表达应专业、可信、温暖。避免夸大升学结果。');

    expect(summary).toBe('品牌表达应专业、可信、温暖。避免夸大升学结果。');
  });

  it('infers tags from brand-related text', () => {
    expect(inferKnowledgeTags('微信公众号 招生 活动 海报')).toEqual(['微信公众号', '招生', '活动', '海报']);
  });
});
