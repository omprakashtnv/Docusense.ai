import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, resolve } from 'node:path';

import { env } from './env.js';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const uploadsDirectory = isAbsolute(env.uploadDirectory)
  ? resolve(env.uploadDirectory)
  : resolve(backendRoot, env.uploadDirectory);
