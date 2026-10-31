import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getHealth, listPages, saveSettings, ApiError } from '../api';
import type { Health } from '../types';
import { useSettings } from '../state/SettingsContext';
import ErrorCard from '../components/ErrorCard';
import { CheckIcon } from '../components/icons';

export default function SettingsPage() {
  const { settings, reload: reloadSettings, loading: settingsLoading } = useSettings();

  const [health, setHealth] = useState<Health | null>(null);
  const [archiveCount, setArchiveCount] = useState<number>(0);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<ApiError | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state when settings context loads or changes
  useEffect(() => {
    if (settings) {
      setSelectedModel(settings.model);
      setSelectedLanguage(settings.target_language);
    }
  }, [settings]);

  const loadHealthAndArchive = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);

    // Try loading archive count (safe even if offline/no model)
    try {
      const p = await listPages();
      setArchiveCount(p.pages.length);
    } catch {
      // Keep existing or 0
    }

    try {
      const h = await getHealth();
      setHealth(h);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ollama_not_running') {
        setHealth({ ollama_running: false, installed_models: [] });
      } else if (err instanceof ApiError) {
        setHealthError(err);
      } else {
        setHealthError(
          new ApiError('unknown', (err as Error).message || 'Failed to connect to local health service')
        );
      }
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthAndArchive();
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, [loadHealthAndArchive]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await saveSettings({
        model: selectedModel,
        target_language: selectedLanguage,
      });
      await reloadSettings();
      setSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      // If error occurs while saving
      if (err instanceof ApiError) {
        setHealthError(err);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = (e: React.MouseEvent) => {
    e.preventDefault();
    if (settings) {
      setSelectedModel(settings.model);
      setSelectedLanguage(settings.target_language);
    }
  };

  // Loading state
  if ((healthLoading && !health) || (settingsLoading && !settings)) {
    return (
      <div className="py-12 text-center text-muted text-[16px] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-rule border-t-marigold rounded-full animate-spin" />
        <p>Loading settings…</p>
      </div>
    );
  }

  // Fatal health call error (other than ollama_not_running which is handled inline)
  if (healthError && !health) {
    return (
      <div className="max-w-[720px] mx-auto flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Settings</h1>
          <p className="text-[15px] text-muted">
            Choose the reading model and the language for translations.
          </p>
        </div>
        <ErrorCard
          code={healthError.code}
          message={healthError.message}
          onRetry={loadHealthAndArchive}
        />
      </div>
    );
  }

  const installedModels = health?.installed_models ?? [];
  const isInstalled = selectedModel ? installedModels.includes(selectedModel) : true;
  const isOllamaRunning = health?.ollama_running ?? false;

  return (
    <div className="max-w-[720px] mx-auto flex flex-col gap-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Settings</h1>
        <p className="text-[15px] text-muted">
          Choose the reading model and the language for translations.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Card 1: Reading model */}
        <section className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-3">
          <label htmlFor="reading-model" className="font-serif text-lg font-bold text-ink">
            Reading model
          </label>
          <select
            id="reading-model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3.5 py-2.5 font-sans text-[15px] text-ink bg-panel border border-rule rounded-btn cursor-pointer focus:outline-none"
          >
            {!isInstalled && selectedModel && (
              <option value={selectedModel}>
                {selectedModel} (not installed)
              </option>
            )}
            {installedModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted leading-relaxed">
            Pick a model that fits this laptop. Smaller models are faster, larger ones may read handwriting better. Only models installed on this computer are listed.
          </p>
        </section>

        {/* Card 2: Translate into */}
        <section className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-3">
          <label htmlFor="target-language" className="font-serif text-lg font-bold text-ink">
            Translate into
          </label>
          <select
            id="target-language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3.5 py-2.5 font-sans text-[15px] text-ink bg-panel border border-rule rounded-btn cursor-pointer focus:outline-none"
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Marathi">Marathi</option>
            <option value="Spanish">Spanish</option>
          </select>
        </section>

        {/* Card 3: Status */}
        <section className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-1">
          <h2 className="font-serif text-lg font-bold text-ink mb-1">Status</h2>
          <div className="flex flex-col text-[15px]">
            <div className="flex items-center justify-between py-3 border-b border-rule/60">
              <span className="text-muted font-medium">Local model service</span>
              {isOllamaRunning ? (
                <span className="text-success font-semibold flex items-center gap-1.5">
                  <span className="text-xs">●</span> Running
                </span>
              ) : (
                <span className="text-danger font-semibold flex items-center gap-1.5">
                  <span className="text-xs">●</span> Not running
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-rule/60">
              <span className="text-muted font-medium">Network</span>
              <span className="text-ink font-medium">Not needed</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-muted font-medium">Archive</span>
              <span className="text-ink font-medium">
                {archiveCount} {archiveCount === 1 ? 'page' : 'pages'} stored on this computer
              </span>
            </div>
          </div>
        </section>

        {/* Problem Card: Model not installed */}
        {!isInstalled && selectedModel && (
          <ErrorCard
            code="model_not_installed"
            modelName={selectedModel}
          />
        )}

        {/* Problem Card: Ollama not running */}
        {!isOllamaRunning && (
          <ErrorCard
            code="ollama_not_running"
            onRetry={loadHealthAndArchive}
            retryText="Check again"
          />
        )}

        {/* Actions section */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-[15px] font-semibold px-5 py-2.5 rounded-btn transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="font-sans text-[15px] font-medium text-muted hover:text-ink cursor-pointer transition-colors"
            >
              Discard changes
            </button>
            {saved && (
              <span className="font-sans text-sm font-semibold text-success flex items-center gap-1.5">
                <CheckIcon width={16} height={16} />
                <span>Saved.</span>
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            Changing the model only affects pages you add afterwards.
          </p>
        </div>
      </form>
    </div>
  );
}
