import type { NextFunction, Request, Response } from 'express';

import {
  createDocumentFromUpload,
  deleteDocument,
  getDocument,
  listDocuments,
} from '../services/document.service.js';
import { indexDocument, listDocumentChunks } from '../services/document-indexing.service.js';
import { toDocumentDetail, toDocumentIntelligence, toDocumentSummary } from '../types/document.js';
import { HttpError } from '../utils/http-error.js';

export async function uploadDocument(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.file) {
      throw new HttpError(400, 'A file is required in the "file" form field.');
    }

    const document = await createDocumentFromUpload(request.file);
    const body = toDocumentDetail(document);

    if (document.processingStatus === 'FAILED') {
      response.status(422).json({
        error: { message: document.processingError ?? 'Text extraction failed.' },
        document: body,
      });
      return;
    }

    response.status(201).json({ document: body });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const documents = await listDocuments();
    response.status(200).json({ documents: documents.map(toDocumentSummary) });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ document: toDocumentDetail(await getDocument(request.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentIntelligenceById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({
      intelligence: toDocumentIntelligence(await getDocument(request.params.id)),
    });
  } catch (error) {
    next(error);
  }
}

export async function indexDocumentById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ indexing: await indexDocument(request.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentChunks(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ chunks: await listDocumentChunks(request.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function removeDocument(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteDocument(request.params.id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
