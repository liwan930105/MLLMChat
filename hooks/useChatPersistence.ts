import { useEffect, useRef } from 'react';

import { clearChatHistory, loadChatHistory, saveChatHistory } from '@/lib/chat-storage';
import type { ChatUIMessage } from '@/types/chat';

/**
 * useChatPersistence 的入参。
 */
interface UseChatPersistenceOptions {
  /** 当前 AI SDK useChat 管理的消息列表。 */
  messages: ChatUIMessage[];
  /** 用于把本地历史恢复到 useChat 状态中的 setter。 */
  setMessages: (messages: ChatUIMessage[]) => void;
}

/**
 * 将聊天消息与 localStorage 同步的自定义 Hook。
 *
 * @param options.messages 当前消息数组。
 * @param options.setMessages AI SDK useChat 暴露的消息设置函数。
 * @returns clearHistory 方法，用于同时清空 localStorage 和内存消息。
 *
 * 内部状态：
 * - hasHydratedRef 标记是否已经完成首次本地历史恢复。
 *
 * 副作用：
 * - 首次挂载时从 localStorage 恢复聊天历史。
 * - messages 变化后自动保存最新历史。
 */
export const useChatPersistence = ({ messages, setMessages }: UseChatPersistenceOptions): {
  /** 清空本地与内存中的聊天历史。 */
  clearHistory: () => void;
} => {
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    }
    // 只有恢复完成后才允许保存，避免初始空数组覆盖已有 localStorage。
    hasHydratedRef.current = true;
  }, [setMessages]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }
    saveChatHistory(messages);
  }, [messages]);

  const clearHistory = (): void => {
    clearChatHistory();
    setMessages([]);
  };

  return { clearHistory };
};
