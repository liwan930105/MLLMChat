import { useCallback, useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';

import clsx from 'clsx';

import { INPUT_PLACEHOLDER } from '@/lib/constants';

/**
 * ChatInput 组件入参。
 */
interface ChatInputProps {
  /** 输入框当前内容，由父组件控制。 */
  value: string;
  /** 当前是否正在提交或流式生成，忙碌时禁用输入并显示停止按钮。 */
  isBusy: boolean;
  /** 输入变化回调。 */
  onChange: (value: string) => void;
  /** 发送消息回调。 */
  onSubmit: () => void;
  /** 停止生成回调。 */
  onStop: () => void;
}

/**
 * 聊天输入区组件。
 *
 * Props：
 * - value/onChange：受控 textarea 的值与更新方法。
 * - isBusy：控制发送按钮与停止按钮的条件渲染。
 * - onSubmit/onStop：提交和停止事件。
 *
 * 主要状态：
 * - textareaRef：用于读取 scrollHeight 并动态调整高度。
 *
 * 副作用：
 * - value 变化时重新计算 textarea 高度。
 *
 * 关键事件：
 * - Enter 发送。
 * - Shift+Enter 换行。
 *
 * 样式：
 * - Tailwind 将输入区固定在底部，textarea 最大高度限制为 120px，避免长文本挤占消息区。
 */
export const ChatInput = ({
  value,
  isBusy,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps): ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0;

  /**
   * 根据内容高度自适应 textarea。
   *
   * @returns 无返回值，直接修改 DOM 行内高度。
   */
  const resizeTextarea = useCallback((): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    // 先重置为 auto 才能正确读取删除文本后的 scrollHeight。
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  /**
   * 处理键盘提交。
   *
   * @param event textarea 键盘事件。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isBusy && canSend) {
        onSubmit();
      }
    }
  };

  /**
   * 处理表单提交，覆盖点击发送按钮的路径。
   *
   * @param event form submit 事件。
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isBusy && canSend) {
      onSubmit();
    }
  };

  return (
    <footer className='shrink-0 border-t border-zinc-200/80 bg-[#f7f8fa] px-4 py-3'>
      <form onSubmit={handleSubmit} className='mx-auto flex max-w-4xl flex-col gap-1'>
        <div className='flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm'>
          <label htmlFor='chat-input' className='sr-only'>
            聊天输入框
          </label>
          <textarea
            ref={textareaRef}
            id='chat-input'
            rows={1}
            aria-label='聊天输入框'
            placeholder={INPUT_PLACEHOLDER}
            value={value}
            disabled={isBusy}
            onChange={(event) => onChange(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            className='max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 disabled:opacity-60'
          />
          {/* 忙碌时显示停止按钮，避免用户重复提交同一轮请求。 */}
          {isBusy ? (
            <button
              type='button'
              onClick={onStop}
              aria-label='停止生成'
              className='shrink-0 rounded-xl bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300'
            >
              停止
            </button>
          ) : (
            <button
              type='submit'
              disabled={!canSend}
              aria-label='发送消息'
              className={clsx(
                'shrink-0 rounded-xl px-4 py-1.5 text-xs font-medium transition',
                canSend
                  ? 'bg-ding-500 text-white hover:bg-ding-600'
                  : 'cursor-not-allowed bg-zinc-200 text-zinc-400',
              )}
            >
              发送
            </button>
          )}
        </div>
        <p className='px-1 text-[11px] text-zinc-400'>Enter 发送 · Shift+Enter 换行</p>
      </form>
    </footer>
  );
};
