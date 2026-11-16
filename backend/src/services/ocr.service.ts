import Tesseract from 'tesseract.js';
import { getDocumentProxy, renderPageAsImage } from 'unpdf';

import { env } from '../config/env.js';
import { getTextMetrics } from './text-cleaning.service.js';

export interface OcrResult {
  text: string;
  pageCount: number;
  failedPages: number[];
}

export class OcrProcessingError extends Error {
  constructor(
    message = 'OCR could not read this PDF. Ensure the file is clear and OCR language data is available.',
  ) {
    super(message);
    this.name = 'OcrProcessingError';
  }
}

export async function extractPdfTextWithOcr(buffer: Buffer): Promise<OcrResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    maxImageSize: 25_000_000,
  });
  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | undefined;

  try {
    if (pdf.numPages > env.ocrMaxPages) {
      throw new OcrProcessingError(
        `OCR is limited to ${env.ocrMaxPages} pages per document. Split this PDF and try again.`,
      );
    }

    const workerOptions: Partial<Tesseract.WorkerOptions> = {};
    if (env.ocrLanguagePath) workerOptions.langPath = env.ocrLanguagePath;

    worker = await Tesseract.createWorker(env.ocrLanguage, Tesseract.OEM.LSTM_ONLY, workerOptions);
    await worker.setParameters({ preserve_interword_spaces: '1' });

    const pages: Array<{ pageNumber: number; text: string }> = [];
    const failedPages: number[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      try {
        // Rendering to PNG is required: Tesseract cannot read a PDF byte stream directly.
        const image = await renderPageAsImage(pdf, pageNumber, {
          canvasImport: () => import('@napi-rs/canvas'),
          format: 'png',
          scale: 2,
        });
        const result = await worker.recognize(Buffer.from(image));
        const pageText = result.data.text.trim();

        if (pageText) pages.push({ pageNumber, text: pageText });
      } catch {
        failedPages.push(pageNumber);
      }
    }

    const text = pages
      .map(({ pageNumber, text: pageText }) => `[Page ${pageNumber}]\n${pageText}`)
      .join('\n\n');

    if (getTextMetrics(text).meaningfulCharacters < 2) {
      throw new OcrProcessingError();
    }

    return { text, pageCount: pdf.numPages, failedPages };
  } catch (error) {
    if (error instanceof OcrProcessingError) throw error;
    throw new OcrProcessingError();
  } finally {
    await worker?.terminate().catch(() => undefined);
    await pdf.cleanup();
  }
}
