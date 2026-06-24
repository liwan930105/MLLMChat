import { IMAGE_KEYWORDS, VIDEO_KEYWORDS } from '@/lib/constants';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

const EMPTY_TEXT = '';

const normalizeText = (text: string): string => {
  return text.trim().toLowerCase();
};

const includesAnyKeyword = (text: string, keywords: string[]): boolean => {
  const normalizedText = normalizeText(text);
  return keywords.some((keyword) => normalizedText.includes(keyword));
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
