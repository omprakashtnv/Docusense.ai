import { readFile } from 'node:fs/promises';

import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

import { DOCX_MIME_TYPE, PDF_MIME_TYPE } from '../utils/document-file.js';
import { extractPdfTextWithOcr } from './ocr.service.js';
import { getTextMetrics, shouldUseOcr } from './text-cleaning.service.js';

const MAX_PDF_PAGES = 500;

export interface DocumentExtractionResult {
  text: string;
  ocrUsed: boolean;
  pageCount: number | null;
}

export class EmptyDocumentError extends Error {
  constructor() {
    super('No meaningful text could be extracted from the document.');
    this.name = 'EmptyDocumentError';
  }
}

async function extractNativePdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    maxImageSize: 16_777_216,
  });

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF exceeds the ${MAX_PDF_PAGES}-page extraction limit.`);
    }

    const result = await extractText(pdf, { mergePages: false });
    const text = result.text
      .map((pageText, index) => `[Page ${index + 1}]\n${pageText.trim()}`)
      .join('\n\n');
    return { text: text.trim(), pageCount: result.totalPages };
  } finally {
    await pdf.cleanup();
  }
}

async function extractPdfContent(buffer: Buffer): Promise<DocumentExtractionResult> {
  const nativeResult = await extractNativePdfText(buffer);

  if (!shouldUseOcr(nativeResult.text)) {
    return { text: nativeResult.text, ocrUsed: false, pageCount: nativeResult.pageCount };
  }

  try {
    const ocrResult = await extractPdfTextWithOcr(buffer);
    return { text: ocrResult.text, ocrUsed: true, pageCount: ocrResult.pageCount };
  } catch (error) {
    // A small amount of usable native text is safer than failing the whole document when OCR fails.
    if (getTextMetrics(nativeResult.text).meaningfulCharacters >= 2) {
      return { text: nativeResult.text, ocrUsed: false, pageCount: nativeResult.pageCount };
    }

    throw error;
  }
}

async function extractDocxContent(buffer: Buffer): Promise<DocumentExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value.trim(), ocrUsed: false, pageCount: null };
}

export async function extractDocumentContent(
  filePath: string,
  mimeType: string,
): Promise<DocumentExtractionResult> {
  const buffer = await readFile(filePath);
  let result: DocumentExtractionResult;

  if (mimeType === PDF_MIME_TYPE) {
    result = await extractPdfContent(buffer);
  } else if (mimeType === DOCX_MIME_TYPE) {
    result = await extractDocxContent(buffer);
  } else {
    throw new Error('Unsupported document type.');
  }

  if (getTextMetrics(result.text).meaningfulCharacters < 2) {
    throw new EmptyDocumentError();
  }

  return result;
}
