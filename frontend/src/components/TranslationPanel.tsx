import React from 'react';
import type { Page } from '../types';

export interface TranslationPanelProps {
  page: Page;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({ page }) => {
  const { translation, model } = page;

  if (!translation.text) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted">No translation yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-sans text-base font-semibold text-ink">
          Translated into {translation.language}
        </h3>
        <p className="text-sm text-muted mt-0.5">
          Translated locally using {model}
        </p>
      </div>

      <div className="bg-inset border border-rule rounded-sm p-5">
        <div className="font-serif text-transcript leading-[1.7] text-ink whitespace-pre-wrap break-words">
          {translation.text}
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;

