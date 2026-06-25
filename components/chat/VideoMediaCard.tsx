import { useCallback, useRef, useState, type ReactElement } from 'react';

import { downloadMedia } from '@/lib/media-actions';

interface VideoMediaCardProps {
  url: string;
  prompt: string;
}

const SEEK_SECONDS = 10;

export const VideoMediaCard = ({ url, prompt }: VideoMediaCardProps): ReactElement => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showActionMessage = (message: string): void => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  };

  const handleDownload = useCallback(async (): Promise<void> => {
    try {
      await downloadMedia(url, `generated-video-${Date.now()}.mp4`);
      showActionMessage('已开始下载');
    } catch (error) {
      showActionMessage(error instanceof Error ? error.message : '下载失败');
    }
  }, [url]);

  const handleFullscreen = useCallback((): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.requestFullscreen) {
      void video.requestFullscreen();
      return;
    }
    showActionMessage('当前浏览器不支持全屏');
  }, []);

  const handleTogglePlay = useCallback((): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play();
      return;
    }
    video.pause();
  }, []);

  const handleSeekForward = useCallback((): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = Math.min(video.duration || video.currentTime + SEEK_SECONDS, video.currentTime + SEEK_SECONDS);
  }, []);

  return (
    <div className='space-y-2'>
      <video
        ref={videoRef}
        src={url}
        controls
        preload='metadata'
        aria-label={prompt || '生成视频'}
        className='max-h-80 w-full rounded-xl bg-black ring-1 ring-zinc-200'
      />

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={handleTogglePlay}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          播放/暂停
        </button>
        <button
          type='button'
          onClick={handleSeekForward}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          快进 {SEEK_SECONDS}s
        </button>
        <button
          type='button'
          onClick={handleFullscreen}
          className='rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-200'
        >
          全屏
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
    </div>
  );
};
