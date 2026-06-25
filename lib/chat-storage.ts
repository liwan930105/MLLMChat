import {
  CHAT_HISTORY_STORAGE_KEY,
  CHAT_SESSION_ID_STORAGE_KEY,
  CHAT_SYSTEM_PROMPT_STORAGE_KEY,
  DEFAULT_SYSTEM_PROMPT,
  MAX_STORED_MESSAGES,
} from '@/lib/constants';
import type { ChatUIMessage } from '@/types/chat';

const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

const readStorageItem = (key: string): string | null => {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(key);
};

const writeStorageItem = (key: string, value: string): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, value);
};

const removeStorageItem = (key: string): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(key);
};

export const loadChatHistory = (): ChatUIMessage[] => {
  const raw = readStorageItem(CHAT_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ChatUIMessage[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
};

export const saveChatHistory = (messages: ChatUIMessage[]): void => {
  if (messages.length === 0) {
    removeStorageItem(CHAT_HISTORY_STORAGE_KEY);
    return;
  }

  writeStorageItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
};

export const clearChatHistory = (): void => {
  removeStorageItem(CHAT_HISTORY_STORAGE_KEY);
};

export const loadSystemPrompt = (): string => {
  const saved = readStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY);
  if (!saved || saved.trim().length === 0) {
    return DEFAULT_SYSTEM_PROMPT;
  }
  return saved;
};

export const saveSystemPrompt = (prompt: string): void => {
  const normalized = prompt.trim();
  if (normalized.length === 0 || normalized === DEFAULT_SYSTEM_PROMPT) {
    removeStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY);
    return;
  }
  writeStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY, normalized);
};

export const loadChatSessionId = (): string | null => {
  return readStorageItem(CHAT_SESSION_ID_STORAGE_KEY);
};

export const saveChatSessionId = (sessionId: string): void => {
  writeStorageItem(CHAT_SESSION_ID_STORAGE_KEY, sessionId);
};
