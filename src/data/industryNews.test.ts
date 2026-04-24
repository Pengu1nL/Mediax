import { describe, expect, it } from 'vitest';
import { getIndustryNews } from './industryNews';

describe('getIndustryNews', () => {
  it('returns news for the exact brand industry', () => {
    const news = getIndustryNews('教育 / 民办高中');

    expect(news).toHaveLength(3);
    expect(news[0]).toMatchObject({
      tag: '招生趋势',
      source: '教育观察周报',
    });
  });

  it('falls back to default news for an unknown industry', () => {
    const news = getIndustryNews('餐饮服务');

    expect(news).toHaveLength(3);
    expect(news[0]).toMatchObject({
      tag: '品牌趋势',
      source: '行业增长简报',
    });
  });

  it('limits the number of returned news items', () => {
    const news = getIndustryNews('科技与软件', 2);

    expect(news).toHaveLength(2);
  });
});
