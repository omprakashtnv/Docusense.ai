import type { Server } from 'node:http';

import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';

let server: Server | undefined;
let isShuttingDown = false;

async function start(): Promise<void> {
  await connectDatabase();

  server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`DocuSense AI API listening on http://0.0.0.0:${env.port}`);
  });
}

async function closeHttpServer(): Promise<void> {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  try {
    await closeHttpServer();
    await disconnectDatabase();
  } catch (error) {
    console.error('Failed to shut down cleanly.', error);
    process.exitCode = 1;
    return;
  }

  process.exitCode = exitCode;
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start().catch(async (error: unknown) => {
  console.error('Failed to start DocuSense AI API.', error);
  await disconnectDatabase().catch(() => undefined);
  process.exitCode = 1;
});
