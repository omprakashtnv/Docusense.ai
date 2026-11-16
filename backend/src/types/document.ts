import type { DocumentModel } from '../generated/prisma/models/Document.js';

export interface DocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  documentType: string | null;
  processingStatus: DocumentModel['processingStatus'];
  processingError: string | null;
  indexingStatus: DocumentModel['indexingStatus'];
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
  structuredData: unknown;
  ocrUsed: boolean;
  ocrPageCount: number | null;
}

export interface DocumentIntelligence {
  id: string;
  processingStatus: DocumentModel['processingStatus'];
  processingError: string | null;
  documentType: string | null;
  extractedText: string | null;
  cleanedText: string | null;
  structuredData: unknown;
  ocrUsed: boolean;
  ocrPageCount: number | null;
  indexingStatus: DocumentModel['indexingStatus'];
  indexingError: string | null;
  indexedAt: string | null;
  chunkCount: number;
  embeddingModel: string | null;
}

export function toDocumentSummary(document: DocumentModel): DocumentSummary {
  return {
    id: document.id,
    originalName: document.originalName,
    mimeType: document.mimeType,
    fileSize: Number(document.fileSize),
    documentType: document.documentType,
    processingStatus: document.processingStatus,
    processingError: document.processingError,
    indexingStatus: document.indexingStatus,
    indexingError: document.indexingError,
    indexedAt: document.indexedAt?.toISOString() ?? null,
    chunkCount: document.chunkCount,
    embeddingModel: document.embeddingModel,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function toDocumentDetail(document: DocumentModel): DocumentDetail {
  return {
    ...toDocumentSummary(document),
    extractedText: document.extractedText,
    cleanedText: document.cleanedText,
    structuredData: document.structuredData,
    ocrUsed: document.ocrUsed,
    ocrPageCount: document.ocrPageCount,
  };
}

export function toDocumentIntelligence(document: DocumentModel): DocumentIntelligence {
  return {
    id: document.id,
    processingStatus: document.processingStatus,
    processingError: document.processingError,
    documentType: document.documentType,
    extractedText: document.extractedText,
    cleanedText: document.cleanedText,
    structuredData: document.structuredData,
    ocrUsed: document.ocrUsed,
    ocrPageCount: document.ocrPageCount,
    indexingStatus: document.indexingStatus,
    indexingError: document.indexingError,
    indexedAt: document.indexedAt?.toISOString() ?? null,
    chunkCount: document.chunkCount,
    embeddingModel: document.embeddingModel,
  };
}
