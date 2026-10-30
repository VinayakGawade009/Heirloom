import React, { useState } from 'react';
import type { ErrorCode } from '../types';
import { errorMessage } from '../lib/errors';
import { useSettings } from '../state/SettingsContext';
import { AlertCircleIcon, CopyIcon, CheckIcon } from './icons';

export interface ErrorCardProps {
  code?: ErrorCode | string | null;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  modelName?: string;
  className?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  code,
  message,
  onRetry,
  retryText = 'Try again',
  modelName: modelNameProp,
  className = '',
}) => {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  const displayMessage = message || errorMessage(code);
  const activeModel = modelNameProp || settings?.model || 'gemma4:e2b';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`ollama pull ${activeModel}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  };

  return (
    <div
      role="alert"
      className={`bg-danger/10 border border-danger rounded-panel p-6 flex flex-col gap-4 text-ink ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon width={20} height={20} className="text-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-danger leading-relaxed">
            {displayMessage}
          </p>
        </div>
      </div>

      {code === 'model_not_installed' && (
        <div className="bg-[#231C16] rounded-md px-4 py-3 flex items-center justify-between gap-3 text-white">
          <code className="font-mono text-[14px] text-[#F8F2E6] select-all">
            ollama pull {activeModel}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-[#3A3026] hover:bg-[#4A3E32] border border-[#57483B] text-[#F8F2E6] font-sans text-xs font-medium px-3 py-1.5 rounded transition-colors"
            aria-label="Copy ollama command"
          >
            {copied ? (
              <>
                <CheckIcon width={14} height={14} className="text-success" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon width={14} height={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {onRetry && (
        <div className="flex items-center pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center border border-danger text-danger hover:bg-danger/10 font-sans text-sm font-semibold px-4 py-2 rounded-btn transition-colors cursor-pointer"
          >
            {retryText}
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorCard;
