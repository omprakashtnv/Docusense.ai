import { Router } from 'express';

import { getPublicMeta } from '../controllers/meta.controller.js';

export const metaRouter = Router();

metaRouter.get('/', getPublicMeta);
