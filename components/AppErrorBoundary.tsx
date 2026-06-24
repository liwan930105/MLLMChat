import type { PropsWithChildren } from 'react';

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps): JSX.Element => {
  return (
    <div className='mx-auto mt-10 w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700'>
      <h2 className='text-sm font-semibold'>页面出现错误</h2>
      <p className='mt-2 text-sm'>{error.message}</p>
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

export const AppErrorBoundary = ({ children }: PropsWithChildren): JSX.Element => {
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
