import type { AppProps } from 'next/app';
import type { ReactElement } from 'react';

import '@/styles/globals.css';

/**
 * Next.js Pages Router 的自定义 App 入口。
 *
 * 页面路由：
 * - `_app.tsx` 不对应具体 URL，而是包裹所有 `pages/*` 页面。
 *
 * 数据获取方式：
 * - 未使用 getInitialProps，因此不会关闭页面的自动静态优化。
 *
 * 渲染策略：
 * - 每个页面仍按自身是否声明数据获取函数决定 SSR/SSG。
 *
 * 页面核心职责：
 * - 引入全局 Tailwind 和基础样式。
 * - 渲染当前路由匹配到的页面组件并透传 pageProps。
 */
export default function App({ Component, pageProps }: AppProps): ReactElement {
  return <Component {...pageProps} />;
}
