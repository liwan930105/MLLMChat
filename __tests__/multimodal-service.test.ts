import { generateImage, generateVideo, parseVideoTaskResponse } from '@/lib/multimodal-service';

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

const setupEnv = (): void => {
  process.env.DOUBAO_API_KEY = 'doubao-test-key';
  process.env.DOUBAO_BASE_URL = 'https://doubao.example.com/api/v3';
  process.env.DOUBAO_IMAGE_MODEL = 'doubao-seedream-4.0';
  process.env.DOUBAO_VIDEO_MODEL = 'doubao-seedance-1-5-pro-251215';
};

describe('multimodal service', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    setupEnv();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should generate image from url response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ url: 'https://img.test/1.png' }] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await generateImage('画一个极简风格图标');

    expect(result.kind).toBe('image');
    expect(result.url).toBe('https://img.test/1.png');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should use default image prompt when input is empty', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ url: 'https://img.test/default.png' }] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await generateImage('   ');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const parsedBody = JSON.parse(init.body as string) as { prompt: string };
    expect(parsedBody.prompt).toBe('请生成一张简洁、现代风格的插画');
  });

  it('should generate image from base64 response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: 'abc' }] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await generateImage('生成图片');
    expect(result.url).toBe('data:image/png;base64,abc');
  });

  it('should throw when image response has no media url', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{}] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateImage('test')).rejects.toThrow('图片生成完成，但未返回可用 URL。');
  });

  it('should throw detailed error when upstream returns error status', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'bad request' }), { status: 400, statusText: 'Bad Request' }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateImage('test')).rejects.toThrow('多模态接口调用失败(400)：bad request');
  });

  it('should parse nested error message object from upstream', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: { message: 'detail message' } }), { status: 422 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateImage('test')).rejects.toThrow('多模态接口调用失败(422)：detail message');
  });

  it('should fallback to status text when upstream error body is invalid', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response('not-json', { status: 503, statusText: 'Service Unavailable' }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateImage('test')).rejects.toThrow('多模态接口调用失败(503)：Service Unavailable');
  });

  it('should create video task with official content payload', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cgt-task-123', status: 'queued' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cgt-task-123',
            status: 'succeeded',
            content: {
              video_url: 'https://video.test/1.mp4',
            },
          }),
          { status: 200 },
        ),
      );
    global.fetch = fetchMock as typeof fetch;

    const result = await generateVideo('无人机穿越障碍');
    expect(result.kind).toBe('video');
    expect(result.url).toBe('https://video.test/1.mp4');

    const createInit = fetchMock.mock.calls[0][1] as RequestInit;
    const createBody = JSON.parse(createInit.body as string) as {
      model: string;
      content: Array<{ type: string; text?: string }>;
    };
    expect(createBody.model).toBe('doubao-seedance-1-5-pro-251215');
    expect(createBody.content[0]).toEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('无人机穿越障碍'),
      }),
    );
    expect(fetchMock.mock.calls[1][1]?.method).toBe('GET');
  });

  it('should use default video prompt when input is empty', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cgt-task-456', status: 'queued' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cgt-task-456',
            status: 'succeeded',
            content: { video_url: 'https://video.test/default.mp4' },
          }),
          { status: 200 },
        ),
      );
    global.fetch = fetchMock as typeof fetch;

    await generateVideo(' ');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const parsedBody = JSON.parse(init.body as string) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(parsedBody.content[0].text).toContain('请生成一个简洁、现代风格的短视频');
  });

  it('should include reference image when configured', async () => {
    process.env.DOUBAO_VIDEO_REFERENCE_IMAGE_URL = 'https://img.test/reference.png';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cgt-task-789', status: 'queued' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cgt-task-789',
            status: 'succeeded',
            content: { video_url: 'https://video.test/i2v.mp4' },
          }),
          { status: 200 },
        ),
      );
    global.fetch = fetchMock as typeof fetch;

    await generateVideo('图生视频测试');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const parsedBody = JSON.parse(init.body as string) as {
      content: Array<{ type: string; image_url?: { url: string } }>;
    };
    expect(parsedBody.content[1]).toEqual({
      type: 'image_url',
      image_url: {
        url: 'https://img.test/reference.png',
      },
    });
  });

  it('should poll video task until succeeded', async () => {
    process.env.VIDEO_POLL_MAX_ATTEMPTS = '3';
    process.env.VIDEO_POLL_INTERVAL_MS = '1';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cgt-task-123', status: 'queued' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cgt-task-123', status: 'running' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cgt-task-123',
            status: 'succeeded',
            content: { video_url: 'https://video.test/polled.mp4' },
          }),
          { status: 200 },
        ),
      );
    global.fetch = fetchMock as typeof fetch;

    const result = await generateVideo('生成一个短视频');
    expect(result.url).toBe('https://video.test/polled.mp4');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should throw when video polling times out', async () => {
    process.env.VIDEO_POLL_MAX_ATTEMPTS = '2';
    process.env.VIDEO_POLL_INTERVAL_MS = '1';

    const fetchMock = jest.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return new Response(JSON.stringify({ id: 'cgt-123', status: 'running' }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'cgt-123', status: 'queued' }), { status: 200 });
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(generateVideo('video')).rejects.toThrow('视频生成超时，请稍后重试。');
  });

  it('should throw when create task response has no id', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'queued' }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateVideo('video')).rejects.toThrow('视频任务创建失败，未返回任务 ID。');
  });

  it('should parse video task response from official structure', () => {
    expect(
      parseVideoTaskResponse({
        id: 'cgt-2025',
        status: 'succeeded',
        content: { video_url: 'https://video.test/1.mp4' },
      }).url,
    ).toBe('https://video.test/1.mp4');
    expect(parseVideoTaskResponse({ id: 'cgt-abc', status: 'queued' }).taskId).toBe('cgt-abc');
    expect(parseVideoTaskResponse({ metadata: { video_url: 'https://wrong.test/x.mp4' } }).url).toBeNull();
  });
});
