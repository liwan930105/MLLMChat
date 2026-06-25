import { memo, useEffect, useMemo, useRef } from 'react';

import clsx from 'clsx';

import { ImageMediaCard } from '@/components/chat/ImageMediaCard';
import { VideoMediaCard } from '@/components/chat/VideoMediaCard';
import type { ChatMediaDataPart, ChatUIMessage } from '@/types/chat';

interface ChatMessageListProps {
  messages: ChatUIMessage[];
  isStreaming: boolean;
}

const isMediaPart = (part: ChatUIMessage['parts'][number]): part is { type: 'data-media'; data: ChatMediaDataPart } => {
  return part.type === 'data-media';
};

const getMessageText = (message: ChatUIMessage): string => {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
};

interface MessageBubbleProps {
  message: ChatUIMessage;
  showCursor: boolean;
}

const MessageBubble = memo(function MessageBubble({ message, showCursor }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const textContent = useMemo(() => getMessageText(message), [message]);
  const mediaParts = useMemo(() => message.parts.filter(isMediaPart), [message.parts]);

  return (
    <div className={clsx('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-1',
          isUser ? 'bg-ding-100 text-ding-800 ring-ding-200' : 'bg-white text-ding-600 ring-zinc-200',
        )}
      >
        {isUser ? '我' : 'AI'}
      </div>

      <div className={clsx('flex max-w-[78%] flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        {textContent ? (
          <div
            className={clsx(
              'px-3 py-2 text-[15px] leading-relaxed',
              isUser
                ? 'user-message-bubble rounded-[4px] rounded-tr-none bg-wechat-bubble text-zinc-900'
                : 'rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm ring-1 ring-zinc-100',
            )}
          >
            <p className='whitespace-pre-wrap break-words'>
              {textContent}
              {showCursor ? <span className='streaming-cursor ml-0.5 inline-block' aria-hidden='true' /> : null}
            </p>
          </div>
        ) : null}

        {mediaParts.map((part, index) => (
          <div
            key={`${message.id}-media-${index}`}
            className='w-full min-w-[240px] max-w-sm rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100'
          >
            {part.data.kind === 'image' ? (
              <ImageMediaCard url={part.data.url} prompt={part.data.prompt} />
            ) : (
              <VideoMediaCard url={part.data.url} prompt={part.data.prompt} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export const ChatMessageList = memo(function ChatMessageList({ messages, isStreaming }: ChatMessageListProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'assistant') {
        return messages[index]?.id ?? null;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <section className='flex-1 overflow-y-auto px-4 py-4' aria-label='聊天记录'>
      <div className='mx-auto flex max-w-4xl flex-col gap-4'>
        {messages.length === 0 ? (
          <div className='mt-12 text-center'>
            <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-semibold text-ding-500 shadow-sm ring-1 ring-zinc-200'>
              AI
            </div>
            <p className='text-sm font-medium text-zinc-700'>开始和 AI 助手聊天吧</p>
            <p className='mt-1 text-xs text-zinc-500'>
              支持多轮对话、流式回复，说「帮我画一张…」或「做一个视频…」可自动生成
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showCursor={isStreaming && message.id === lastAssistantMessageId}
            />
          ))
        )}
        <div ref={scrollAnchorRef} />
      </div>
    </section>
  );
});
