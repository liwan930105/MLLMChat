import { useCallback, useEffect, type ReactElement } from 'react';

/**
 * ImageLightbox 组件入参。
 */
interface ImageLightboxProps {
  /** 需要全屏预览的图片地址。 */
  url: string;
  /** 是否打开灯箱。 */
  open: boolean;
  /** 关闭灯箱回调。 */
  onClose: () => void;
}

/**
 * 图片灯箱预览组件。
 *
 * Props：
 * - url：图片资源地址。
 * - open：控制是否渲染灯箱。
 * - onClose：点击遮罩、关闭按钮或按 Esc 时触发。
 *
 * 主要状态：无本地状态。
 *
 * 副作用：
 * - 打开时监听 Escape 键。
 * - 打开时锁定 body 滚动，关闭或卸载时恢复。
 *
 * Next.js 特性：
 * - 这里使用原生 img 而不是 next/image，因为灯箱需要展示任意 data/blob/远程图且不依赖优化尺寸。
 *
 * 样式：
 * - Tailwind 使用 fixed inset-0 覆盖全屏，max-h/max-w 保证大图不超出视口。
 */
export const ImageLightbox = ({ url, open, onClose }: ImageLightboxProps): ReactElement | null => {
  /**
   * 监听 Esc 键关闭灯箱。
   *
   * @param event 浏览器键盘事件。
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    // 灯箱打开时禁止背景聊天列表继续滚动，避免关闭后位置跳动。
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4'
      role='dialog'
      aria-modal='true'
      aria-label='图片预览'
      onClick={onClose}
    >
      <button
        type='button'
        onClick={onClose}
        className='absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white transition hover:bg-black/70'
      >
        关闭
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt='放大预览'
        className='max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
};
