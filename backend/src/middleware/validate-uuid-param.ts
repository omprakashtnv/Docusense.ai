import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../utils/http-error.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuidParam(parameterName = 'id') {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const value = request.params[parameterName];
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      next(new HttpError(400, `${parameterName} must be a valid UUID.`));
      return;
    }
    next();
  };
}
