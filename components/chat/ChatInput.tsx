import { useCallback, useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';

import clsx from 'clsx';

import { INPUT_PLACEHOLDER } from '@/lib/constants';

interface ChatInputProps {
  value: string;
  isBusy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}

export const ChatInput = ({
  value,
  isBusy,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps): ReactElement => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0;

  const resizeTextarea = useCallback((): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isBusy && canSend) {
        onSubmit();
      }
    }
  };

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
