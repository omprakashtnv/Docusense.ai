import { prisma } from './prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

export const EMBEDDING_DIMENSIONS = 1536;

export interface SimilarDocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number | null;
  similarity: number;
}

export interface SemanticDocumentChunk extends SimilarDocumentChunk {
  documentName: string;
  documentType: string | null;
}

export interface SemanticVectorSearchOptions {
  topK: number;
  minSimilarity: number;
  embeddingModel: string;
  documentIds: string[];
  documentType: string | null;
}

function toVectorLiteral(embedding: readonly number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding must contain exactly ${EMBEDDING_DIMENSIONS} dimensions.`);
  }

  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new Error('Embedding must contain only finite numbers.');
  }

  return `[${embedding.join(',')}]`;
}

export async function setDocumentChunkEmbedding(
  chunkId: string,
  embedding: readonly number[],
  client: Pick<Prisma.TransactionClient, '$executeRaw'> = prisma,
): Promise<void> {
  const vector = toVectorLiteral(embedding);
  const updatedRows = await client.$executeRaw`
    UPDATE "DocumentChunk"
    SET "embedding" = ${vector}::vector
    WHERE "id" = ${chunkId}
  `;

  if (updatedRows === 0) {
    throw new Error(`Document chunk not found: ${chunkId}`);
  }
}

export async function findSimilarDocumentChunks(
  embedding: readonly number[],
  limit = 10,
): Promise<SimilarDocumentChunk[]> {
  const vector = toVectorLiteral(embedding);
  const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  return prisma.$queryRaw<SimilarDocumentChunk[]>`
    SELECT
      "id",
      "documentId",
      "content",
      "chunkIndex",
      "pageNumber",
      "tokenCount",
      (1 - ("embedding" <=> ${vector}::vector))::double precision AS "similarity"
    FROM "DocumentChunk"
    WHERE "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${vector}::vector
    LIMIT ${normalizedLimit}
  `;
}

export async function searchIndexedDocumentChunks(
  embedding: readonly number[],
  options: SemanticVectorSearchOptions,
): Promise<SemanticDocumentChunk[]> {
  const vector = toVectorLiteral(embedding);

  return prisma.$queryRaw<SemanticDocumentChunk[]>`
    WITH "SearchQuery" AS (
      SELECT ${vector}::vector AS "embedding"
    )
    SELECT
      "chunk"."id",
      "chunk"."documentId",
      "chunk"."content",
      "chunk"."chunkIndex",
      "chunk"."pageNumber",
      "chunk"."tokenCount",
      "document"."originalName" AS "documentName",
      "document"."documentType",
      (1 - ("chunk"."embedding" <=> "SearchQuery"."embedding"))::double precision AS "similarity"
    FROM "DocumentChunk" AS "chunk"
    INNER JOIN "Document" AS "document" ON "document"."id" = "chunk"."documentId"
    CROSS JOIN "SearchQuery"
    WHERE "chunk"."embedding" IS NOT NULL
      AND "document"."indexingStatus" = 'INDEXED'
      AND "document"."embeddingModel" = ${options.embeddingModel}
      AND (${options.documentIds.length === 0} OR "document"."id" = ANY(${options.documentIds}::text[]))
      AND (${options.documentType === null} OR "document"."documentType" = ${options.documentType})
      AND (1 - ("chunk"."embedding" <=> "SearchQuery"."embedding")) >= ${options.minSimilarity}
    ORDER BY "chunk"."embedding" <=> "SearchQuery"."embedding"
    LIMIT ${options.topK}
  `;
}
