import React from 'react';

export interface PaperThumbProps {
  className?: string;
  compact?: boolean;
}

export const PaperThumb: React.FC<PaperThumbProps> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`relative w-full aspect-[3/4] bg-[#FAF4E6] border border-rule rounded-sm overflow-hidden flex flex-col justify-between ${
        compact ? 'p-2.5 gap-1.5' : 'p-4 gap-2.5'
      } ${className}`}
      aria-hidden="true"
    >
      {/* Paper folded corner */}
      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-b border-l border-rule bg-inset" />

      {/* Faint ruled lines */}
      <div className="flex flex-col gap-2 w-full pt-1">
        <div className="h-[1px] bg-rule w-[65%]" />
        <div className="h-[1px] bg-rule w-[85%]" />
        <div className="h-[1px] bg-rule w-[75%]" />
        <div className="h-[1px] bg-rule w-[90%]" />
        <div className="h-[1px] bg-rule w-[50%]" />
        {!compact && (
          <>
            <div className="h-[1px] bg-rule w-[80%]" />
            <div className="h-[1px] bg-rule w-[70%]" />
            <div className="h-[1px] bg-rule w-[85%]" />
            <div className="h-[1px] bg-rule w-[40%]" />
          </>
        )}
      </div>

      {/* Subtle bottom indicator */}
      <div className="w-full flex justify-end items-center opacity-40">
        <div className="w-4 h-4 border border-rule rounded-full" />
      </div>
    </div>
  );
};

export default PaperThumb;
