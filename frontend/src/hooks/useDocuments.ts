import { useCallback, useEffect, useState } from 'react';

import {
  ApiError,
  deleteDocument,
  indexDocument,
  listDocuments,
  uploadDocument,
} from '../services/documents.api';
import type { DocumentIndexingResult, DocumentSummary } from '../types/document';
import type { FeedbackMessage } from '../components/ui/FeedbackBanner';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!['.pdf', '.docx'].includes(extension)) return 'Choose a PDF or DOCX file.';
  if (file.size > MAX_FILE_SIZE) return 'File is too large. The maximum size is 10 MB.';
  if (file.size === 0) return 'The selected file is empty.';
  return null;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load documents.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listDocuments()
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Could not load documents.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return null;
    }
    setUploading(true);
    setUploadProgress(0);
    setMessage(null);
    try {
      const document = await uploadDocument(file, setUploadProgress);
      setMessage({ type: 'success', text: `${document.originalName} was processed successfully.` });
      return document;
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'The document could not be uploaded.',
      });
      return null;
    } finally {
      setUploading(false);
      await refresh();
    }
  };

  const remove = async (document: DocumentSummary) => {
    setDeletingId(document.id);
    setMessage(null);
    try {
      await deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage({ type: 'success', text: `${document.originalName} was deleted.` });
      return true;
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The document could not be deleted.',
      });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const index = async (
    document: Pick<DocumentSummary, 'id' | 'originalName'>,
  ): Promise<DocumentIndexingResult | null> => {
    setIndexingId(document.id);
    setMessage(null);
    try {
      const result = await indexDocument(document.id);
      setMessage({
        type: 'success',
        text: `${document.originalName} was indexed into ${result.chunkCount} chunk${result.chunkCount === 1 ? '' : 's'}.`,
      });
      return result;
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The document could not be indexed.',
      });
      return null;
    } finally {
      setIndexingId(null);
      await refresh();
    }
  };

  const uploadAndIndex = async (file: File): Promise<string | null> => {
    const document = await upload(file);
    if (!document) return null;
    const result = await index(document);
    return result ? document.id : null;
  };

  return {
    documents,
    loading,
    uploading,
    uploadProgress,
    deletingId,
    indexingId,
    message,
    clearMessage: () => setMessage(null),
    refresh,
    upload,
    uploadAndIndex,
    remove,
    index,
  };
}
