import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { app } from '../../src/app.js';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/database/prisma.js';
import { MAX_UPLOAD_SIZE_BYTES } from '../../src/middleware/document-upload.js';
import { createSyntheticPdf } from '../helpers/synthetic-files.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const createdDocumentIds = new Set<string>();

before(async () => {
  await connectDatabase();
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  for (const id of createdDocumentIds) {
    const document = await prisma.document.findUnique({ where: { id } });
    if (document) await prisma.document.delete({ where: { id } });
  }
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await disconnectDatabase();
});

test('upload, detail, listing, and deletion work with a synthetic PDF', async () => {
  const form = new FormData();
  form.append(
    'file',
    new Blob(
      [
        new Uint8Array(
          createSyntheticPdf('Invoice number INV-API subtotal USD 20 tax USD 2 total USD 22'),
        ),
      ],
      {
        type: 'application/pdf',
      },
    ),
    'synthetic-api-invoice.pdf',
  );

  const upload = await fetch(`${baseUrl}/documents/upload`, { method: 'POST', body: form });
  assert.equal(upload.status, 201);
  const uploaded = (await upload.json()) as { document: { id: string; processingStatus: string } };
  createdDocumentIds.add(uploaded.document.id);
  assert.equal(uploaded.document.processingStatus, 'COMPLETED');

  const detail = await fetch(`${baseUrl}/documents/${uploaded.document.id}`);
  assert.equal(detail.status, 200);
  const detailBody = (await detail.json()) as {
    document: { originalName: string; cleanedText: string; storedName?: string; filePath?: string };
  };
  assert.equal(detailBody.document.originalName, 'synthetic-api-invoice.pdf');
  assert.match(detailBody.document.cleanedText, /INV-API/);
  assert.equal(detailBody.document.storedName, undefined);
  assert.equal(detailBody.document.filePath, undefined);

  const list = await fetch(`${baseUrl}/documents`);
  assert.equal(list.status, 200);
  const listed = (await list.json()) as { documents: Array<{ id: string }> };
  assert.ok(listed.documents.some(({ id }) => id === uploaded.document.id));

  const stored = await prisma.document.findUnique({ where: { id: uploaded.document.id } });
  assert.ok(stored);
  const storedPath = stored.filePath;

  const deleted = await fetch(`${baseUrl}/documents/${uploaded.document.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  createdDocumentIds.delete(uploaded.document.id);
  assert.equal(await prisma.document.findUnique({ where: { id: uploaded.document.id } }), null);
  await assert.rejects(access(storedPath));
});

test('upload rejects unsupported and oversized files', async () => {
  const unsupported = new FormData();
  unsupported.append('file', new Blob(['plain text'], { type: 'text/plain' }), 'unsafe.txt');
  const unsupportedResponse = await fetch(`${baseUrl}/documents/upload`, {
    method: 'POST',
    body: unsupported,
  });
  assert.equal(unsupportedResponse.status, 415);

  const oversized = new FormData();
  oversized.append(
    'file',
    new Blob([new Uint8Array(MAX_UPLOAD_SIZE_BYTES + 1)], { type: 'application/pdf' }),
    'oversized.pdf',
  );
  const oversizedResponse = await fetch(`${baseUrl}/documents/upload`, {
    method: 'POST',
    body: oversized,
  });
  assert.equal(oversizedResponse.status, 413);
});

test('invalid identifiers and disallowed browser origins are handled safely', async () => {
  const invalidId = await fetch(`${baseUrl}/documents/not-a-uuid`);
  assert.equal(invalidId.status, 400);

  const disallowedOrigin = await fetch(`${baseUrl}/meta`, {
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(disallowedOrigin.status, 200);
  assert.equal(disallowedOrigin.headers.get('access-control-allow-origin'), null);
});
