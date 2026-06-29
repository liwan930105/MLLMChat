import type { ReactElement } from 'react';

/**
 * ChatHeader 组件入参。
 */
interface ChatHeaderProps {
  /** 页面主标题。 */
  title: string;
  /** 副标题，通常由“当前意图 + 运行状态”组合而成。 */
  subtitle: string;
  /** 打开系统提示词设置面板的回调。 */
  onOpenSettings: () => void;
  /** 清空聊天历史的回调。 */
  onClearHistory: () => void;
}

/**
 * 聊天页顶部栏。
 *
 * Props：
 * - title：应用标题。
 * - subtitle：状态副标题，展示最近意图与运行状态。
 * - onOpenSettings：点击齿轮按钮时触发。
 * - onClearHistory：点击清空按钮时触发。
 *
 * 主要状态：无本地状态，全部由父组件控制。
 *
 * 样式：
 * - Tailwind 使用 shrink-0 固定高度，避免消息列表滚动时顶部被压缩。
 * - 文案区域使用 truncate，保证窄屏下状态文字不撑破布局。
 */
export const ChatHeader = ({ title, subtitle, onOpenSettings, onClearHistory }: ChatHeaderProps): ReactElement => {
  return (
    <header className='flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-3 shadow-sm'>
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ding-500 text-sm font-semibold text-white'>
          AI
        </div>
        <div className='min-w-0'>
          <h1 className='truncate text-base font-semibold text-zinc-900'>{title}</h1>
          <p className='truncate text-xs text-zinc-500'>{subtitle}</p>
        </div>
      </div>

      <div className='flex items-center gap-1'>
        <button
          type='button'
          onClick={onClearHistory}
          className='rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100'
          aria-label='清空聊天记录'
        >
          清空
        </button>
        <button
          type='button'
          onClick={onOpenSettings}
          className='rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100'
          aria-label='系统提示词设置'
        >
          {/* 内联 SVG 避免额外图标依赖，按钮语义由 aria-label 提供。 */}
          <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'
            />
          </svg>
        </button>
      </div>
    </header>
  );
};
