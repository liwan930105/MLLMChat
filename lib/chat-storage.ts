import {
  CHAT_HISTORY_STORAGE_KEY,
  CHAT_SESSION_ID_STORAGE_KEY,
  CHAT_SYSTEM_PROMPT_STORAGE_KEY,
  DEFAULT_SYSTEM_PROMPT,
  MAX_STORED_MESSAGES,
} from '@/lib/constants';
import type { ChatUIMessage } from '@/types/chat';

/**
 * 判断当前代码是否运行在浏览器中。
 *
 * @returns 浏览器环境返回 true；SSR 或测试中的 Node 环境返回 false。
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 从 localStorage 读取字符串。
 *
 * @param key 存储键名。
 * @returns 读取到的字符串；非浏览器环境或不存在时返回 null。
 */
const readStorageItem = (key: string): string | null => {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(key);
};

/**
 * 写入 localStorage。
 *
 * @param key 存储键名。
 * @param value 要写入的字符串。
 */
const writeStorageItem = (key: string, value: string): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, value);
};

/**
 * 删除 localStorage 中的指定键。
 *
 * @param key 存储键名。
 */
const removeStorageItem = (key: string): void => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(key);
};

/**
 * 加载本地聊天历史。
 *
 * @returns 解析成功的最近 MAX_STORED_MESSAGES 条消息；无数据或 JSON 损坏时返回空数组。
 */
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
    // 只保留最近消息，避免长期会话让 localStorage 和首屏恢复过重。
    return parsed.slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
};

/**
 * 保存聊天历史到 localStorage。
 *
 * @param messages 当前会话消息数组。
 */
export const saveChatHistory = (messages: ChatUIMessage[]): void => {
  if (messages.length === 0) {
    // 空数组等价于没有历史，删除键能让后续加载路径更简单。
    removeStorageItem(CHAT_HISTORY_STORAGE_KEY);
    return;
  }

  writeStorageItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
};

/**
 * 清空本地聊天历史。
 */
export const clearChatHistory = (): void => {
  removeStorageItem(CHAT_HISTORY_STORAGE_KEY);
};

/**
 * 加载用户自定义系统提示词。
 *
 * @returns 用户保存的提示词；未设置或为空时返回默认系统提示词。
 */
export const loadSystemPrompt = (): string => {
  const saved = readStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY);
  if (!saved || saved.trim().length === 0) {
    return DEFAULT_SYSTEM_PROMPT;
  }
  return saved;
};

/**
 * 保存系统提示词。
 *
 * @param prompt 用户输入的系统提示词。
 */
export const saveSystemPrompt = (prompt: string): void => {
  const normalized = prompt.trim();
  if (normalized.length === 0 || normalized === DEFAULT_SYSTEM_PROMPT) {
    // 默认值无需持久化，便于后续更新 DEFAULT_SYSTEM_PROMPT 后自动生效。
    removeStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY);
    return;
  }
  writeStorageItem(CHAT_SYSTEM_PROMPT_STORAGE_KEY, normalized);
};

/**
 * 加载当前聊天会话 ID。
 *
 * @returns 已保存的 sessionId；不存在时返回 null。
 */
export const loadChatSessionId = (): string | null => {
  return readStorageItem(CHAT_SESSION_ID_STORAGE_KEY);
};

/**
 * 保存当前聊天会话 ID。
 *
 * @param sessionId 会话 ID。
 */
export const saveChatSessionId = (sessionId: string): void => {
  writeStorageItem(CHAT_SESSION_ID_STORAGE_KEY, sessionId);
};
