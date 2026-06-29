import {
  detectIntentFromText,
  extractMediaPrompt,
  getLatestUserText,
  resolveMediaPrompt,
} from '@/lib/chat-intent';
import type { ChatUIMessage } from '@/types/chat';

const buildUserMessage = (id: string, text: string): ChatUIMessage => {
  return {
    id,
    role: 'user',
    parts: [
      {
        type: 'text',
        text,
      },
    ],
  };
};

describe('chat intent', () => {
  it('should detect image intent from chinese keyword', () => {
    expect(detectIntentFromText('请帮我生成图片')).toBe('image');
  });

  it('should detect image intent from help generate one image phrase', () => {
    expect(detectIntentFromText('帮我生成一张图')).toBe('image');
  });

  it('should detect image intent from draw request', () => {
    expect(detectIntentFromText('帮我画一张猫')).toBe('image');
  });

  it('should detect video intent from generate video phrase', () => {
    expect(detectIntentFromText('生成视频')).toBe('video');
  });

  it('should detect video intent from make video phrase', () => {
    expect(detectIntentFromText('做一个视频')).toBe('video');
  });

  it('should detect video intent from help generate phrase', () => {
    expect(detectIntentFromText('帮我生成一个视频')).toBe('video');
  });

  it('should detect video intent from descriptive natural language', () => {
    expect(detectIntentFromText('做一个夏季日落的视频')).toBe('video');
  });

  it('should detect video intent from generate descriptive phrase', () => {
    expect(detectIntentFromText('生成夏季海边浪花的视频')).toBe('video');
  });

  it('should extract video prompt from descriptive natural language', () => {
    expect(extractMediaPrompt('做一个夏季日落的视频', 'video')).toBe('夏季日落');
  });

  it('should detect image intent from descriptive natural language', () => {
    expect(detectIntentFromText('画一张夏季日落的图片')).toBe('image');
  });

  it('should extract image prompt from descriptive natural language', () => {
    expect(extractMediaPrompt('画一张夏季日落的图片', 'image')).toBe('夏季日落');
  });

  it('should detect image intent from make descriptive image phrase', () => {
    expect(detectIntentFromText('做一个猫咪的图片')).toBe('image');
  });

  it('should extract image prompt from make descriptive image phrase', () => {
    expect(extractMediaPrompt('做一个猫咪的图片', 'image')).toBe('猫咪');
  });

  it('should not detect video intent from casual mention', () => {
    expect(detectIntentFromText('make a short video about ocean')).toBe('text');
  });

  it('should fallback to text intent', () => {
    expect(detectIntentFromText('你好，帮我总结这段话')).toBe('text');
  });

  it('should extract image prompt from natural language', () => {
    expect(extractMediaPrompt('帮我画一张 sunset', 'image')).toBe('sunset');
  });

  it('should extract image prompt from explicit content suffix', () => {
    expect(extractMediaPrompt('生成图片，内容是赛博朋克城市', 'image')).toBe('赛博朋克城市');
  });

  it('should extract video prompt from natural language', () => {
    expect(extractMediaPrompt('做一个视频，无人机穿越峡谷', 'video')).toBe('无人机穿越峡谷');
  });

  it('should resolve media prompt with fallback', () => {
    expect(resolveMediaPrompt('生成视频，内容是海浪', 'video')).toBe('海浪');
  });

  it('should read latest user text from messages', () => {
    const messages: ChatUIMessage[] = [
      buildUserMessage('u-1', '第一条'),
      {
        id: 'a-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '收到',
          },
        ],
      },
      buildUserMessage('u-2', '最后一条用户消息'),
    ];

    expect(getLatestUserText(messages)).toBe('最后一条用户消息');
  });

  it('should return empty text when user message is missing', () => {
    const messages: ChatUIMessage[] = [
      {
        id: 'a-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '仅助手消息',
          },
        ],
      },
    ];

    expect(getLatestUserText(messages)).toBe('');
  });

  it('should skip empty user text and fallback to earlier user message', () => {
    const messages: ChatUIMessage[] = [
      buildUserMessage('u-1', '可用内容'),
      buildUserMessage('u-2', '   '),
    ];

    expect(getLatestUserText(messages)).toBe('可用内容');
  });
});
