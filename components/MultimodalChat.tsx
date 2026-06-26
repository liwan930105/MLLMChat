import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import { SystemPromptPanel } from '@/components/chat/SystemPromptPanel';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatMessageList } from '@/components/ChatMessageList';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { detectIntentFromText } from '@/lib/chat-intent';
import { INTENT_BADGE_TEXT } from '@/lib/constants';
import { loadSystemPrompt } from '@/lib/chat-storage';
import { appFetch } from '@/lib/request';
import type { ChatIntentType, ChatUIMessage } from '@/types/chat';

/**
 * API 通过 data-status 发送到前端的状态数据。
 */
interface StatusData {
  /** 状态级别；error 会切换为错误提示条。 */
  level: 'info' | 'error';
  /** 展示在头部副标题或错误提示中的文案。 */
  message: string;
}

/**
 * API 通过 data-intent 发送到前端的最终意图。
 */
interface IntentData {
  /** 服务端确认后的请求意图。 */
  intent: ChatIntentType;
}

/** 当前页面状态提示的展示级别。 */
type StatusLevel = 'info' | 'error';

/**
 * 清洗用户输入，避免把纯空白内容提交给后端。
 *
 * @param input 输入框原始内容。
 * @returns 去除首尾空白后的文本。
 */
const normalizeInput = (input: string): string => {
  return input.trim();
};

/**
 * 判断未知值是否是普通对象，供 data part 类型守卫复用。
 *
 * @param value 需要判断的未知值。
 * @returns value 是否可按键值对象读取。
 */
const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * 校验服务端状态 data part 的结构，防止异常数据污染 UI 状态。
 *
 * @param value AI SDK onData 回调传入的数据。
 * @returns value 是否符合 StatusData。
 */
const isStatusData = (value: unknown): value is StatusData => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return (value.level === 'info' || value.level === 'error') && typeof value.message === 'string';
};

/**
 * 校验服务端意图 data part 的结构。
 *
 * @param value AI SDK onData 回调传入的数据。
 * @returns value 是否符合 IntentData。
 */
const isIntentData = (value: unknown): value is IntentData => {
  if (!isObjectRecord(value)) {
    return false;
  }
  return value.intent === 'text' || value.intent === 'image' || value.intent === 'video';
};

/**
 * 多模态聊天主容器。
 *
 * 组件职责：
 * - 管理输入框、运行状态、意图徽标、系统提示词和设置面板状态。
 * - 使用 Vercel AI SDK 的 useChat 与 Pages API 路由建立流式通信。
 * - 通过 useChatPersistence 把消息同步到 localStorage。
 * - 根据服务端 data-status / data-intent 更新 UI。
 *
 * Props：无。
 *
 * 主要状态：
 * - input：当前输入框内容。
 * - runtimeStatus/statusLevel：顶部状态栏与错误提示来源。
 * - latestIntent：最近一次服务端确认的聊天意图。
 * - systemPrompt：文本对话使用的系统提示词。
 * - settingsOpen：系统提示词弹层开关。
 *
 * 副作用：
 * - useChat 内部负责请求、流式接收和错误处理。
 * - useChatPersistence 在客户端挂载后恢复并保存聊天记录。
 *
 * 样式：
 * - Tailwind 构建全屏纵向聊天布局，顶部固定、消息区滚动、底部输入区固定。
 */
