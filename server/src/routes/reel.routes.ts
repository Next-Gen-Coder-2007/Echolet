import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import {
  createReel,
  getReels,
  getReelById,
  getUserReels,
  toggleLikeReel,
  toggleBookmarkReel,
  updateReelBookmarkCollection,
  getSavedReels,
  getLikedReels,
  deleteReel,
  getReelComments,
  addReelComment,
  deleteReelComment,
  toggleReelCommentReaction,
  togglePinReelComment,
  shareReel,
} from '../controllers/reel.controller';

const router = Router();

// Personal saved and liked reels (must be declared before /:id)
router.get('/saved', authMiddleware, getSavedReels);
router.get('/liked', authMiddleware, getLikedReels);

// Comment reactions & management
router.post('/comments/:commentId/reaction', authMiddleware, toggleReelCommentReaction);
router.delete('/comments/:commentId', authMiddleware, deleteReelComment);
router.post('/:id/comments/:commentId/pin', authMiddleware, togglePinReelComment);

// Feed, creator reels, and single reel views
router.get('/', optionalAuthMiddleware, getReels);
router.get('/user/:username', optionalAuthMiddleware, getUserReels);
router.get('/:id', optionalAuthMiddleware, getReelById);

// Comments retrieval & creation
router.get('/:id/comments', optionalAuthMiddleware, getReelComments);
router.post('/:id/comments', authMiddleware, addReelComment);

// Authenticated reel interactions
router.post('/', authMiddleware, createReel);
router.post('/:id/like', authMiddleware, toggleLikeReel);
router.post('/:id/bookmark', authMiddleware, toggleBookmarkReel);
router.put('/:id/bookmark/collection', authMiddleware, updateReelBookmarkCollection);
router.post('/:id/share', optionalAuthMiddleware, shareReel);
router.delete('/:id', authMiddleware, deleteReel);

export default router;
