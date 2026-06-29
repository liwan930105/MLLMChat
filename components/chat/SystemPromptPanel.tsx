import { useState, type ReactElement } from 'react';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import { saveSystemPrompt } from '@/lib/chat-storage';

/**
 * SystemPromptPanel 组件入参。
 */
interface SystemPromptPanelProps {
  /** 是否展示弹层。 */
  open: boolean;
  /** 当前生效的系统提示词，用于初始化编辑草稿。 */
  initialPrompt: string;
  /** 关闭弹层回调。 */
  onClose: () => void;
  /** 保存成功后通知父组件更新系统提示词。 */
  onSave: (prompt: string) => void;
}

/**
 * 系统提示词编辑弹层内容。
 *
 * Props：
 * - initialPrompt：打开面板时的提示词快照。
 * - onClose：关闭弹层。
 * - onSave：把保存后的提示词同步给父组件。
 *
 * 主要状态：
 * - draft：textarea 中正在编辑的提示词草稿。
 *
 * 关键事件：
 * - 保存：写入 localStorage，并同步父组件状态。
 * - 恢复默认：只重置草稿，用户仍需点击保存才生效。
 *
 * 样式：
 * - 移动端贴近底部，sm 及以上居中展示，适配不同屏幕高度。
 */
const SystemPromptPanelContent = ({
  initialPrompt,
  onClose,
  onSave,
}: Omit<SystemPromptPanelProps, 'open'>): ReactElement => {
  const [draft, setDraft] = useState<string>(initialPrompt);

  /**
   * 保存当前草稿。
   */
  const handleSave = (): void => {
    const normalized = draft.trim() || DEFAULT_SYSTEM_PROMPT;
    saveSystemPrompt(normalized);
    onSave(normalized);
    onClose();
  };

  /**
   * 将编辑草稿恢复为默认提示词。
   */
  const handleReset = (): void => {
    setDraft(DEFAULT_SYSTEM_PROMPT);
  };

  return (
    <div className='fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center' role='dialog' aria-modal='true'>
      <div className='w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-base font-semibold text-zinc-900'>系统提示词</h2>
          <button type='button' onClick={onClose} className='text-sm text-zinc-500 hover:text-zinc-700'>
            关闭
          </button>
        </div>
        <p className='mb-3 text-xs text-zinc-500'>自定义 AI 的角色与回答风格，仅影响文本对话。</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          rows={6}
          className='w-full resize-none rounded-xl border border-zinc-200 p-3 text-sm text-zinc-800 outline-none focus:border-ding-400 focus:ring-1 focus:ring-ding-400'
          aria-label='系统提示词'
        />
        <div className='mt-4 flex justify-end gap-2'>
          <button
            type='button'
            onClick={handleReset}
            className='rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50'
          >
            恢复默认
          </button>
          <button
            type='button'
            onClick={handleSave}
            className='rounded-lg bg-ding-500 px-4 py-2 text-sm font-medium text-white hover:bg-ding-600'
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 系统提示词面板外层组件。
 *
 * Props：
 * - open：为 false 时返回 null，不渲染弹层 DOM。
 * - initialPrompt：当前系统提示词。
 * - onClose/onSave：关闭和保存事件。
 *
 * 关键逻辑：
 * - key={initialPrompt} 让每次保存后重新打开面板时，内部 draft 与最新提示词同步。
 */
export const SystemPromptPanel = ({ open, initialPrompt, onClose, onSave }: SystemPromptPanelProps): ReactElement | null => {
  if (!open) {
    return null;
  }

  return <SystemPromptPanelContent key={initialPrompt} initialPrompt={initialPrompt} onClose={onClose} onSave={onSave} />;
};
