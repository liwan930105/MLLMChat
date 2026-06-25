import { useCallback, useState, type ReactElement } from 'react';

import Image from 'next/image';

import { ImageLightbox } from '@/components/chat/ImageLightbox';
import { copyImageToClipboard, downloadMedia } from '@/lib/media-actions';

interface ImageMediaCardProps {
  url: string;
  prompt: string;
}

export const ImageMediaCard = ({ url, prompt }: ImageMediaCardProps): ReactElement => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showActionMessage = (message: string): void => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  };

  const handleDownload = useCallback(async (): Promise<void> => {
    try {
      await downloadMedia(url, `generated-image-${Date.now()}.png`);
      showActionMessage('已开始下载');
    } catch (error) {
      showActionMessage(error instanceof Error ? error.message : '下载失败');
    }
  }, [url]);

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
