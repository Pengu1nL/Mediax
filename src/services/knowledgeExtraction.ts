const TAG_CANDIDATES = [
  '微信公众号',
  '小红书',
  '抖音',
  '视频号',
  '招生',
  '活动',
  '校庆',
  '海报',
  '短视频',
  '品牌语气',
];

export function createKnowledgeSummaryFromText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 160);
}

export function inferKnowledgeTags(text: string): string[] {
  return TAG_CANDIDATES.filter((tag) => text.includes(tag)).slice(0, 6);
}
