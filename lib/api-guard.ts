import type { NextApiRequest } from 'next';

import {
  CHAT_RATE_LIMIT_MAX,
  CHAT_RATE_LIMIT_WINDOW_MS,
  MAX_REQUEST_BODY_BYTES,
} from '@/lib/constants';

export interface ApiGuardFailure {
  ok: false;
  status: number;
  message: string;
}

export interface ApiGuardSuccess {
  ok: true;
}

export type ApiGuardResult = ApiGuardFailure | ApiGuardSuccess;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

const getClientIp = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0];
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return req.socket.remoteAddress ?? 'unknown';
};

const pruneExpiredBuckets = (now: number): void => {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
};

export const checkRequestBodySize = (req: NextApiRequest): ApiGuardResult => {
  const contentLengthHeader = req.headers['content-length'];
  if (typeof contentLengthHeader !== 'string') {
    return { ok: true };
  }

  const contentLength = Number.parseInt(contentLengthHeader, 10);
  if (Number.isNaN(contentLength)) {
    return { ok: true };
  }

  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      message: '请求体过大',
    };
  }

  return { ok: true };
};

export const checkApiKey = (req: NextApiRequest): ApiGuardResult => {
  const expectedKey = process.env.CHAT_API_KEY;
  if (!expectedKey) {
    return { ok: true };
  }

  const headerKey = req.headers['x-chat-api-key'];
  const providedKey = typeof headerKey === 'string' ? headerKey : '';

  if (providedKey !== expectedKey) {
    return {
      ok: false,
      status: 401,
      message: '未授权访问',
    };
  }

  return { ok: true };
};

export const checkRateLimit = (clientIp: string): ApiGuardResult => {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const bucket = rateLimitBuckets.get(clientIp);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(clientIp, {
      count: 1,
      resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (bucket.count >= CHAT_RATE_LIMIT_MAX) {
    return {
      ok: false,
      status: 429,
      message: '请求过于频繁，请稍后再试',
    };
  }

  bucket.count += 1;
  return { ok: true };
};

export const enforceChatApiGuard = (req: NextApiRequest): ApiGuardResult => {
  const sizeResult = checkRequestBodySize(req);
  if (!sizeResult.ok) {
    return sizeResult;
  }

  const authResult = checkApiKey(req);
  if (!authResult.ok) {
    return authResult;
  }

  return checkRateLimit(getClientIp(req));
};

export const resetRateLimitBucketsForTest = (): void => {
  rateLimitBuckets.clear();
};
