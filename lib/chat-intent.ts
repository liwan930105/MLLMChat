import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

const EMPTY_TEXT = '';

/** 句首可选「请」，用于意图匹配 */
const normalizeForIntent = (text: string): string => {
  return text.trim().replace(/^请\s*/, '');
};

const VIDEO_INTENT_PATTERNS: RegExp[] = [
  /^生成视频/i,
  /^生成.+视频$/i,
  /^做一个视频/i,
  /^做一个.+视频$/i,
  /^做(?:一个|一段)?.+视频$/i,
  /^制作(?:一个|一段)?.+视频$/i,
  /^帮我(?:做|生成)(?:一个|一段)?.*视频$/i,
];

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

const CONTENT_PATTERNS: RegExp[] = [
  /(?:内容是|内容[:：])\s*(.+)$/i,
  /(?:主题是|主题[:：])\s*(.+)$/i,
];

const VIDEO_DESCRIPTIVE_PATTERNS: RegExp[] = [
  /^做(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
  /^制作(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
  /^生成(?:的)?(.+?)的?视频$/i,
  /^帮我(?:做|生成)(?:一个|一段)?(?:的)?(.+?)的?视频$/i,
];

const IMAGE_DESCRIPTIVE_PATTERNS: RegExp[] = [
  /^画(?:一张|一幅|一个)(?:的)?(.+?)(?:的)?(?:图片|图)?$/i,
  /^做(?:一张|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^生成(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^帮我生成(?:一张|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)$/i,
  /^绘制(?:一张|一幅|一个)?(?:的)?(.+?)(?:的)?(?:图片|图)?$/i,
];

const matchesAnyPattern = (text: string, patterns: RegExp[]): boolean => {
  const trimmed = normalizeForIntent(text);
  return patterns.some((pattern) => pattern.test(trimmed));
};

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

const stripPrefixPatterns = (text: string, patterns: RegExp[]): string => {
  let cleaned = normalizeForIntent(text);
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  return cleaned;
};

const extractContentSuffix = (text: string): string | null => {
  for (const pattern of CONTENT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
};

export const detectIntentFromText = (text: string): ChatIntentType => {
  if (matchesAnyPattern(text, VIDEO_INTENT_PATTERNS)) {
    return 'video';
  }

  if (matchesAnyPattern(text, IMAGE_INTENT_PATTERNS)) {
    return 'image';
  }

  return 'text';
};

export const extractMediaPrompt = (text: string, intent: ChatIntentType): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  const contentSuffix = extractContentSuffix(trimmed);
  if (contentSuffix) {
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

const getMessageText = (message: ChatUIMessage): string => {
  const textParts = message.parts.filter((part) => part.type === 'text');
  return textParts.map((part) => part.text).join('\n');
};

export const getLatestUserText = (messages: ChatUIMessage[]): string => {
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

export const resolveMediaPrompt = (text: string, intent: ChatIntentType): string => {
  return extractMediaPrompt(text, intent) || text.trim();
};
