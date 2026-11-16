import type { DocumentSummary } from '../types/document';

export interface DocumentStats {
  total: number;
  processed: number;
  indexed: number;
  failed: number;
}

export interface DocumentFilters {
  query: string;
  documentType: string;
  status: string;
}

export function getDocumentStats(documents: DocumentSummary[]): DocumentStats {
  return {
    total: documents.length,
    processed: documents.filter((document) => document.processingStatus === 'COMPLETED').length,
    indexed: documents.filter((document) => document.indexingStatus === 'INDEXED').length,
    failed: documents.filter(
      (document) => document.processingStatus === 'FAILED' || document.indexingStatus === 'FAILED',
    ).length,
  };
}

export function filterDocuments(
  documents: DocumentSummary[],
  filters: DocumentFilters,
): DocumentSummary[] {
  const query = filters.query.trim().toLowerCase();

  return documents.filter(
    (document) =>
      (!query || document.originalName.toLowerCase().includes(query)) &&
      (!filters.documentType || document.documentType === filters.documentType) &&
      (!filters.status ||
        document.processingStatus === filters.status ||
        document.indexingStatus === filters.status),
  );
}
