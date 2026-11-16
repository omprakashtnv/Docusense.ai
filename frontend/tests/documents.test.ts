import assert from 'node:assert/strict';
import test from 'node:test';

import type { DocumentSummary } from '../src/types/document.js';
import { filterDocuments, getDocumentStats } from '../src/utils/documents.js';

function makeDocument(overrides: Partial<DocumentSummary>): DocumentSummary {
  return {
    id: crypto.randomUUID(),
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    fileSize: 100,
    documentType: 'GENERAL',
    processingStatus: 'COMPLETED',
    processingError: null,
    indexingStatus: 'NOT_INDEXED',
    indexingError: null,
    indexedAt: null,
    chunkCount: 0,
    embeddingModel: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const documents = [
  makeDocument({
    originalName: 'Invoice-November.pdf',
    documentType: 'INVOICE',
    indexingStatus: 'INDEXED',
  }),
  makeDocument({
    originalName: 'Employment Contract.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    documentType: 'CONTRACT',
  }),
  makeDocument({
    originalName: 'Unreadable.pdf',
    processingStatus: 'FAILED',
    indexingStatus: 'FAILED',
  }),
];

test('dashboard statistics are derived from document states', () => {
  assert.deepEqual(getDocumentStats(documents), {
    total: 3,
    processed: 2,
    indexed: 1,
    failed: 1,
  });
});

test('document filtering matches filenames case-insensitively', () => {
  assert.deepEqual(
    filterDocuments(documents, { query: 'invoice', documentType: '', status: '' }).map(
      ({ originalName }) => originalName,
    ),
    ['Invoice-November.pdf'],
  );
});

test('document filtering combines type and status filters', () => {
  assert.equal(
    filterDocuments(documents, { query: '', documentType: 'INVOICE', status: 'INDEXED' }).length,
    1,
  );
  assert.equal(
    filterDocuments(documents, { query: '', documentType: 'CONTRACT', status: 'INDEXED' }).length,
    0,
  );
});
