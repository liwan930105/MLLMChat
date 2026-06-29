/**
 * requestJson 抛错时保留的响应错误详情。
 */
export interface RequestErrorDetail {
  /** HTTP 状态码。 */
  status: number;
  /** 从响应体中解析出的错误信息。 */
  message: string;
}

/** 应用内 JSON 请求的默认请求头。 */
const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

/**
 * 构建前端可用的 API 鉴权请求头。
 *
 * @returns 配置 NEXT_PUBLIC_CHAT_API_KEY 时返回 x-chat-api-key，否则返回空对象。
 *
 * 注意：
 * NEXT_PUBLIC_ 前缀会暴露给浏览器，因此它只适合作为轻量访问门槛，
 * 真正的服务端密钥仍应使用不带 NEXT_PUBLIC_ 的环境变量。
 */
const buildAuthHeaders = (): HeadersInit => {
  const chatApiKey = process.env.NEXT_PUBLIC_CHAT_API_KEY;
  if (!chatApiKey) {
    return {};
  }

  return {
    'x-chat-api-key': chatApiKey,
  };
};

/**
 * 合并默认请求头、鉴权头和调用方自定义请求头。
 *
 * @param headers 调用方传入的可选请求头。
 * @returns Headers 实例，后传入的自定义请求头优先级最高。
 */
const mergeHeaders = (headers?: HeadersInit): Headers => {
  const resolvedHeaders = new Headers(DEFAULT_HEADERS);
  const authHeaders = new Headers(buildAuthHeaders());
  const extraHeaders = new Headers(headers);

  authHeaders.forEach((value, key) => {
    resolvedHeaders.set(key, value);
  });

  extraHeaders.forEach((value, key) => {
    resolvedHeaders.set(key, value);
  });

  return resolvedHeaders;
};

/**
 * 从失败响应中读取 API 错误文案。
 *
 * @param response fetch 返回的非 2xx 响应。
 * @returns 响应体中的 error 字段；解析失败时返回通用文案。
 */
const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const parsed = (await response.json()) as { error?: string };
    return parsed.error ?? '请求失败';
  } catch {
    return '请求失败';
  }
};

/**
 * 应用统一 fetch 封装。
 *
 * @param input fetch 的地址或 Request 对象。
 * @param init fetch 配置。
 * @returns 原始 Response，供 AI SDK transport 等需要流式响应的调用方使用。
 * @throws 网络层失败时抛出带中文上下文的 Error。
 */
export const appFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    const mergedInit: RequestInit = {
      ...init,
      headers: mergeHeaders(init?.headers),
    };
    return await fetch(input, mergedInit);
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络请求异常';
    throw new Error(`请求发送失败：${message}`);
  }
};

/**
 * 请求 JSON 接口并解析响应体。
 *
 * @param url 请求地址。
 * @param init fetch 配置。
 * @returns 解析后的 JSON 数据。
 * @throws 非 2xx 响应或 JSON 解析失败时抛出异常。
 */
export const requestJson = async <TResponse>(url: string, init?: RequestInit): Promise<TResponse> => {
  const response = await appFetch(url, init);

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    const detail: RequestErrorDetail = {
      status: response.status,
      message,
    };
    throw new Error(`请求错误(${detail.status})：${detail.message}`);
  }

  try {
    return (await response.json()) as TResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : '响应解析失败';
    throw new Error(`响应解析失败：${message}`);
  }
};
