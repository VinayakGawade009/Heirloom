import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { Page, UncertainSpan, Correction } from '../types';
import CorrectionPopover from './CorrectionPopover';

export interface TranscriptTextProps {
  page: Page;
  onPageUpdated: (page: Page) => void;
  /** Highlight a specific span (from facts "Show in transcript") */
  highlightSpan?: { start: number; end: number } | null;
  highlightRef?: React.RefObject<HTMLSpanElement | null>;
}

interface Segment {
  start: number;
  end: number;
  text: string;
  uncertain: boolean;
  corrected: Correction | null;
}

function buildSegments(
  text: string,
  uncertain: UncertainSpan[],
  corrections: Correction[]
): Segment[] {
  if (!text) return [];

  // Create boundary points
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);

  for (const u of uncertain) {
    if (u.start >= 0 && u.start <= text.length) boundaries.add(u.start);
    if (u.end >= 0 && u.end <= text.length) boundaries.add(u.end);
  }

  for (const c of corrections) {
    // Correction matches if text.slice(start, end) === c.new
    if (c.start >= 0 && c.start <= text.length) boundaries.add(c.start);
    if (c.end >= 0 && c.end <= text.length) boundaries.add(c.end);
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const segText = text.slice(start, end);

    // Check if this segment falls within any uncertain span
    const isUncertain = uncertain.some(
      (u) => u.start <= start && u.end >= end
    );

    // Check if this segment has a matching correction
    let matchedCorrection: Correction | null = null;
    for (const c of corrections) {
      if (c.start <= start && c.end >= end) {
        // Verify the correction text still matches
        if (text.slice(c.start, c.end) === c.new) {
          matchedCorrection = c;
          break;
        }
      }
    }

    segments.push({
      start,
      end,
      text: segText,
      uncertain: isUncertain,
      corrected: matchedCorrection,
    });
  }

  return segments;
}

export const TranscriptText: React.FC<TranscriptTextProps> = ({
  page,
  onPageUpdated,
  highlightSpan,
  highlightRef,
}) => {
  const [activePopover, setActivePopover] = useState<{
    start: number;
    end: number;
    word: string;
    rect: DOMRect;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { text, uncertain, corrections } = page.transcript;

  const segments = useMemo(
    () => buildSegments(text, uncertain, corrections),
    [text, uncertain, corrections]
  );

  const handleUncertainClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, start: number, end: number) => {
      const word = text.slice(start, end);
      const rect = e.currentTarget.getBoundingClientRect();
      setActivePopover({ start, end, word, rect });
    },
    [text]
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

  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div ref={containerRef} className="relative">
      <div className="font-serif text-transcript leading-[1.7] text-ink whitespace-pre-wrap break-words">
        {segments.map((seg) => {
          // Check if this segment overlaps with highlightSpan
          const isHighlighted =
            highlightSpan &&
            seg.start < highlightSpan.end &&
            seg.end > highlightSpan.start;

          if (seg.uncertain) {
            // Find the full uncertain span this segment belongs to
            const uSpan = uncertain.find(
              (u) => u.start <= seg.start && u.end >= seg.end
            );
            return (
              <button
                key={`${seg.start}-${seg.end}`}
                type="button"
                onClick={(e) =>
                  handleUncertainClick(
                    e,
                    uSpan?.start ?? seg.start,
                    uSpan?.end ?? seg.end
                  )
                }
                className={`bg-tint/60 border-b-2 border-dotted border-marigold rounded-[3px] px-0.5 cursor-pointer font-serif text-transcript leading-[1.7] text-ink hover:bg-tint transition-colors focus:outline-none focus:ring-2 focus:ring-marigold/40 ${
                  isHighlighted ? 'ring-2 ring-marigold bg-tint' : ''
                }`}
                ref={isHighlighted && highlightRef ? (highlightRef as React.Ref<HTMLButtonElement>) : undefined}
                tabIndex={0}
              >
                {seg.text}
              </button>
            );
          }

          if (seg.corrected) {
            const corrDate = new Date(seg.corrected.at).toLocaleDateString();
            return (
              <span
                key={`${seg.start}-${seg.end}`}
                className={`border-b-2 border-solid border-marigold relative ${
                  isHighlighted ? 'bg-tint ring-2 ring-marigold rounded-[3px]' : ''
                }`}
                title={`Corrected ${corrDate}`}
                ref={isHighlighted && highlightRef ? highlightRef : undefined}
              >
                {seg.text}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-marigold" />
              </span>
            );
          }

          if (isHighlighted) {
            return (
              <span
                key={`${seg.start}-${seg.end}`}
                className="bg-tint ring-2 ring-marigold rounded-[3px]"
                ref={highlightRef ?? undefined}
              >
                {seg.text}
              </span>
            );
          }

          return (
            <span key={`${seg.start}-${seg.end}`}>{seg.text}</span>
          );
        })}
      </div>

      {/* Uncertain word count message */}
      <div className="mt-6 pt-4 border-t border-rule">
        <p className="text-sm text-muted">
          {uncertain.length > 0 ? (
            <>
              <span className="font-semibold text-ink">{uncertain.length} words</span>{' '}
              the model was unsure about. Click any highlighted word to review or edit.
            </>
          ) : (
            'No uncertain words.'
          )}
        </p>
      </div>

      {/* Popover */}
      {activePopover && containerRect && (
        <CorrectionPopover
          pageId={page.id}
          word={activePopover.word}
          start={activePopover.start}
          end={activePopover.end}
          anchorRect={activePopover.rect}
          containerRect={containerRect}
          onSaved={handleSaved}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
};

export default TranscriptText;
