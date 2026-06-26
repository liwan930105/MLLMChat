import type { UIMessage } from 'ai';

/**
 * 聊天请求的业务意图类型。
 *
 * - text：普通文本对话，走语言模型流式输出。
 * - image：图片生成，走豆包图片接口。
 * - video：视频生成，走豆包视频任务接口。
 */
export type ChatIntentType = 'text' | 'image' | 'video';

/**
 * 附着在 AI SDK UIMessage 上的自定义元数据。
 */
export interface ChatMessageMetadata {
  /** 当前请求链路的可选 ID，用于后续排查或追踪一次聊天请求。 */
  requestId?: string;
}

/**
 * 服务端通过 data-media 写入消息流的媒体结果。
 */
export interface ChatMediaDataPart {
  /** 媒体类型，决定前端渲染图片卡片还是视频卡片。 */
  kind: 'image' | 'video';
  /** 可直接展示或下载的媒体地址，也可能是图片 data URL。 */
  url: string;
  /** 实际提交给媒体模型的提示词，方便用户确认生成依据。 */
  prompt: string;
  /** 执行生成任务的模型 ID。 */
  model: string;
}

/**
 * 服务端通过 data-status 推送给前端的运行状态。
 */
export interface ChatStatusDataPart {
  /** 状态级别；error 会触发前端错误提示样式。 */
  level: 'info' | 'error';
  /** 面向用户展示的状态文案。 */
  message: string;
}

/**
 * 服务端通过 data-intent 告知前端最终识别出的意图。
 */
export interface ChatIntentDataPart {
  /** 本轮请求最终采用的处理意图。 */
  intent: ChatIntentType;
}

/**
 * AI SDK UIMessage 支持的自定义 data part 集合。
 *
 * 保留索引签名是为了兼容 AI SDK 可能注入的其他未知数据片段。
 */
export interface ChatDataParts {
  [key: string]: unknown;
  /** 媒体生成结果数据片段。 */
  media: ChatMediaDataPart;
  /** 运行状态数据片段。 */
  status: ChatStatusDataPart;
  /** 意图识别数据片段。 */
  intent: ChatIntentDataPart;
}

/**
 * 应用内统一使用的聊天消息类型。
 *
 * 它在 AI SDK 的 UIMessage 基础上绑定了自定义 metadata 与 data part 类型。
 */
export type ChatUIMessage = UIMessage<ChatMessageMetadata, ChatDataParts>;

/**
 * 前端提交到 /api/ai-sdk/multimodal 的请求体。
 */
export interface ChatRequestBody {
  /** AI SDK 生成的可选请求 ID。 */
  id?: string;
  /** 当前会话消息列表，服务端会从中提取最近一条用户文本。 */
  messages: ChatUIMessage[];
  /** 前端预判的意图提示；服务端仍会在缺省时自行识别。 */
  intentHint?: ChatIntentType;
  /** 用户配置的系统提示词，仅影响文本对话。 */
  systemPrompt?: string;
}

/**
 * 媒体生成服务返回给 API 路由的标准结果。
 */
export interface MediaGenerationResult {
  /** 生成结果类型，与前端媒体卡片一一对应。 */
  kind: 'image' | 'video';
  /** 生成结果地址。 */
  url: string;
  /** 归一化后的模型提示词。 */
  prompt: string;
  /** 实际调用的媒体模型 ID。 */
  model: string;
}
