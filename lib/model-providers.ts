import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DOUBAO_BASE_URL,
  DEFAULT_TEXT_MODEL,
} from '@/lib/constants';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
}

const readRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
};

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

export const getDoubaoConfig = (): OpenAICompatibleConfig => {
  const apiKey = readRequiredEnv('DOUBAO_API_KEY');
  const baseUrl = process.env.DOUBAO_BASE_URL ?? DEFAULT_DOUBAO_BASE_URL;
  return {
    apiKey,
    baseUrl,
  };
};
