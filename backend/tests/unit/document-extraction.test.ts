import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { extractDocumentContent } from '../../src/services/document-extraction.service.js';
import { DOCX_MIME_TYPE, PDF_MIME_TYPE } from '../../src/utils/document-file.js';
import { createSyntheticDocx, createSyntheticPdf } from '../helpers/synthetic-files.js';

test('native PDF and DOCX extraction return synthetic text without OCR', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'docusense-extraction-'));
  try {
    const pdfPath = join(directory, 'sample.pdf');
    const docxPath = join(directory, 'sample.docx');
    await writeFile(
      pdfPath,
      createSyntheticPdf('Synthetic PDF invoice number INV-42 total USD 25.00'),
    );
    await writeFile(
      docxPath,
      createSyntheticDocx('Synthetic DOCX contract effective date 2026-01-15'),
    );

    const pdf = await extractDocumentContent(pdfPath, PDF_MIME_TYPE);
    const docx = await extractDocumentContent(docxPath, DOCX_MIME_TYPE);

    assert.match(pdf.text, /Synthetic PDF invoice number INV-42/);
    assert.equal(pdf.ocrUsed, false);
    assert.equal(pdf.pageCount, 1);
    assert.match(docx.text, /Synthetic DOCX contract effective date/);
    assert.equal(docx.ocrUsed, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
