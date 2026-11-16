import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env.js';

function createRateLimit(max: number, message: string) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({ error: { message } });
    },
  });
}

export const apiRateLimit = createRateLimit(
  env.rateLimitMax,
  'Too many requests. Please wait and try again.',
);

export const uploadRateLimit = createRateLimit(
  env.uploadRateLimitMax,
  'Too many upload attempts. Please wait and try again.',
);

export const aiRateLimit = createRateLimit(
  env.aiRateLimitMax,
  'Too many AI requests. Please wait and try again.',
);
