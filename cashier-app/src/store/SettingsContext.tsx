/**
 * SettingsContext — store-wide config (tax, currency, receipt, etc.).
 * Persisted in localStorage.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { DEFAULT_SETTINGS } from '../domain/seed';
import { storage } from '../lib/storage';
import type { StoreSettings } from '../domain/types';

const STORAGE_KEY = 'settings';

interface SettingsContextValue {
  readonly settings: StoreSettings;
  readonly update: (patch: Partial<StoreSettings>) => void;
  readonly reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(
    () => storage.load<StoreSettings>(STORAGE_KEY, DEFAULT_SETTINGS),
  );

  useEffect(() => { storage.save(STORAGE_KEY, settings); }, [settings]);

  const update = useCallback((patch: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
};
