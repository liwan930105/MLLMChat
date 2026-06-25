import { z } from 'zod';

import { MAX_MESSAGE_COUNT, MAX_MESSAGE_PARTS, MAX_TEXT_PART_LENGTH } from '@/lib/constants';
import type { ChatUIMessage } from '@/types/chat';

const uiMessagePartSchema = z
  .object({
    type: z.string().min(1).max(64),
    text: z.string().max(MAX_TEXT_PART_LENGTH).optional(),
  })
  .passthrough()
  .superRefine((part, context) => {
    if (part.type === 'text' && typeof part.text !== 'string') {
      context.addIssue({
        code: 'custom',
        message: 'text 类型的消息片段必须包含 text 字段',
      });
    }
  });

const chatUIMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(uiMessagePartSchema).min(1).max(MAX_MESSAGE_PARTS),
});

export const chatRequestSchema = z.object({
  id: z.string().max(128).optional(),
  messages: z.array(chatUIMessageSchema).min(1).max(MAX_MESSAGE_COUNT),
  intentHint: z.enum(['text', 'image', 'video']).optional(),
  systemPrompt: z.string().max(MAX_TEXT_PART_LENGTH).optional(),
});

export type ParsedChatRequest = z.infer<typeof chatRequestSchema>;

export const parseChatRequest = (body: unknown): ParsedChatRequest | null => {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }

  return parsed.data as ParsedChatRequest;
};

export const toChatUIMessages = (messages: ParsedChatRequest['messages']): ChatUIMessage[] => {
  return messages as ChatUIMessage[];
};
