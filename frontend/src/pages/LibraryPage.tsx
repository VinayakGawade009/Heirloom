import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import type { PageSummary } from '../types';
import { listPages, deletePage, ApiError } from '../api';
import PaperThumb from '../components/PaperThumb';
import StatusPill from '../components/StatusPill';
import ErrorCard from '../components/ErrorCard';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { PlusIcon, FileTextIcon, TrashIcon, CheckIcon } from '../components/icons';

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return 'Added recently';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `Added ${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
  } catch {
    // ignore
  }
  return `Added ${dateStr}`;
}

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-tint text-ink rounded-[3px] px-1 font-serif">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function LibraryPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Deletion state
  const [deletingPage, setDeletingPage] = useState<PageSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await listPages(q || undefined);
        if (isMountedRef.current) {
          setPages(res.pages);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          if (err instanceof ApiError) {
            setError(err);
          } else {
            setError(new ApiError('unknown', (err as Error).message || 'Failed to load archive'));
          }
        }
      } finally {
        if (!isBackground && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [q]
  );

  // Initial load when q changes
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Polling: while any listed page has a status other than done or error,
  // call listPages again every 3 seconds. Stop otherwise and stop when leaving the screen.
  useEffect(() => {
    const hasPending = pages.some(
      (p) => p.status !== 'done' && p.status !== 'error'
    );
    if (!hasPending) return;

    const intervalId = setInterval(() => {
      loadData(true);
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pages, loadData]);

  const handleConfirmDelete = async () => {
    if (!deletingPage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePage(deletingPage.id);
      // Remove card from list without reload
      if (isMountedRef.current) {
        setPages((prev) => prev.filter((p) => p.id !== deletingPage.id));
        // Clear localStorage keys
        try {
          localStorage.removeItem(`heirloom_corrections_count_${deletingPage.id}`);
        } catch {
          // ignore
        }
        setDeletingPage(null);
        setIsDeleting(false);

        // Show brief success toast for ~3 seconds
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage('Page deleted.');
        toastTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setToastMessage(null);
          }
          toastTimerRef.current = null;
        }, 3000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsDeleting(false);
        if (err instanceof ApiError) {
          setDeleteError(err.message);
        } else {
          setDeleteError((err as Error).message || 'Failed to delete page.');
        }
      }
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeletingPage(null);
    setDeleteError(null);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted text-[16px] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-rule border-t-marigold rounded-full animate-spin" />
        <p>Loading your archive…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 max-w-2xl mx-auto">
        <ErrorCard code={error.code} message={error.message} onRetry={() => loadData(false)} />
      </div>
    );
  }

  // --- With Search Query ---
  if (q.trim()) {
    const matchesCount = pages.length;

    return (
      <div className="flex flex-col gap-6">
        {toastMessage && (
          <div
            role="status"
            className="bg-panel border border-rule text-ink px-4 py-2.5 rounded-card shadow-xs flex items-center gap-2 text-sm font-medium"
          >
            <CheckIcon width={16} height={16} className="text-success flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="border-b border-rule pb-4 flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
              Results for '{q}'
            </h1>
            <span className="bg-inset text-muted border border-rule rounded-chip text-xs px-2.5 py-1 font-semibold">
              {matchesCount} {matchesCount === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-medium text-muted hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm"
          >
            Clear search
          </button>
        </div>

        {matchesCount === 0 ? (
          <EmptyState
            message={`No pages match '${q}'.`}
            action={
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center bg-panel hover:bg-inset border border-rule text-ink font-sans text-sm font-semibold px-4 py-2 rounded-btn transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
              >
                Clear search
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {pages.map((page) => {
              const isInProgress = page.status !== 'done' && page.status !== 'error';

              return (
                <div key={page.id} className="relative group">
                  <Link
                    to={`/pages/${page.id}`}
                    className="bg-panel border border-rule hover:border-marigold rounded-panel p-5 pr-14 flex items-start gap-5 transition-colors"
                  >
                    {/* Small thumbnail */}
                    <div className="w-16 flex-shrink-0">
                      {page.thumbnail_url ? (
                        <img
                          src={page.thumbnail_url}
                          alt={page.title}
                          className="w-16 aspect-[3/4] object-cover rounded-sm border border-rule"
                        />
                      ) : (
                        <PaperThumb compact />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="font-serif text-xl font-bold text-ink group-hover:text-black truncate">
                          {page.title}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted font-medium flex-shrink-0">
                          <FileTextIcon width={13} height={13} />
                          Found in transcript
                        </span>
                      </div>

                      {page.snippet && (
                        <p className="font-serif text-base text-ink/90 leading-relaxed line-clamp-3">
                          “<HighlightedSnippet text={page.snippet} query={q} />”
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted pt-1">
                        <span>{formatShortDate(page.added_at)}</span>
                        <StatusPill status={page.status} />
                      </div>
                    </div>
                  </Link>

                  {/* Trash icon button */}
                  <button
                    type="button"
                    aria-label="Delete page"
                    disabled={isInProgress}
                    title={isInProgress ? 'Wait until this page has finished processing' : 'Delete page'}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingPage(page);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-panel/90 border border-rule/70 text-muted hover:text-danger hover:bg-panel active:bg-tint/40 shadow-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 z-10"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          isOpen={!!deletingPage}
          isDeleting={isDeleting}
          errorMessage={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    );
  }

  // --- Without Search Query: Empty State ---
  if (pages.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {toastMessage && (
          <div
            role="status"
            className="bg-panel border border-rule text-ink px-4 py-2.5 rounded-card shadow-xs flex items-center gap-2 text-sm font-medium"
          >
            <CheckIcon width={16} height={16} className="text-success flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <EmptyState
          message="No pages yet. Add a photo of an old letter to begin."
          action={
            <Link
              to="/add"
              className="inline-flex items-center gap-1.5 bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-sm font-semibold px-5 py-2.5 rounded-btn transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
            >
              <PlusIcon width={16} height={16} />
              <span>Add page</span>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {toastMessage && (
        <div
          role="status"
          className="bg-panel border border-rule text-ink px-4 py-2.5 rounded-card shadow-xs flex items-center gap-2 text-sm font-medium"
        >
          <CheckIcon width={16} height={16} className="text-success flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-rule pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Your archive</h1>
          <p className="text-sm text-muted mt-1">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} · all stored on this computer
          </p>
        </div>
      </div>

      {/* Grid: 4 columns (3 on narrower screens, e.g. md:grid-cols-3 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pages.map((page) => {
          const isInProgress =
            page.status !== 'done' && page.status !== 'error';

          return (
            <div key={page.id} className="relative group">
              <Link
                to={`/pages/${page.id}`}
                className="bg-panel border border-rule hover:border-marigold rounded-panel p-4 flex flex-col justify-between transition-colors h-full cursor-pointer"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="w-full relative mb-3">
                    {page.thumbnail_url ? (
                      <img
                        src={page.thumbnail_url}
                        alt={page.title}
                        className="w-full aspect-[3/4] object-cover rounded-sm border border-rule"
                      />
                    ) : (
                      <PaperThumb />
                    )}

                    {/* Thin marigold progress bar for in-progress cards */}
                    {isInProgress && (
                      <div className="w-full h-1 bg-rule rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-marigold animate-pulse w-3/4 rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="font-serif text-lg font-semibold text-ink group-hover:text-black leading-snug line-clamp-2">
                    {page.title}
                  </h2>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-rule/50 mt-3">
                  <span>{formatShortDate(page.added_at)}</span>
                  <StatusPill status={page.status} />
                </div>
              </Link>

              {/* Trash icon button */}
              <button
                type="button"
                aria-label="Delete page"
                disabled={isInProgress}
                title={isInProgress ? 'Wait until this page has finished processing' : 'Delete page'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeletingPage(page);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-panel/90 border border-rule/70 text-muted hover:text-danger hover:bg-panel active:bg-tint/40 shadow-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 z-10"
              >
                <TrashIcon width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deletingPage}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
