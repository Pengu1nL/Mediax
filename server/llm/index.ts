import type { LlmProvider } from './types';
import { createDeepSeekProvider } from './deepseek';

let cachedProvider: LlmProvider | null = null;

/**
 * 获取 LLM provider 实例（单例）。
 * 目前仅支持 DeepSeek，后续可扩展其他厂商。
 */
export function getLlmProvider(): LlmProvider | null {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  cachedProvider = createDeepSeekProvider({ apiKey, model });
  return cachedProvider;
}

/**
 * 清除缓存的 provider（测试用）。
 */
export function clearLlmProviderCache(): void {
  cachedProvider = null;
}
