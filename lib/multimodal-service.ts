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

/**
 * OpenAI 兼容图片接口的单条图片数据。
 */
interface OpenAICompatibleImageItem {
  /** 上游直接返回的图片 URL。 */
  url?: string;
  /** 上游返回的 base64 图片内容，作为没有 URL 时的兜底。 */
  b64_json?: string;
}

/**
 * OpenAI 兼容图片接口响应。
 */
interface OpenAICompatibleImageResponse {
  /** 生成图片列表，本应用只取第一张。 */
  data?: OpenAICompatibleImageItem[];
}

/**
 * 视频任务中的文本内容片段。
 */
interface VideoTaskTextContent {
  /** 豆包视频任务要求的内容类型标识。 */
  type: 'text';
  /** 视频生成提示词和附加参数。 */
  text: string;
}

/**
 * 视频任务中的参考图片内容片段。
 */
interface VideoTaskImageContent {
  /** 豆包视频任务要求的图片输入类型标识。 */
  type: 'image_url';
  /** 参考图片地址包装对象。 */
  image_url: {
    /** 可被上游访问的参考图片 URL。 */
    url: string;
  };
}

/** 视频任务支持的内容片段联合类型。 */
type VideoTaskContentItem = VideoTaskTextContent | VideoTaskImageContent;

/**
 * 豆包视频任务创建或查询接口的关键响应字段。
 */
interface VideoTaskResponse {
  /** 异步任务 ID，用于轮询查询视频生成进度。 */
  id?: string;
  /** 任务状态，例如 succeeded、failed、processing 等。 */
  status?: string;
  /** 任务完成后返回的内容对象。 */
  content?: {
    /** 生成完成的视频地址。 */
    video_url?: string;
  };
}

/** 便于安全读取 JSON 响应的对象类型。 */
type JsonRecord = Record<string, unknown>;

/**
 * 媒体生成过程的可选回调。
 */
export interface MediaGenerationOptions {
  /** 生成流程中的状态通知，供 API 路由继续推送给前端。 */
  onStatus?: (message: string) => void;
}

/**
 * 判断未知值是否为对象，避免直接读取上游响应导致运行时异常。
 *
 * @param value 任意 JSON 值。
 * @returns value 是否可按普通对象读取。
 */
const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null;
};

/**
 * 等待指定毫秒数。
 *
 * @param durationMs 等待时间，单位毫秒。
 * @returns 在等待结束后 resolve 的 Promise。
 */
const sleep = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

/**
 * 构建媒体生成提示词。
 *
 * @param prompt 用户输入清洗后的 prompt。
 * @param kind 媒体类型，用于选择空 prompt 的兜底文案。
 * @returns 非空媒体 prompt。
 */
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

/**
 * 安全读取非空字符串。
 *
 * @param value 上游响应中的未知字段。
 * @returns 非空字符串；字段缺失或为空时返回 null。
 */
const readNonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};

/**
 * 解析豆包视频任务响应。
 *
 * @param response 上游创建或查询任务返回的原始 JSON。
 * @returns 标准化后的视频 URL、任务 ID 与状态。
 *
 * 边界情况：
 * - 上游字段缺失时返回 null，而不是抛出异常。
 * - 创建接口可能只返回 taskId，查询接口才返回 video_url。
 */
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

/**
 * 判断视频任务是否已经失败。
 *
 * @param status 上游返回的任务状态。
 * @returns 是否属于不可继续轮询的失败态。
 */
