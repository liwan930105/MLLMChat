import type { ChatIntentType } from '@/types/chat';

/** 默认文本模型 ID，供 DEEPSEEK_TEXT_MODEL 未配置时使用。 */
export const DEFAULT_TEXT_MODEL = 'deepseek-v4-pro';
/** 默认图片生成模型 ID，供 DOUBAO_IMAGE_MODEL 未配置时使用。 */
export const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4.0';
/** 默认视频生成模型 ID，供 DOUBAO_VIDEO_MODEL 未配置时使用。 */
export const DEFAULT_VIDEO_MODEL = 'doubao-seedance-1-5-pro-251215';

/** DeepSeek OpenAI 兼容接口默认基础地址。 */
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
/** 豆包/火山方舟 OpenAI 兼容接口默认基础地址。 */
export const DEFAULT_DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

/** 图片生成接口路径，最终会拼接到 DOUBAO_BASE_URL 后。 */
export const IMAGE_GENERATION_PATH = '/images/generations';
/** 视频任务创建接口路径。 */
export const VIDEO_TASK_CREATE_PATH = '/contents/generations/tasks';
/** 视频任务查询路径模板，{taskId} 会在轮询时替换为真实任务 ID。 */
export const VIDEO_TASK_QUERY_PATH_TEMPLATE = '/contents/generations/tasks/{taskId}';
/** 视频文本 prompt 的默认附加参数，控制时长、镜头固定和水印等上游能力。 */
export const DEFAULT_VIDEO_TEXT_PARAMS = ' --duration 5 --camerafixed false --watermark true';

/** 文本模型单次回复的最大输出 token 数。 */
export const MAX_GENERATION_TOKENS = 1000;
/** 单次请求允许携带的最大消息数，防止历史上下文过长。 */
export const MAX_MESSAGE_COUNT = 100;
/** 单条消息允许的最大 parts 数，避免构造异常复杂消息。 */
export const MAX_MESSAGE_PARTS = 200;
/** 文本片段与系统提示词的最大长度。 */
export const MAX_TEXT_PART_LENGTH = 8000;
/** 请求体最大字节数，超过后 API 会返回 413。 */
export const MAX_REQUEST_BODY_BYTES = 512 * 1024;

/** 单个 IP 在一个限流窗口内允许的最大聊天请求数。 */
export const CHAT_RATE_LIMIT_MAX = 30;
/** 聊天 API 固定限流窗口长度，单位毫秒。 */
export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;

/** 上游 fetch 默认超时时间，单位毫秒。 */
export const UPSTREAM_FETCH_TIMEOUT_MS = 120_000;
/** 视频任务轮询间隔，单位毫秒。 */
export const VIDEO_POLL_INTERVAL_MS = 3_000;
/** 视频任务最大轮询次数，控制总体等待上限。 */
export const VIDEO_POLL_MAX_ATTEMPTS = 40;

/** 默认系统提示词，用于文本对话时约束助手风格。 */
export const DEFAULT_SYSTEM_PROMPT =
  '你是一个专业、简洁的多模态助手。回答应清晰、结构化、避免冗长，尽量给出可执行建议。';

/** localStorage 中保存聊天历史的键名。 */
export const CHAT_HISTORY_STORAGE_KEY = 'mllm-chat-history';
/** localStorage 中保存系统提示词的键名。 */
export const CHAT_SYSTEM_PROMPT_STORAGE_KEY = 'mllm-chat-system-prompt';
/** localStorage 中保存聊天会话 ID 的键名。 */
export const CHAT_SESSION_ID_STORAGE_KEY = 'mllm-chat-session-id';
/** 本地最多保留的聊天消息数量。 */
export const MAX_STORED_MESSAGES = 200;

/** 输入框占位文案，引导用户触发文本、图片或视频意图。 */
export const INPUT_PLACEHOLDER = '输入消息，Enter 发送；说「生成图片」或「生成视频」可自动调用对应模型';

/** 顶部状态栏中展示的意图中文名称。 */
export const INTENT_BADGE_TEXT: Record<ChatIntentType, string> = {
  text: '文本对话',
  image: '图片生成',
  video: '视频生成',
};
