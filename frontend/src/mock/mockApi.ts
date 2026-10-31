import {
  ApiError,
  type CreatePageMeta,
  type CreatePageResponse,
  type Fact,
  type Health,
  type Page,
  type PageSummary,
  type Settings,
  type UncertainSpan,
} from '../types';
import { CANNED_PAGE_DATA, SEED_PAGES } from './fixtures';

const STORAGE_PAGES_KEY = 'heirloom_mock_pages';
const STORAGE_SETTINGS_KEY = 'heirloom_mock_settings';

function randomDelay(min = 150, max = 400): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMockParam(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('mock');
    if (fromSearch) return fromSearch;

    if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      return new URLSearchParams(hashQuery).get('mock');
    }
  } catch (e) {
    console.warn('Failed to parse URL query params', e);
  }
  return null;
}

function loadPagesFromStorage(): Page[] {
  try {
    const raw = localStorage.getItem(STORAGE_PAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read pages from localStorage', e);
  }
  const seeds = JSON.parse(JSON.stringify(SEED_PAGES));
  savePagesToStorage(seeds);
  return seeds;
}

function savePagesToStorage(pages: Page[]): void {
  try {
    localStorage.setItem(STORAGE_PAGES_KEY, JSON.stringify(pages));
  } catch (e) {
    console.warn('Failed to write pages to localStorage', e);
  }
}

function loadSettingsFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.model === 'string' &&
        typeof parsed.target_language === 'string'
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read settings from localStorage', e);
  }
  const def: Settings = { model: 'gemma4:e2b', target_language: 'English' };
  saveSettingsToStorage(def);
  return def;
}

function saveSettingsToStorage(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to write settings to localStorage', e);
  }
}

function advancePageProgress(page: Page): boolean {
  if (page.status === 'error') {
    return false;
  }

  let changed = false;

  // 3. POST refresh is asynchronous: advances translating -> extracting -> done (~2s each)
  if (page.refreshStartedAtMs) {
    const elapsed = Date.now() - page.refreshStartedAtMs;
    if (elapsed < 2000) {
      if (page.status !== 'translating') {
        page.status = 'translating';
        changed = true;
      }
    } else if (elapsed < 4000) {
      if (page.status !== 'extracting') {
        page.status = 'extracting';
        changed = true;
      }
    } else {
      page.status = 'done';
      delete page.refreshStartedAtMs;

      // Fact positions are recomputed when it reaches 'done'
      const updatedFacts: Fact[] = [];
      for (const fact of page.facts) {
        const foundIndex = page.transcript.text.indexOf(fact.text);
        if (foundIndex !== -1) {
          updatedFacts.push({
            ...fact,
            start: foundIndex,
            end: foundIndex + fact.text.length,
          });
        }
      }
      page.facts = updatedFacts;
      changed = true;
    }
    return changed;
  }

  // Handle stage progression for newly created pages
  if (page.createdAtMs) {
    const elapsed = Date.now() - page.createdAtMs;

    if (elapsed < 2000) {
      if (page.status !== 'queued') {
        page.status = 'queued';
        changed = true;
      }
      // 2. Before transcript exists, text is '', translation.text is '', facts is []
      if (
        page.transcript.text !== '' ||
        page.translation.text !== '' ||
        page.facts.length !== 0
      ) {
        page.transcript = { text: '', uncertain: [], corrections: [] };
        page.translation = { language: 'English', text: '' };
        page.facts = [];
        changed = true;
      }
    } else if (elapsed < 4000) {
      if (page.status !== 'transcribing') {
        page.status = 'transcribing';
        changed = true;
      }
      if (
        page.transcript.text !== '' ||
        page.translation.text !== '' ||
        page.facts.length !== 0
      ) {
        page.transcript = { text: '', uncertain: [], corrections: [] };
        page.translation = { language: 'English', text: '' };
        page.facts = [];
        changed = true;
      }
    } else if (elapsed < 6000) {
      if (page.status !== 'translating') {
        page.status = 'translating';
        changed = true;
      }
      if (page.transcript.text !== CANNED_PAGE_DATA.transcript) {
        page.transcript.text = CANNED_PAGE_DATA.transcript;
        page.transcript.uncertain = JSON.parse(
          JSON.stringify(CANNED_PAGE_DATA.uncertain)
        );
        page.translation = { language: 'English', text: '' };
        page.facts = [];
        changed = true;
      }
    } else if (elapsed < 8000) {
      if (page.status !== 'extracting') {
        page.status = 'extracting';
        changed = true;
      }
      if (page.translation.text !== CANNED_PAGE_DATA.translation) {
        page.transcript.text = CANNED_PAGE_DATA.transcript;
        page.transcript.uncertain = JSON.parse(
          JSON.stringify(CANNED_PAGE_DATA.uncertain)
        );
        page.translation = {
          language: 'English',
          text: CANNED_PAGE_DATA.translation,
        };
        page.facts = [];
        changed = true;
      }
    } else {
      page.status = 'done';
      page.transcript.text = CANNED_PAGE_DATA.transcript;
      page.transcript.uncertain = JSON.parse(
        JSON.stringify(CANNED_PAGE_DATA.uncertain)
      );
      page.translation = {
        language: 'English',
        text: CANNED_PAGE_DATA.translation,
      };
      page.facts = JSON.parse(JSON.stringify(CANNED_PAGE_DATA.facts));
      delete page.createdAtMs;
      changed = true;
    }
  }

  return changed;
}

