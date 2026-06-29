import type { PropsWithChildren, ReactElement } from 'react';

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

/**
 * 将未知错误转换为可展示文案。
 *
 * @param error React 错误边界捕获到的异常。
 * @returns 错误消息；非 Error 对象返回通用文案。
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
};

/**
 * 错误边界的降级 UI。
 *
 * Props：
 * - error：捕获到的异常对象。
 * - resetErrorBoundary：触发 ErrorBoundary 重置的回调。
 *
 * 样式：
 * - 使用红色边框和浅红背景突出页面级错误。
 */
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps): ReactElement => {
  return (
    <div className='mx-auto mt-10 w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700'>
      <h2 className='text-sm font-semibold'>页面出现错误</h2>
      <p className='mt-2 text-sm'>{getErrorMessage(error)}</p>
      <button
        type='button'
        onClick={resetErrorBoundary}
        className='mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100'
      >
        重试
      </button>
    </div>
  );
};

/**
 * 应用级错误边界组件。
 *
 * Props：
 * - children：需要被错误边界保护的页面内容。
 *
 * 关键事件：
 * - 点击“重试”会触发 onReset 并刷新页面，清理可能残留的组件状态。
 */
export const AppErrorBoundary = ({ children }: PropsWithChildren): ReactElement => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
