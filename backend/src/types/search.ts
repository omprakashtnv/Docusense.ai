export const DOCUMENT_TYPES = [
  'INVOICE',
  'CONTRACT',
  'IDENTITY_DOCUMENT',
  'RESUME',
  'GENERAL',
] as const;

export type SearchDocumentType = (typeof DOCUMENT_TYPES)[number];

export interface SemanticSearchRequest {
  query: string;
  topK?: number;
  documentId?: string;
  documentIds?: string[];
  documentType?: SearchDocumentType;
}

export interface SemanticSearchResult {
  chunkId: string;
  content: string;
  documentId: string;
  documentName: string;
  documentType: string | null;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
}

export interface SemanticSearchResponse {
  query: string;
  topK: number;
  similarityThreshold: number;
  filters: {
    documentIds: string[];
    documentType: SearchDocumentType | null;
  };
  results: SemanticSearchResult[];
}
