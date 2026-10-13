import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import {
  createReel,
  getReels,
  getReelById,
  getUserReels,
  toggleLikeReel,
  deleteReel,
  getReelComments,
  addReelComment,
  deleteReelComment,
} from '../controllers/reel.controller';

const router = Router();

// Feed and user reels (optional auth to personalize isLiked)
router.get('/', optionalAuthMiddleware, getReels);
router.get('/user/:username', optionalAuthMiddleware, getUserReels);
router.get('/:id', optionalAuthMiddleware, getReelById);

// Comments
router.get('/:id/comments', optionalAuthMiddleware, getReelComments);
router.post('/:id/comments', authMiddleware, addReelComment);
router.delete('/comments/:commentId', authMiddleware, deleteReelComment);

// Authenticated reel actions
router.post('/', authMiddleware, createReel);
router.post('/:id/like', authMiddleware, toggleLikeReel);
router.delete('/:id', authMiddleware, deleteReel);

export default router;
