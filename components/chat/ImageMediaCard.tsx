import { useCallback, useState, type ReactElement } from 'react';

import Image from 'next/image';

import { ImageLightbox } from '@/components/chat/ImageLightbox';
import { copyImageToClipboard, downloadMedia } from '@/lib/media-actions';

/**
 * ImageMediaCard 组件入参。
 */
interface ImageMediaCardProps {
  /** 图片地址，可为远程 URL、blob URL 或 data URL。 */
  url: string;
  /** 生成图片时使用的提示词，同时作为图片 alt 的来源。 */
  prompt: string;
}

/**
 * 图片生成结果卡片。
 *
 * Props：
 * - url：图片资源地址。
 * - prompt：图片生成提示词。
 *
 * 主要状态：
 * - lightboxOpen：控制全屏图片预览开关。
 * - actionMessage：复制/下载操作后的短暂反馈文案。
 *
 * 关键事件：
 * - 点击图片或“放大”打开灯箱。
 * - 点击“复制”写入系统剪贴板。
 * - 点击“下载”触发浏览器下载。
 *
 * Next.js 特性：
 * - 使用 next/image 获得统一图片组件语义。
 * - unoptimized 用于兼容生成图、data URL 或未配置远程域名的上游图片。
 *
 * 样式：
 * - Tailwind 通过 max-h-72 限制卡片内图片高度，hover 时轻微放大强化可点击感。
 */
export const ImageMediaCard = ({ url, prompt }: ImageMediaCardProps): ReactElement => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  /**
   * 展示短暂操作反馈。
   *
   * @param message 需要显示给用户的反馈文案。
   */
  const showActionMessage = (message: string): void => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  };

  /**
   * 下载当前生成图片。
   */
  const handleDownload = useCallback(async (): Promise<void> => {
    try {
      await downloadMedia(url, `generated-image-${Date.now()}.png`);
      showActionMessage('已开始下载');
    } catch (error) {
      showActionMessage(error instanceof Error ? error.message : '下载失败');
    }
  }, [url]);

  /**
   * 复制当前图片到剪贴板。
   */
  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await copyImageToClipboard(url);
      showActionMessage('已复制到剪贴板');
    } catch (error) {
      showActionMessage(error instanceof Error ? error.message : '复制失败');
    }
  }, [url]);

  return (
    <div className='space-y-2'>
      <button
        type='button'
        onClick={() => setLightboxOpen(true)}
        className='group relative block overflow-hidden rounded-xl ring-1 ring-zinc-200 transition hover:ring-ding-300'
        aria-label='点击放大图片'
      >
        <Image
          src={url}
          alt={prompt || '生成图片'}
          width={1024}
          height={1024}
          unoptimized
          className='max-h-72 w-full object-cover transition group-hover:scale-[1.02]'
        />
        {/* 仅 hover 时展示提示，避免遮挡生成图片主体。 */}
        <span className='absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100'>
          点击放大
        </span>
      </button>

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => setLightboxOpen(true)}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          放大
        </button>
        <button
          type='button'
          onClick={handleCopy}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          复制
        </button>
        <button
          type='button'
          onClick={handleDownload}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          下载
        </button>
      </div>

      {actionMessage ? <p className='text-[11px] text-ding-600'>{actionMessage}</p> : null}

      <ImageLightbox url={url} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </div>
  );
};
