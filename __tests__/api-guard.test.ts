import type { NextApiRequest } from 'next';

import {
  checkApiKey,
  checkRateLimit,
  checkRequestBodySize,
  enforceChatApiGuard,
  resetRateLimitBucketsForTest,
} from '@/lib/api-guard';
import { CHAT_RATE_LIMIT_MAX } from '@/lib/constants';

const ORIGINAL_ENV = process.env;

const buildRequest = (overrides: Partial<NextApiRequest> = {}): NextApiRequest => {
  return {
    headers: {},
    socket: {
      remoteAddress: '127.0.0.1',
    },
    ...overrides,
  } as NextApiRequest;
};

describe('api guard', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetRateLimitBucketsForTest();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should reject oversized request body', () => {
    const result = checkRequestBodySize(
      buildRequest({
        headers: {
          'content-length': String(1024 * 1024),
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });

  it('should require api key when CHAT_API_KEY is configured', () => {
    process.env.CHAT_API_KEY = 'secret-key';

    const unauthorized = checkApiKey(buildRequest());
    expect(unauthorized.ok).toBe(false);

    const authorized = checkApiKey(
      buildRequest({
        headers: {
          'x-chat-api-key': 'secret-key',
        },
      }),
    );
    expect(authorized.ok).toBe(true);
  });

  it('should rate limit repeated requests from same ip', () => {
    for (let index = 0; index < CHAT_RATE_LIMIT_MAX; index += 1) {
      expect(checkRateLimit('10.0.0.1').ok).toBe(true);
    }

    const blocked = checkRateLimit('10.0.0.1');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(429);
    }
  });

  it('should allow requests when guard checks pass', () => {
    const result = enforceChatApiGuard(
      buildRequest({
        headers: {
          'content-length': '128',
        },
      }),
    );

    expect(result.ok).toBe(true);
  });
});
