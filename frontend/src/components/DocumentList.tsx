import type { DocumentSummary, IndexingStatus, ProcessingStatus } from '../types/document';

interface DocumentListProps {
  documents: DocumentSummary[];
  loading: boolean;
  deletingId: string | null;
  onView: (document: DocumentSummary) => void;
  onDelete: (document: DocumentSummary) => void;
}

const statusStyles: Record<ProcessingStatus, string> = {
  UPLOADED: 'bg-blue-400/10 text-blue-300 ring-blue-400/20',
  PROCESSING: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  COMPLETED: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  FAILED: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
};

const indexingStyles: Record<IndexingStatus, string> = {
  NOT_INDEXED: 'bg-slate-400/10 text-slate-400 ring-slate-400/20',
  INDEXING: 'bg-violet-400/10 text-violet-300 ring-violet-400/20',
  INDEXED: 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/20',
  FAILED: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getFileLabel(mimeType: string): string {
  return mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
}

function getCategoryLabel(documentType: string | null): string {
  const knownTypes = ['INVOICE', 'CONTRACT', 'IDENTITY_DOCUMENT', 'RESUME', 'GENERAL'];
  return documentType && knownTypes.includes(documentType)
    ? documentType.replaceAll('_', ' ')
    : 'UNCLASSIFIED';
}

export function DocumentList({
  documents,
  loading,
  deletingId,
  onView,
  onDelete,
}: DocumentListProps) {
  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-400">Loading documents…</p>;
  }

  if (documents.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-base font-medium text-slate-200">Your document library is empty</p>
        <p className="mt-2 text-sm text-slate-500">Upload a PDF or DOCX to extract its text.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800">
      {documents.map((document) => (
        <li key={document.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300 ring-1 ring-slate-700">
              {getFileLabel(document.mimeType)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100">{document.originalName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(document.fileSize)} · {formatDate(document.createdAt)}
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-wide text-cyan-300/80 uppercase">
                {getCategoryLabel(document.documentType)}
              </p>
              {document.processingError && (
                <p className="mt-2 text-xs text-rose-300">{document.processingError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${statusStyles[document.processingStatus]}`}
            >
              {document.processingStatus}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${indexingStyles[document.indexingStatus]}`}
            >
              {document.indexingStatus.replaceAll('_', ' ')}
            </span>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={() => onView(document)}
            >
              View
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-wait disabled:opacity-50"
              onClick={() => onDelete(document)}
              disabled={deletingId === document.id}
              aria-label={`Delete ${document.originalName}`}
            >
              {deletingId === document.id ? (
                <span className="block size-5 animate-spin rounded-full border-2 border-slate-600 border-t-rose-300" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                  <path
                    d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m3 0l-1 13H7L6 7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
