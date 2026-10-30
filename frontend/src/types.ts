export type PageStatus =
  | 'queued'
  | 'transcribing'
  | 'translating'
  | 'extracting'
  | 'done'
  | 'error';

export type ErrorCode =
  | 'ollama_not_running'
  | 'model_not_installed'
  | 'model_failed'
  | 'unknown';

export type FactKind = 'person' | 'place' | 'date' | 'item';

export interface UncertainSpan {
  start: number;
  end: number;
}

export interface Correction {
  start: number;
  end: number;
  old: string;
  new: string;
  at: string;
}

export interface Transcript {
  text: string;
  uncertain: UncertainSpan[];
  corrections: Correction[];
}

export interface Translation {
  language: string;
  text: string;
}

export interface Fact {
  id: number;
  kind: FactKind;
  text: string;
  start: number;
  end: number;
}

export interface PageError {
  code: ErrorCode;
  message: string;
}

export interface Page {
  id: number;
  title: string;
  image_url: string;
  status: PageStatus;
  error: PageError | null;
  model: string;
  language_hint: string | null;
  writer: string | null;
  approx_date: string | null;
  transcript: Transcript;
  translation: Translation | null;
  facts: Fact[];
  added_at?: string;
  createdAtMs?: number;
}

export interface PageSummary {
  id: number;
  title: string;
  thumbnail_url: string;
  added_at: string;
  status: PageStatus;
  snippet?: string;
}

export interface Settings {
  model: string;
  target_language: string;
}

export interface Health {
  ollama_running: boolean;
  installed_models: string[];
}

export interface CreatePageResponse {
  id: number;
  status: PageStatus;
}

export interface CreatePageMeta {
  language_hint?: string | null;
  writer?: string | null;
  approx_date?: string | null;
}

export interface AddCorrectionRequest {
  start: number;
  end: number;
  new_text: string;
}

export class ApiError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
