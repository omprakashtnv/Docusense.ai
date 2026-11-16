import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { connectDatabase, disconnectDatabase, prisma } from './prisma.js';
import { EMBEDDING_DIMENSIONS, setDocumentChunkEmbedding } from './vector.js';
import {
  EmbeddingGenerationError,
  type EmbeddingProvider,
} from '../services/gemini-embedding.service.js';
import { semanticSearch } from '../services/semantic-search.service.js';
import { HttpError } from '../utils/http-error.js';

const MOCK_MODEL = 'mock-gemini-embedding-001';

function vector(entries: Array<[number, number]>): number[] {
  const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  for (const [index, value] of entries) values[index] = value;
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return values.map((value) => value / magnitude);
}

function queryVector(text: string): number[] {
  const normalized = text.toLowerCase();
  if (normalized.includes('no matching concept')) return vector([[9, 1]]);
  if (normalized.includes('across documents'))
    return vector([
      [0, 1],
      [1, 1],
    ]);
  if (normalized.includes('termination')) return vector([[1, 1]]);
  return vector([[0, 1]]);
}

class MockSearchEmbeddingProvider implements EmbeddingProvider {
  readonly model = MOCK_MODEL;
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(queryVector);
  }

  async embedQuery(text: string): Promise<number[]> {
    return queryVector(text);
  }
}

class FailingSearchEmbeddingProvider extends MockSearchEmbeddingProvider {
  override async embedQuery(): Promise<number[]> {
    throw new EmbeddingGenerationError('Synthetic Gemini query failure.');
  }
}

interface TestDocumentOptions {
  id: string;
  name: string;
  documentType: string;
  content: string;
  embedding: number[];
  indexed?: boolean;
  embeddingModel?: string;
}

