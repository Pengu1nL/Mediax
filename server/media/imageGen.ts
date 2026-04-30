import type { ImageGenConfig } from '../../src/types';
import { getProxyDispatcher } from '../fetchProxy';

interface ImageGenInput {
  prompt: string;
  size?: string;
  n?: number;
  quality?: string;
}

interface ImageGenResult {
  images: Array<{ base64: string; format: string }>;
}

function createImageGenerator(config: { apiKey: string; baseUrl: string; model: string }) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  return {
    async generate(input: ImageGenInput): Promise<ImageGenResult> {
      const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        ...getProxyDispatcher(),
        body: JSON.stringify({
          model: config.model,
          prompt: input.prompt,
          n: input.n || 1,
          size: input.size || '1024x1024',
          quality: input.quality || 'medium',
          response_format: 'b64_json',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`图片生成 API 返回错误 (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as {
        data: Array<{ b64_json?: string; url?: string }>;
      };

      const images = (data.data || []).map((item) => {
        if (item.b64_json) return { base64: item.b64_json, format: 'png' as const };
        if (item.url) return { base64: item.url, format: 'url' as const };
        throw new Error('图片生成返回了空数据');
      });

      return { images };
    },
  };
}

/**
 * 获取图片生成器。
 * 优先级：存储配置 > 环境变量
 */
export function getImageGenerator(config?: ImageGenConfig) {
  const apiKey = config?.apiKey?.trim() || process.env.IMAGE_GEN_API_KEY?.trim();
  const baseUrl = config?.baseUrl?.trim() || process.env.IMAGE_GEN_BASE_URL?.trim();

  if (!apiKey || !baseUrl) return null;

  const model = config?.model?.trim() || process.env.IMAGE_GEN_MODEL || 'gpt-image-2';

  return createImageGenerator({ apiKey, baseUrl, model });
}
