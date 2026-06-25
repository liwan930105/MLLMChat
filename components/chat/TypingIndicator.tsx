import type { ReactElement } from 'react';

interface TypingIndicatorProps {
  visible: boolean;
  message?: string;
}

export const TypingIndicator = ({ visible, message = 'AI 正在思考...' }: TypingIndicatorProps): ReactElement | null => {
  if (!visible) {
    return null;
  }

  return (
    <div className='flex items-start gap-2 px-4 py-2' aria-live='polite'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-ding-600 shadow-sm ring-1 ring-zinc-200'>
        AI
      </div>
      <div className='rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-zinc-600'>{message}</span>
          <span className='flex gap-1'>
            <span className='typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400' />
            <span className='typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400' />
            <span className='typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400' />
          </span>
        </div>
      </div>
    </div>
  );
};
