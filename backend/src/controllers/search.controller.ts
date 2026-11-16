import type { NextFunction, Request, Response } from 'express';

import { semanticSearch } from '../services/semantic-search.service.js';

export async function searchDocuments(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json(await semanticSearch(request.body));
  } catch (error) {
    next(error);
  }
}
