import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ApiError, addCorrection } from '../api';
import type { Page } from '../types';

export interface CorrectionPopoverProps {
  pageId: number;
  word: string;
  start: number;
  end: number;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  onSaved: (updatedPage: Page) => void;
  onClose: () => void;
}

export const CorrectionPopover: React.FC<CorrectionPopoverProps> = ({
  pageId,
  word,
  start,
  end,
  anchorRect,
  containerRect,
  onSaved,
  onClose,
}) => {
  const [text, setText] = useState(word);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Auto-focus the input
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the click that opened the popover from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const trimmed = text;
    // If unchanged or empty, just close
    if (trimmed === word || trimmed === '') {
      onClose();
      return;
    }

    setSaving(true);
    setApiError(null);
    try {
      const updatedPage = await addCorrection(pageId, {
        start,
        end,
        new_text: trimmed,
      });
      onSaved(updatedPage);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError((err as Error).message || 'Something went wrong');
      }
      setSaving(false);
    }
  }, [text, word, pageId, start, end, onSaved, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      e.preventDefault();
      handleSave();
    }
  };

  // Position the popover BELOW the anchor word, staying inside the container
  const top = anchorRect.bottom - containerRect.top + 8;
  let left = anchorRect.left - containerRect.left;
  // Ensure it doesn't overflow the right side
  const popoverWidth = 280;
  if (left + popoverWidth > containerRect.width) {
    left = Math.max(0, containerRect.width - popoverWidth - 16);
  }
  if (left < 0) left = 8;

  return (
    <div
      ref={popoverRef}
      className="absolute z-20 bg-panel border border-rule rounded-panel p-4 flex flex-col gap-3"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      }}
    >
      <label className="font-sans text-sm font-semibold text-ink">
        What does the page say?
      </label>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setApiError(null);
        }}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 font-sans text-[15px] text-ink bg-white border border-rule rounded-input placeholder:text-muted/60 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30"
        disabled={saving}
      />
      {apiError && (
        <p className="text-sm text-danger font-medium">{apiError}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Esc to dismiss</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="font-sans text-sm font-medium text-muted hover:text-ink cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-sm font-semibold px-4 py-1.5 rounded-btn transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrectionPopover;

