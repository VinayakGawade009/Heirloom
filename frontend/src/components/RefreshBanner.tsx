import React from 'react';

export interface RefreshBannerProps {
  correctionCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export const RefreshBanner: React.FC<RefreshBannerProps> = ({
  correctionCount,
  refreshing,
  onRefresh,
}) => {
  return (
    <div className="bg-tint/50 border border-marigold/40 rounded-panel px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-ink flex-1 min-w-0">
        <span className="inline-block w-2 h-2 rounded-full bg-marigold mr-2 flex-shrink-0" />
        You corrected {correctionCount} word{correctionCount !== 1 ? 's' : ''}. Refresh to update the translation and facts.
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-sm font-semibold px-4 py-2 rounded-btn transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap flex-shrink-0"
      >
        {refreshing ? 'Refreshing…' : 'Refresh translation and facts'}
      </button>
    </div>
  );
};

export default RefreshBanner;

