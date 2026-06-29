import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

const EMPTY_TEXT = '';

/**
 * 去除句首礼貌词，降低“请生成图片”和“生成图片”之间的匹配差异。
 *
 * @param text 用户输入的原始文本。
 * @returns 更适合正则匹配的文本。
 */
const normalizeForIntent = (text: string): string => {
  return text.trim().replace(/^请\s*/, '');
};

/**
 * 视频生成意图匹配规则。
 *
 * 这些规则覆盖“生成视频”“做一个视频”“帮我生成一段视频”等常见中文表达。
 */
const VIDEO_INTENT_PATTERNS: RegExp[] = [
  /^生成视频/i,
  /^生成.+视频$/i,
  /^做一个视频/i,
  /^做一个.+视频$/i,
  /^做(?:一个|一段)?.+视频$/i,
  /^制作(?:一个|一段)?.+视频$/i,
  /^帮我(?:做|生成)(?:一个|一段)?.*视频$/i,
];

/**
 * 图片生成意图匹配规则。
 *
 * 规则优先识别明确提到“图片/图/画/绘制”的表达，避免普通文本被误判。
 */
const IMAGE_INTENT_PATTERNS: RegExp[] = [
  /^生成图片/i,
  /^生成.+(?:图片|图)$/i,
  /^画一张/i,
  /^画(?:一张|一幅|一个).+/i,
  /^帮我画/i,
  /^帮我生成一张图/i,
  /^帮我生成图片/i,
  /^帮我生成.+(?:图片|图)$/i,
  /^绘制(?:一张|一幅|一个)?.+/i,
  /^做(?:一张|一个)?.+(?:图片|图)$/i,
];

/**
 * 图片提示词清洗规则，用于去掉“帮我画”“生成图片”等命令前后缀。
 */
const IMAGE_PREFIX_PATTERNS: RegExp[] = [
  /^帮我画(?:一张|一个|一幅|张)?(?:的)?/i,
  /^帮我生成(?:一张|一个)?图(?:片)?[，,：:\s]+/i,
  /^生成图片[，,：:\s]*/i,
  /^画(?:一张|一个|一幅)?(?:的)?/i,
  /^绘制(?:一张|一个|一幅)?(?:的)?/i,
  /^做(?:一张|一个)?图(?:片)?[，,：:\s]+/i,
  /^做(?:一张|一个)?(?:的)?/i,
  /(?:的)?(?:图片|图)$/i,
];

/**
 * 视频提示词清洗规则，用于保留真正的视频内容描述。
 */
const VIDEO_PREFIX_PATTERNS: RegExp[] = [
  /^帮我(?:做|生成)(?:一个|一段)?视频[，,：:\s]+/i,
  /^帮我(?:做|生成)(?:一个|一段)?(?:的)?/i,
  /^生成视频[，,：:\s]*/i,
  /^做(?:一个|一段)?视频[，,：:\s]+/i,
  /^生成/i,
  /^做(?:一个|一段)?(?:的)?/i,
  /^制作(?:一个|一段)?(?:的)?/i,
  /(?:的)?视频$/i,
];

/**
 * 显式内容字段提取规则。
 *
 * 用户说“内容是...”或“主题是...”时，后半段通常就是最干净的媒体 prompt。
 */
const CONTENT_PATTERNS: RegExp[] = [
  /(?:内容是|内容[:：])\s*(.+)$/i,
  /(?:主题是|主题[:：])\s*(.+)$/i,
];

/**
 * 视频描述句式提取规则，捕获“做一个 XXX 的视频”里的 XXX。
 */
