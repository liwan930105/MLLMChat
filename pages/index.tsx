import Head from 'next/head';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { MultimodalChat } from '@/components/MultimodalChat';

export default function HomePage(): JSX.Element {
  return (
    <>
      <Head>
        <title>MLLM Chat</title>
        <meta name='description' content='多模态聊天应用，支持文本、图片、视频生成。' />
      </Head>
      <AppErrorBoundary>
        <MultimodalChat />
      </AppErrorBoundary>
    </>
  );
}
