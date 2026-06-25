import type { ChatIntentType } from '@/types/chat';

export const DEFAULT_TEXT_MODEL = 'deepseek-v4-pro';
export const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4.0';
export const DEFAULT_VIDEO_MODEL = 'doubao-seedance-1-5-pro-251215';

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export const IMAGE_GENERATION_PATH = '/images/generations';
export const VIDEO_TASK_CREATE_PATH = '/contents/generations/tasks';
export const VIDEO_TASK_QUERY_PATH_TEMPLATE = '/contents/generations/tasks/{taskId}';
export const DEFAULT_VIDEO_TEXT_PARAMS = ' --duration 5 --camerafixed false --watermark true';

export const MAX_GENERATION_TOKENS = 1000;
export const MAX_MESSAGE_COUNT = 100;
export const MAX_MESSAGE_PARTS = 200;
export const MAX_TEXT_PART_LENGTH = 8000;
export const MAX_REQUEST_BODY_BYTES = 512 * 1024;

export const CHAT_RATE_LIMIT_MAX = 30;
export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;

export const UPSTREAM_FETCH_TIMEOUT_MS = 120_000;
export const VIDEO_POLL_INTERVAL_MS = 3_000;
export const VIDEO_POLL_MAX_ATTEMPTS = 40;

export const DEFAULT_SYSTEM_PROMPT =
  '你是一个专业、简洁的多模态助手。回答应清晰、结构化、避免冗长，尽量给出可执行建议。';

export const CHAT_HISTORY_STORAGE_KEY = 'mllm-chat-history';
export const CHAT_SYSTEM_PROMPT_STORAGE_KEY = 'mllm-chat-system-prompt';
export const CHAT_SESSION_ID_STORAGE_KEY = 'mllm-chat-session-id';
export const MAX_STORED_MESSAGES = 200;

export const INPUT_PLACEHOLDER = '输入消息，Enter 发送，Shift+Enter 换行';

export const IMAGE_KEYWORDS = [
  '生成图片',
  '帮我生成一张图',
  '帮我生成图片',
  '帮我画',
  '画一张',
  '画个',
  '画一幅',
  '绘制',
  '做一张图',
  '图片',
  '图像',
  '生成图',
  'image',
  'draw',
  'picture',
];

export const VIDEO_KEYWORDS = [
  '生成视频',
  '帮我生成一个视频',
  '帮我做一个视频',
  '做一个视频',
  '做个视频',
  '制作视频',
  '视频',
  '短片',
  '动画',
  'video',
  'clip',
  'movie',
];

export const INTENT_BADGE_TEXT: Record<ChatIntentType, string> = {
  text: '文本对话',
  image: '图片生成',
  video: '视频生成',
};
