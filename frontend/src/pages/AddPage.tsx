import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPage, getPage, ApiError } from '../api';
import type { Page, PageStatus } from '../types';
import ErrorCard from '../components/ErrorCard';
import { UploadIcon, XIcon } from '../components/icons';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFileType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  const hasValidType = validTypes.includes(file.type.toLowerCase());
  const hasValidExt = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
  return hasValidType || hasValidExt;
}

export default function AddPage() {
  const navigate = useNavigate();

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [languageHint, setLanguageHint] = useState('');
  const [writer, setWriter] = useState('');
  const [approxDate, setApproxDate] = useState('');

  // Processing & progress states
  const [submitting, setSubmitting] = useState(false);
  const [createdPageId, setCreatedPageId] = useState<number | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus | null>(null);
  const [pageError, setPageError] = useState<{ code: string; message: string } | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clean up object URLs and timers on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, [previewUrl]);

  const handleSelectFile = (selected: File) => {
    setFileError(null);
    setApiError(null);

    if (!isValidFileType(selected) || selected.size > MAX_FILE_SIZE) {
      setFileError('Please choose a JPG or PNG under 25 MB.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    setSubmitting(false);
    setCreatedPageId(null);
    setPageStatus(null);
    setPageError(null);
    setApiError(null);
  };

  // Start polling when createdPageId is set
  useEffect(() => {
    if (!createdPageId) return;

    const startTime = Date.now();
    const MAX_POLL_MS = 210000; // at least 3 minutes (3.5 minutes)

    const poll = async () => {
      // Timeout check: give up only after at least 3 minutes
      if (Date.now() - startTime > MAX_POLL_MS) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setPageError({
          code: 'model_failed',
          message: 'Processing took too long. Try again.',
        });
        return;
      }

      try {
        const page: Page = await getPage(createdPageId);
        setPageStatus(page.status);

        if (page.status === 'done') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          // When status is done, go to "/pages/{id}" after 1 second
          navTimeoutRef.current = setTimeout(() => {
            navigate(`/pages/${page.id}`);
          }, 1000);
        } else if (page.status === 'error') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPageError(page.error || { code: 'model_failed', message: 'Failed to process page' });
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPageError({ code: err.code, message: err.message });
        }
      }
    };

    // Initial check
    poll();
    pollIntervalRef.current = setInterval(poll, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [createdPageId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setApiError(null);
    setPageError(null);

    try {
      const res = await createPage(file, {
        language_hint: languageHint.trim() || null,
        writer: writer.trim() || null,
        approx_date: approxDate.trim() || null,
      });

      setCreatedPageId(res.id);
      setPageStatus(res.status);

      if (res.status === 'error') {
        setPageError({ code: 'model_failed', message: 'The model could not read this page.' });
      }
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        setApiError(err);
      } else {
        setApiError(new ApiError('unknown', (err as Error).message || 'Failed to create page'));
      }
    }
  };

  // Determine active step markers
  // Step 1: transcribing ("Reading the handwriting")
  // Step 2: translating ("Translating")
  // Step 3: extracting ("Finding people, places and dates")
  const getStepState = (stepNumber: 1 | 2 | 3): 'done' | 'active' | 'waiting' => {
    if (!pageStatus) return 'waiting';
    if (pageStatus === 'done') return 'done';

    if (stepNumber === 1) {
      if (pageStatus === 'queued' || pageStatus === 'transcribing') return 'active';
      return 'done'; // translating, extracting
    }

    if (stepNumber === 2) {
      if (pageStatus === 'translating') return 'active';
      if (pageStatus === 'extracting') return 'done';
      return 'waiting';
    }

    if (stepNumber === 3) {
      if (pageStatus === 'extracting') return 'active';
      return 'waiting';
    }

    return 'waiting';
  };

  return (
    <div className="max-w-[720px] mx-auto flex flex-col gap-7 py-4">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-2">
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink transition-colors">
          ← Library / New page
        </Link>
        <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">Add a page</h1>
        <p className="text-[15px] text-muted">
          Photos stay on this computer. Nothing is uploaded anywhere.
        </p>
      </div>

      {/* Global Error from createPage */}
      {apiError && (
        <ErrorCard
          code={apiError.code}
          message={apiError.message}
          onRetry={() => {
            setApiError(null);
          }}
        />
      )}

      {/* When processing, show Progress Card and/or Error */}
      {createdPageId !== null && (
        <div className="flex flex-col gap-6">
          {pageError ? (
            <ErrorCard
              code={pageError.code}
              message={pageError.message}
              onRetry={resetForm}
            />
          ) : (
            <div className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                {(() => {
                  const state = getStepState(1);
                  return (
                    <div className="flex flex-col gap-2">
                      <div
                        className={`text-sm font-semibold flex items-center gap-1.5 ${
                          state === 'done'
                            ? 'text-success'
                            : state === 'active'
                            ? 'text-ink font-bold'
                            : 'text-muted'
                        }`}
                      >
                        {state === 'done' ? (
                          <span className="text-success font-bold">✓</span>
                        ) : state === 'active' ? (
                          <span className="text-marigold font-bold">●</span>
                        ) : (
                          <span className="text-muted">○</span>
                        )}
                        <span>Reading the handwriting</span>
                      </div>
                      <div className="w-full h-1 bg-rule rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            state === 'done'
                              ? 'w-full bg-success'
                              : state === 'active'
                              ? 'w-3/4 bg-marigold animate-pulse'
                              : 'w-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Step 2 */}
                {(() => {
                  const state = getStepState(2);
                  return (
                    <div className="flex flex-col gap-2">
                      <div
                        className={`text-sm font-semibold flex items-center gap-1.5 ${
                          state === 'done'
                            ? 'text-success'
                            : state === 'active'
                            ? 'text-ink font-bold'
                            : 'text-muted'
                        }`}
                      >
                        {state === 'done' ? (
                          <span className="text-success font-bold">✓</span>
                        ) : state === 'active' ? (
                          <span className="text-marigold font-bold">●</span>
                        ) : (
                          <span className="text-muted">○</span>
                        )}
                        <span>Translating</span>
                      </div>
                      <div className="w-full h-1 bg-rule rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            state === 'done'
                              ? 'w-full bg-success'
                              : state === 'active'
                              ? 'w-3/4 bg-marigold animate-pulse'
                              : 'w-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Step 3 */}
                {(() => {
                  const state = getStepState(3);
                  return (
                    <div className="flex flex-col gap-2">
                      <div
                        className={`text-sm font-semibold flex items-center gap-1.5 ${
                          state === 'done'
                            ? 'text-success'
                            : state === 'active'
                            ? 'text-ink font-bold'
                            : 'text-muted'
                        }`}
                      >
                        {state === 'done' ? (
                          <span className="text-success font-bold">✓</span>
                        ) : state === 'active' ? (
                          <span className="text-marigold font-bold">●</span>
                        ) : (
                          <span className="text-muted">○</span>
                        )}
                        <span>Finding people, places and dates</span>
                      </div>
                      <div className="w-full h-1 bg-rule rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            state === 'done'
                              ? 'w-full bg-success'
                              : state === 'active'
                              ? 'w-3/4 bg-marigold animate-pulse'
                              : 'w-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <p className="text-xs text-muted pt-2 border-t border-rule/50">
                This can take about a minute on a laptop. Everything stays on this computer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Upload Form (hidden or disabled once submitted, or reset on retry) */}
      {!createdPageId && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* File input (hidden) */}
          <label htmlFor="file-upload" className="sr-only">
            Upload page photo
          </label>
          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
          />

          {/* Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-panel p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors ${
              isDragging
                ? 'border-marigold bg-tint/20'
                : file
                ? 'border-rule bg-panel'
                : 'border-rule bg-panel hover:bg-inset/30'
            }`}
          >
            {file && previewUrl ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative group">
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-52 max-w-full object-contain rounded-sm border border-rule"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute -top-2 -right-2 bg-panel hover:bg-danger hover:text-white border border-rule rounded-full p-1 text-ink cursor-pointer transition-colors shadow-none"
                    aria-label="Remove selected file"
                  >
                    <XIcon width={16} height={16} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="font-sans text-[15px] font-semibold text-ink break-all">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-muted hover:text-ink underline cursor-pointer mt-1"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {/* CSS paper sheet illustration */}
                <div
                  className="w-12 h-16 bg-[#FAF4E6] border border-rule rounded-sm p-2 flex flex-col justify-around relative mb-1 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  aria-hidden="true"
                >
                  <div className="absolute top-0 right-0 w-3 h-3 border-b border-l border-rule bg-inset" />
                  <div className="h-[1px] bg-rule w-[60%]" />
                  <div className="h-[1px] bg-rule w-[85%]" />
                  <div className="h-[1px] bg-rule w-[75%]" />
                  <div className="h-[1px] bg-rule w-[50%]" />
                </div>

                <div className="font-sans text-[16px] font-semibold text-ink">
                  Drop a photo here or choose a file
                </div>
                <div className="text-sm text-muted">
                  JPG or PNG, one page at a time (up to 25 MB)
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1.5 bg-panel hover:bg-inset border border-rule text-ink font-sans text-sm font-semibold px-4 py-2 rounded-btn cursor-pointer transition-colors"
                >
                  <UploadIcon width={16} height={16} />
                  <span>Choose file</span>
                </button>
              </div>
            )}

            {fileError && (
              <p className="text-sm font-medium text-danger mt-1">{fileError}</p>
            )}
          </div>

          {/* Optional Fields Card */}
          <div className="bg-panel border border-rule rounded-panel p-6 flex flex-col gap-4">
            <h2 className="font-serif text-lg font-bold text-ink">
              Optional, helps the model
            </h2>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="language-hint" className="font-sans text-sm font-semibold text-ink">
                Language or script
              </label>
              <input
                id="language-hint"
                type="text"
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                placeholder="e.g. Hindi in Devanagari"
                className="w-full px-3.5 py-2.5 font-sans text-[15px] text-ink bg-white border border-rule rounded-input placeholder:text-muted/60 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="writer" className="font-sans text-sm font-semibold text-ink">
                Who wrote it
              </label>
              <input
                id="writer"
                type="text"
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
                placeholder="e.g. Nani or Uncle Ramesh"
                className="w-full px-3.5 py-2.5 font-sans text-[15px] text-ink bg-white border border-rule rounded-input placeholder:text-muted/60 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="approx-date" className="font-sans text-sm font-semibold text-ink">
                Approximate date
              </label>
              <input
                id="approx-date"
                type="text"
                value={approxDate}
                onChange={(e) => setApproxDate(e.target.value)}
                placeholder="e.g. around 1952"
                className="w-full px-3.5 py-2.5 font-sans text-[15px] text-ink bg-white border border-rule rounded-input placeholder:text-muted/60 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={!file || submitting}
              className={`inline-flex items-center justify-center font-sans text-[15px] font-semibold px-6 py-2.5 rounded-btn transition-colors ${
                !file || submitting
                  ? 'bg-rule text-muted cursor-not-allowed opacity-60'
                  : 'bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink cursor-pointer'
              }`}
            >
              Add and read this page
            </button>
            <Link
              to="/"
              className="text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
