import { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title = 'Delete this page?',
  body = "The original photo, transcript, translation and your corrections will be removed from this computer. This can't be undone.",
  confirmLabel = 'Delete page',
  cancelLabel = 'Cancel',
  isDeleting = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Store previously focused element and set focus to Cancel button on open
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      // Focus Cancel button by default so Enter/Space doesn't accidentally confirm deletion
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isDeleting) {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !isDeleting) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-panel rounded-panel border border-rule shadow-xl p-6 sm:p-7 flex flex-col"
      >
        <h2 id="confirm-dialog-title" className="font-serif text-xl font-bold text-ink mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="text-ink/80 text-sm leading-relaxed mb-6">
          {body}
        </p>

        {errorMessage && (
          <div
            className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-card px-3.5 py-2.5 mb-5 font-medium leading-snug"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-auto">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-ink bg-panel border border-rule hover:bg-tint/40 active:bg-tint/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#B23A2B] hover:bg-[#9B2F22] active:bg-[#85271C] disabled:opacity-50 disabled:cursor-not-allowed rounded-btn transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
          >
            {isDeleting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

