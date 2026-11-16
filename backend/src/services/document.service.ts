import { chmod } from 'node:fs/promises';
import { basename } from 'node:path';

import type { Express } from 'express';

import { prisma } from '../database/prisma.js';
import { ProcessingStatus } from '../generated/prisma/enums.js';
import type { DocumentModel } from '../generated/prisma/models/Document.js';
import { HttpError } from '../utils/http-error.js';
import {
  removeUploadedFile,
  validateDocumentType,
  validateFileSignature,
} from '../utils/document-file.js';
import { processDocument } from './document-processing.service.js';

function safeOriginalName(name: string): string {
  const printableName = Array.from(basename(name))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');

  return printableName.slice(0, 255) || 'document';
}

export async function createDocumentFromUpload(file: Express.Multer.File): Promise<DocumentModel> {
  validateDocumentType(file.originalname, file.mimetype);

  try {
    await chmod(file.path, 0o600);
    await validateFileSignature(file.path, file.mimetype);
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }

  let document: DocumentModel;

  try {
    document = await prisma.document.create({
      data: {
        originalName: safeOriginalName(file.originalname),
        storedName: file.filename,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        filePath: file.path,
        processingStatus: ProcessingStatus.UPLOADED,
      },
    });
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }

  return processDocument(document.id, file.path, file.mimetype);
}

export async function listDocuments(): Promise<DocumentModel[]> {
  return prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getDocument(id: string): Promise<DocumentModel> {
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    throw new HttpError(404, 'Document not found.');
  }

  return document;
}

export async function deleteDocument(id: string): Promise<void> {
  const document = await getDocument(id);

  // DocumentChunk rows are removed by the schema's cascading foreign key.
  await prisma.document.delete({ where: { id } });

  try {
    await removeUploadedFile(document.filePath);
  } catch (error) {
    // The database deletion succeeded, so do not leak a server path or report a false API failure.
    console.error('Failed to remove stored document file after database deletion.', error);
  }
}
