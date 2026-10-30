import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Settings } from '../types';
import { getSettings } from '../api';

export interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
  error: null,
  reload: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSettings();
      setSettings(res);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, reload }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
