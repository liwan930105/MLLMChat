import { memo, useMemo } from 'react';

import Image from 'next/image';

import type { ChatMediaDataPart, ChatUIMessage } from '@/types/chat';

interface ChatMessageListProps {
  messages: ChatUIMessage[];
}

const isMediaPart = (part: ChatUIMessage['parts'][number]): part is { type: 'data-media'; data: ChatMediaDataPart } => {
  return part.type === 'data-media';
};

const renderRoleLabel = (role: ChatUIMessage['role']): string => {
  return role === 'user' ? '你' : '助手';
};

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatUIMessage }) {
  const textParts = useMemo(() => {
    return message.parts.filter((part) => part.type === 'text');
  }, [message.parts]);

  const mediaParts = useMemo(() => {
    return message.parts.filter(isMediaPart);
  }, [message.parts]);

  return (
    <article className='rounded-xl border border-zinc-200 bg-white p-4 shadow-sm'>
      <header className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
        {renderRoleLabel(message.role)}
      </header>

      <div className='space-y-3'>
        {textParts.map((part, index) => (
          <p key={`${message.id}-text-${index}`} className='whitespace-pre-wrap text-sm text-zinc-800'>
            {part.text}
          </p>
        ))}

        {mediaParts.map((part, index) => (
          <div key={`${message.id}-media-${index}`} className='space-y-2'>
            {part.data.kind === 'image' ? (
              <Image
                src={part.data.url}
                alt='生成图片'
                width={1024}
                height={1024}
                unoptimized
                className='w-full rounded-lg border border-zinc-200 object-cover'
              />
            ) : (
              <video src={part.data.url} controls preload='metadata' className='w-full rounded-lg border border-zinc-200' />
            )}
            <p className='text-xs text-zinc-500'>模型：{part.data.model}</p>
            <p className='text-xs text-zinc-500'>提示词：{part.data.prompt}</p>
          </div>
        ))}
      </div>
    </article>
  );
});

export const ChatMessageList = memo(function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <section className='space-y-3'>
      {messages.length === 0 ? (
        <div className='rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500'>
          开始对话吧：你可以输入普通问题，或点击下方按钮直接生成图片 / 视频。
        </div>
      ) : (
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}
    </section>
  );
});
