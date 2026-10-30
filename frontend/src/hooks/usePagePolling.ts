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
const MAX_POLL_DURATION_MS = 210000; // at least 3 minutes (3.5 minutes)

function isTerminal(status: string): boolean {
  return status === 'done' || status === 'error';
}

export function usePagePolling(id: string | number): UsePagePollingResult {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<number>(Date.now());

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchPage = useCallback(async () => {
    // Timeout check: give up only after at least 3 minutes
    if (Date.now() - startTimeRef.current > MAX_POLL_DURATION_MS) {
      stopPolling();
      if (!mountedRef.current) return;
      setLoading(false);
      setError(new ApiError('model_failed', 'Processing took too long. Try again.'));
      return;
    }

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
    startTimeRef.current = Date.now();
    setLoading(true);
    setError(null);
    fetchPage().then(() => {
      if (mountedRef.current) {
        startPolling();
      }
    });
  }, [fetchPage, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    startTimeRef.current = Date.now();
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

