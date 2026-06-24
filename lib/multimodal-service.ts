import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  IMAGE_GENERATION_PATH,
  VIDEO_GENERATION_PATH,
} from '@/lib/constants';
import { getDoubaoConfig } from '@/lib/model-providers';
import type { ChatIntentType, MediaGenerationResult } from '@/types/chat';

interface OpenAICompatibleImageItem {
  url?: string;
  b64_json?: string;
}

interface OpenAICompatibleImageResponse {
  data?: OpenAICompatibleImageItem[];
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null;
};

const buildMediaPrompt = (prompt: string, kind: ChatIntentType): string => {
  const normalizedPrompt = prompt.trim();
  if (normalizedPrompt.length > 0) {
    return normalizedPrompt;
  }

  if (kind === 'image') {
    return '请生成一张简洁、现代风格的插画';
  }

  return '请生成一个简洁、现代风格的短视频';
};

const resolveMediaUrl = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const urlValue = payload.url;
  if (typeof urlValue === 'string' && urlValue.length > 0) {
    return urlValue;
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nestedUrl = resolveMediaUrl(item);
        if (nestedUrl) {
          return nestedUrl;
        }
      }
      continue;
    }

    const nestedUrl = resolveMediaUrl(value);
    if (nestedUrl) {
      return nestedUrl;
    }
  }

  return null;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: { message?: string } | string };
    if (typeof data.error === 'string') {
      return data.error;
    }
    if (isRecord(data.error) && typeof data.error.message === 'string') {
      return data.error.message;
    }
  } catch {
    return response.statusText || '请求失败';
  }
  return response.statusText || '请求失败';
};

const callOpenAICompatibleApi = async <TResponse>(
  path: string,
  payload: JsonRecord,
): Promise<TResponse> => {
  const { apiKey, baseUrl } = getDoubaoConfig();
  const endpoint = `${baseUrl.replace(/\/$/, '')}${path}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new Error(`多模态接口调用失败(${response.status})：${detail}`);
  }

  return (await response.json()) as TResponse;
};

const toDataUrl = (base64: string): string => {
  return `data:image/png;base64,${base64}`;
};

export const generateImage = async (prompt: string): Promise<MediaGenerationResult> => {
  const model = process.env.DOUBAO_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  const normalizedPrompt = buildMediaPrompt(prompt, 'image');

  const response = await callOpenAICompatibleApi<OpenAICompatibleImageResponse>(
    process.env.DOUBAO_IMAGE_ENDPOINT ?? IMAGE_GENERATION_PATH,
    {
      model,
      prompt: normalizedPrompt,
      size: '1024x1024',
    },
  );

  const imageItem = response.data?.[0];
  const imageUrl = imageItem?.url ?? (imageItem?.b64_json ? toDataUrl(imageItem.b64_json) : null);
  if (!imageUrl) {
    throw new Error('图片生成完成，但未返回可用 URL。');
  }

  return {
    kind: 'image',
    url: imageUrl,
    prompt: normalizedPrompt,
    model,
  };
};

export const generateVideo = async (prompt: string): Promise<MediaGenerationResult> => {
  const model = process.env.DOUBAO_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;
  const normalizedPrompt = buildMediaPrompt(prompt, 'video');

  const response = await callOpenAICompatibleApi<unknown>(
    process.env.DOUBAO_VIDEO_ENDPOINT ?? VIDEO_GENERATION_PATH,
    {
      model,
      prompt: normalizedPrompt,
      duration: 5,
      aspect_ratio: '16:9',
    },
  );

  const videoUrl = resolveMediaUrl(response);
  if (!videoUrl) {
    throw new Error('视频任务已创建，但当前响应未携带视频 URL，请检查视频接口是否支持同步返回。');
  }

  return {
    kind: 'video',
    url: videoUrl,
    prompt: normalizedPrompt,
    model,
  };
};
