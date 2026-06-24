import {
  convertToModelMessages,
  createUIMessageStream,
  generateId,
  pipeUIMessageStreamToResponse,
  streamText,
} from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { detectIntentFromText, getLatestUserText } from '@/lib/chat-intent';
import { MAX_GENERATION_TOKENS } from '@/lib/constants';
import { getDeepSeekLanguageModel } from '@/lib/model-providers';
import { generateImage, generateVideo } from '@/lib/multimodal-service';
import type { ChatIntentType, ChatRequestBody, ChatUIMessage } from '@/types/chat';

const METHOD_NOT_ALLOWED = '仅支持 POST 请求';

const chatRequestSchema = z.object({
  id: z.string().optional(),
  messages: z.array(z.custom<ChatUIMessage>()),
  intentHint: z.enum(['text', 'image', 'video']).optional(),
});

const getIntent = (hint: ChatIntentType | undefined, text: string): ChatIntentType => {
  if (hint) {
    return hint;
  }
  return detectIntentFromText(text);
};

const writeAssistantText = (writer: UIMessageStreamWriter<ChatUIMessage>, text: string): void => {
  const textId = generateId();
  writer.write({
    type: 'text-start',
    id: textId,
  });
  writer.write({
    type: 'text-delta',
    id: textId,
    delta: text,
  });
  writer.write({
    type: 'text-end',
    id: textId,
  });
};

const writeStatus = (
  writer: UIMessageStreamWriter<ChatUIMessage>,
  level: 'info' | 'error',
  message: string,
): void => {
  writer.write({
    type: 'data-status',
    data: {
      level,
      message,
    },
    transient: true,
  });
};

const handleMediaIntent = async (
  writer: UIMessageStreamWriter<ChatUIMessage>,
  intent: ChatIntentType,
  prompt: string,
): Promise<void> => {
  writeStatus(writer, 'info', intent === 'image' ? '正在生成图片...' : '正在生成视频...');
  const media = intent === 'image' ? await generateImage(prompt) : await generateVideo(prompt);
  writer.write({
    type: 'data-media',
    data: media,
  });
  writeAssistantText(writer, `已完成${media.kind === 'image' ? '图片' : '视频'}生成，结果见下方预览。`);
  writeStatus(writer, 'info', `${media.kind === 'image' ? '图片' : '视频'}生成完成`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: METHOD_NOT_ALLOWED });
    return;
  }

  const parsedBody = chatRequestSchema.safeParse(req.body as ChatRequestBody);
  if (!parsedBody.success) {
    res.status(400).json({ error: '请求参数不合法' });
    return;
  }

  const { messages, intentHint } = parsedBody.data;
  const latestUserText = getLatestUserText(messages);
  const intent = getIntent(intentHint, latestUserText);

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: async ({ writer }) => {
      writer.write({
        type: 'data-intent',
        data: {
          intent,
        },
        transient: true,
      });

      try {
        if (intent === 'text') {
          const result = streamText({
            model: getDeepSeekLanguageModel(),
            messages: await convertToModelMessages(messages),
            system:
              '你是一个专业、简洁的多模态助手。回答应清晰、结构化、避免冗长，尽量给出可执行建议。',
            maxOutputTokens: MAX_GENERATION_TOKENS,
          });
          writer.merge(result.toUIMessageStream<ChatUIMessage>());
          return;
        }

        await handleMediaIntent(writer, intent, latestUserText);
      } catch (error) {
        const message = error instanceof Error ? error.message : '处理请求时发生未知错误';
        writeStatus(writer, 'error', message);
        writeAssistantText(writer, `请求失败：${message}`);
      }
    },
  });

  pipeUIMessageStreamToResponse({
    response: res,
    stream,
  });
}
