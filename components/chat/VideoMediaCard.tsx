import { useCallback, useRef, useState, type ReactElement } from 'react';

import { downloadMedia } from '@/lib/media-actions';

/**
 * VideoMediaCard 组件入参。
 */
interface VideoMediaCardProps {
  /** 生成视频地址。 */
  url: string;
  /** 生成视频时使用的提示词，用于 aria-label。 */
  prompt: string;
}

/** 每次点击快进按钮跳过的秒数。 */
const SEEK_SECONDS = 10;

/**
 * 视频生成结果卡片。
 *
 * Props：
 * - url：视频资源地址。
 * - prompt：视频生成提示词。
 *
 * 主要状态：
 * - videoRef：引用原生 video 元素，控制播放、快进与全屏。
 * - actionMessage：下载或不支持全屏时的反馈文案。
 *
 * 关键事件：
 * - 播放/暂停：复用 video 原生状态切换。
 * - 快进：最多跳到视频总时长，避免 currentTime 超出范围。
 * - 全屏：调用浏览器 Fullscreen API。
 * - 下载：触发媒体下载。
 *
 * 样式：
 * - Tailwind 限制视频最大高度并使用黑色背景，保证不同宽高比视频都有稳定容器。
 */
export const VideoMediaCard = ({ url, prompt }: VideoMediaCardProps): ReactElement => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  /**
   * 展示短暂操作反馈。
   *
   * @param message 需要展示的反馈文案。
   */
  const showActionMessage = (message: string): void => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  };

  /**
   * 下载当前生成视频。
   */
  const handleDownload = useCallback(async (): Promise<void> => {
    try {
      await downloadMedia(url, `generated-video-${Date.now()}.mp4`);
      showActionMessage('已开始下载');
    } catch (error) {
      showActionMessage(error instanceof Error ? error.message : '下载失败');
    }
  }, [url]);

  /**
   * 让视频进入浏览器全屏模式。
   */
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

  /**
   * 切换视频播放状态。
   */
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

  /**
   * 将视频向后快进固定秒数。
   */
  const handleSeekForward = useCallback((): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    // duration 可能在元数据未加载时为 NaN，因此用当前时间 + SEEK_SECONDS 作为兜底上限。
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
