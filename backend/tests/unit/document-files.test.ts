import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DOCX_MIME_TYPE,
  PDF_MIME_TYPE,
  assertSafeUploadPath,
  validateDocumentType,
  validateFileSignature,
} from '../../src/utils/document-file.js';
import { HttpError } from '../../src/utils/http-error.js';
import { createSyntheticDocx, createSyntheticPdf } from '../helpers/synthetic-files.js';

test('document type validation requires matching extension and MIME type', () => {
  assert.doesNotThrow(() => validateDocumentType('report.pdf', PDF_MIME_TYPE));
  assert.doesNotThrow(() => validateDocumentType('report.docx', DOCX_MIME_TYPE));
  assert.throws(() => validateDocumentType('../report.pdf', 'text/plain'), HttpError);
  assert.throws(() => validateDocumentType('report.exe', PDF_MIME_TYPE), HttpError);
});

test('file signature validation accepts synthetic PDF and DOCX and rejects spoofing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'docusense-signatures-'));
  try {
    const pdfPath = join(directory, 'sample.pdf');
    const docxPath = join(directory, 'sample.docx');
    const spoofedPath = join(directory, 'spoofed.pdf');
    await writeFile(pdfPath, createSyntheticPdf('Synthetic PDF content'));
    await writeFile(docxPath, createSyntheticDocx('Synthetic DOCX content'));
    await writeFile(spoofedPath, 'not a pdf');

    await assert.doesNotReject(validateFileSignature(pdfPath, PDF_MIME_TYPE));
    await assert.doesNotReject(validateFileSignature(docxPath, DOCX_MIME_TYPE));
    await assert.rejects(validateFileSignature(spoofedPath, PDF_MIME_TYPE), HttpError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('safe upload path validation rejects paths outside the upload directory', () => {
  assert.throws(() => assertSafeUploadPath('/tmp/not-a-docusense-upload.pdf'), HttpError);
});
