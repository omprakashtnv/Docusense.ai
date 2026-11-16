import type { DocumentDetail } from '../types/document';

interface DocumentDetailPanelProps {
  document: DocumentDetail | null;
  loading: boolean;
  error: string | null;
  indexing: boolean;
  onIndex: (document: DocumentDetail) => void;
  onClose: () => void;
}

function formatLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not found';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DocumentDetailPanel({
  document,
  loading,
  error,
  indexing,
  onIndex,
  onClose,
}: DocumentDetailPanelProps) {
  const structuredEntries = document?.structuredData
    ? Object.entries(document.structuredData).filter(([key]) => key !== 'type')
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-[#0a0f1b] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] text-cyan-400 uppercase">
              Document intelligence
            </p>
            <h2
              id="document-detail-title"
              className="mt-2 truncate text-2xl font-semibold text-white"
            >
              {document?.originalName ?? 'Loading document…'}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            aria-label="Close document details"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <span
              className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300"
              aria-label="Loading document intelligence"
            />
          </div>
        )}

        {error && !loading && (
          <div
            className="mt-6 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200 ring-1 ring-rose-400/20"
            role="alert"
          >
            {error}
          </div>
        )}

        {document && !loading && (
          <div className="space-y-8 pt-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/20">
                {(document.documentType ?? 'UNCLASSIFIED').replaceAll('_', ' ')}
              </span>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                {document.processingStatus}
              </span>
              {document.ocrUsed && (
                <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-300 ring-1 ring-violet-400/20">
                  OCR · {document.ocrPageCount ?? 0} page{document.ocrPageCount === 1 ? '' : 's'}
                </span>
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  document.indexingStatus === 'INDEXED'
                    ? 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/20'
                    : document.indexingStatus === 'FAILED'
                      ? 'bg-rose-400/10 text-rose-300 ring-rose-400/20'
                      : 'bg-slate-400/10 text-slate-400 ring-slate-400/20'
                }`}
              >
                {document.indexingStatus.replaceAll('_', ' ')}
              </span>
            </div>

            {document.processingError && (
              <div className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200 ring-1 ring-rose-400/20">
                {document.processingError}
              </div>
            )}

            <section
              className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800"
              aria-labelledby="indexing-heading"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 id="indexing-heading" className="text-sm font-semibold text-white">
                    Vector index
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {document.indexingStatus === 'INDEXED'
                      ? `${document.chunkCount} chunks · ${document.embeddingModel ?? 'Embedding model unavailable'}`
                      : 'Create searchable chunks and Gemini embeddings for this document.'}
                  </p>
                  {document.indexingError && (
                    <p className="mt-2 text-xs text-rose-300">{document.indexingError}</p>
                  )}
                </div>
                {document.indexingStatus !== 'INDEXED' &&
                  document.processingStatus === 'COMPLETED' && (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
                      onClick={() => onIndex(document)}
                      disabled={indexing || document.indexingStatus === 'INDEXING'}
                    >
                      {indexing
                        ? 'Indexing…'
                        : document.indexingStatus === 'FAILED'
                          ? 'Retry indexing'
                          : 'Index document'}
                    </button>
                  )}
              </div>
            </section>

            <section aria-labelledby="structured-heading">
              <h3 id="structured-heading" className="text-sm font-semibold text-white">
                Structured fields
              </h3>
              {structuredEntries.length > 0 ? (
                <dl className="mt-4 grid gap-px overflow-hidden rounded-xl bg-slate-800 ring-1 ring-slate-800 sm:grid-cols-2">
                  {structuredEntries.map(([key, value]) => (
                    <div key={key} className="bg-slate-900 px-4 py-3">
                      <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        {formatLabel(key)}
                      </dt>
                      <dd
                        className={`mt-1.5 text-sm ${value == null ? 'text-slate-600' : 'text-slate-200'}`}
                      >
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-900 p-4 text-sm text-slate-500 ring-1 ring-slate-800">
                  No category-specific fields were found.
                </p>
              )}
            </section>

            <section aria-labelledby="cleaned-text-heading">
              <h3 id="cleaned-text-heading" className="text-sm font-semibold text-white">
                Cleaned text
              </h3>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-sans text-sm leading-6 text-slate-300 ring-1 ring-slate-800">
                {document.cleanedText ?? document.extractedText ?? 'No text available.'}
              </pre>
            </section>

            {document.extractedText && document.cleanedText !== document.extractedText && (
              <details className="rounded-xl bg-slate-900 ring-1 ring-slate-800">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300">
                  Original extracted text
                </summary>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-slate-800 p-4 font-sans text-xs leading-5 text-slate-400">
                  {document.extractedText}
                </pre>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
