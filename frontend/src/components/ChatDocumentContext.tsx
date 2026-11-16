import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import type { DocumentIndexingResult, DocumentSummary } from '../types/document';
import { fileTypeLabel, formatFileSize } from '../utils/format';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

const MAX_CHAT_DOCUMENTS = 20;

interface ChatDocumentContextProps {
  documents: DocumentSummary[];
  selectedDocumentIds: string[];
  uploading: boolean;
  uploadProgress: number;
  indexingId: string | null;
  onSelectedDocumentIdsChange: (documentIds: string[]) => void;
  onUploadAndIndex: (file: File) => Promise<string | null>;
  onIndexDocument: (
    document: Pick<DocumentSummary, 'id' | 'originalName'>,
  ) => Promise<DocumentIndexingResult | null>;
  onClose: () => void;
}

export function ChatDocumentContext({
  documents,
  selectedDocumentIds,
  uploading,
  uploadProgress,
  indexingId,
  onSelectedDocumentIdsChange,
  onUploadAndIndex,
  onIndexDocument,
  onClose,
}: ChatDocumentContextProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const addSelection = (documentId: string) => {
    if (selectedDocumentIds.includes(documentId)) return;
    onSelectedDocumentIdsChange([...selectedDocumentIds, documentId].slice(0, MAX_CHAT_DOCUMENTS));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const documentId = await onUploadAndIndex(file);
    if (documentId) addSelection(documentId);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0) ?? null;
    event.target.value = '';
    void handleFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading) void handleFile(event.dataTransfer.files.item(0));
  };

  const toggleDocument = (documentId: string) => {
    if (selectedDocumentIds.includes(documentId)) {
      onSelectedDocumentIdsChange(selectedDocumentIds.filter((id) => id !== documentId));
      return;
    }
    addSelection(documentId);
  };

  const prepareDocument = async (document: DocumentSummary) => {
    setPreparingId(document.id);
    try {
      const result = await onIndexDocument(document);
      if (result) addSelection(document.id);
    } finally {
      setPreparingId(null);
    }
  };

  const busy = uploading || Boolean(indexingId) || Boolean(preparingId);

  return (
    <section
      className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5"
      aria-label="Choose documents for this conversation"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Documents for this conversation</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Upload a new file or limit answers to selected indexed documents.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close document chooser"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInput}
        disabled={busy}
      />
      <div
        className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-4 text-center transition sm:flex-row sm:justify-between sm:text-left ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Icon name="upload" className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">
              {uploading ? 'Uploading and preparing document…' : 'Add a PDF or DOCX'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {uploading ? `${uploadProgress}% uploaded` : 'Drop here or browse · Maximum 10 MB'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 sm:mt-0"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Available documents
        </p>
        <button
          type="button"
          onClick={() => onSelectedDocumentIdsChange([])}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
            selectedDocumentIds.length === 0
              ? 'bg-indigo-100 text-indigo-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Use all indexed
        </button>
      </div>

      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
        {documents.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            No documents yet. Upload your first file above.
          </p>
        )}
        {documents.map((document) => {
          const indexed = document.indexingStatus === 'INDEXED';
          const selected = selectedDocumentIds.includes(document.id);
          const preparing = preparingId === document.id || indexingId === document.id;
          return (
            <div
              key={document.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => indexed && toggleDocument(document.id)}
                disabled={
                  !indexed || (selectedDocumentIds.length >= MAX_CHAT_DOCUMENTS && !selected)
                }
                className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                  selected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-transparent'
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={`${selected ? 'Remove' : 'Add'} ${document.originalName} ${selected ? 'from' : 'to'} this conversation`}
                aria-pressed={selected}
              >
                <Icon name="check" className="size-3" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {document.originalName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {fileTypeLabel(document.mimeType)} · {formatFileSize(document.fileSize)} ·{' '}
                  {indexed
                    ? 'Ready'
                    : document.processingStatus === 'FAILED'
                      ? 'Failed'
                      : 'Not indexed'}
                </p>
              </div>
              {!indexed && document.processingStatus === 'COMPLETED' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void prepareDocument(document)}
                >
                  {preparing ? 'Preparing…' : 'Prepare'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {selectedDocumentIds.length === 0
          ? 'Answers can use every successfully indexed document.'
          : `${selectedDocumentIds.length} document${selectedDocumentIds.length === 1 ? '' : 's'} selected. Answers will use only this context.`}
      </p>
    </section>
  );
}
