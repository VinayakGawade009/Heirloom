import {
  ApiError,
  type CreatePageMeta,
  type CreatePageResponse,
  type ErrorCode,
  type Health,
  type Page,
  type PageSummary,
  type Settings,
} from './types';
import * as mock from './mock/mockApi';

export { ApiError };

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorCode: ErrorCode = 'unknown';
    let errorMessage = res.statusText || 'Request failed';
    try {
      const data = await res.json();
      if (data && data.error) {
        if (typeof data.error === 'object') {
          errorCode = (data.error.code as ErrorCode) || 'unknown';
          errorMessage = data.error.message || errorMessage;
        } else if (typeof data.error === 'string') {
          errorMessage = data.error;
        }
      } else if (data && data.detail) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else {
          errorMessage = JSON.stringify(data.detail);
        }
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(errorCode, errorMessage);
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<Health> {
  if (USE_MOCK) {
    return mock.getHealth();
  }
  try {
    const res = await fetch('/api/health');
    return await handleResponse<Health>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'ollama_not_running',
      (err as Error).message || 'Failed to connect to local health service'
    );
  }
}

export async function getSettings(): Promise<Settings> {
  if (USE_MOCK) {
    return mock.getSettings();
  }
  try {
    const res = await fetch('/api/settings');
    return await handleResponse<Settings>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to fetch settings'
    );
  }
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  if (USE_MOCK) {
    return mock.saveSettings(settings);
  }
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return await handleResponse<Settings>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to save settings'
    );
  }
}

export async function listPages(q?: string): Promise<{ pages: PageSummary[] }> {
  if (USE_MOCK) {
    return mock.listPages(q);
  }
  try {
    const url = q ? `/api/pages?q=${encodeURIComponent(q)}` : '/api/pages';
    const res = await fetch(url);
    return await handleResponse<{ pages: PageSummary[] }>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to list pages'
    );
  }
}

export async function createPage(
  file: File | Blob,
  meta?: CreatePageMeta
): Promise<CreatePageResponse> {
  if (USE_MOCK) {
    return mock.createPage(file, meta);
  }
  try {
    const formData = new FormData();
    formData.append('image', file);
    if (meta?.language_hint) {
      formData.append('language_hint', meta.language_hint);
    }
    if (meta?.writer) {
      formData.append('writer', meta.writer);
    }
    if (meta?.approx_date) {
      formData.append('approx_date', meta.approx_date);
    }

    const res = await fetch('/api/pages', {
      method: 'POST',
      body: formData,
    });
    return await handleResponse<CreatePageResponse>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to create page'
    );
  }
}

export async function getPage(id: number | string): Promise<Page> {
  if (USE_MOCK) {
    return mock.getPage(id);
  }
  try {
    const res = await fetch(`/api/pages/${id}`);
    return await handleResponse<Page>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || `Failed to fetch page #${id}`
    );
  }
}

export async function addCorrection(
  id: number | string,
  correction: { start: number; end: number; new_text: string }
): Promise<Page> {
  if (USE_MOCK) {
    return mock.addCorrection(id, correction);
  }
  try {
    const res = await fetch(`/api/pages/${id}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correction),
    });
    return await handleResponse<Page>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to add correction'
    );
  }
}

export async function refreshPage(id: number | string): Promise<Page> {
  if (USE_MOCK) {
    return mock.refreshPage(id);
  }
  try {
    const res = await fetch(`/api/pages/${id}/refresh`, {
      method: 'POST',
    });
    return await handleResponse<Page>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || 'Failed to refresh page'
    );
  }
}

export async function deletePage(id: number | string): Promise<{ ok: boolean }> {
  if (USE_MOCK) {
    return mock.deletePage(id);
  }
  try {
    const res = await fetch(`/api/pages/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse<{ ok: boolean }>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'unknown',
      (err as Error).message || `Failed to delete page #${id}`
    );
  }
}
