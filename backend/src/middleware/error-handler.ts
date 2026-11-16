import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { HttpError } from '../utils/http-error.js';

interface ErrorResponse {
  error: {
    message: string;
    requestId?: string;
  };
}

export function errorHandler(
  error: Error,
  request: Request,
  response: Response<ErrorResponse>,
  _next: NextFunction,
): void {
  let statusCode = error instanceof HttpError ? error.statusCode : 500;
  let message = statusCode === 500 ? 'Internal server error' : error.message;

  if (error instanceof multer.MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. The maximum size is 10 MB.'
        : 'The uploaded file could not be accepted.';
  }

  if (statusCode >= 500) {
    console.error(
      JSON.stringify({
        event: 'request_error',
        requestId: response.locals.requestId,
        method: request.method,
        path: request.path,
        errorName: error.name,
      }),
    );
  }

  response.status(statusCode).json({
    error: {
      message,
      ...(response.locals.requestId ? { requestId: response.locals.requestId as string } : {}),
    },
  });
}
