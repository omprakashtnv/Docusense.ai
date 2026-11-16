export interface SemanticSearchRequest {
  query: string;
  topK?: number;
  documentId?: string;
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
    documentType: string | null;
  };
  results: SemanticSearchResult[];
}
