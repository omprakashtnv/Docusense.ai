import { API_BASE_URL, ApiError, apiRequest } from './api-client';
import type {
  DocumentChunk,
  DocumentDetail,
  DocumentIndexingResult,
  DocumentIntelligence,
  DocumentSummary,
} from '../types/document';

export { ApiError };

export async function listDocuments(): Promise<DocumentSummary[]> {
  const result = await apiRequest<{ documents: DocumentSummary[] }>('/documents');
  return result.documents;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const result = await apiRequest<{ document: DocumentDetail }>(`/documents/${id}`);
  return result.document;
}

export async function getDocumentIntelligence(id: string): Promise<DocumentIntelligence> {
  const result = await apiRequest<{ intelligence: DocumentIntelligence }>(
    `/documents/${id}/intelligence`,
  );
  return result.intelligence;
}

export async function indexDocument(id: string): Promise<DocumentIndexingResult> {
  const result = await apiRequest<{ indexing: DocumentIndexingResult }>(`/documents/${id}/index`, {
    method: 'POST',
  });
  return result.indexing;
}

export async function listDocumentChunks(id: string): Promise<DocumentChunk[]> {
  const result = await apiRequest<{ chunks: DocumentChunk[] }>(`/documents/${id}/chunks`);
  return result.chunks;
}

export function uploadDocument(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<DocumentDetail> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    request.open('POST', `${API_BASE_URL}/documents/upload`);
    request.responseType = 'json';
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      const body = request.response as {
        document?: DocumentDetail;
        error?: { message?: string };
      } | null;

      if (request.status >= 200 && request.status < 300 && body?.document) {
        resolve(body.document);
        return;
      }

      reject(new ApiError(body?.error?.message ?? 'Upload failed.', request.status));
    });
    request.addEventListener('error', () => {
      reject(new ApiError('Could not connect to the API.', 0));
    });
    request.send(formData);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await apiRequest<void>(`/documents/${id}`, { method: 'DELETE' });
}
