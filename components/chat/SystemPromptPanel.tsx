import { useState, type ReactElement } from 'react';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import { saveSystemPrompt } from '@/lib/chat-storage';

interface SystemPromptPanelProps {
  open: boolean;
  initialPrompt: string;
  onClose: () => void;
  onSave: (prompt: string) => void;
}

const SystemPromptPanelContent = ({
  initialPrompt,
  onClose,
  onSave,
}: Omit<SystemPromptPanelProps, 'open'>): ReactElement => {
  const [draft, setDraft] = useState<string>(initialPrompt);

  const handleSave = (): void => {
    const normalized = draft.trim() || DEFAULT_SYSTEM_PROMPT;
    saveSystemPrompt(normalized);
    onSave(normalized);
    onClose();
  };

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

export const SystemPromptPanel = ({ open, initialPrompt, onClose, onSave }: SystemPromptPanelProps): ReactElement | null => {
  if (!open) {
    return null;
  }

  return <SystemPromptPanelContent key={initialPrompt} initialPrompt={initialPrompt} onClose={onClose} onSave={onSave} />;
};
