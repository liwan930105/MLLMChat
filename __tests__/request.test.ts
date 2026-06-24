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
});
