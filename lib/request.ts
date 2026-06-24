export interface RequestErrorDetail {
  status: number;
  message: string;
}

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

const mergeHeaders = (headers?: HeadersInit): Headers => {
  const resolvedHeaders = new Headers(DEFAULT_HEADERS);
  const extraHeaders = new Headers(headers);

  extraHeaders.forEach((value, key) => {
    resolvedHeaders.set(key, value);
  });

  return resolvedHeaders;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const parsed = (await response.json()) as { error?: string };
    return parsed.error ?? '请求失败';
  } catch {
    return '请求失败';
  }
};

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
