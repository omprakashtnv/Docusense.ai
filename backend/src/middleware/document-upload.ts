import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { extname } from 'node:path';

import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

import { uploadsDirectory } from '../config/paths.js';
import { removeUploadedFile, validateDocumentType } from '../utils/document-file.js';

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    mkdir(uploadsDirectory, { recursive: true, mode: 0o750 })
      .then(() => callback(null, uploadsDirectory))
      .catch((error: unknown) => callback(error as Error, uploadsDirectory));
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    try {
      // Validate both values synchronously before Multer writes anything to disk.
      validateDocumentType(file.originalname, file.mimetype);
      callback(null, true);
    } catch (error) {
      callback(error as Error);
    }
  },
});

export function uploadSingleDocument(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  upload.single('file')(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const uploadedPath = request.file?.path;
    if (!uploadedPath) {
      next(error);
      return;
    }

    void removeUploadedFile(uploadedPath)
      .catch(() => undefined)
      .finally(() => next(error));
  });
}
