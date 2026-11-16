import { setDocumentChunkEmbedding } from '../database/vector.js';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { IndexingStatus, ProcessingStatus } from '../generated/prisma/enums.js';
import { HttpError } from '../utils/http-error.js';
import { chunkDocumentText } from './text-chunking.service.js';
import {
  EmbeddingConfigurationError,
  EmbeddingGenerationError,
  GeminiEmbeddingService,
  type EmbeddingProvider,
} from './gemini-embedding.service.js';

export interface DocumentIndexingResult {
  documentId: string;
  indexingStatus: 'INDEXED';
  chunkCount: number;
  embeddingModel: string;
  indexedAt: string;
  alreadyIndexed: boolean;
}

export interface DocumentChunkResponse {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number | null;
  createdAt: string;
}

function safeIndexingError(error: unknown): string {
  if (error instanceof EmbeddingConfigurationError || error instanceof EmbeddingGenerationError) {
    return error.message;
  }

  return 'Document indexing failed. No partial index was saved.';
}

export async function indexDocument(
  documentId: string,
  provider?: EmbeddingProvider,
): Promise<DocumentIndexingResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { _count: { select: { chunks: true } } },
  });

  if (!document) throw new HttpError(404, 'Document not found.');
  if (document.processingStatus !== ProcessingStatus.COMPLETED || !document.cleanedText) {
    throw new HttpError(409, 'Document processing must complete before indexing.');
  }
  if (document.indexingStatus === IndexingStatus.INDEXING) {
    throw new HttpError(409, 'Document indexing is already in progress.');
  }

  const expectedModel = provider?.model ?? env.geminiEmbeddingModel;
  if (
    document.indexingStatus === IndexingStatus.INDEXED &&
    document.embeddingModel === expectedModel &&
    document.chunkCount > 0 &&
    document.chunkCount === document._count.chunks &&
    document.indexedAt
  ) {
    return {
      documentId,
      indexingStatus: 'INDEXED',
      chunkCount: document.chunkCount,
      embeddingModel: document.embeddingModel,
      indexedAt: document.indexedAt.toISOString(),
      alreadyIndexed: true,
    };
  }

  const acquired = await prisma.$transaction(async (transaction) => {
    const update = await transaction.document.updateMany({
      where: { id: documentId, indexingStatus: { not: IndexingStatus.INDEXING } },
      data: {
        indexingStatus: IndexingStatus.INDEXING,
        indexingError: null,
        indexedAt: null,
        chunkCount: 0,
        embeddingModel: null,
      },
    });

    if (update.count === 1) {
      await transaction.documentChunk.deleteMany({ where: { documentId } });
    }

    return update.count === 1;
  });

  if (!acquired) throw new HttpError(409, 'Document indexing is already in progress.');

  try {
    const chunks = await chunkDocumentText(document.cleanedText);
    if (chunks.length === 0) throw new Error('Chunking produced no content.');

    const activeProvider = provider ?? new GeminiEmbeddingService();
    if (activeProvider.dimensions !== env.geminiEmbeddingDimensions) {
      throw new EmbeddingGenerationError(
        `Embedding provider must return ${env.geminiEmbeddingDimensions}-dimension vectors.`,
      );
    }

    const embeddings = await activeProvider.embedDocuments(chunks.map(({ content }) => content));

    if (embeddings.length !== chunks.length) {
      throw new EmbeddingGenerationError(
        'Embedding count does not match the document chunk count.',
      );
    }
    if (embeddings.some((embedding) => embedding.length !== env.geminiEmbeddingDimensions)) {
      throw new EmbeddingGenerationError(
        `Every embedding must contain exactly ${env.geminiEmbeddingDimensions} values.`,
      );
    }

    const indexedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      for (const [index, chunk] of chunks.entries()) {
        const createdChunk = await transaction.documentChunk.create({
          data: {
            documentId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            tokenCount: chunk.tokenCount,
          },
        });

        await setDocumentChunkEmbedding(createdChunk.id, embeddings[index] ?? [], transaction);
      }

      await transaction.document.update({
        where: { id: documentId },
        data: {
          indexingStatus: IndexingStatus.INDEXED,
          indexingError: null,
          indexedAt,
          chunkCount: chunks.length,
          embeddingModel: activeProvider.model,
        },
      });
    });

    return {
      documentId,
      indexingStatus: 'INDEXED',
      chunkCount: chunks.length,
      embeddingModel: activeProvider.model,
      indexedAt: indexedAt.toISOString(),
      alreadyIndexed: false,
    };
  } catch (error) {
    const message = safeIndexingError(error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexingStatus: IndexingStatus.FAILED,
        indexingError: message,
        indexedAt: null,
        chunkCount: 0,
        embeddingModel: null,
      },
    });

    if (error instanceof EmbeddingConfigurationError) throw new HttpError(503, message);
    if (error instanceof EmbeddingGenerationError) throw new HttpError(502, message);
    throw new HttpError(500, message);
  }
}

export async function listDocumentChunks(documentId: string): Promise<DocumentChunkResponse[]> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true },
  });
  if (!document) throw new HttpError(404, 'Document not found.');

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
    select: {
      id: true,
      documentId: true,
      content: true,
      chunkIndex: true,
      pageNumber: true,
      tokenCount: true,
      createdAt: true,
    },
  });

  return chunks.map((chunk) => ({
    ...chunk,
    createdAt: chunk.createdAt.toISOString(),
  }));
}