function extractSnippet(
  text: string,
  matchIndex: number,
  queryLength: number
): string {
  const targetRadius = 25;
  const start = Math.max(0, matchIndex - targetRadius);
  const end = Math.min(text.length, matchIndex + queryLength + 35);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end).replace(/\n/g, ' ') + suffix;
}

export async function getHealth(): Promise<Health> {
  await randomDelay();
  const mock = getMockParam();

  if (mock === 'ollama_not_running') {
    return {
      ollama_running: false,
      installed_models: ['gemma4:e2b', 'gemma4:e4b'],
    };
  }

  if (mock === 'model_not_installed') {
    return {
      ollama_running: true,
      installed_models: ['gemma4:e4b'],
    };
  }

  return {
    ollama_running: true,
    installed_models: ['gemma4:e2b', 'gemma4:e4b'],
  };
}

export async function getSettings(): Promise<Settings> {
  await randomDelay();
  return loadSettingsFromStorage();
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  await randomDelay();
  saveSettingsToStorage(settings);
  return { ...settings };
}

export async function listPages(q?: string): Promise<{ pages: PageSummary[] }> {
  await randomDelay();
  const pages = loadPagesFromStorage();
  let changed = false;
  for (const p of pages) {
    if (advancePageProgress(p)) changed = true;
  }
  if (changed) savePagesToStorage(pages);

  const query = q?.trim().toLowerCase();

  if (!query) {
    const summaries: PageSummary[] = pages.map((p) => ({
      id: p.id,
      title: p.title,
      thumbnail_url: p.image_url || '',
      added_at: p.added_at || '2026-10-30T10:00:00',
      status: p.status,
    }));
    return { pages: summaries };
  }

  const results: PageSummary[] = [];

  for (const p of pages) {
    let matchedSnippet: string | undefined;

    // 1. Search transcript
    if (p.transcript.text) {
      const idx = p.transcript.text.toLowerCase().indexOf(query);
      if (idx !== -1) {
        matchedSnippet = extractSnippet(p.transcript.text, idx, query.length);
      }
    }

    // 2. Search translation
    if (!matchedSnippet && p.translation.text) {
      const idx = p.translation.text.toLowerCase().indexOf(query);
      if (idx !== -1) {
        matchedSnippet = extractSnippet(p.translation.text, idx, query.length);
      }
    }

    // 3. Search facts
    if (!matchedSnippet && p.facts.length > 0) {
      for (const f of p.facts) {
        const idx = f.text.toLowerCase().indexOf(query);
        if (idx !== -1) {
          matchedSnippet = `Fact (${f.kind}): ${f.text}`;
          break;
        }
      }
    }

    // 4. Search title
    if (!matchedSnippet && p.title.toLowerCase().includes(query)) {
      matchedSnippet = p.title;
    }

    if (matchedSnippet !== undefined) {
      results.push({
        id: p.id,
        title: p.title,
        thumbnail_url: p.image_url || '',
        added_at: p.added_at || '2026-10-30T10:00:00',
        status: p.status,
        snippet: matchedSnippet,
      });
    }
  }

  return { pages: results };
}

