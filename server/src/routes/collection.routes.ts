import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collection.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getCollections);
router.post('/', createCollection);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);

export default router;
