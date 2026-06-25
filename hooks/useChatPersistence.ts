import { useEffect, useRef } from 'react';

import { clearChatHistory, loadChatHistory, saveChatHistory } from '@/lib/chat-storage';
import type { ChatUIMessage } from '@/types/chat';

interface UseChatPersistenceOptions {
  messages: ChatUIMessage[];
  setMessages: (messages: ChatUIMessage[]) => void;
}

export const useChatPersistence = ({ messages, setMessages }: UseChatPersistenceOptions): {
  clearHistory: () => void;
} => {
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    }
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
