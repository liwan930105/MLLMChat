import type { ReactElement } from 'react';

/**
 * TypingIndicator 组件入参。
 */
interface TypingIndicatorProps {
  /** 是否显示等待指示器。 */
  visible: boolean;
  /** 指示器旁展示的状态文案。 */
  message?: string;
}

/**
 * 助手等待/输入中指示器。
 *
 * Props：
 * - visible：控制条件渲染。
 * - message：展示当前运行状态，默认是“AI 正在思考...”。
 *
 * 主要状态：无本地状态。
 *
 * 样式：
 * - Tailwind 复用 AI 头像与白色气泡样式。
 * - typing-dot 动画定义在 globals.css，用三个延迟不同的小圆点表现等待状态。
 */
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
