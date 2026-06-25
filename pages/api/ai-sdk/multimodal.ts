import {
  convertToModelMessages,
  createUIMessageStream,
  generateId,
  pipeUIMessageStreamToResponse,
  streamText,
} from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import type { NextApiRequest, NextApiResponse } from 'next';

import { enforceChatApiGuard } from '@/lib/api-guard';
import { detectIntentFromText, getLatestUserText, resolveMediaPrompt } from '@/lib/chat-intent';
import { parseChatRequest, toChatUIMessages } from '@/lib/chat-request-schema';
import { DEFAULT_SYSTEM_PROMPT, MAX_GENERATION_TOKENS } from '@/lib/constants';
import { getDeepSeekLanguageModel } from '@/lib/model-providers';
import { generateImage, generateVideo } from '@/lib/multimodal-service';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

const METHOD_NOT_ALLOWED = '仅支持 POST 请求';
const EMPTY_TEXT_PROMPT = '请输入内容后再发送';

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
  writeStatus(writer, 'info', intent === 'image' ? '正在生成图片...' : '正在创建视频任务...');
  const media =
    intent === 'image'
      ? await generateImage(prompt)
      : await generateVideo(prompt, {
          onStatus: (message) => writeStatus(writer, 'info', message),
        });
  writer.write({
    type: 'data-media',
    data: media,
  });
  writeAssistantText(writer, `已完成${media.kind === 'image' ? '图片' : '视频'}生成。`);
  writeStatus(writer, 'info', `${media.kind === 'image' ? '图片' : '视频'}生成完成`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: METHOD_NOT_ALLOWED });
    return;
  }

  const guardResult = enforceChatApiGuard(req);
  if (!guardResult.ok) {
    res.status(guardResult.status).json({ error: guardResult.message });
    return;
  }

  const parsedBody = parseChatRequest(req.body);
  if (!parsedBody) {
    res.status(400).json({ error: '请求参数不合法' });
    return;
  }

  const messages = toChatUIMessages(parsedBody.messages);
  const { intentHint, systemPrompt } = parsedBody;
  const latestUserText = getLatestUserText(messages);
  const intent = getIntent(intentHint, latestUserText);

  if (intent === 'text' && latestUserText.trim().length === 0) {
    res.status(400).json({ error: EMPTY_TEXT_PROMPT });
    return;
  }

  const resolvedSystemPrompt = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
  const mediaPrompt = resolveMediaPrompt(latestUserText, intent);

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
            system: resolvedSystemPrompt,
            maxOutputTokens: MAX_GENERATION_TOKENS,
          });
          writer.merge(result.toUIMessageStream<ChatUIMessage>());
          return;
        }

        await handleMediaIntent(writer, intent, mediaPrompt);
      } catch (error) {
        const message = error instanceof Error ? error.message : '处理请求时发生未知错误';
        writeStatus(writer, 'error', message);
      }
    },
  });

  pipeUIMessageStreamToResponse({
    response: res,
    stream,
  });
}
