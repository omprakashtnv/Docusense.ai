import assert from 'node:assert/strict';
import { before, test } from 'node:test';

import type { NextFunction, Request, Response } from 'express';

process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'https://demo.example';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DEMO_ACCESS_KEY = 'test-demo-access-key';
process.env.UPLOAD_DIR = '/tmp/docusense-test-uploads';

let requireDemoAccess: (request: Request, response: Response, next: NextFunction) => void;

before(async () => {
  ({ requireDemoAccess } = await import('../../src/middleware/demo-auth.js'));
});

function runMiddleware(authorization?: string) {
  const headers = new Map<string, string>();
  let statusCode = 200;
  let body: unknown;
  let nextCalled = false;

  const request = {
    get(name: string) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    },
  } as Request;
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    status(value: number) {
      statusCode = value;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;

  requireDemoAccess(request, response, () => {
    nextCalled = true;
  });

  return { headers, statusCode, body, nextCalled };
}

test('demo access middleware rejects missing and invalid bearer keys', () => {
  for (const authorization of [undefined, 'Bearer wrong-key', 'Basic test-demo-access-key']) {
    const result = runMiddleware(authorization);
    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.headers.get('www-authenticate'), 'Bearer realm="DocuSense AI Demo"');
    assert.deepEqual(result.body, {
      error: { message: 'A valid demo access key is required.' },
    });
  }
});

test('demo access middleware accepts the configured bearer key', () => {
  const result = runMiddleware('Bearer test-demo-access-key');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body, undefined);
});
