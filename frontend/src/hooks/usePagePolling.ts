import { useState, useEffect, useRef, useCallback } from 'react';
import { getPage, ApiError } from '../api';
import type { Page } from '../types';

export interface UsePagePollingResult {
  page: Page | null;
  loading: boolean;
  error: ApiError | null;
  /** Replace the page object in state (e.g. after a correction) */
  setPage: (page: Page) => void;
  /** Re-fetch and restart polling if status is not terminal */
  reload: () => void;
}

const POLL_INTERVAL = 1500;

function isTerminal(status: string): boolean {
  return status === 'done' || status === 'error';
}

export function usePagePolling(id: string | number): UsePagePollingResult {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchPage = useCallback(async () => {
    try {
      const p = await getPage(id);
      if (!mountedRef.current) return;
      setPage(p);
      setError(null);
      setLoading(false);
      if (isTerminal(p.status)) {
        stopPolling();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setLoading(false);
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new ApiError('unknown', (err as Error).message || 'Failed to load page'));
      }
      stopPolling();
    }
  }, [id, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(fetchPage, POLL_INTERVAL);
  }, [fetchPage, stopPolling]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPage().then(() => {
      // After initial fetch, start polling if not terminal
      if (mountedRef.current) {
        // Check current page state via a re-fetch
        // The fetchPage already set the page, so check it via another approach
        // We just start polling and let the interval handle it
        startPolling();
      }
    });
  }, [fetchPage, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    fetchPage().then(() => {
      if (mountedRef.current) {
        startPolling();
      }
    });

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { page, loading, error, setPage, reload };
}

