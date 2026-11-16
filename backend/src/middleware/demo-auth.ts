import { timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';

function keysMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function requireDemoAccess(request: Request, response: Response, next: NextFunction): void {
  if (!env.demoAccessKey) {
    next();
    return;
  }

  const authorization = request.get('authorization');
  const prefix = 'Bearer ';
  const receivedKey = authorization?.startsWith(prefix)
    ? authorization.slice(prefix.length).trim()
    : '';

  if (!receivedKey || !keysMatch(receivedKey, env.demoAccessKey)) {
    response.setHeader('WWW-Authenticate', 'Bearer realm="DocuSense AI Demo"');
    response.status(401).json({ error: { message: 'A valid demo access key is required.' } });
    return;
  }

  next();
}
