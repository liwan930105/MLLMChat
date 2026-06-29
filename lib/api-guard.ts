import type { NextApiRequest } from 'next';

import {
  CHAT_RATE_LIMIT_MAX,
  CHAT_RATE_LIMIT_WINDOW_MS,
  MAX_REQUEST_BODY_BYTES,
} from '@/lib/constants';

/**
 * API 防护失败结果。
 */
export interface ApiGuardFailure {
  /** 固定为 false，便于调用方用判别联合类型分支处理。 */
  ok: false;
  /** 应返回给客户端的 HTTP 状态码。 */
  status: number;
  /** 面向用户展示的错误文案。 */
  message: string;
}

/**
 * API 防护成功结果。
 */
export interface ApiGuardSuccess {
  /** 固定为 true，表示当前检查通过。 */
  ok: true;
}

/** API 防护统一返回类型。 */
export type ApiGuardResult = ApiGuardFailure | ApiGuardSuccess;

/**
 * 单个客户端 IP 的限流桶。
 */
interface RateLimitBucket {
  /** 当前窗口内已接收的请求数。 */
  count: number;
  /** 当前限流窗口结束时间戳。 */
  resetAt: number;
}

/**
 * 进程内限流状态。
 *
 * 该 Map 适合轻量防刷；在无状态 Serverless 多实例环境中不能作为强一致限流方案。
 */
const rateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * 从 Next.js API 请求中提取客户端 IP。
 *
 * @param req Next.js Pages API 请求对象。
 * @returns 优先级为 x-forwarded-for、x-real-ip、socket.remoteAddress 的 IP 字符串。
 */
const getClientIp = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    // x-forwarded-for 可能是代理链，首个 IP 通常代表原始客户端。
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

/**
 * 删除已过期的限流桶，避免 Map 随访问 IP 数持续增长。
 *
 * @param now 当前时间戳。
 */
const pruneExpiredBuckets = (now: number): void => {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
};

/**
 * 检查请求体大小。
 *
 * @param req Next.js Pages API 请求对象。
 * @returns 通过时 ok=true；超过 MAX_REQUEST_BODY_BYTES 时返回 413。
 */
export const checkRequestBodySize = (req: NextApiRequest): ApiGuardResult => {
  const contentLengthHeader = req.headers['content-length'];
  if (typeof contentLengthHeader !== 'string') {
    // 没有 content-length 时无法预判大小，交给后续 JSON 解析与 schema 校验处理。
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

/**
 * 校验可选的聊天 API Key。
 *
 * @param req Next.js Pages API 请求对象。
 * @returns 未配置 CHAT_API_KEY 时默认放行；配置后缺失或不匹配返回 401。
 */
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

/**
 * 按客户端 IP 执行内存级固定窗口限流。
 *
 * @param clientIp 客户端 IP。
 * @returns 通过时 ok=true；超出窗口内最大请求数时返回 429。
 */
export const checkRateLimit = (clientIp: string): ApiGuardResult => {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const bucket = rateLimitBuckets.get(clientIp);
  if (!bucket || bucket.resetAt <= now) {
    // 新 IP 或窗口已过期时重建桶，窗口从当前请求开始计算。
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

/**
 * 串行执行聊天 API 的全部防护检查。
 *
 * @param req Next.js Pages API 请求对象。
 * @returns 第一个失败检查的结果；全部通过时返回 ok=true。
 */
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

/**
 * 测试辅助函数：清空进程内限流桶，避免不同测试用例互相影响。
 */
export const resetRateLimitBucketsForTest = (): void => {
  rateLimitBuckets.clear();
};