const isVideoTaskFailed = (status: string | null): boolean => {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toLowerCase();
  return ['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(normalizedStatus);
};

/**
 * 判断视频任务是否成功完成。
 *
 * @param status 上游返回的任务状态。
 * @returns 是否属于成功态。
 */
const isVideoTaskSucceeded = (status: string | null): boolean => {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toLowerCase();
  return ['succeeded', 'completed', 'success', 'done'].includes(normalizedStatus);
};

/**
 * 从非 2xx 响应中提取尽量友好的错误文案。
 *
 * @param response fetch 返回的失败响应。
 * @returns 上游 error.message、error 字符串或 HTTP statusText。
 */
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

/**
 * 带超时控制的 fetch。
 *
 * @param endpoint 上游完整接口地址。
 * @param init fetch 请求配置。
 * @returns fetch Response。
 */
const fetchWithTimeout = async (endpoint: string, init: RequestInit): Promise<Response> => {
  const timeoutMs = Number(process.env.UPSTREAM_FETCH_TIMEOUT_MS ?? UPSTREAM_FETCH_TIMEOUT_MS);
  return fetch(endpoint, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
};

/**
 * 调用豆包 OpenAI 兼容接口。
 *
 * @param path 基于 DOUBAO_BASE_URL 的接口路径。
 * @param payload POST 请求体；GET 请求可传 null。
 * @param method HTTP 方法，默认为 POST。
 * @returns 按调用方指定类型解析后的 JSON。
 * @throws 当上游返回非 2xx 时抛出包含状态码和错误详情的异常。
 */
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

/**
 * 构建视频任务查询路径。
 *
 * @param taskId 上游返回的视频任务 ID。
 * @returns 替换 {taskId} 后的查询路径。
 */
const buildVideoTaskQueryPath = (taskId: string): string => {
  const template = process.env.DOUBAO_VIDEO_POLL_PATH ?? VIDEO_TASK_QUERY_PATH_TEMPLATE;
  return template.replace('{taskId}', encodeURIComponent(taskId));
};

/**
 * 构建视频任务 content 数组。
 *
 * @param prompt 视频描述 prompt。
 * @returns 豆包视频任务接口需要的文本片段和可选参考图片段。
 */
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
    // 参考图是可选增强输入，只有配置了可访问 URL 时才随任务提交。
    content.push({
      type: 'image_url',
      image_url: {
        url: referenceImageUrl,
      },
    });
  }

  return content;
};

/**
 * 轮询视频任务直到成功、失败或超时。
 *
 * @param taskId 创建视频任务后得到的任务 ID。
 * @param options 状态回调配置。
 * @returns 成功生成后的视频 URL。
 * @throws 当任务失败或超过最大轮询次数时抛出异常。
 */
const pollVideoTask = async (taskId: string, options?: MediaGenerationOptions): Promise<string> => {
  const pollIntervalMs = Number(process.env.VIDEO_POLL_INTERVAL_MS ?? VIDEO_POLL_INTERVAL_MS);
  const maxAttempts = Number(process.env.VIDEO_POLL_MAX_ATTEMPTS ?? VIDEO_POLL_MAX_ATTEMPTS);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options?.onStatus?.(`视频生成中，正在查询任务进度（${attempt}/${maxAttempts}）...`);

    const pollResponse = await callDoubaoApi<VideoTaskResponse>(buildVideoTaskQueryPath(taskId), null, 'GET');
    const parsed = parseVideoTaskResponse(pollResponse);

    if (parsed.url && (!parsed.status || isVideoTaskSucceeded(parsed.status))) {
      // 有些兼容接口可能不返回状态，只要 URL 可用也视为成功。
      return parsed.url;
    }

    if (isVideoTaskFailed(parsed.status)) {
      throw new Error(`视频生成失败，任务状态：${parsed.status}`);
    }

    if (attempt < maxAttempts) {
      // 不是最后一次才等待，避免超时前多延迟一个轮询间隔。
      await sleep(pollIntervalMs);
    }
  }

  throw new Error('视频生成超时，请稍后重试。');
};

/**
 * 将 base64 图片内容包装成浏览器可展示的 data URL。
 *
 * @param base64 纯 base64 图片字符串。
 * @returns PNG data URL。
 */
const toDataUrl = (base64: string): string => {
  return `data:image/png;base64,${base64}`;
};

/**
 * 调用豆包图片生成接口。
 *
 * @param prompt 用户媒体提示词。
 * @returns 标准化后的图片生成结果。
 * @throws 当上游没有返回 URL 或 base64 内容时抛出异常。
 */
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
  // 兼容 URL 与 base64 两种图片返回形式，前端统一按 src 渲染。
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

/**
 * 调用豆包视频生成接口。
 *
 * @param prompt 用户媒体提示词。
 * @param options 可选状态回调，用于把任务进度传回前端。
 * @returns 标准化后的视频生成结果。
 * @throws 当任务创建失败、轮询失败或超时时抛出异常。
 */
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
    // 少数上游实现可能在创建任务时直接返回成片，命中时无需再轮询。
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