export const MultimodalChat = (): ReactElement => {
  const [input, setInput] = useState<string>('');
  const [runtimeStatus, setRuntimeStatus] = useState<string>('在线');
  const [statusLevel, setStatusLevel] = useState<StatusLevel>('info');
  const [latestIntent, setLatestIntent] = useState<ChatIntentType>('text');
  const [systemPrompt, setSystemPrompt] = useState<string>(() => loadSystemPrompt());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const transport = useMemo(() => {
    // DefaultChatTransport 绑定 Next.js API 路由；appFetch 会自动合并 JSON 与鉴权请求头。
    return new DefaultChatTransport<ChatUIMessage>({
      api: '/api/ai-sdk/multimodal',
      fetch: appFetch,
    });
  }, []);

  const { messages, sendMessage, status, error, stop, clearError, setMessages } = useChat<ChatUIMessage>({
    transport,
    onData: (part) => {
      // data-status 是服务端推送的临时运行状态，不会成为消息内容。
      if (part.type === 'data-status' && isStatusData(part.data)) {
        setRuntimeStatus(part.data.message);
        setStatusLevel(part.data.level);
      }
      // data-intent 以后端判定为准，避免前端预判和实际分流不一致。
      if (part.type === 'data-intent' && isIntentData(part.data)) {
        setLatestIntent(part.data.intent);
      }
    },
    onError: (chatError) => {
      setRuntimeStatus(chatError.message);
      setStatusLevel('error');
    },
    onFinish: () => {
      setRuntimeStatus('在线');
      setStatusLevel('info');
    },
  });

  const { clearHistory } = useChatPersistence({ messages, setMessages });

  const isBusy = status === 'submitted' || status === 'streaming';
  const isSubmitted = status === 'submitted';
  const isStreaming = status === 'streaming';

  /**
   * 构造发送给 API 的附加请求体。
   *
   * @returns 目前仅包含系统提示词，消息本体由 useChat 自动提供。
   */
  const buildRequestBody = useCallback((): Record<string, unknown> => {
    return {
      systemPrompt,
    };
  }, [systemPrompt]);

  /**
   * 根据前端初步识别的意图生成即时状态文案。
   *
   * @param intent 用户输入对应的预判意图。
   * @returns 发送请求后立即显示的状态提示。
   */
  const getStatusMessageForIntent = (intent: ChatIntentType): string => {
    if (intent === 'image') {
      return '正在准备生成图片...';
    }
    if (intent === 'video') {
      return '正在准备生成视频...';
    }
    return 'AI 正在思考...';
  };

  /**
   * 提交当前输入。
   *
   * 关键事件：
   * - 空内容直接忽略，避免无效请求。
   * - 先在前端预判意图用于即时反馈，最终意图仍以后端 data-intent 为准。
   * - 发送成功后清空输入框，发送失败则把错误提升到状态栏。
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    const prompt = normalizeInput(input);
    if (!prompt) {
      return;
    }

    const intent = detectIntentFromText(prompt);

    // 新请求开始前清理旧错误，防止上一轮失败影响本轮展示。
    clearError();
    setStatusLevel('info');
    setRuntimeStatus(getStatusMessageForIntent(intent));

    try {
      await sendMessage(
        { text: prompt },
        {
          body: buildRequestBody(),
        },
      );
      setInput('');
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '发送消息失败';
      setRuntimeStatus(message);
      setStatusLevel('error');
    }
  }, [buildRequestBody, clearError, input, sendMessage]);

  /**
   * 停止当前流式响应或媒体生成状态等待。
   */
  const handleStop = useCallback(async (): Promise<void> => {
    await stop();
    setRuntimeStatus('已停止生成');
    setStatusLevel('info');
  }, [stop]);

  /**
   * 清除 useChat 暴露的错误，并恢复默认在线状态。
   */
  const handleClearError = useCallback((): void => {
    clearError();
    setRuntimeStatus('在线');
    setStatusLevel('info');
  }, [clearError]);

  /**
   * 清空聊天历史。
   *
   * 为避免误删，只有存在消息时才弹出浏览器确认框。
   */
  const handleClearHistory = useCallback((): void => {
    if (messages.length === 0) {
      return;
    }
    if (window.confirm('确定清空所有聊天记录吗？')) {
      clearHistory();
      setRuntimeStatus('在线');
      setStatusLevel('info');
    }
  }, [clearHistory, messages.length]);

  /**
   * 保存系统提示词到组件状态；持久化由 SystemPromptPanel 内部完成。
   *
   * @param prompt 用户确认保存的系统提示词。
   */
  const handleSaveSystemPrompt = useCallback((prompt: string): void => {
    setSystemPrompt(prompt);
  }, []);

  const displayStatus = error && statusLevel !== 'error' ? error.message : runtimeStatus;
  const displayLevel: StatusLevel = error ? 'error' : statusLevel;
  // submitted 阶段代表请求已发出但还没有 assistant 消息，显示“正在输入”占位能减少等待空白。
  const showTypingIndicator = isSubmitted && messages[messages.length - 1]?.role !== 'assistant';

  return (
    <div className='flex h-dvh flex-col bg-[#ededed]'>
      <ChatHeader
        title='MLLM 智能助手'
        subtitle={`${INTENT_BADGE_TEXT[latestIntent]} · ${displayStatus}`}
        onOpenSettings={() => setSettingsOpen(true)}
        onClearHistory={handleClearHistory}
      />

      {displayLevel === 'error' ? (
        <div
          role='alert'
          className='flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700'
        >
          <span>{displayStatus}</span>
          <button type='button' onClick={handleClearError} className='font-medium underline underline-offset-2'>
            清除
          </button>
        </div>
      ) : null}

      <ChatMessageList messages={messages} isStreaming={isStreaming} />
      <TypingIndicator visible={showTypingIndicator} message={displayStatus} />

      <ChatInput
        value={input}
        isBusy={isBusy}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
      />

      <SystemPromptPanel
        open={settingsOpen}
        initialPrompt={systemPrompt}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSystemPrompt}
      />
    </div>
  );
};
