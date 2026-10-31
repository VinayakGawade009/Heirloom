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

// 4. In transcript.corrections, start and end are the position of the corrected word in the CURRENT transcript text, i.e. start to start + new.length (not the old word's span).
export interface Correction {
  start: number;
  end: number;
  old: string;
  new: string;
  at: string;
}

// 2. Before a transcript exists (status queued or transcribing), transcript is {text: '', uncertain: [], corrections: []}, translation.text is '', and facts is [].
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

// 1. Page.error is null when there is no error, otherwise an object {code, message} where code is one of our error codes.
export interface PageError {
  code: ErrorCode;
  message: string;
}

// 3. POST refresh is asynchronous: refreshPage returns the Page immediately with status 'translating', not 'done'. The page then goes translating, extracting, done (about 2 seconds per stage, computed from elapsed time when getPage is polled). Fact positions are recomputed when it reaches 'done'.
export interface Page {
  id: number;
  title: string;
  image_url: string;
  status: PageStatus;
  error: { code: ErrorCode; message: string } | null;
  model: string;
  language_hint: string | null;
  writer: string | null;
  approx_date: string | null;
  transcript: Transcript;
  translation: Translation;
  facts: Fact[];
  added_at?: string;
  createdAtMs?: number;
  refreshStartedAtMs?: number;
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
