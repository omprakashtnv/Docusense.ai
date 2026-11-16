import { open, unlink } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

import { uploadsDirectory } from '../config/paths.js';
import { HttpError } from './http-error.js';

export const PDF_MIME_TYPE = 'application/pdf';
export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const allowedDocumentTypes = new Map([
  ['.pdf', PDF_MIME_TYPE],
  ['.docx', DOCX_MIME_TYPE],
]);

export function validateDocumentType(originalName: string, mimeType: string): void {
  const extension = extname(originalName).toLowerCase();

  if (allowedDocumentTypes.get(extension) !== mimeType) {
    throw new HttpError(415, 'Only PDF and DOCX files are supported.');
  }
}

export async function validateFileSignature(filePath: string, mimeType: string): Promise<void> {
  const file = await open(filePath, 'r');

  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await file.read(header, 0, header.length, 0);

    const isPdf = mimeType === PDF_MIME_TYPE && header.subarray(0, 5).toString() === '%PDF-';
    const isZip =
      mimeType === DOCX_MIME_TYPE &&
      bytesRead >= 4 &&
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      ((header[2] === 0x03 && header[3] === 0x04) ||
        (header[2] === 0x05 && header[3] === 0x06) ||
        (header[2] === 0x07 && header[3] === 0x08));

    if (!isPdf && !isZip) {
      throw new HttpError(415, 'The file content does not match its PDF or DOCX extension.');
    }
  } finally {
    await file.close();
  }
}

export function assertSafeUploadPath(filePath: string): string {
  const absolutePath = resolve(filePath);
  const pathFromUploads = relative(uploadsDirectory, absolutePath);

  // Only files physically inside the configured upload directory may be removed.
  if (
    pathFromUploads.startsWith('..') ||
    resolve(uploadsDirectory, pathFromUploads) !== absolutePath
  ) {
    throw new HttpError(500, 'Stored document path is invalid.');
  }

  return absolutePath;
}

export async function removeUploadedFile(filePath: string): Promise<void> {
  const safePath = assertSafeUploadPath(filePath);

  try {
    await unlink(safePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
