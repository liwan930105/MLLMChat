import { useCallback, useEffect, type ReactElement } from 'react';

interface ImageLightboxProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

export const ImageLightbox = ({ url, open, onClose }: ImageLightboxProps): ReactElement | null => {
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
