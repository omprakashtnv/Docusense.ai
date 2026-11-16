import { Router } from 'express';

import { chatRouter } from './chat.routes.js';
import { documentRouter } from './document.routes.js';
import { healthRouter } from './health.routes.js';
import { metaRouter } from './meta.routes.js';
import { searchRouter } from './search.routes.js';
import { requireDemoAccess } from '../middleware/demo-auth.js';
import { aiRateLimit, apiRateLimit } from '../middleware/rate-limits.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use(requireDemoAccess);
apiRouter.use(apiRateLimit);
apiRouter.use('/meta', metaRouter);
apiRouter.use('/documents', documentRouter);
apiRouter.use('/search', aiRateLimit, searchRouter);
apiRouter.use('/chat', chatRouter);
