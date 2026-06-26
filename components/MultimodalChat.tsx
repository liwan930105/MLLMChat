import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import { SystemPromptPanel } from '@/components/chat/SystemPromptPanel';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatMessageList } from '@/components/ChatMessageList';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { detectIntentFromText } from '@/lib/chat-intent';
import { INTENT_BADGE_TEXT } from '@/lib/constants';
import { loadSystemPrompt } from '@/lib/chat-storage';
import { appFetch } from '@/lib/request';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

interface StatusData {
  level: 'info' | 'error';
  message: string;
}

interface IntentData {
  intent: ChatIntentType;
}

type StatusLevel = 'info' | 'error';

const normalizeInput = (input: string): string => {
  return input.trim();
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isStatusData = (value: unknown): value is StatusData => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return (value.level === 'info' || value.level === 'error') && typeof value.message === 'string';
};

const isIntentData = (value: unknown): value is IntentData => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return value.intent === 'text' || value.intent === 'image' || value.intent === 'video';
};

export const MultimodalChat = (): ReactElement => {
  const [input, setInput] = useState<string>('');
  const [runtimeStatus, setRuntimeStatus] = useState<string>('在线');
  const [statusLevel, setStatusLevel] = useState<StatusLevel>('info');
  const [latestIntent, setLatestIntent] = useState<ChatIntentType>('text');
  const [systemPrompt, setSystemPrompt] = useState<string>(() => loadSystemPrompt());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const transport = useMemo(() => {
    return new DefaultChatTransport<ChatUIMessage>({
      api: '/api/ai-sdk/multimodal',
      fetch: appFetch,
    });
  }, []);

  const { messages, sendMessage, status, error, stop, clearError, setMessages } = useChat<ChatUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === 'data-status' && isStatusData(part.data)) {
        setRuntimeStatus(part.data.message);
        setStatusLevel(part.data.level);
      }
      if (part.type === 'data-intent' && isIntentData(part.data)) {
        setLatestIntent(part.data.intent);
      }
    },
    onError: (chatError) => {
      setRuntimeStatus(chatError.message);
      setStatusLevel('error');
    },
    onFinish: () => {
      setRuntimeStatus('在线');
      setStatusLevel('info');
    },
  });

  const { clearHistory } = useChatPersistence({ messages, setMessages });

  const isBusy = status === 'submitted' || status === 'streaming';
  const isSubmitted = status === 'submitted';
  const isStreaming = status === 'streaming';

  const buildRequestBody = useCallback((): Record<string, unknown> => {
    return {
      systemPrompt,
    };
  }, [systemPrompt]);

  const getStatusMessageForIntent = (intent: ChatIntentType): string => {
    if (intent === 'image') {
      return '正在准备生成图片...';
    }
    if (intent === 'video') {
      return '正在准备生成视频...';
    }
    return 'AI 正在思考...';
  };

  const handleSubmit = useCallback(async (): Promise<void> => {
    const prompt = normalizeInput(input);
    if (!prompt) {
      return;
    }

    const intent = detectIntentFromText(prompt);

    clearError();
    setStatusLevel('info');
    setRuntimeStatus(getStatusMessageForIntent(intent));

    try {
      await sendMessage(
        { text: prompt },
        {
          body: buildRequestBody(),
        },
      );
      setInput('');
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '发送消息失败';
      setRuntimeStatus(message);
      setStatusLevel('error');
    }
  }, [buildRequestBody, clearError, input, sendMessage]);

  const handleStop = useCallback(async (): Promise<void> => {
    await stop();
    setRuntimeStatus('已停止生成');
    setStatusLevel('info');
  }, [stop]);

  const handleClearError = useCallback((): void => {
    clearError();
    setRuntimeStatus('在线');
    setStatusLevel('info');
  }, [clearError]);

  const handleClearHistory = useCallback((): void => {
    if (messages.length === 0) {
      return;
    }
    if (window.confirm('确定清空所有聊天记录吗？')) {
      clearHistory();
      setRuntimeStatus('在线');
      setStatusLevel('info');
    }
  }, [clearHistory, messages.length]);

  const handleSaveSystemPrompt = useCallback((prompt: string): void => {
    setSystemPrompt(prompt);
  }, []);

  const displayStatus = error && statusLevel !== 'error' ? error.message : runtimeStatus;
  const displayLevel: StatusLevel = error ? 'error' : statusLevel;
  const showTypingIndicator = isSubmitted && messages[messages.length - 1]?.role !== 'assistant';

  return (
    <div className='flex h-dvh flex-col bg-[#ededed]'>
      <ChatHeader
        title='MLLM 智能助手'
        subtitle={`${INTENT_BADGE_TEXT[latestIntent]} · ${displayStatus}`}
        onOpenSettings={() => setSettingsOpen(true)}
        onClearHistory={handleClearHistory}
      />

      {displayLevel === 'error' ? (
        <div
          role='alert'
          className='flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700'
        >
          <span>{displayStatus}</span>
          <button type='button' onClick={handleClearError} className='font-medium underline underline-offset-2'>
            清除
          </button>
        </div>
      ) : null}

      <ChatMessageList messages={messages} isStreaming={isStreaming} />
      <TypingIndicator visible={showTypingIndicator} message={displayStatus} />

      <ChatInput
        value={input}
        isBusy={isBusy}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
      />

      <SystemPromptPanel
        open={settingsOpen}
        initialPrompt={systemPrompt}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSystemPrompt}
      />
    </div>
  );
};
