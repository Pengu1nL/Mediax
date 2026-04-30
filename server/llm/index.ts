import type { LlmProvider } from './types';
import type { LlmConfig } from '../../src/types';
import { createDeepSeekProvider } from './deepseek';

/**
 * 获取 LLM provider。
 * 优先级：存储配置 > 环境变量
 */
export function getLlmProvider(config?: LlmConfig): LlmProvider | null {
  const apiKey = config?.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = config?.baseUrl?.trim() || 'https://api.deepseek.com/v1';
  const model = config?.model?.trim() || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

  return createDeepSeekProvider({ apiKey, baseUrl, model });
}
