import React from 'react';

export interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, action, className = '' }) => {
  return (
    <div
      className={`bg-panel border border-rule rounded-panel p-12 flex flex-col items-center justify-center text-center gap-4 ${className}`}
    >
      {/* Paper icon illustration */}
      <div
        className="w-12 h-16 bg-[#FAF4E6] border border-rule rounded-sm p-2 flex flex-col justify-around relative mb-1"
        aria-hidden="true"
      >
        <div className="absolute top-0 right-0 w-3 h-3 border-b border-l border-rule bg-inset" />
        <div className="h-[1px] bg-rule w-[60%]" />
        <div className="h-[1px] bg-rule w-[80%]" />
        <div className="h-[1px] bg-rule w-[70%]" />
        <div className="h-[1px] bg-rule w-[50%]" />
      </div>

      <p className="font-sans text-[16px] text-muted max-w-md leading-relaxed">
        {message}
      </p>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
