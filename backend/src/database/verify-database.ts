import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { checkDatabaseConnection, connectDatabase, disconnectDatabase, prisma } from './prisma.js';
import {
  EMBEDDING_DIMENSIONS,
  findSimilarDocumentChunks,
  setDocumentChunkEmbedding,
} from './vector.js';

interface ExtensionRow {
  extversion: string;
}

interface ColumnRow {
  formattedType: string;
}

interface IndexRow {
  indexdef: string;
}

interface CountRow {
  count: bigint;
}

async function verifyDatabase(): Promise<void> {
  const documentId = randomUUID();
  const chunkId = randomUUID();
  const sessionId = randomUUID();
  const messageId = randomUUID();

  await connectDatabase();

  try {
    assert.equal(await checkDatabaseConnection(), true, 'Database connection failed');

    const extensions = await prisma.$queryRaw<ExtensionRow[]>`
      SELECT "extversion"
      FROM "pg_extension"
      WHERE "extname" = 'vector'
    `;
    assert.equal(extensions.length, 1, 'pgvector extension is not enabled');

    const columns = await prisma.$queryRaw<ColumnRow[]>`
      SELECT format_type("attribute"."atttypid", "attribute"."atttypmod") AS "formattedType"
      FROM "pg_attribute" AS "attribute"
      INNER JOIN "pg_class" AS "table" ON "table"."oid" = "attribute"."attrelid"
      INNER JOIN "pg_namespace" AS "namespace" ON "namespace"."oid" = "table"."relnamespace"
      WHERE "namespace"."nspname" = 'public'
        AND "table"."relname" = 'DocumentChunk'
        AND "attribute"."attname" = 'embedding'
        AND NOT "attribute"."attisdropped"
    `;
    assert.equal(columns[0]?.formattedType, 'vector(1536)', 'Embedding column is not vector(1536)');

    const indexes = await prisma.$queryRaw<IndexRow[]>`
      SELECT "indexdef"
      FROM "pg_indexes"
      WHERE "schemaname" = 'public'
        AND "indexname" = 'DocumentChunk_embedding_hnsw_idx'
    `;
    assert.match(indexes[0]?.indexdef ?? '', /USING hnsw/iu, 'HNSW vector index is missing');
    assert.match(
      indexes[0]?.indexdef ?? '',
      /vector_cosine_ops/iu,
      'Cosine operator class is missing',
    );

    const foreignKeys = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS "count"
      FROM "information_schema"."table_constraints"
      WHERE "constraint_schema" = 'public'
        AND "constraint_type" = 'FOREIGN KEY'
        AND "constraint_name" IN (
          'DocumentChunk_documentId_fkey',
          'ChatMessage_sessionId_fkey'
        )
    `;
    assert.equal(Number(foreignKeys[0]?.count), 2, 'Expected foreign keys are missing');

    await prisma.document.create({
      data: {
        id: documentId,
        originalName: 'database-verification.pdf',
        storedName: `database-verification-${documentId}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 128n,
        filePath: `/tmp/database-verification-${documentId}.pdf`,
        processingStatus: 'COMPLETED',
      },
    });

    await prisma.documentChunk.create({
      data: {
        id: chunkId,
        documentId,
        content: 'DocuSense AI pgvector verification chunk.',
        chunkIndex: 0,
        pageNumber: 1,
        tokenCount: 7,
      },
    });

    const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) =>
      index === 0 ? 1 : 0,
    );
    await setDocumentChunkEmbedding(chunkId, embedding);

    const similarChunks = await findSimilarDocumentChunks(embedding, 1);
    assert.equal(similarChunks[0]?.id, chunkId, 'Vector search did not return the sample chunk');
    assert.ok(
      Math.abs((similarChunks[0]?.similarity ?? 0) - 1) < 1e-9,
      'Identical vector similarity is not 1',
    );

    await prisma.chatSession.create({
      data: {
        id: sessionId,
        title: 'Database verification',
        messages: {
          create: {
            id: messageId,
            role: 'USER',
            content: 'Does the chat relation work?',
          },
        },
      },
    });

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
    assert.equal(session?.messages[0]?.id, messageId, 'ChatSession messages relation failed');

    await prisma.document.delete({ where: { id: documentId } });
    assert.equal(
      await prisma.documentChunk.count({ where: { id: chunkId } }),
      0,
      'DocumentChunk cascade delete failed',
    );

    await prisma.chatSession.delete({ where: { id: sessionId } });
    assert.equal(
      await prisma.chatMessage.count({ where: { id: messageId } }),
      0,
      'ChatMessage cascade delete failed',
    );

    console.log(
      JSON.stringify(
        {
          connected: true,
          pgvectorVersion: extensions[0]?.extversion,
          embeddingType: columns[0]?.formattedType,
          vectorIndex: 'hnsw/vector_cosine_ops',
          foreignKeys: Number(foreignKeys[0]?.count),
          sampleVectorDimensions: embedding.length,
          sampleSimilarity: similarChunks[0]?.similarity,
          cascadeDeletes: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.document.deleteMany({ where: { id: documentId } }).catch(() => undefined);
    await prisma.chatSession.deleteMany({ where: { id: sessionId } }).catch(() => undefined);
    await disconnectDatabase();
  }
}

verifyDatabase().catch((error: unknown) => {
  console.error('Database verification failed.', error);
  process.exitCode = 1;
});
