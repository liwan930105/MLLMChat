/**
 * 下载远程或 data/blob 媒体资源。
 *
 * @param url 媒体资源地址。
 * @param filename 浏览器下载时使用的文件名。
 * @throws 当资源不可访问或响应非 2xx 时抛出异常。
 */
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
  // 下载触发后立即释放临时 URL，避免长时间占用浏览器内存。
  URL.revokeObjectURL(objectUrl);
};

/**
 * 复制图片到系统剪贴板。
 *
 * @param url 图片 URL、data URL、blob URL 或普通文本地址。
 * @throws 浏览器不支持 Clipboard API 或图片读取失败时抛出异常。
 */
export const copyImageToClipboard = async (url: string): Promise<void> => {
  if (!navigator.clipboard) {
    throw new Error('当前浏览器不支持复制功能');
  }

  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
    // ClipboardItem 需要 Blob，因此先 fetch 图片内容再写入剪贴板。
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

/**
 * 复制纯文本到系统剪贴板。
 *
 * @param text 需要复制的文本。
 * @throws 浏览器不支持 Clipboard API 时抛出异常。
 */
export const copyTextToClipboard = async (text: string): Promise<void> => {
  if (!navigator.clipboard) {
    throw new Error('当前浏览器不支持复制功能');
  }
  await navigator.clipboard.writeText(text);
};
