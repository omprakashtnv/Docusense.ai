import { prisma } from '../database/prisma.js';
import { ProcessingStatus } from '../generated/prisma/enums.js';
import type { DocumentModel } from '../generated/prisma/models/Document.js';
import { classifyDocument } from './document-classification.service.js';
import { EmptyDocumentError, extractDocumentContent } from './document-extraction.service.js';
import { OcrProcessingError } from './ocr.service.js';
import { extractStructuredData } from './structured-extraction.service.js';
import { cleanExtractedText, InvalidExtractedTextError } from './text-cleaning.service.js';

function safeProcessingError(error: unknown): string {
  if (
    error instanceof EmptyDocumentError ||
    error instanceof InvalidExtractedTextError ||
    error instanceof OcrProcessingError
  ) {
    return error.message;
  }

  return 'Document intelligence processing failed. The file may be damaged or unsupported.';
}

export async function processDocument(
  documentId: string,
  filePath: string,
  mimeType: string,
): Promise<DocumentModel> {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      processingStatus: ProcessingStatus.PROCESSING,
      processingError: null,
    },
  });

  try {
    const extraction = await extractDocumentContent(filePath, mimeType);

    // Save raw extractor/OCR output before cleaning so it remains available for debugging.
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: extraction.text,
        ocrUsed: extraction.ocrUsed,
        ocrPageCount: extraction.pageCount,
      },
    });

    const cleanedText = cleanExtractedText(extraction.text);
    const classification = classifyDocument(cleanedText);
    const structuredData = extractStructuredData(classification.documentType, cleanedText);

    return await prisma.document.update({
      where: { id: documentId },
      data: {
        cleanedText,
        documentType: classification.documentType,
        structuredData,
        processingStatus: ProcessingStatus.COMPLETED,
        processingError: null,
      },
    });
  } catch (error) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        processingStatus: ProcessingStatus.FAILED,
        processingError: safeProcessingError(error),
      },
    });
  }
}
