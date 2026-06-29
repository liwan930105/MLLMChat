import { memo, useEffect, useMemo, useRef } from 'react';

import clsx from 'clsx';

import { ImageMediaCard } from '@/components/chat/ImageMediaCard';
import { VideoMediaCard } from '@/components/chat/VideoMediaCard';
import type { ChatMediaDataPart, ChatUIMessage } from '@/types/chat';

/**
 * ChatMessageList 组件入参。
 */
interface ChatMessageListProps {
  /** 当前会话中需要渲染的消息列表。 */
  messages: ChatUIMessage[];
  /** AI SDK 是否正在流式输出，用于给最后一条助手消息显示光标。 */
  isStreaming: boolean;
}

/**
 * 判断消息片段是否为媒体数据。
 *
 * @param part AI SDK UIMessage 中的任意 part。
 * @returns part 是否包含可渲染的图片或视频数据。
 */
const isMediaPart = (part: ChatUIMessage['parts'][number]): part is { type: 'data-media'; data: ChatMediaDataPart } => {
  return part.type === 'data-media';
};

/**
 * 拼接消息中的全部文本片段。
 *
 * @param message 单条聊天消息。
 * @returns 可展示在气泡中的文本内容。
 */
const getMessageText = (message: ChatUIMessage): string => {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
};

/**
 * 单条消息气泡的入参。
 */
interface MessageBubbleProps {
  /** 需要展示的聊天消息。 */
  message: ChatUIMessage;
  /** 是否在文本末尾显示流式输出光标。 */
  showCursor: boolean;
}

/**
 * 单条聊天消息气泡。
 *
 * Props：
 * - message：AI SDK UIMessage，可能包含 text 与 data-media 两类内容。
 * - showCursor：流式响应时给最后一条助手消息显示闪烁光标。
 *
 * 主要状态：无本地状态；textContent 与 mediaParts 通过 useMemo 从 message 派生。
 *
 * 样式：
 * - Tailwind 使用 flex-row / flex-row-reverse 区分 AI 与用户消息方向。
 * - 用户气泡模拟微信绿色消息，AI 气泡使用白色卡片。
 */
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
              {/* 流式光标只出现在最后一条助手消息上，避免历史消息闪烁。 */}
              {showCursor ? <span className='streaming-cursor ml-0.5 inline-block' aria-hidden='true' /> : null}
            </p>
          </div>
        ) : null}

        {/* data-media 是服务端生成完成后追加的结构化媒体结果。 */}
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

/**
 * 聊天消息列表组件。
 *
 * Props：
 * - messages：会话消息数组。
 * - isStreaming：是否正在接收助手流式响应。
 *
 * 主要状态：
 * - scrollAnchorRef：列表底部锚点，用于新消息或流式更新时自动滚动。
 * - lastAssistantMessageId：最近一条 assistant 消息 ID，用于控制流式光标。
 *
 * 副作用：
 * - messages 或 isStreaming 变化时滚动到底部，保持最新回复可见。
 *
 * 样式：
 * - 外层 section 占据剩余高度并启用纵向滚动。
 * - 内容区限制最大宽度，保证桌面端阅读行宽适中。
 */
export const ChatMessageList = memo(function ChatMessageList({ messages, isStreaming }: ChatMessageListProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageId = useMemo(() => {
    // 从后向前查找，避免每次都额外保存派生状态。
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'assistant') {
        return messages[index]?.id ?? null;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    // 流式响应期间也持续滚动，确保最新 token 不被输入框遮住。
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
              支持 DeepSeek 多轮文本对话；说「生成图片，内容是…」或「做一个视频…」将自动调用对应模型
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
