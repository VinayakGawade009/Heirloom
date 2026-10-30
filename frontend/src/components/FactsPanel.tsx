import React, { useState, useCallback, useMemo } from 'react';
import type { Fact, FactKind, Page } from '../types';

export interface FactsPanelProps {
  page: Page;
  onShowInTranscript: (start?: number | null, end?: number | null) => void;
}

const KIND_ORDER: FactKind[] = ['person', 'place', 'date', 'item'];
const KIND_LABELS: Record<FactKind, string> = {
  person: 'People',
  place: 'Places',
  date: 'Dates',
  item: 'Items',
};

export function getFactRange(text: string, fact: Fact): { start: number; end: number } | null {
  if (!text || !fact || !fact.text) return null;

  const { start, end } = fact;

  // 1. If positions are within bounds and slice matches fact text
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    start >= 0 &&
    end <= text.length &&
    start < end &&
    text.slice(start, end) === fact.text
  ) {
    return { start, end };
  }

  // 2. Fallback: find first occurrence of fact.text in transcript
  const idx = text.indexOf(fact.text);
  if (idx !== -1) {
    return { start: idx, end: idx + fact.text.length };
  }

  // 3. If positions are within bounds (even if text slightly shifted)
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    start >= 0 &&
    end <= text.length &&
    start < end
  ) {
    return { start, end };
  }

  return null;
}

function buildExcerpt(text: string, fact: Fact): { before: string; match: string; after: string; valid: boolean } {
  const range = getFactRange(text, fact);
  if (!range) {
    return { before: '', match: fact.text, after: '', valid: false };
  }

  const { start, end } = range;
  const radius = 60;
  const excerptStart = Math.max(0, start - radius);
  const excerptEnd = Math.min(text.length, end + radius);
  const beforeText = text.slice(excerptStart, start);
  const matchText = text.slice(start, end);
  const afterText = text.slice(end, excerptEnd);

  return {
    before: (excerptStart > 0 ? '…' : '') + beforeText,
    match: matchText,
    after: afterText + (excerptEnd < text.length ? '…' : ''),
    valid: true,
  };
}

export const FactsPanel: React.FC<FactsPanelProps> = ({ page, onShowInTranscript }) => {
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const facts = page.facts ?? [];
  const transcript = page.transcript ?? { text: '', uncertain: [], corrections: [] };

  const grouped = useMemo(() => {
    const groups: Record<FactKind, Fact[]> = {
      person: [],
      place: [],
      date: [],
      item: [],
    };
    for (const f of page.facts ?? []) {
      if (groups[f.kind]) {
        groups[f.kind].push(f);
      }
    }
    return groups;
  }, [page.facts]);

  const handleSelect = useCallback(
    (fact: Fact) => {
      setSelectedFact((prev) => (prev?.id === fact.id ? null : fact));
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, fact: Fact) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(fact);
      } else if (e.key === 'Escape') {
        setSelectedFact(null);
      }
    },
    [handleSelect]
  );

  // Listen for Escape globally to clear selection
  React.useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFact(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  if (facts.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted">No people, places, dates or items found yet.</p>
      </div>
    );
  }

  const excerpt = selectedFact ? buildExcerpt(transcript.text, selectedFact) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* "Where it appears" excerpt card */}
      {selectedFact && excerpt && (
        <div className="bg-inset border border-rule rounded-sm p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Where it appears</p>
          <p className="font-serif text-transcript leading-[1.7] text-ink">
            {excerpt.before.replace(/\n/g, ' ')}
            {excerpt.valid ? (
              <span className="bg-tint outline outline-2 outline-marigold rounded-[3px] px-0.5">
                {excerpt.match.replace(/\n/g, ' ')}
              </span>
            ) : (
              <span>{excerpt.match.replace(/\n/g, ' ')}</span>
            )}
            {excerpt.after.replace(/\n/g, ' ')}
          </p>
          <button
            type="button"
            onClick={() => {
              const range = getFactRange(transcript.text, selectedFact);
              if (range) {
                onShowInTranscript(range.start, range.end);
              } else {
                onShowInTranscript(null, null);
              }
            }}
            className="self-start font-sans text-sm font-semibold text-marigold hover:text-marigold-hover cursor-pointer transition-colors"
          >
            Show in transcript
          </button>
        </div>
      )}

      {/* Grouped chips */}
      {KIND_ORDER.map((kind) => {
        const items = grouped[kind];
        if (items.length === 0) return null;

        return (
          <div key={kind} className="flex flex-col gap-2">
            <h4 className="font-sans text-xs font-semibold text-muted uppercase tracking-wide">
              {KIND_LABELS[kind]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {items.map((fact) => {
                const isSelected = selectedFact?.id === fact.id;
                return (
                  <button
                    key={fact.id}
                    type="button"
                    onClick={() => handleSelect(fact)}
                    onKeyDown={(e) => handleKeyDown(e, fact)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-chip border font-sans text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-tint border-marigold text-ink'
                        : 'bg-panel border-rule text-ink hover:bg-inset'
                    }`}
                    tabIndex={0}
                  >
                    {fact.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FactsPanel;