export async function createPage(
  _file: File | Blob,
  meta?: CreatePageMeta
): Promise<CreatePageResponse> {
  await randomDelay();
  const mock = getMockParam();

  if (mock === 'ollama_not_running') {
    throw new ApiError('ollama_not_running', 'Ollama is not running');
  }

  const pages = loadPagesFromStorage();
  const nextId =
    pages.length > 0 ? Math.max(...pages.map((p) => p.id)) + 1 : 1;

  const title =
    meta?.writer && meta.writer.trim()
      ? meta.writer.trim()
      : meta?.approx_date && meta.approx_date.trim()
      ? meta.approx_date.trim()
      : `Page ${nextId}`;

  if (mock === 'model_failed') {
    const errorPage: Page = {
      id: nextId,
      title,
      image_url: '',
      status: 'error',
      // 1. Page.error is {code, message} where code is one of our error codes
      error: {
        code: 'model_failed',
        message: 'The model could not read this page.',
      },
      model: 'gemma4:e2b',
      language_hint: meta?.language_hint || null,
      writer: meta?.writer || null,
      approx_date: meta?.approx_date || null,
      transcript: { text: '', uncertain: [], corrections: [] },
      // 2. translation.text is ''
      translation: { language: 'English', text: '' },
      facts: [],
      added_at: new Date().toISOString(),
    };
    pages.push(errorPage);
    savePagesToStorage(pages);
    return { id: nextId, status: 'error' };
  }

  const newPage: Page = {
    id: nextId,
    title,
    image_url: '',
    status: 'queued',
    error: null,
    model: 'gemma4:e2b',
    language_hint: meta?.language_hint || null,
    writer: meta?.writer || null,
    approx_date: meta?.approx_date || null,
    // 2. Before transcript exists, transcript is {text: '', uncertain: [], corrections: []}, translation.text is '', facts is []
    transcript: { text: '', uncertain: [], corrections: [] },
    translation: { language: 'English', text: '' },
    facts: [],
    added_at: new Date().toISOString(),
    createdAtMs: Date.now(),
  };

  pages.push(newPage);
  savePagesToStorage(pages);
  return { id: nextId, status: 'queued' };
}

export async function getPage(id: number | string): Promise<Page> {
  await randomDelay();
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const pages = loadPagesFromStorage();
  const page = pages.find((p) => p.id === numId);

  if (!page) {
    throw new ApiError('unknown', `Page #${id} not found`);
  }

  if (advancePageProgress(page)) {
    savePagesToStorage(pages);
  }

  return JSON.parse(JSON.stringify(page));
}

export async function addCorrection(
  id: number | string,
  correction: { start: number; end: number; new_text: string }
): Promise<Page> {
  await randomDelay();
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const pages = loadPagesFromStorage();
  const page = pages.find((p) => p.id === numId);

  if (!page) {
    throw new ApiError('unknown', `Page #${id} not found`);
  }

  const { start, end, new_text } = correction;
  const currentText = page.transcript.text;

  if (start < 0 || end > currentText.length || start > end) {
    throw new ApiError('unknown', 'Invalid span coordinates');
  }

  const oldText = currentText.slice(start, end);
  const updatedText =
    currentText.slice(0, start) + new_text + currentText.slice(end);
  page.transcript.text = updatedText;

  const lengthDiff = new_text.length - (end - start);

  // Shift previously existing corrections that were positioned after the edited span
  for (const c of page.transcript.corrections) {
    if (c.start >= end) {
      c.start += lengthDiff;
      c.end += lengthDiff;
    }
  }

  // Remove that span from uncertain
  const remainingUncertain: UncertainSpan[] = [];
  for (const u of page.transcript.uncertain) {
    if (u.start === start && u.end === end) {
      continue;
    }
    if (u.start >= end) {
      remainingUncertain.push({
        start: u.start + lengthDiff,
        end: u.end + lengthDiff,
      });
    } else if (u.end <= start) {
      remainingUncertain.push(u);
    } else {
      remainingUncertain.push({
        start: u.start,
        end: Math.max(u.start, u.end + lengthDiff),
      });
    }
  }
  page.transcript.uncertain = remainingUncertain;

  // 4. In transcript.corrections, start and end are the position of the corrected word in the CURRENT transcript text:
  // start to start + new.length
  page.transcript.corrections.push({
    start,
    end: start + new_text.length,
    old: oldText,
    new: new_text,
    at: new Date().toISOString(),
  });

  savePagesToStorage(pages);
  return JSON.parse(JSON.stringify(page));
}

// 3. POST refresh is asynchronous: refreshPage returns the Page immediately with status 'translating', not 'done'.
// The page then goes translating, extracting, done (~2s each, computed from elapsed time when getPage is polled).
export async function refreshPage(id: number | string): Promise<Page> {
  await randomDelay();
  const mock = getMockParam();

  if (mock === 'ollama_not_running') {
    throw new ApiError('ollama_not_running', 'Ollama is not running');
  }

  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const pages = loadPagesFromStorage();
  const page = pages.find((p) => p.id === numId);

  if (!page) {
    throw new ApiError('unknown', `Page #${id} not found`);
  }

  // Return the Page immediately with status 'translating', not 'done'
  page.status = 'translating';
  page.refreshStartedAtMs = Date.now();
  savePagesToStorage(pages);

  return JSON.parse(JSON.stringify(page));
}
