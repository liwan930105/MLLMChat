import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_TEXT_PARAMS,
  IMAGE_GENERATION_PATH,
  UPSTREAM_FETCH_TIMEOUT_MS,
  VIDEO_POLL_INTERVAL_MS,
  VIDEO_POLL_MAX_ATTEMPTS,
  VIDEO_TASK_CREATE_PATH,
  VIDEO_TASK_QUERY_PATH_TEMPLATE,
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

interface VideoTaskTextContent {
  type: 'text';
  text: string;
}

interface VideoTaskImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

type VideoTaskContentItem = VideoTaskTextContent | VideoTaskImageContent;

interface VideoTaskResponse {
  id?: string;
  status?: string;
  content?: {
    video_url?: string;
  };
}

type JsonRecord = Record<string, unknown>;

export interface MediaGenerationOptions {
  onStatus?: (message: string) => void;
}

const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null;
};

const sleep = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
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

const readNonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};

export const parseVideoTaskResponse = (
  response: unknown,
): { url: string | null; taskId: string | null; status: string | null } => {
  if (!isRecord(response)) {
    return { url: null, taskId: null, status: null };
  }

  const typedResponse = response as VideoTaskResponse;
  const status = readNonEmptyString(typedResponse.status);
  const taskId = readNonEmptyString(typedResponse.id);
  const videoUrl = readNonEmptyString(typedResponse.content?.video_url);

  return {
    url: videoUrl,
    taskId,
    status,
  };
};

/** @deprecated 使用 parseVideoTaskResponse */
export const parseVideoGenerationResponse = parseVideoTaskResponse;

const isVideoTaskFailed = (status: string | null): boolean => {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toLowerCase();
  return ['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(normalizedStatus);
};

const isVideoTaskSucceeded = (status: string | null): boolean => {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toLowerCase();
  return ['succeeded', 'completed', 'success', 'done'].includes(normalizedStatus);
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

const fetchWithTimeout = async (endpoint: string, init: RequestInit): Promise<Response> => {
  const timeoutMs = Number(process.env.UPSTREAM_FETCH_TIMEOUT_MS ?? UPSTREAM_FETCH_TIMEOUT_MS);
  return fetch(endpoint, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
};

const callDoubaoApi = async <TResponse>(
  path: string,
  payload: JsonRecord | null,
  method: 'GET' | 'POST' = 'POST',
): Promise<TResponse> => {
  const { apiKey, baseUrl } = getDoubaoConfig();
  const endpoint = `${baseUrl.replace(/\/$/, '')}${path}`;

  const response = await fetchWithTimeout(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' && payload !== null ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new Error(`多模态接口调用失败(${response.status})：${detail}`);
  }

  return (await response.json()) as TResponse;
};

const buildVideoTaskQueryPath = (taskId: string): string => {
  const template = process.env.DOUBAO_VIDEO_POLL_PATH ?? VIDEO_TASK_QUERY_PATH_TEMPLATE;
  return template.replace('{taskId}', encodeURIComponent(taskId));
};

const buildVideoTaskContent = (prompt: string): VideoTaskContentItem[] => {
  const normalizedPrompt = buildMediaPrompt(prompt, 'video');
  const textParams = process.env.DOUBAO_VIDEO_TEXT_PARAMS ?? DEFAULT_VIDEO_TEXT_PARAMS;
  const content: VideoTaskContentItem[] = [
    {
      type: 'text',
      text: `${normalizedPrompt}${textParams}`,
    },
  ];

  const referenceImageUrl = process.env.DOUBAO_VIDEO_REFERENCE_IMAGE_URL?.trim();
  if (referenceImageUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: referenceImageUrl,
      },
    });
  }

  return content;
};

const pollVideoTask = async (taskId: string, options?: MediaGenerationOptions): Promise<string> => {
  const pollIntervalMs = Number(process.env.VIDEO_POLL_INTERVAL_MS ?? VIDEO_POLL_INTERVAL_MS);
  const maxAttempts = Number(process.env.VIDEO_POLL_MAX_ATTEMPTS ?? VIDEO_POLL_MAX_ATTEMPTS);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options?.onStatus?.(`视频生成中，正在查询任务进度（${attempt}/${maxAttempts}）...`);

    const pollResponse = await callDoubaoApi<VideoTaskResponse>(buildVideoTaskQueryPath(taskId), null, 'GET');
    const parsed = parseVideoTaskResponse(pollResponse);

    if (parsed.url && (!parsed.status || isVideoTaskSucceeded(parsed.status))) {
      return parsed.url;
    }

    if (isVideoTaskFailed(parsed.status)) {
      throw new Error(`视频生成失败，任务状态：${parsed.status}`);
    }

    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error('视频生成超时，请稍后重试。');
};

const toDataUrl = (base64: string): string => {
  return `data:image/png;base64,${base64}`;
};

export const generateImage = async (prompt: string): Promise<MediaGenerationResult> => {
  const model = process.env.DOUBAO_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  const normalizedPrompt = buildMediaPrompt(prompt, 'image');

  const response = await callDoubaoApi<OpenAICompatibleImageResponse>(
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

export const generateVideo = async (
  prompt: string,
  options?: MediaGenerationOptions,
): Promise<MediaGenerationResult> => {
  const model = process.env.DOUBAO_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;
  const normalizedPrompt = buildMediaPrompt(prompt, 'video');

  options?.onStatus?.('正在创建视频生成任务...');

  const createResponse = await callDoubaoApi<VideoTaskResponse>(
    process.env.DOUBAO_VIDEO_ENDPOINT ?? VIDEO_TASK_CREATE_PATH,
    {
      model,
      content: buildVideoTaskContent(prompt),
    },
  );

  const parsedCreateResponse = parseVideoTaskResponse(createResponse);
  const taskId = parsedCreateResponse.taskId;

  if (!taskId) {
    throw new Error('视频任务创建失败，未返回任务 ID。');
  }

  if (parsedCreateResponse.url && isVideoTaskSucceeded(parsedCreateResponse.status)) {
    return {
      kind: 'video',
      url: parsedCreateResponse.url,
      prompt: normalizedPrompt,
      model,
    };
  }

  const videoUrl = await pollVideoTask(taskId, options);

  return {
    kind: 'video',
    url: videoUrl,
    prompt: normalizedPrompt,
    model,
  };
};
