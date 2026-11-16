import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyDocument } from '../../src/services/document-classification.service.js';
import { extractStructuredData } from '../../src/services/structured-extraction.service.js';
import { chunkDocumentText } from '../../src/services/text-chunking.service.js';
import {
  cleanExtractedText,
  InvalidExtractedTextError,
  shouldUseOcr,
} from '../../src/services/text-cleaning.service.js';

test('text cleaning removes controls and excessive whitespace while preserving structure', () => {
  const cleaned = cleanExtractedText('Invoice\r\n\r\n\r\nTotal:\t USD 25.00\u0000');
  assert.equal(cleaned, 'Invoice\n\nTotal: USD 25.00');
});

test('text cleaning rejects empty or meaningless extraction output', () => {
  assert.throws(() => cleanExtractedText(' \n \u0000 '), InvalidExtractedTextError);
});

test('OCR detection runs only for PDFs with little meaningful native text', () => {
  assert.equal(shouldUseOcr('[Page 1]\n'), true);
  assert.equal(
    shouldUseOcr('[Page 1]\nThis readable page contains enough words to skip OCR.'),
    false,
  );
});

test('classification recognizes supported categories and keeps unknown text general', () => {
  assert.equal(
    classifyDocument('Invoice number: 10\nBill to: Client\nSubtotal: 5\nTax: 1').documentType,
    'INVOICE',
  );
  assert.equal(
    classifyDocument('Agreement between A and B. Effective date. Governing law.').documentType,
    'CONTRACT',
  );
  assert.equal(
    classifyDocument('Resume\nProfessional experience\nEducation\nTechnical skills').documentType,
    'RESUME',
  );
  assert.equal(
    classifyDocument('A short project note with no category markers.').documentType,
    'GENERAL',
  );
});

test('invoice extraction returns deterministic amounts and null for missing values', () => {
  const result = extractStructuredData(
    'INVOICE',
    'Invoice Number: INV-9\nInvoice Date: 2026-01-15\nVendor: Northstar\nSubtotal: USD 100.00\nTax: USD 18.00\nTotal: USD 118.00',
  );
  assert.deepEqual(result, {
    type: 'INVOICE',
    invoiceNumber: 'INV-9',
    invoiceDate: '2026-01-15',
    vendorName: 'Northstar',
    customerName: null,
    subtotal: 100,
    taxAmount: 18,
    totalAmount: 118,
    currency: 'USD',
  });
});

test('chunking preserves page numbers, order, and bounded overlap metadata', async () => {
  const chunks = await chunkDocumentText(
    `[Page 1]\n${'Invoice content and totals. '.repeat(70)}\n[Page 2]\n${'Contract terms and notices. '.repeat(70)}`,
  );
  assert.ok(chunks.length >= 4);
  assert.deepEqual([...new Set(chunks.map(({ pageNumber }) => pageNumber))], [1, 2]);
  assert.deepEqual(
    chunks.map(({ chunkIndex }) => chunkIndex),
    chunks.map((_, index) => index),
  );
  assert.ok(chunks.every(({ tokenCount, content }) => tokenCount > 0 && content.length > 0));
});
