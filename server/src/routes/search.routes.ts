import { Router } from 'express';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { searchAll } from '../controllers/search.controller';

const router = Router();

router.get('/', optionalAuthMiddleware, searchAll);

export default router;
