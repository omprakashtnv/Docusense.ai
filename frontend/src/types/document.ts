export type ProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type IndexingStatus = 'NOT_INDEXED' | 'INDEXING' | 'INDEXED' | 'FAILED';
export type DocumentCategory = 'INVOICE' | 'CONTRACT' | 'IDENTITY_DOCUMENT' | 'RESUME' | 'GENERAL';

export interface DocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  documentType: string | null;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  indexingStatus: IndexingStatus;
  indexingError: string | null;
  indexedAt: string | null;
  chunkCount: number;
  embeddingModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  extractedText: string | null;
  cleanedText: string | null;
  structuredData: Record<string, unknown> | null;
  ocrUsed: boolean;
  ocrPageCount: number | null;
}

export interface DocumentIntelligence {
  id: string;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  documentType: string | null;
  extractedText: string | null;
  cleanedText: string | null;
  structuredData: Record<string, unknown> | null;
  ocrUsed: boolean;
  ocrPageCount: number | null;
  indexingStatus: IndexingStatus;
  indexingError: string | null;
  indexedAt: string | null;
  chunkCount: number;
  embeddingModel: string | null;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number | null;
  createdAt: string;
}

export interface DocumentIndexingResult {
  documentId: string;
  indexingStatus: 'INDEXED';
  chunkCount: number;
  embeddingModel: string;
  indexedAt: string;
  alreadyIndexed: boolean;
}
