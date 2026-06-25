import Head from 'next/head';
import type { ReactElement } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { MultimodalChat } from '@/components/MultimodalChat';

export default function HomePage(): ReactElement {
  return (
    <>
      <Head>
        <title>MLLM Chat</title>
        <meta name='description' content='多模态聊天应用，支持文本、图片、视频生成。' />
        <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
      </Head>
      <AppErrorBoundary>
        <MultimodalChat />
      </AppErrorBoundary>
    </>
  );
}
