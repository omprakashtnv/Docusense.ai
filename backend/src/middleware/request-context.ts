import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  const startedAt = performance.now();
  response.on('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        event: 'http_request',
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs,
      }),
    );
  });

  next();
}
