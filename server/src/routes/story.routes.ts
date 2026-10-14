import { Router } from 'express';
import {
  getStories,
  createStory,
  viewStory,
  deleteStory,
} from '../controllers/story.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalAuthMiddleware, getStories);
router.post('/', authMiddleware, createStory);
router.post('/:id/view', authMiddleware, viewStory);
router.delete('/:id', authMiddleware, deleteStory);

export default router;
