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

/**
 * 根据前端传入的意图提示或最新用户文本确定本轮处理方式。
 *
 * @param hint 前端预判的可选意图，存在时优先使用以减少重复识别。
 * @param text 最新一条用户文本，用于在没有 hint 时进行服务端兜底识别。
 * @returns 本轮请求应执行的文本、图片或视频意图。
 */
const getIntent = (hint: ChatIntentType | undefined, text: string): ChatIntentType => {
  if (hint) {
    return hint;
  }
  return detectIntentFromText(text);
};

/**
 * 向 AI SDK UIMessage 流中写入一段完整的助手文本。
 *
 * @param writer UIMessage 流写入器。
 * @param text 需要展示在 assistant 气泡中的文本。
 */
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

/**
 * 向前端推送临时状态，不会持久化为聊天消息的一部分。
 *
 * @param writer UIMessage 流写入器。
 * @param level 状态级别，error 会让前端展示错误条。
 * @param message 面向用户展示的状态文案。
 */
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

/**
 * 处理图片或视频生成意图，并把媒体结果写回 UIMessage 流。
 *
 * @param writer UIMessage 流写入器。
 * @param intent 已识别出的媒体意图。
 * @param prompt 清洗后的媒体提示词。
 */
const handleMediaIntent = async (
  writer: UIMessageStreamWriter<ChatUIMessage>,
  intent: ChatIntentType,
  prompt: string,
): Promise<void> => {
  writeStatus(writer, 'info', intent === 'image' ? '正在生成图片...' : '正在创建视频任务...');
  // 图片是单次请求，视频是异步任务轮询，因此二者共用结果结构但调用路径不同。
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

/**
 * API 路由：POST /api/ai-sdk/multimodal
 *
 * 请求体：
 * - messages：AI SDK UIMessage 列表，服务端从中读取最近一条用户消息。
 * - intentHint：前端可选意图提示，可为 text/image/video。
 * - systemPrompt：可选系统提示词，仅用于文本对话。
 *
 * 响应：
 * - 文本意图：返回 AI SDK UIMessage 流式文本。
 * - 图片/视频意图：返回 data-status、data-media 与一段完成提示文本。
 *
 * 异常处理：
 * - 非 POST 返回 405。
 * - 鉴权、限流、请求体过大由 enforceChatApiGuard 返回对应状态码。
 * - 参数校验失败返回 400。
 * - 上游模型异常会写入 data-status:error，保持流式响应不中断。
 */
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
      // 先把服务端最终意图发给前端，保证顶部状态与实际分流结果一致。
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
          // 文本对话直接合并语言模型流，前端可逐 token 渲染。
          writer.merge(result.toUIMessageStream<ChatUIMessage>());
          return;
        }

        // 媒体生成没有 token 流，改为状态事件 + 媒体数据事件驱动 UI。
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
