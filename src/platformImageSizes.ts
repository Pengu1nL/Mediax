// Platform × ContentType → recommended image size
// Sizes follow the OpenAI image generation format: WxH
// All dimensions are multiples of 16, max 3840px, aspect ratio ≤ 3:1

export interface ImageSizePreset {
  width: number;
  height: number;
  label: string;
  description: string;
}

type PlatformKey = string; // e.g. "微信公众号", "小红书"

const PLATFORM_SIZE_MAP: Record<string, Record<string, ImageSizePreset>> = {
  '微信公众号': {
    '图文': { width: 900, height: 383, label: '900×383', description: '头图 2.35:1' },
    '海报': { width: 1080, height: 1920, label: '1080×1920', description: '竖版海报 9:16' },
  },
  '小红书': {
    '图文': { width: 1080, height: 1440, label: '1080×1440', description: '封面 3:4' },
    '海报': { width: 1080, height: 1440, label: '1080×1440', description: '封面 3:4' },
    '短视频': { width: 1080, height: 1920, label: '1080×1920', description: '视频封面 9:16' },
  },
  '抖音': {
    '图文': { width: 1080, height: 1920, label: '1080×1920', description: '竖屏 9:16' },
    '海报': { width: 1080, height: 1920, label: '1080×1920', description: '竖屏 9:16' },
    '短视频': { width: 1080, height: 1920, label: '1080×1920', description: '视频封面 9:16' },
  },
  '视频号': {
    '图文': { width: 1080, height: 607, label: '1080×607', description: '封面 16:9' },
    '海报': { width: 1080, height: 607, label: '1080×607', description: '封面 16:9' },
  },
};

const DEFAULT_PRESET: ImageSizePreset = {
  width: 1024, height: 1024, label: '1024×1024', description: '通用方形',
};

export function getImageSizeForPlatform(
  platform: string,
  contentType: string,
): ImageSizePreset {
  const platformSizes = PLATFORM_SIZE_MAP[platform];
  if (platformSizes && platformSizes[contentType]) {
    return platformSizes[contentType];
  }
  // Try partial match on platform name
  for (const key of Object.keys(PLATFORM_SIZE_MAP)) {
    if (platform.includes(key) || key.includes(platform)) {
      const sizes = PLATFORM_SIZE_MAP[key];
      if (sizes[contentType]) return sizes[contentType];
    }
  }
  return DEFAULT_PRESET;
}

export function imageSizeToString(preset: ImageSizePreset): string {
  return `${preset.width}x${preset.height}`;
}