async function createTestDocument(options: TestDocumentOptions): Promise<void> {
  const indexed = options.indexed ?? true;
  await prisma.document
    .create({
      data: {
        id: options.id,
        originalName: options.name,
        storedName: `search-verification-${options.id}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 128n,
        filePath: `/tmp/search-verification-${options.id}.pdf`,
        extractedText: options.content,
        cleanedText: options.content,
        documentType: options.documentType,
        processingStatus: 'COMPLETED',
        indexingStatus: indexed ? 'INDEXED' : 'NOT_INDEXED',
        indexedAt: indexed ? new Date() : null,
        chunkCount: 1,
        embeddingModel: indexed ? (options.embeddingModel ?? MOCK_MODEL) : null,
        chunks: {
          create: {
            content: options.content,
            chunkIndex: 0,
            pageNumber: 1,
            tokenCount: Math.ceil(options.content.length / 4),
          },
        },
      },
      include: { chunks: true },
    })
    .then(async (document) => {
      const chunk = document.chunks[0];
      assert.ok(chunk);
      await setDocumentChunkEmbedding(chunk.id, options.embedding);
    });
}

async function verifySemanticSearch(): Promise<void> {
  const ids = {
    invoice: randomUUID(),
    contract: randomUUID(),
    resume: randomUUID(),
    unindexed: randomUUID(),
    otherModel: randomUUID(),
  };
  const provider = new MockSearchEmbeddingProvider();

  await connectDatabase();

  try {
    await createTestDocument({
      id: ids.invoice,
      name: 'synthetic-invoice.pdf',
      documentType: 'INVOICE',
      content: 'Invoice total amount due is 125 dollars.',
      embedding: vector([[0, 1]]),
    });
    await createTestDocument({
      id: ids.contract,
      name: 'synthetic-contract.pdf',
      documentType: 'CONTRACT',
      content: 'The agreement contains a termination clause and notice period.',
      embedding: vector([
        [0, 0.6],
        [1, 0.8],
      ]),
    });
    await createTestDocument({
      id: ids.resume,
      name: 'synthetic-resume.pdf',
      documentType: 'RESUME',
      content: 'Software engineer with TypeScript experience.',
      embedding: vector([[1, 1]]),
    });
    await createTestDocument({
      id: ids.unindexed,
      name: 'synthetic-unindexed.pdf',
      documentType: 'INVOICE',
      content: 'An unindexed invoice must never be returned.',
      embedding: vector([[0, 1]]),
      indexed: false,
    });
    await createTestDocument({
      id: ids.otherModel,
      name: 'synthetic-other-model.pdf',
      documentType: 'INVOICE',
      content: 'A vector from a different model must never be compared.',
      embedding: vector([[0, 1]]),
      embeddingModel: 'different-embedding-model',
    });

    const dependencies = { embeddingProvider: provider };
    const exact = await semanticSearch(
      { query: 'What is the invoice total amount due?', topK: 5 },
      dependencies,
    );
    assert.equal(exact.results[0]?.documentId, ids.invoice);
    assert.ok(exact.results.every((result) => result.documentId !== ids.unindexed));
    assert.ok(exact.results.every((result) => result.documentId !== ids.otherModel));
    assert.ok(
      exact.results.every(
        (result, index) => index === 0 || exact.results[index - 1]!.similarity >= result.similarity,
      ),
      'Results are not ordered by descending similarity',
    );

    const synonym = await semanticSearch(
      { query: 'How much money is owed for payment?', topK: 5 },
      dependencies,
    );
    assert.equal(synonym.results[0]?.documentId, ids.invoice);

    const acrossDocuments = await semanticSearch(
      { query: 'Compare relevant information across documents', topK: 5 },
      dependencies,
    );
    assert.equal(acrossDocuments.results[0]?.documentId, ids.contract);
    assert.deepEqual(
      new Set(acrossDocuments.results.map((result) => result.documentId)),
      new Set([ids.invoice, ids.contract, ids.resume]),
    );

    const oneDocument = await semanticSearch(
      { query: 'Search across documents', documentId: ids.resume },
      dependencies,
    );
    assert.deepEqual(
      oneDocument.results.map((result) => result.documentId),
      [ids.resume],
    );

    const multipleDocuments = await semanticSearch(
      { query: 'Search across documents', documentIds: [ids.invoice, ids.resume] },
      dependencies,
    );
    assert.deepEqual(
      new Set(multipleDocuments.results.map((result) => result.documentId)),
      new Set([ids.invoice, ids.resume]),
    );

    const typeFilter = await semanticSearch(
      { query: 'termination conditions', documentType: 'CONTRACT' },
      dependencies,
    );
    assert.deepEqual(
      typeFilter.results.map((result) => result.documentId),
      [ids.contract],
    );

    const noMatch = await semanticSearch({ query: 'no matching concept' }, dependencies);
    assert.equal(noMatch.results.length, 0);

    await assert.rejects(
      semanticSearch({ query: '   ' }, dependencies),
      (error: unknown) => error instanceof HttpError && error.statusCode === 400,
    );
    await assert.rejects(
      semanticSearch({ query: 'invoice', topK: 0 }, dependencies),
      (error: unknown) => error instanceof HttpError && error.statusCode === 400,
    );
    await assert.rejects(
      semanticSearch({ query: 'invoice', topK: 10_000 }, dependencies),
      (error: unknown) => error instanceof HttpError && error.statusCode === 400,
    );
    await assert.rejects(
      semanticSearch(
        { query: 'invoice' },
        { embeddingProvider: new FailingSearchEmbeddingProvider() },
      ),
      (error: unknown) => error instanceof HttpError && error.statusCode === 502,
    );
    await assert.rejects(
      semanticSearch(
        { query: 'invoice' },
        {
          embeddingProvider: provider,
          vectorSearch: () => Promise.reject(new Error('Synthetic database failure.')),
        },
      ),
      (error: unknown) => error instanceof HttpError && error.statusCode === 500,
    );

    console.log(
      JSON.stringify(
        {
          exactWordsRankedFirst: true,
          semanticSynonymRankedFirst: true,
          crossDocumentSearch: true,
          oneDocumentFilter: true,
          multipleDocumentFilter: true,
          documentTypeFilter: true,
          emptyResults: true,
          invalidRequestsRejected: true,
          providerFailureHandled: true,
          databaseFailureHandled: true,
          indexedAndModelFilters: true,
          similarityOrdering: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.document.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await disconnectDatabase();
  }
}

verifySemanticSearch().catch((error: unknown) => {
  console.error('Semantic search verification failed.', error);
  process.exitCode = 1;
});
