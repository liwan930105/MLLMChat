/** @jest-environment jsdom */

import {
  clearChatHistory,
  loadChatHistory,
  loadSystemPrompt,
  saveChatHistory,
  saveSystemPrompt,
} from '@/lib/chat-storage';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import type { ChatUIMessage } from '@/types/chat';

const buildMessage = (id: string, text: string): ChatUIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});

describe('chat storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should save and load chat history', () => {
    const messages = [buildMessage('u-1', 'hello')];
    saveChatHistory(messages);
    expect(loadChatHistory()).toEqual(messages);
  });

  it('should clear chat history', () => {
    saveChatHistory([buildMessage('u-1', 'hello')]);
    clearChatHistory();
    expect(loadChatHistory()).toEqual([]);
  });

  it('should save and load custom system prompt', () => {
    saveSystemPrompt('你是写作助手');
    expect(loadSystemPrompt()).toBe('你是写作助手');
  });

  it('should fallback to default system prompt', () => {
    expect(loadSystemPrompt()).toBe(DEFAULT_SYSTEM_PROMPT);
  });
});
