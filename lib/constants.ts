import type { ChatIntentType } from '@/types/chat';

export const DEFAULT_TEXT_MODEL = 'deepseek-v4-pro';
export const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4.0';
export const DEFAULT_VIDEO_MODEL = 'seedance-1.5-pro';

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export const IMAGE_GENERATION_PATH = '/images/generations';
export const VIDEO_GENERATION_PATH = '/video/generations';

export const TEXT_RESPONSE_LIMIT = 1200;
export const MAX_GENERATION_TOKENS = 1000;

export const INPUT_PLACEHOLDER = '输入你的问题，或点击“生成图片 / 生成视频”';

export const IMAGE_KEYWORDS = [
  '图片',
  '图像',
  '画一张',
  '生成图',
  'image',
  'draw',
  'picture',
];

export const VIDEO_KEYWORDS = [
  '视频',
  '短片',
  '动画',
  '生成视频',
  'video',
  'clip',
  'movie',
];

export const INTENT_BADGE_TEXT: Record<ChatIntentType, string> = {
  text: '文本对话',
  image: '图片生成',
  video: '视频生成',
};
