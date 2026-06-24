import { useCallback, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import clsx from 'clsx';

import { ChatMessageList } from '@/components/ChatMessageList';
import { INPUT_PLACEHOLDER, INTENT_BADGE_TEXT } from '@/lib/constants';
import { appFetch } from '@/lib/request';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

interface StatusData {
  level: 'info' | 'error';
  message: string;
}

interface IntentData {
  intent: ChatIntentType;
}

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
  const [runtimeStatus, setRuntimeStatus] = useState<string>('准备就绪');
  const [latestIntent, setLatestIntent] = useState<ChatIntentType>('text');

  const transport = useMemo(() => {
    return new DefaultChatTransport<ChatUIMessage>({
      api: '/api/ai-sdk/multimodal',
      fetch: appFetch,
    });
  }, []);

  const { messages, sendMessage, status, error, stop, clearError } = useChat<ChatUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === 'data-status' && isStatusData(part.data)) {
        setRuntimeStatus(part.data.message);
      }
      if (part.type === 'data-intent' && isIntentData(part.data)) {
        setLatestIntent(part.data.intent);
      }
    },
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  const sendWithIntent = useCallback(
    async (intentHint?: ChatIntentType): Promise<void> => {
      const prompt = normalizeInput(input);
      if (!prompt) {
        setRuntimeStatus('请输入内容后再发送');
        return;
      }

      try {
        await sendMessage(
          { text: prompt },
          {
            body: intentHint ? { intentHint } : {},
          },
        );
        setInput('');
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : '发送消息失败';
        setRuntimeStatus(message);
      }
    },
    [input, sendMessage],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      await sendWithIntent();
    },
    [sendWithIntent],
  );

  const handleImage = useCallback(async (): Promise<void> => {
    await sendWithIntent('image');
  }, [sendWithIntent]);

  const handleVideo = useCallback(async (): Promise<void> => {
    await sendWithIntent('video');
  }, [sendWithIntent]);

  const handleStop = useCallback(async (): Promise<void> => {
    await stop();
    setRuntimeStatus('已停止当前响应');
  }, [stop]);

  return (
    <div className='mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-8'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight text-zinc-900'>MLLM Chat</h1>
        <p className='text-sm text-zinc-600'>支持文本对话、图片生成与视频生成，页面风格保持简洁。</p>
      </header>

      <div className='rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700'>
        <span className='font-medium text-zinc-900'>当前模式：</span>
        <span className='ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs'>{INTENT_BADGE_TEXT[latestIntent]}</span>
        <span className='ml-3 text-zinc-500'>状态：{runtimeStatus}</span>
      </div>

      <ChatMessageList messages={messages} />

      <form onSubmit={handleSubmit} className='mt-auto space-y-3 rounded-xl border border-zinc-200 bg-white p-4'>
        <textarea
          className='h-28 w-full resize-none rounded-lg border border-zinc-300 p-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
          value={input}
          placeholder={INPUT_PLACEHOLDER}
          onChange={(event) => setInput(event.currentTarget.value)}
        />

        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='submit'
            disabled={isBusy}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition',
              isBusy ? 'cursor-not-allowed bg-zinc-400' : 'bg-brand-600 hover:bg-brand-500',
            )}
          >
            发送文本
          </button>
          <button
            type='button'
            disabled={isBusy}
            onClick={handleImage}
            className='rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            生成图片
          </button>
          <button
            type='button'
            disabled={isBusy}
            onClick={handleVideo}
            className='rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            生成视频
          </button>
          <button
            type='button'
            disabled={!isBusy}
            onClick={handleStop}
            className='rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            停止生成
          </button>
        </div>

        {error ? (
          <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            <p>{error.message}</p>
            <button type='button' onClick={clearError} className='mt-2 text-xs font-medium underline underline-offset-2'>
              清除错误
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
};
