export const downloadMedia = async (url: string, filename: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('下载失败，请稍后重试');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

export const copyImageToClipboard = async (url: string): Promise<void> => {
  if (!navigator.clipboard) {
    throw new Error('当前浏览器不支持复制功能');
  }

  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('复制失败，无法读取图片');
    }
    const blob = await response.blob();
    const mimeType = blob.type || 'image/png';
    await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
    return;
  }

  await navigator.clipboard.writeText(url);
};

export const copyTextToClipboard = async (text: string): Promise<void> => {
  if (!navigator.clipboard) {
    throw new Error('当前浏览器不支持复制功能');
  }
  await navigator.clipboard.writeText(text);
};
