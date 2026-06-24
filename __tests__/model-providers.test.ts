import { getDeepSeekLanguageModel, getDoubaoConfig } from '@/lib/model-providers';

const ORIGINAL_ENV = process.env;

describe('model providers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should throw when deepseek api key is missing', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(() => getDeepSeekLanguageModel()).toThrow('缺少环境变量：DEEPSEEK_API_KEY');
  });

  it('should create deepseek language model with env config', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_BASE_URL = 'https://example.com/v1';
    process.env.DEEPSEEK_TEXT_MODEL = 'deepseek-v4-pro';

    const model = getDeepSeekLanguageModel();
    expect(typeof model).toBe('object');
  });

  it('should read doubao config from env', () => {
    process.env.DOUBAO_API_KEY = 'doubao-key';
    process.env.DOUBAO_BASE_URL = 'https://doubao.example.com';

    expect(getDoubaoConfig()).toEqual({
      apiKey: 'doubao-key',
      baseUrl: 'https://doubao.example.com',
    });
  });

  it('should fallback to default model settings when optional env is missing', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.DEEPSEEK_TEXT_MODEL;

    const model = getDeepSeekLanguageModel();
    expect(typeof model).toBe('object');
  });

  it('should throw when doubao api key is missing', () => {
    delete process.env.DOUBAO_API_KEY;
    expect(() => getDoubaoConfig()).toThrow('缺少环境变量：DOUBAO_API_KEY');
  });

  it('should fallback to default doubao base url', () => {
    process.env.DOUBAO_API_KEY = 'doubao-key';
    delete process.env.DOUBAO_BASE_URL;

    expect(getDoubaoConfig().baseUrl).toBe('https://ark.cn-beijing.volces.com/api/v3');
  });
});
