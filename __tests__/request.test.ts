import { appFetch, requestJson } from '@/lib/request';

const originalFetch = global.fetch;

describe('request utility', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should send merged content-type header', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await appFetch('/api/test', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
      },
      body: '{}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledInit = fetchMock.mock.calls[0][1];
    expect(calledInit?.headers instanceof Headers).toBe(true);
    const headers = calledInit?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token');
  });

  it('should throw error when response is not ok', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'invalid request' }), { status: 400 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestJson('/api/fail')).rejects.toThrow('请求错误(400)：invalid request');
  });

  it('should parse json response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ value: 1 }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestJson<{ value: number }>('/api/success')).resolves.toEqual({ value: 1 });
  });

  it('should throw readable error when network request fails', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock as typeof fetch;

    await expect(appFetch('/api/network-error')).rejects.toThrow('请求发送失败：network down');
  });

  it('should use fallback message when thrown value is not Error', async () => {
    const fetchMock = jest.fn().mockRejectedValue('network failed');
    global.fetch = fetchMock as typeof fetch;

    await expect(appFetch('/api/network-error-2')).rejects.toThrow('请求发送失败：网络请求异常');
  });

  it('should fallback to generic message when error response is non-json', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('plain text error', { status: 500, statusText: 'Server Error' }));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestJson('/api/plain-error')).rejects.toThrow('请求错误(500)：请求失败');
  });

  it('should throw parse error when success response is not json', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('not-json', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestJson('/api/not-json')).rejects.toThrow('响应解析失败');
  });

  it('should use generic error message when error payload has no message', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestJson('/api/no-message')).rejects.toThrow('请求错误(500)：请求失败');
  });

  it('should handle non-error throw while parsing success response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => {
        throw 'parse failed';
      },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(requestJson('/api/non-error-throw')).rejects.toThrow('响应解析失败：响应解析失败');
  });
});
