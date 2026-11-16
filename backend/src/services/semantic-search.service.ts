import { env } from '../config/env.js';
import {
  searchIndexedDocumentChunks,
  type SemanticDocumentChunk,
  type SemanticVectorSearchOptions,
} from '../database/vector.js';
import {
  DOCUMENT_TYPES,
  type SearchDocumentType,
  type SemanticSearchRequest,
  type SemanticSearchResponse,
} from '../types/search.js';
import { HttpError } from '../utils/http-error.js';
import {
  EmbeddingConfigurationError,
  EmbeddingGenerationError,
  GeminiEmbeddingService,
  type EmbeddingProvider,
} from './gemini-embedding.service.js';

const MAX_QUERY_LENGTH = 2_000;
const MAX_DOCUMENT_FILTERS = 50;

type VectorSearch = (
  embedding: readonly number[],
  options: SemanticVectorSearchOptions,
) => Promise<SemanticDocumentChunk[]>;

export interface SemanticSearchDependencies {
  embeddingProvider?: EmbeddingProvider;
  vectorSearch?: VectorSearch;
}

interface NormalizedSearchRequest {
  query: string;
  topK: number;
  documentIds: string[];
  documentType: SearchDocumentType | null;
}

function validateOptionalDocumentId(value: unknown, fieldName: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeSearchRequest(input: unknown): NormalizedSearchRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'A JSON request body is required.');
  }

  const request = input as Partial<SemanticSearchRequest> & Record<string, unknown>;
  if (typeof request.query !== 'string' || !request.query.trim()) {
    throw new HttpError(400, 'Search query must be a non-empty string.');
  }

  const query = request.query.trim();
  if (query.length > MAX_QUERY_LENGTH) {
    throw new HttpError(400, `Search query must not exceed ${MAX_QUERY_LENGTH} characters.`);
  }

  const topK = request.topK ?? env.searchDefaultTopK;
  if (!Number.isInteger(topK) || topK < 1 || topK > env.searchMaxTopK) {
    throw new HttpError(400, `topK must be an integer between 1 and ${env.searchMaxTopK}.`);
  }

  const documentIds: string[] = [];
  const documentId = validateOptionalDocumentId(request.documentId, 'documentId');
  if (documentId) documentIds.push(documentId);

  if (request.documentIds !== undefined) {
    if (!Array.isArray(request.documentIds)) {
      throw new HttpError(400, 'documentIds must be an array of non-empty strings.');
    }
    if (request.documentIds.length > MAX_DOCUMENT_FILTERS) {
      throw new HttpError(400, `documentIds cannot contain more than ${MAX_DOCUMENT_FILTERS} IDs.`);
    }
    for (const value of request.documentIds) {
      const normalized = validateOptionalDocumentId(value, 'Each documentIds value');
      if (normalized) documentIds.push(normalized);
    }
  }

  let documentType: SearchDocumentType | null = null;
  if (request.documentType !== undefined) {
    if (
      typeof request.documentType !== 'string' ||
      !DOCUMENT_TYPES.includes(request.documentType as SearchDocumentType)
    ) {
      throw new HttpError(400, `documentType must be one of: ${DOCUMENT_TYPES.join(', ')}.`);
    }
    documentType = request.documentType as SearchDocumentType;
  }

  return {
    query,
    topK,
    documentIds: [...new Set(documentIds)],
    documentType,
  };
}

export async function semanticSearch(
  input: unknown,
  dependencies: SemanticSearchDependencies = {},
): Promise<SemanticSearchResponse> {
  const request = normalizeSearchRequest(input);
  let provider: EmbeddingProvider;
  let queryEmbedding: number[];

  try {
    provider = dependencies.embeddingProvider ?? new GeminiEmbeddingService();
    if (provider.dimensions !== env.geminiEmbeddingDimensions) {
      throw new EmbeddingGenerationError(
        `Query embedding provider must return ${env.geminiEmbeddingDimensions}-dimension vectors.`,
      );
    }

    queryEmbedding = await provider.embedQuery(request.query);
    if (queryEmbedding.length !== env.geminiEmbeddingDimensions) {
      throw new EmbeddingGenerationError(
        `Query embedding must contain exactly ${env.geminiEmbeddingDimensions} values.`,
      );
    }
  } catch (error) {
    if (error instanceof EmbeddingConfigurationError) throw new HttpError(503, error.message);
    if (error instanceof EmbeddingGenerationError) throw new HttpError(502, error.message);
    throw new HttpError(502, 'Gemini could not generate the search embedding. Try again later.');
  }

  let matches: SemanticDocumentChunk[];
  try {
    const vectorSearch = dependencies.vectorSearch ?? searchIndexedDocumentChunks;
    matches = await vectorSearch(queryEmbedding, {
      topK: request.topK,
      minSimilarity: env.searchMinSimilarity,
      embeddingModel: provider.model,
      documentIds: request.documentIds,
      documentType: request.documentType,
    });
  } catch {
    throw new HttpError(500, 'Semantic search is temporarily unavailable.');
  }

  return {
    query: request.query,
    topK: request.topK,
    similarityThreshold: env.searchMinSimilarity,
    filters: {
      documentIds: request.documentIds,
      documentType: request.documentType,
    },
    results: matches.map((match) => ({
      chunkId: match.id,
      content: match.content,
      documentId: match.documentId,
      documentName: match.documentName,
      documentType: match.documentType,
      chunkIndex: match.chunkIndex,
      pageNumber: match.pageNumber,
      similarity: match.similarity,
    })),
  };
}
