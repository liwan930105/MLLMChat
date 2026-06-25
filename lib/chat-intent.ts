import { IMAGE_KEYWORDS, VIDEO_KEYWORDS } from '@/lib/constants';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

const EMPTY_TEXT = '';

const normalizeText = (text: string): string => {
  return text.trim().toLowerCase();
};

const includesAnyKeyword = (text: string, keywords: string[]): boolean => {
  const normalizedText = normalizeText(text);
  return keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));
};

const IMAGE_PREFIX_PATTERNS: RegExp[] = [
  /^帮我画(一张|一个|一幅|张)?/i,
  /^帮我生成(一张|一个)?图(片)?[，,：:\s]*/i,
  /^生成图片[，,：:\s]*/i,
  /^画(一张|一个|一幅)?[，,：:\s]*/i,
  /^绘制(一张|一个|一幅)?[，,：:\s]*/i,
  /^做(一张|一个)?图(片)?[，,：:\s]*/i,
];

const VIDEO_PREFIX_PATTERNS: RegExp[] = [
  /^帮我(做|生成)(一个|一段)?视频[，,：:\s]*/i,
  /^生成视频[，,：:\s]*/i,
  /^做(一个|一段)?视频[，,：:\s]*/i,
  /^制作(一个|一段)?视频[，,：:\s]*/i,
];

const CONTENT_PATTERNS: RegExp[] = [
  /(?:内容是|内容[:：])\s*(.+)$/i,
  /(?:主题是|主题[:：])\s*(.+)$/i,
];

const stripPrefixPatterns = (text: string, patterns: RegExp[]): string => {
  let cleaned = text.trim();
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
  if (includesAnyKeyword(text, VIDEO_KEYWORDS)) {
    return 'video';
  }

  if (includesAnyKeyword(text, IMAGE_KEYWORDS)) {
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
