import { useCallback, useEffect, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getDocument } from '../services/documents.api';
import type { DocumentDetail } from '../types/document';
import { fileTypeLabel, formatDate, formatFileSize, formatLabel } from '../utils/format';

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not found';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DocumentDetailPage({
  documentId,
  indexing,
  onBack,
  onIndex,
}: {
  documentId: string;
  indexing: boolean;
  onBack: () => void;
  onIndex: (document: DocumentDetail) => Promise<unknown>;
}) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocument(await getDocument(documentId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load document details.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    void getDocument(documentId)
      .then((result) => {
        if (!cancelled) setDocument(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Could not load document details.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) return <LoadingState label="Loading document intelligence…" />;
  if (error || !document) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-rose-700">{error ?? 'Document not found.'}</p>
        <Button className="mt-5" variant="secondary" onClick={onBack}>
          Back to documents
        </Button>
      </Card>
    );
  }

  const structuredEntries = document.structuredData
    ? Object.entries(document.structuredData).filter(([key]) => key !== 'type')
    : [];

  const handleIndex = async () => {
    await onIndex(document);
    await load();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <Icon name="back" className="size-4" />
        Back to documents
      </button>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-indigo-600 uppercase">
            Document intelligence
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {document.originalName}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={document.processingStatus} />
            <StatusBadge status={document.indexingStatus} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {formatLabel(document.documentType ?? 'UNCLASSIFIED')}
            </span>
          </div>
        </div>
        {document.processingStatus === 'COMPLETED' && document.indexingStatus !== 'INDEXED' && (
          <Button
            disabled={indexing || document.indexingStatus === 'INDEXING'}
            onClick={() => void handleIndex()}
            icon={<Icon name="database" className="size-4" />}
          >
            {indexing
              ? 'Indexing…'
              : document.indexingStatus === 'FAILED'
                ? 'Retry indexing'
                : 'Index document'}
          </Button>
        )}
      </div>

      {(document.processingError || document.indexingError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Processing needs attention</p>
          <p className="mt-1">{document.processingError ?? document.indexingError}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['File type', fileTypeLabel(document.mimeType)],
          ['File size', formatFileSize(document.fileSize)],
          ['Uploaded', formatDate(document.createdAt)],
          ['Indexed chunks', String(document.chunkCount)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Classification</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Document type</dt>
                <dd className="font-medium text-slate-900">
                  {formatLabel(document.documentType ?? 'UNCLASSIFIED')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">OCR used</dt>
                <dd className="font-medium text-slate-900">
                  {document.ocrUsed ? `Yes · ${document.ocrPageCount ?? 0} pages` : 'No'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Embedding model</dt>
                <dd className="max-w-[14rem] text-right font-medium break-words text-slate-900">
                  {document.embeddingModel ?? 'Not indexed'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Indexed at</dt>
                <dd className="text-right font-medium text-slate-900">
                  {document.indexedAt ? formatDate(document.indexedAt) : 'Not indexed'}
                </dd>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Structured fields</h2>
            {structuredEntries.length > 0 ? (
              <dl className="mt-4 divide-y divide-slate-100">
                {structuredEntries.map(([key, value]) => (
                  <div key={key} className="py-3 first:pt-0">
                    <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      {formatLabel(key)}
                    </dt>
                    <dd
                      className={`mt-1 text-sm ${value == null ? 'text-slate-400' : 'text-slate-800'}`}
                    >
                      {displayValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No category-specific fields were found.</p>
            )}
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Document text</h2>
            <p className="mt-1 text-xs text-slate-500">Cleaned text used by downstream indexing</p>
          </div>
          <pre className="max-h-[44rem] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-7 text-slate-700">
            {document.cleanedText ?? document.extractedText ?? 'No text available.'}
          </pre>
          {document.extractedText && document.cleanedText !== document.extractedText && (
            <details className="border-t border-slate-200">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                View original extracted text
              </summary>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-slate-100 bg-slate-50 p-5 font-sans text-xs leading-6 text-slate-600">
                {document.extractedText}
              </pre>
            </details>
          )}
        </Card>
      </section>
    </div>
  );
}
