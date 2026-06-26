import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DOUBAO_BASE_URL,
  DEFAULT_TEXT_MODEL,
} from '@/lib/constants';

/**
 * OpenAI 兼容模型服务的基础配置。
 */
export interface OpenAICompatibleConfig {
  /** 服务端私密 API Key，不应暴露到浏览器。 */
  apiKey: string;
  /** OpenAI 兼容接口的基础地址。 */
  baseUrl: string;
}

/**
 * 读取必需环境变量。
 *
 * @param name 环境变量名称。
 * @returns 环境变量值。
 * @throws 当变量不存在或为空时抛出异常，让 API 路由尽早暴露配置问题。
 */
const readRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
};

/**
 * 创建 DeepSeek 文本对话模型。
 *
 * 环境变量：
 * - DEEPSEEK_API_KEY：必填，DeepSeek 服务端密钥。
 * - DEEPSEEK_BASE_URL：可选，默认使用官方 OpenAI 兼容地址。
 * - DEEPSEEK_TEXT_MODEL：可选，默认使用 DEFAULT_TEXT_MODEL。
 *
 * @returns 可传给 AI SDK streamText 的语言模型实例。
 */
export const getDeepSeekLanguageModel = (): LanguageModel => {
  const apiKey = readRequiredEnv('DEEPSEEK_API_KEY');
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL;
  const modelId = process.env.DEEPSEEK_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
  const provider = createOpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  // DeepSeek 仅兼容 OpenAI Chat Completions，需使用 .chat() 而非默认的 Responses API
  return provider.chat(modelId);
};

/**
 * 读取豆包多模态接口配置。
 *
 * 环境变量：
 * - DOUBAO_API_KEY：必填，图片和视频接口共用。
 * - DOUBAO_BASE_URL：可选，默认指向火山方舟 OpenAI 兼容地址。
 *
 * @returns 豆包接口 API Key 与基础 URL。
 */
export const getDoubaoConfig = (): OpenAICompatibleConfig => {
  const apiKey = readRequiredEnv('DOUBAO_API_KEY');
  const baseUrl = process.env.DOUBAO_BASE_URL ?? DEFAULT_DOUBAO_BASE_URL;
  return {
    apiKey,
    baseUrl,
  };
};
