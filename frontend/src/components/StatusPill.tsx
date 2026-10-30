import React from 'react';
import type { PageStatus } from '../types';
import { CheckIcon } from './icons';

export interface StatusPillProps {
  status: PageStatus;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'done':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-success bg-success/15 ${className}`}
        >
          <CheckIcon width={12} height={12} strokeWidth={2.5} />
          <span>Done</span>
        </span>
      );

    case 'transcribing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-ink bg-tint ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
          <span>Reading…</span>
        </span>
      );

    case 'translating':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-ink bg-tint ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
          <span>Translating…</span>
        </span>
      );

    case 'extracting':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-ink bg-tint ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
          <span>Finding facts…</span>
        </span>
      );

    case 'queued':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-muted bg-inset ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-muted/60" />
          <span>Queued…</span>
        </span>
      );

    case 'error':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-danger bg-danger/15 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          <span>Needs attention</span>
        </span>
      );

    default:
      return null;
  }
};

export default StatusPill;