const VIDEO_DESCRIPTIVE_PATTERNS: RegExp[] = [
  /^做(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
  /^制作(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
  /^生成(?:的)?(.+?)的?视频$/i,
  /^帮我(?:做|生成)(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
];

/**
 * 图片描述句式提取规则，捕获“画一张 XXX”或“生成 XXX 图片”里的 XXX。
 */
const IMAGE_DESCRIPTIVE_PATTERNS: RegExp[] = [
  /^画(?:一张|一幅|一个)(?:的)?(.+?)(?:的)?(?:图片|图)?$/i,
  /^做(?:一张|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^生成(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^帮我生成(?:一张|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^绘制(?:一张|一幅|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)?$/i,
];

/**
 * 判断文本是否命中任一意图规则。
 *
 * @param text 用户输入文本。
 * @param patterns 同一类意图的正则集合。
 * @returns 是否匹配至少一个规则。
 */
const matchesAnyPattern = (text: string, patterns: RegExp[]): boolean => {
  const trimmed = normalizeForIntent(text);
  return patterns.some((pattern) => pattern.test(trimmed));
};

/**
 * 从描述性句式中提取核心内容。
 *
 * @param text 用户输入文本。
 * @param patterns 带捕获组的正则集合。
 * @returns 捕获到的媒体描述；未命中时返回 null。
 */
const extractFromDescriptivePatterns = (text: string, patterns: RegExp[]): string | null => {
  const normalized = normalizeForIntent(text);
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const captured = match?.[1]?.trim();
    if (captured && captured.length > 0) {
      return captured;
    }
  }
  return null;
};

/**
 * 逐个移除命令式前后缀，留下可直接提交给媒体模型的 prompt。
 *
 * @param text 用户输入文本。
 * @param patterns 针对图片或视频的前后缀规则。
 * @returns 清洗后的 prompt；如果规则过宽，后续 resolveMediaPrompt 会兜底原文。
 */
const stripPrefixPatterns = (text: string, patterns: RegExp[]): string => {
  let cleaned = normalizeForIntent(text);
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  return cleaned;
};

/**
 * 优先提取“内容是/主题是”后面的显式内容。
 *
 * @param text 用户输入文本。
 * @returns 显式内容字段；没有时返回 null。
 */
const extractContentSuffix = (text: string): string | null => {
  for (const pattern of CONTENT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
};

/**
 * 根据用户文本识别聊天意图。
 *
 * @param text 最新一条用户输入。
 * @returns text/image/video 三类意图之一。
 *
 * 边界情况：
 * - 同时包含图片和视频关键词时，视频优先，因为视频表达通常也可能包含“画面”等词。
 * - 未命中媒体规则时默认走文本对话，避免误触发高成本媒体生成。
 */
export const detectIntentFromText = (text: string): ChatIntentType => {
  if (matchesAnyPattern(text, VIDEO_INTENT_PATTERNS)) {
    return 'video';
  }

  if (matchesAnyPattern(text, IMAGE_INTENT_PATTERNS)) {
    return 'image';
  }

  return 'text';
};

/**
 * 从用户命令中提取媒体模型真正需要的 prompt。
 *
 * @param text 用户输入文本。
 * @param intent 已识别的意图；text 意图通常不会调用该函数。
 * @returns 清洗后的媒体 prompt。
 */
export const extractMediaPrompt = (text: string, intent: ChatIntentType): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  const contentSuffix = extractContentSuffix(trimmed);
  if (contentSuffix) {
    // 显式“内容/主题”比正则清洗更可靠，优先作为媒体 prompt。
    return contentSuffix;
  }

  if (intent === 'video') {
    const descriptive = extractFromDescriptivePatterns(trimmed, VIDEO_DESCRIPTIVE_PATTERNS);
    if (descriptive) {
      return descriptive;
    }
  }

  if (intent === 'image') {
    const descriptive = extractFromDescriptivePatterns(trimmed, IMAGE_DESCRIPTIVE_PATTERNS);
    if (descriptive) {
      return descriptive;
    }
  }

  const patterns = intent === 'image' ? IMAGE_PREFIX_PATTERNS : VIDEO_PREFIX_PATTERNS;
  return stripPrefixPatterns(trimmed, patterns);
};

/**
 * 从单条 UIMessage 中拼接所有 text 片段。
 *
 * @param message AI SDK UIMessage。
 * @returns 消息中所有文本片段按换行拼接后的内容。
 */
const getMessageText = (message: ChatUIMessage): string => {
  const textParts = message.parts.filter((part) => part.type === 'text');
  return textParts.map((part) => part.text).join('\n');
};

/**
 * 读取最近一条非空用户消息文本。
 *
 * @param messages 当前会话消息列表。
 * @returns 最近一条用户文本；不存在时返回空字符串。
 */
export const getLatestUserText = (messages: ChatUIMessage[]): string => {
  // 从后往前找可以避免把历史消息误当成本轮请求内容。
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') {
      continue;
    }

    const text = getMessageText(message);
    if (text.trim().length > 0) {
      return text;
    }
  }

  return EMPTY_TEXT;
};

/**
 * 解析媒体 prompt，并在清洗结果为空时回退到用户原文。
 *
 * @param text 用户输入文本。
 * @param intent 图片或视频意图。
 * @returns 可提交给媒体生成接口的 prompt。
 */
export const resolveMediaPrompt = (text: string, intent: ChatIntentType): string => {
  return extractMediaPrompt(text, intent) || text.trim();
};
