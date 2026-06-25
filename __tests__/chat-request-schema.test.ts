import { parseChatRequest } from '@/lib/chat-request-schema';

describe('chat request schema', () => {
  it('should accept valid chat request', () => {
    const parsed = parseChatRequest({
      messages: [
        {
          id: 'u-1',
          role: 'user',
          parts: [{ type: 'text', text: '你好' }],
        },
      ],
      intentHint: 'text',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.messages).toHaveLength(1);
  });

  it('should reject request without messages', () => {
    expect(parseChatRequest({ messages: [] })).toBeNull();
  });

  it('should reject text part without text field', () => {
    expect(
      parseChatRequest({
        messages: [
          {
            id: 'u-1',
            role: 'user',
            parts: [{ type: 'text' }],
          },
        ],
      }),
    ).toBeNull();
  });

  it('should reject overly long text part', () => {
    expect(
      parseChatRequest({
        messages: [
          {
            id: 'u-1',
            role: 'user',
            parts: [{ type: 'text', text: 'a'.repeat(8001) }],
          },
        ],
      }),
    ).toBeNull();
  });

  it('should accept custom system prompt', () => {
    const parsed = parseChatRequest({
      messages: [
        {
          id: 'u-1',
          role: 'user',
          parts: [{ type: 'text', text: '你好' }],
        },
      ],
      systemPrompt: '你是代码助手',
    });

    expect(parsed?.systemPrompt).toBe('你是代码助手');
  });
});
