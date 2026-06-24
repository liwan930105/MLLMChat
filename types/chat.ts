import type { UIMessage } from 'ai';

export type ChatIntentType = 'text' | 'image' | 'video';

export interface ChatMessageMetadata {
  requestId?: string;
}

export interface ChatMediaDataPart {
  kind: 'image' | 'video';
  url: string;
  prompt: string;
  model: string;
}

export interface ChatStatusDataPart {
  level: 'info' | 'error';
  message: string;
}

export interface ChatIntentDataPart {
  intent: ChatIntentType;
}

export interface ChatDataParts {
  [key: string]: unknown;
  media: ChatMediaDataPart;
  status: ChatStatusDataPart;
  intent: ChatIntentDataPart;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata, ChatDataParts>;

export interface ChatRequestBody {
  id?: string;
  messages: ChatUIMessage[];
  intentHint?: ChatIntentType;
}

export interface MediaGenerationResult {
  kind: 'image' | 'video';
  url: string;
  prompt: string;
  model: string;
}
