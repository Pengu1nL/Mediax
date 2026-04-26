import type { LlmProvider, LlmGenerateInput } from './types';

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>;
}

export function createDeepSeekProvider(config: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): LlmProvider {
  const model = config.model || 'deepseek-chat';
  const baseUrl = config.baseUrl || 'https://api.deepseek.com';

  return {
    async generate(input: LlmGenerateInput): Promise<string> {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.userPrompt },
          ],
          max_tokens: input.maxTokens ?? 2048,
          temperature: input.temperature ?? 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepSeek API 返回错误 (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as DeepSeekResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek API 返回了空内容');
      }

      return content;
    },
  };
}
