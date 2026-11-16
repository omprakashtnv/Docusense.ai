import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../utils/http-error.js';

export function notFound(_request: Request, _response: Response, next: NextFunction): void {
  next(new HttpError(404, 'Route not found.'));
}
