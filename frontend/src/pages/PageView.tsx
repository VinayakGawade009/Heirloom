import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePagePolling } from '../hooks/usePagePolling';
import { refreshPage, getPage, deletePage, ApiError } from '../api';
import type { Page, PageStatus } from '../types';
import ErrorCard from '../components/ErrorCard';
import ImageStage from '../components/ImageStage';
import TranscriptText from '../components/TranscriptText';
import TranslationPanel from '../components/TranslationPanel';
import FactsPanel from '../components/FactsPanel';
import RefreshBanner from '../components/RefreshBanner';
import ConfirmDialog from '../components/ConfirmDialog';
import { TrashIcon } from '../components/icons';

type TabId = 'transcript' | 'translation' | 'facts';

// --- localStorage helpers for stale detection ---
const STALE_KEY_PREFIX = 'heirloom_corrections_count_';

function getSavedCount(pageId: number): number | null {
  try {
    const val = localStorage.getItem(STALE_KEY_PREFIX + pageId);
    return val !== null ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

function saveCorrectionCount(pageId: number, count: number): void {
  try {
    localStorage.setItem(STALE_KEY_PREFIX + pageId, String(count));
  } catch {
    // Silently ignore
  }
}

// --- Progress card (reused from AddPage) ---
function getStepState(status: PageStatus | null, step: 1 | 2 | 3): 'done' | 'active' | 'waiting' {
  if (!status) return 'waiting';
  if (status === 'done') return 'done';

  if (step === 1) {
    if (status === 'queued' || status === 'transcribing') return 'active';
    return 'done';
  }
  if (step === 2) {
    if (status === 'translating') return 'active';
    if (status === 'extracting') return 'done';
    return 'waiting';
  }
  if (step === 3) {
    if (status === 'extracting') return 'active';
    return 'waiting';
  }
  return 'waiting';
}

function StepIndicator({ label, state }: { label: string; state: 'done' | 'active' | 'waiting' }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`text-sm font-semibold flex items-center gap-1.5 ${
          state === 'done'
            ? 'text-success'
            : state === 'active'
            ? 'text-ink font-bold'
            : 'text-muted'
        }`}
      >
        {state === 'done' ? (
          <span className="text-success font-bold">✓</span>
        ) : state === 'active' ? (
          <span className="text-marigold font-bold">●</span>
        ) : (
          <span className="text-muted">○</span>
        )}
        <span>{label}</span>
      </div>
      <div className="w-full h-1 bg-rule rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            state === 'done'
              ? 'w-full bg-success'
              : state === 'active'
              ? 'w-3/4 bg-marigold animate-pulse'
              : 'w-0'
          }`}
        />
      </div>
    </div>
  );
}

function ProgressCard({ status }: { status: PageStatus }) {
  return (
    <div className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepIndicator label="Reading the handwriting" state={getStepState(status, 1)} />
        <StepIndicator label="Translating" state={getStepState(status, 2)} />
        <StepIndicator label="Finding people, places and dates" state={getStepState(status, 3)} />
      </div>
      <p className="text-xs text-muted pt-2 border-t border-rule/50">
        This can take about a minute on a laptop. Everything stays on this computer.
      </p>
    </div>
  );
}

function isProcessing(status: PageStatus): boolean {
  return status === 'queued' || status === 'transcribing' || status === 'translating' || status === 'extracting';
}

export default function PageView() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? parseInt(id, 10) : NaN;
  const navigate = useNavigate();
  const { page, loading, error, setPage, reload } = usePagePolling(numericId);

  const [activeTab, setActiveTab] = useState<TabId>('transcript');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<ApiError | null>(null);
  const refreshPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Deletion state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Highlight span for facts -> transcript cross-referencing
  const [highlightSpan, setHighlightSpan] = useState<{ start: number; end: number } | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHighlight = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setHighlightSpan(null);
  }, []);

  // Initialize correction count in localStorage on first load
  const initializedRef = useRef(false);
  useEffect(() => {
    if (page && page.status === 'done' && !initializedRef.current) {
      initializedRef.current = true;
      const saved = getSavedCount(page.id);
      if (saved === null) {
        saveCorrectionCount(page.id, page.transcript.corrections.length);
      }
    }
  }, [page]);

  // Stale detection
  const savedCount = page ? getSavedCount(page.id) : null;
  const currentCount = page?.transcript.corrections.length ?? 0;
  const isStale = savedCount !== null && currentCount > savedCount;
  const staleCount = isStale ? currentCount - (savedCount ?? 0) : 0;

  // Clean up polling and highlight timer on unmount
  useEffect(() => {
    return () => {
      if (refreshPollRef.current) clearInterval(refreshPollRef.current);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!page || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);

    const refreshStartTime = Date.now();
    const MAX_REFRESH_MS = 210000; // at least 3 minutes

    try {
      const result = await refreshPage(page.id);
      setPage(result);

      // Start polling
      refreshPollRef.current = setInterval(async () => {
        if (Date.now() - refreshStartTime > MAX_REFRESH_MS) {
          if (refreshPollRef.current) clearInterval(refreshPollRef.current);
          setRefreshing(false);
          setRefreshError(
            new ApiError('model_failed', 'Refresh took too long. Try again.')
          );
          return;
        }
        try {
          const updated = await getPage(page.id);
          setPage(updated);
          if (updated.status === 'done' || updated.status === 'error') {
            if (refreshPollRef.current) clearInterval(refreshPollRef.current);
            setRefreshing(false);
            if (updated.status === 'done') {
              saveCorrectionCount(page.id, updated.transcript.corrections.length);
            }
            if (updated.status === 'error') {
              setRefreshError(
                new ApiError(
                  updated.error?.code || 'unknown',
                  updated.error?.message || 'Refresh failed'
                )
              );
            }
          }
        } catch (err) {
          if (refreshPollRef.current) clearInterval(refreshPollRef.current);
          setRefreshing(false);
          if (err instanceof ApiError) {
            setRefreshError(err);
          }
        }
      }, 1500);
    } catch (err) {
      setRefreshing(false);
      if (err instanceof ApiError) {
        setRefreshError(err);
      }
    }
  }, [page, refreshing, setPage]);

  const handlePageUpdated = useCallback(
    (updatedPage: Page) => {
      setPage(updatedPage);
    },
    [setPage]
  );

  const handleShowInTranscript = useCallback((start?: number | null, end?: number | null) => {
    // Clear any previous timer
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (typeof start === 'number' && typeof end === 'number' && start < end) {
      setHighlightSpan({ start, end });
      // Auto-clear highlight after about 3 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightSpan(null);
        highlightTimeoutRef.current = null;
      }, 3000);
    } else {
      setHighlightSpan(null);
    }
    setActiveTab('transcript');
    // Scroll to highlighted span after tab switch if available
    if (typeof start === 'number') {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  // Clear highlight when switching tabs or pressing Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearHighlight();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearHighlight]);

  const handleConfirmDelete = async () => {
    if (!page || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePage(page.id);
      try {
        localStorage.removeItem(STALE_KEY_PREFIX + page.id);
      } catch {
        // ignore
      }
      setIsDeleting(false);
      setIsConfirmOpen(false);
      navigate('/');
    } catch (err) {
      setIsDeleting(false);
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError((err as Error).message || 'Failed to delete page.');
      }
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setDeleteError(null);
  };

  // --- Render states ---
  if (isNaN(numericId)) {
    return (
      <div className="flex flex-col gap-6 py-4 max-w-2xl mx-auto">
        <ErrorCard code="unknown" message="Page not found." />
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm">
          ← Back to library
        </Link>
      </div>
    );
  }

  if (loading && !page) {
    return (
      <div className="flex flex-col gap-6 py-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-marigold animate-pulse" />
          <span className="text-sm text-muted">Opening page…</span>
        </div>
      </div>
    );
  }

  if (error && !page) {
    const isNotFound = error.message.toLowerCase().includes('not found') || error.code === 'unknown';
    return (
      <div className="flex flex-col gap-6 py-4 max-w-2xl mx-auto">
        <ErrorCard
          code={error.code}
          message={isNotFound ? 'Page not found.' : error.message}
          onRetry={reload}
        />
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm">
          ← Back to library
        </Link>
      </div>
    );
  }

  if (!page) return null;

  const processing = isProcessing(page.status);
  const isError = page.status === 'error';
  const isDone = page.status === 'done';
  const hasTranscript = !!page.transcript.text;

  const tabItems: { id: TabId; label: string; badge?: string }[] = [
    { id: 'transcript', label: 'Transcript' },
    {
      id: 'translation',
      label: `Translation (${page.translation.language || 'English'})`,
    },
    {
      id: 'facts',
      label: 'Facts',
      badge: (page.facts?.length ?? 0) > 0 ? String(page.facts.length) : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/"
            className="text-sm font-medium text-muted hover:text-ink transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm"
          >
            ← Archive
          </Link>
          <span className="text-sm text-muted">/</span>
          <h1 className="font-serif text-lg font-bold text-ink truncate">{page.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-inset border border-rule font-mono text-xs text-muted whitespace-nowrap">
            Read with {page.model}
          </span>
          <button
            type="button"
            disabled={processing}
            title={processing ? 'Wait until this page has finished processing' : 'Delete page'}
            onClick={() => setIsConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B23A2B] bg-panel border border-rule rounded-btn hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
          >
            <TrashIcon width={13} height={13} />
            <span>Delete page</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && page.error && (
        <ErrorCard
          code={page.error.code}
          message={page.error.message}
          onRetry={reload}
        />
      )}

      {/* Processing state: show progress card */}
      {processing && <ProgressCard status={page.status} />}

      {/* Refresh error */}
      {refreshError && (
        <ErrorCard
          code={refreshError.code}
          message={refreshError.message}
          onRetry={handleRefresh}
        />
      )}

      {/* Main two-column layout */}
      {(isDone || hasTranscript) && (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT column: Original page (40%) */}
          <div className="w-full lg:w-[40%] flex-shrink-0">
            <ImageStage imageUrl={page.image_url} title={page.title} />
          </div>

          {/* RIGHT column: Tabs (60%) */}
          <div className="w-full lg:w-[60%] flex flex-col">
            <div className="bg-panel border border-rule rounded-panel flex flex-col">
              {/* Tab bar */}
              <div className="flex items-center border-b border-rule px-5 gap-0 overflow-visible">
                {tabItems.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        clearHighlight();
                        setActiveTab(tab.id);
                      }}
                      className={`relative py-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-t-sm ${
                        isActive
                          ? 'text-ink'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="bg-inset text-muted border border-rule rounded-chip text-xs px-2 py-0.5 font-sans font-medium">
                          {tab.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-marigold z-10" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {/* Stale banner (shown on all tabs) */}
                {(isStale || refreshing) && (
                  <div className="mb-5">
                    <RefreshBanner
                      correctionCount={staleCount}
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                    />
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <TranscriptText
                    page={page}
                    onPageUpdated={handlePageUpdated}
                    highlightSpan={highlightSpan}
                    highlightRef={highlightRef}
                    onClearHighlight={clearHighlight}
                  />
                )}

                {activeTab === 'translation' && (
                  <TranslationPanel page={page} />
                )}

                {activeTab === 'facts' && (
                  <FactsPanel
                    page={page}
                    onShowInTranscript={handleShowInTranscript}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
