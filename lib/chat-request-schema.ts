import { z } from 'zod';

import { MAX_MESSAGE_COUNT, MAX_MESSAGE_PARTS, MAX_TEXT_PART_LENGTH } from '@/lib/constants';
import type { ChatUIMessage } from '@/types/chat';

/**
 * AI SDK UIMessage 单个消息片段的 Zod schema。
 *
 * passthrough 用于保留 AI SDK 自带或未来新增的字段；这里只强约束本接口关心的 type/text。
 */
const uiMessagePartSchema = z
  .object({
    type: z.string().min(1).max(64),
    text: z.string().max(MAX_TEXT_PART_LENGTH).optional(),
  })
  .passthrough()
  .superRefine((part, context) => {
    if (part.type === 'text' && typeof part.text !== 'string') {
      // text 片段没有 text 字段时，后续模型消息转换会缺少必要内容，因此提前拒绝。
      context.addIssue({
        code: 'custom',
        message: 'text 类型的消息片段必须包含 text 字段',
      });
    }
  });

/**
 * 单条聊天消息 schema。
 *
 * 限制 parts 数量可防止恶意构造超大消息数组造成服务端压力。
 */
const chatUIMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(uiMessagePartSchema).min(1).max(MAX_MESSAGE_PARTS),
});

/**
 * POST /api/ai-sdk/multimodal 请求体 schema。
 */
export const chatRequestSchema = z.object({
  id: z.string().max(128).optional(),
  messages: z.array(chatUIMessageSchema).min(1).max(MAX_MESSAGE_COUNT),
  intentHint: z.enum(['text', 'image', 'video']).optional(),
  systemPrompt: z.string().max(MAX_TEXT_PART_LENGTH).optional(),
});

/** 校验通过后的聊天请求体类型。 */
export type ParsedChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * 解析并校验聊天请求体。
 *
 * @param body API 路由收到的未知请求体。
 * @returns 校验成功的结构化请求；失败时返回 null 交给路由返回 400。
 */
export const parseChatRequest = (body: unknown): ParsedChatRequest | null => {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }

  return parsed.data as ParsedChatRequest;
};

/**
 * 将校验后的消息列表收窄为应用内部 ChatUIMessage 类型。
 *
 * @param messages Zod 校验后的消息数组。
 * @returns 可传给 AI SDK 与业务函数的消息数组。
 */
export const toChatUIMessages = (messages: ParsedChatRequest['messages']): ChatUIMessage[] => {
  return messages as ChatUIMessage[];
};
