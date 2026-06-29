import Head from 'next/head';
import type { ReactElement } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { MultimodalChat } from '@/components/MultimodalChat';

/**
 * 首页页面组件。
 *
 * 页面路由：
 * - Pages Router 下的 `/`，由 `pages/index.tsx` 自动映射。
 *
 * 数据获取方式：
 * - 未使用 getServerSideProps、getStaticProps 或 getStaticPaths。
 * - 聊天数据在浏览器端通过 Vercel AI SDK 请求 API 路由获取。
 *
 * 渲染策略：
 * - 该页面没有服务端数据依赖，Next.js 会进行自动静态优化。
 * - 首屏 HTML 静态生成，聊天交互在客户端 hydration 后运行。
 *
 * 页面核心职责：
 * - 通过 Head 写入标题、描述和移动端 viewport。
 * - 用 AppErrorBoundary 保护聊天主组件，避免运行时错误导致整页空白。
 * - 挂载 MultimodalChat，承载文本、图片和视频生成体验。
 */
export default function HomePage(): ReactElement {
  return (
    <>
      <Head>
        {/* next/head 会把这些标签合并到当前页面的 <head>，适用于 Pages Router。 */}
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
