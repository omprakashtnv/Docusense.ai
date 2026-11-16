import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { EMBEDDING_DIMENSIONS } from './vector.js';
import { connectDatabase, disconnectDatabase, prisma } from './prisma.js';
import {
  EmbeddingGenerationError,
  type EmbeddingProvider,
} from '../services/gemini-embedding.service.js';
import { indexDocument } from '../services/document-indexing.service.js';
import { HttpError } from '../utils/http-error.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'mock-gemini-embedding-001';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  calls = 0;

  async embedDocuments(texts: string[]): Promise<number[][]> {
    this.calls += 1;
    return texts.map((_text, index) =>
      Array.from({ length: this.dimensions }, (_, dimension) =>
        dimension === index % this.dimensions ? 1 : 0,
      ),
    );
  }

  async embedQuery(): Promise<number[]> {
    return Array.from({ length: this.dimensions }, (_, dimension) => (dimension === 0 ? 1 : 0));
  }
}

class FailingEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'mock-failing-gemini';
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embedDocuments(): Promise<number[][]> {
    throw new EmbeddingGenerationError('Synthetic Gemini failure.');
  }

  async embedQuery(): Promise<number[]> {
    throw new EmbeddingGenerationError('Synthetic Gemini failure.');
  }
}

interface VectorDimensionRow {
  dimensions: number;
  chunkCount: bigint;
}

async function createTestDocument(id: string, cleanedText: string | null): Promise<void> {
  await prisma.document.create({
    data: {
      id,
      originalName: `indexing-verification-${id}.pdf`,
      storedName: `indexing-verification-${id}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 128n,
      filePath: `/tmp/indexing-verification-${id}.pdf`,
      extractedText: cleanedText,
      cleanedText,
      documentType: 'GENERAL',
      processingStatus: 'COMPLETED',
    },
  });
}

async function verifyIndexing(): Promise<void> {
  const indexedDocumentId = randomUUID();
  const failedDocumentId = randomUUID();
  const emptyDocumentId = randomUUID();
  const mockProvider = new MockEmbeddingProvider();
  const longText = [
    `[Page 1]\n${'Paragraph one keeps its sentence structure. '.repeat(45)}`,
    `[Page 2]\n${'Paragraph two provides additional indexing content. '.repeat(45)}`,
  ].join('\n\n');

  await connectDatabase();

  try {
    await createTestDocument(indexedDocumentId, longText);
    const firstResult = await indexDocument(indexedDocumentId, mockProvider);
    assert.equal(firstResult.indexingStatus, 'INDEXED');
    assert.equal(firstResult.alreadyIndexed, false);
    assert.ok(firstResult.chunkCount > 2, 'Long document should produce multiple chunks');

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: indexedDocumentId },
      orderBy: { chunkIndex: 'asc' },
      select: { chunkIndex: true, content: true, pageNumber: true, tokenCount: true },
    });
    assert.equal(chunks.length, firstResult.chunkCount);
    assert.deepEqual(
      chunks.map(({ chunkIndex }) => chunkIndex),
      Array.from({ length: chunks.length }, (_, index) => index),
      'Chunk indexes must be sequential',
    );
    assert.ok(
      chunks.every(({ content }) => content.trim().length > 0),
      'Chunks cannot be empty',
    );
    assert.ok(
      chunks.every(({ tokenCount }) => (tokenCount ?? 0) > 0),
      'Token counts are missing',
    );
    assert.deepEqual(
      [...new Set(chunks.map(({ pageNumber }) => pageNumber))],
      [1, 2],
      'Page metadata was not preserved',
    );

    const dimensions = await prisma.$queryRaw<VectorDimensionRow[]>`
      SELECT
        MIN(vector_dims("embedding"))::integer AS "dimensions",
        COUNT(*) AS "chunkCount"
      FROM "DocumentChunk"
      WHERE "documentId" = ${indexedDocumentId}
        AND "embedding" IS NOT NULL
    `;
    assert.equal(dimensions[0]?.dimensions, EMBEDDING_DIMENSIONS);
    assert.equal(Number(dimensions[0]?.chunkCount), chunks.length);

    const secondResult = await indexDocument(indexedDocumentId, mockProvider);
    assert.equal(secondResult.alreadyIndexed, true, 'Re-index should be idempotent');
    assert.equal(mockProvider.calls, 1, 'Idempotent re-index should not call the provider again');
    assert.equal(
      await prisma.documentChunk.count({ where: { documentId: indexedDocumentId } }),
      chunks.length,
      'Re-index created duplicate chunks',
    );

    await createTestDocument(failedDocumentId, 'A valid document whose embedding request fails.');
    await assert.rejects(
      indexDocument(failedDocumentId, new FailingEmbeddingProvider()),
      (error: unknown) => error instanceof HttpError && error.statusCode === 502,
    );
    const failedDocument = await prisma.document.findUniqueOrThrow({
      where: { id: failedDocumentId },
    });
    assert.equal(failedDocument.indexingStatus, 'FAILED');
    assert.equal(failedDocument.chunkCount, 0);
    assert.equal(await prisma.documentChunk.count({ where: { documentId: failedDocumentId } }), 0);

    await createTestDocument(emptyDocumentId, null);
    await assert.rejects(
      indexDocument(emptyDocumentId, mockProvider),
      (error: unknown) => error instanceof HttpError && error.statusCode === 409,
    );

    await prisma.document.delete({ where: { id: indexedDocumentId } });
    assert.equal(
      await prisma.documentChunk.count({ where: { documentId: indexedDocumentId } }),
      0,
      'Document deletion did not cascade to chunks',
    );

    console.log(
      JSON.stringify(
        {
          mockProvider: true,
          chunksCreated: chunks.length,
          pageNumbers: [...new Set(chunks.map(({ pageNumber }) => pageNumber))],
          embeddingDimensions: dimensions[0]?.dimensions,
          vectorsStored: Number(dimensions[0]?.chunkCount),
          idempotentReindex: true,
          partialFailureCleanup: true,
          emptyDocumentRejected: true,
          cascadeDeletes: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.document
      .deleteMany({ where: { id: { in: [indexedDocumentId, failedDocumentId, emptyDocumentId] } } })
      .catch(() => undefined);
    await disconnectDatabase();
  }
}

verifyIndexing().catch((error: unknown) => {
  console.error('Indexing verification failed.', error);
  process.exitCode = 1;
});
