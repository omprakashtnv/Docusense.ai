import { useMemo, useState } from 'react';

import { UploadDropzone } from '../components/UploadDropzone';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { DocumentSummary } from '../types/document';
import { filterDocuments } from '../utils/documents';
import { fileTypeLabel, formatDate, formatFileSize, formatLabel } from '../utils/format';

const PAGE_SIZE = 8;

export function DocumentsPage({
  documents,
  loading,
  uploading,
  uploadProgress,
  deletingId,
  onUpload,
  onOpen,
  onDelete,
}: {
  documents: DocumentSummary[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  deletingId: string | null;
  onUpload: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (document: DocumentSummary) => Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(documents.length === 0);
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);

  const types = useMemo(
    () =>
      [
        ...new Set(documents.map((document) => document.documentType).filter(Boolean) as string[]),
      ].sort(),
    [documents],
  );
  const filtered = useMemo(
    () => filterDocuments(documents, { query, documentType: type, status }),
    [documents, query, status, type],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDocuments = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const deleted = await onDelete(pendingDelete);
    if (deleted) setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Documents"
        description="Upload, review, index, and manage every document in your workspace."
        action={
          <Button
            icon={<Icon name="upload" className="size-4" />}
            onClick={() => setShowUpload((value) => !value)}
          >
            {showUpload ? 'Hide upload' : 'Upload document'}
          </Button>
        }
      />

      {showUpload && (
        <Card className="p-5">
          <UploadDropzone
            disabled={uploading}
            progress={uploadProgress}
            onFileSelected={onUpload}
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_13rem_13rem]">
          <label className="relative">
            <span className="sr-only">Search documents by filename</span>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by filename"
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            aria-label="Filter by document type"
          >
            <option value="">All document types</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {[
              'UPLOADED',
              'PROCESSING',
              'COMPLETED',
              'FAILED',
              'NOT_INDEXED',
              'INDEXING',
              'INDEXED',
            ].map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState label="Loading document library…" />
        ) : pageDocuments.length === 0 ? (
          <EmptyState
            title={
              documents.length === 0
                ? 'Your document library is empty'
                : 'No documents match these filters'
            }
            description={
              documents.length === 0
                ? 'Upload a PDF or DOCX to extract, classify, and index its content.'
                : 'Change your search or clear a filter to see more documents.'
            }
            action={
              documents.length === 0 ? (
                <Button onClick={() => setShowUpload(true)}>Upload a document</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Document</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3">Processing</th>
                    <th className="px-4 py-3">Index</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                            {fileTypeLabel(document.mimeType)}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-xs truncate text-sm font-semibold text-slate-900">
                              {document.originalName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatFileSize(document.fileSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-slate-600">
                        {formatLabel(document.documentType ?? 'UNCLASSIFIED')}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {formatDate(document.createdAt, false)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={document.processingStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={document.indexingStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpen(document.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                            aria-label={`View ${document.originalName}`}
                          >
                            <Icon name="eye" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(document)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Delete ${document.originalName}`}
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {pageDocuments.map((document) => (
                <li key={document.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                      {fileTypeLabel(document.mimeType)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {document.originalName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(document.fileSize)} ·{' '}
                        {formatDate(document.createdAt, false)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={document.processingStatus} />
                    <StatusBadge status={document.indexingStatus} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpen(document.id)}
                      icon={<Icon name="eye" className="size-4" />}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(document)}
                      icon={<Icon name="trash" className="size-4" />}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete document?"
        description={`“${pendingDelete?.originalName ?? ''}” and its indexed chunks will be permanently removed.`}
        confirmLabel="Delete document"
        busy={pendingDelete?.id === deletingId}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
