import { generateImage, generateVideo } from '@/lib/multimodal-service';

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

const setupEnv = (): void => {
  process.env.DOUBAO_API_KEY = 'doubao-test-key';
  process.env.DOUBAO_BASE_URL = 'https://doubao.example.com/api/v3';
  process.env.DOUBAO_IMAGE_MODEL = 'doubao-seedream-4.0';
  process.env.DOUBAO_VIDEO_MODEL = 'seedance-1.5-pro';
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

  it('should generate video when nested url exists', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              output: {
                url: 'https://video.test/1.mp4',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock as typeof fetch;

    const result = await generateVideo('生成一个短视频');
    expect(result.kind).toBe('video');
    expect(result.url).toBe('https://video.test/1.mp4');
  });

  it('should use default video prompt when input is empty', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ url: 'https://video.test/default.mp4' }] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await generateVideo(' ');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const parsedBody = JSON.parse(init.body as string) as { prompt: string };
    expect(parsedBody.prompt).toBe('请生成一个简洁、现代风格的短视频');
  });

  it('should throw when video url is missing', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ task_id: '123' }] }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(generateVideo('video')).rejects.toThrow(
      '视频任务已创建，但当前响应未携带视频 URL，请检查视频接口是否支持同步返回。',
    );
  });
});
