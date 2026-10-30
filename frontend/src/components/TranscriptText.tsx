import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { Page } from '../types';
import CorrectionPopover from './CorrectionPopover';

export interface TranscriptTextProps {
  page: Page;
  onPageUpdated: (page: Page) => void;
  /** Highlight a specific span (from facts "Show in transcript") */
  highlightSpan?: { start: number; end: number } | null;
  highlightRef?: React.RefObject<HTMLSpanElement | null>;
  onClearHighlight?: () => void;
}

interface Token {
  type: 'word' | 'whitespace';
  text: string;
  start: number;
  end: number;
}

function tokenizeTranscript(text: string): Token[] {
  if (!text) return [];
  const tokens: Token[] = [];
  const regex = /\S+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const wordStart = match.index;
    const wordEnd = wordStart + match[0].length;

    // Any whitespace before this word
    if (wordStart > lastIndex) {
      tokens.push({
        type: 'whitespace',
        text: text.slice(lastIndex, wordStart),
        start: lastIndex,
        end: wordStart,
      });
    }

    tokens.push({
      type: 'word',
      text: match[0],
      start: wordStart,
      end: wordEnd,
    });

    lastIndex = wordEnd;
  }

  // Any trailing whitespace
  if (lastIndex < text.length) {
    tokens.push({
      type: 'whitespace',
      text: text.slice(lastIndex),
      start: lastIndex,
      end: text.length,
    });
  }

  return tokens;
}

export const TranscriptText: React.FC<TranscriptTextProps> = ({
  page,
  onPageUpdated,
  highlightSpan,
  highlightRef,
  onClearHighlight,
}) => {
  const [activePopover, setActivePopover] = useState<{
    start: number;
    end: number;
    word: string;
    rect: DOMRect;
    containerRect: DOMRect;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const text = page.transcript?.text ?? '';
  const uncertain = page.transcript?.uncertain ?? [];
  const corrections = page.transcript?.corrections ?? [];

  const tokens = useMemo(() => tokenizeTranscript(text), [text]);

  const handleWordClick = useCallback(
    (
      e: React.MouseEvent<HTMLSpanElement>,
      start: number,
      end: number,
      word: string
    ) => {
      // If user was dragging to select text, do not open the popover
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        return;
      }

      // Clear fact highlight if active
      if (highlightSpan && onClearHighlight) {
        onClearHighlight();
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const containerRect =
        containerRef.current?.getBoundingClientRect() || rect;
      setActivePopover({ start, end, word, rect, containerRect });
    },
    [highlightSpan, onClearHighlight]
  );

  const handleWordKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLSpanElement>,
      start: number,
      end: number,
      word: string
    ) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect =
          containerRef.current?.getBoundingClientRect() || rect;
        setActivePopover({ start, end, word, rect, containerRect });
      }
    },
    []
  );

  const handleSaved = useCallback(
    (updatedPage: Page) => {
      setActivePopover(null);
      onPageUpdated(updatedPage);
    },
    [onPageUpdated]
  );

  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
  }, []);

  if (!text) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted">No transcript yet.</p>
      </div>
    );
  }

  // Find the first highlighted word index in advance to attach highlightRef without mutating variables during render
  const firstHighlightedIndex = highlightSpan
    ? tokens.findIndex(
        (t) =>
          t.type === 'word' &&
          t.start < highlightSpan.end &&
          t.end > highlightSpan.start
      )
    : -1;

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={() => {
        if (highlightSpan && onClearHighlight) {
          onClearHighlight();
        }
      }}
    >
      <div className="font-serif text-transcript leading-[1.7] text-ink whitespace-pre-wrap break-words select-text">
        {tokens.map((token, index) => {
          if (token.type === 'whitespace') {
            // Check if this whitespace is inside the highlighted fact range
            const isHighlightedSpace = Boolean(
              highlightSpan &&
                token.start >= highlightSpan.start &&
                token.end <= highlightSpan.end
            );

            return (
              <span
                key={`ws-${token.start}-${token.end}`}
                className={isHighlightedSpace ? 'bg-tint' : undefined}
              >
                {token.text}
              </span>
            );
          }

          // Word token
          const isUncertain = uncertain.some(
            (u) => u.start < token.end && u.end > token.start
          );

          const matchingCorrection = corrections.find(
            (c) =>
              c.start < token.end &&
              c.end > token.start &&
              text.slice(c.start, c.end) === c.new
          );

          const isHighlighted = Boolean(
            highlightSpan &&
              token.start < highlightSpan.end &&
              token.end > highlightSpan.start
          );

          const isFirstHighlighted = index === firstHighlightedIndex;
          const refToAttach = isFirstHighlighted ? highlightRef : undefined;

          // Compute styles
          let classes =
            'inline font-serif text-transcript leading-[1.7] text-ink select-text cursor-pointer rounded-[3px] px-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-marigold/40 ';

          if (isUncertain) {
            // Unsure word styling (<mark>-like)
            classes +=
              'bg-tint/60 border-b-2 border-dotted border-marigold hover:bg-tint ';
          } else if (matchingCorrection) {
            // Corrected word styling
            classes +=
              'border-b-2 border-solid border-marigold relative hover:bg-inset ';
          } else {
            // Normal word styling
            classes += 'hover:bg-inset ';
          }

          if (isHighlighted) {
            classes += 'bg-tint ring-2 ring-marigold ';
          }

          const correctionTitle = matchingCorrection
            ? `Corrected ${new Date(matchingCorrection.at).toLocaleDateString()}`
            : undefined;

          return (
            <span
              key={`w-${token.start}-${token.end}`}
              ref={refToAttach}
              role="button"
              tabIndex={0}
              onClick={(e) =>
                handleWordClick(e, token.start, token.end, token.text)
              }
              onKeyDown={(e) =>
                handleWordKeyDown(e, token.start, token.end, token.text)
              }
              className={classes.trim()}
              title={correctionTitle}
            >
              {token.text}
              {matchingCorrection && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-marigold pointer-events-none" />
              )}
            </span>
          );
        })}
      </div>

      {/* Uncertain word count message & hint */}
      <div className="mt-6 pt-4 border-t border-rule">
        <p className="text-sm text-muted">
          {uncertain.length > 0 ? (
            <>
              <span className="font-semibold text-ink">
                {uncertain.length} {uncertain.length === 1 ? 'word' : 'words'}
              </span>{' '}
              the model was unsure about. Click any word to correct it.
            </>
          ) : (
            'Click any word to correct it.'
          )}
        </p>
      </div>

      {/* Popover */}
      {activePopover && (
        <CorrectionPopover
          pageId={page.id}
          word={activePopover.word}
          start={activePopover.start}
          end={activePopover.end}
          anchorRect={activePopover.rect}
          containerRect={activePopover.containerRect}
          onSaved={handleSaved}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
};

export default TranscriptText;
