import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import {
  createPost,
  getFeedPosts,
  getUserPosts,
  getPostById,
  deletePost,
  toggleLikePost,
  toggleBookmarkPost,
  updatePostBookmarkCollection,
  votePoll,
  getComments,
  addComment,
  deleteComment,
  toggleLikeComment,
  getSavedPosts,
  getLikedPosts,
} from '../controllers/post.controller';

const router = Router();

// Personal lists (require login - must be defined before /:id)
router.get('/saved', authMiddleware, getSavedPosts);
router.get('/liked', authMiddleware, getLikedPosts);

// Public viewing routes (with optional auth to detect if guest or logged in)
router.get('/feed', optionalAuthMiddleware, getFeedPosts);
router.get('/user/:username', optionalAuthMiddleware, getUserPosts);
router.get('/:id', optionalAuthMiddleware, getPostById);
router.get('/:id/comments', optionalAuthMiddleware, getComments);

// Single post operations (require login)
router.post('/', authMiddleware, createPost);
router.delete('/:id', authMiddleware, deletePost);

// Interactions (require login)
router.post('/:id/like', authMiddleware, toggleLikePost);
router.post('/:id/bookmark', authMiddleware, toggleBookmarkPost);
router.put('/:id/bookmark/collection', authMiddleware, updatePostBookmarkCollection);
router.post('/:id/poll/vote', authMiddleware, votePoll);

// Comments (require login)
router.post('/:id/comments', authMiddleware, addComment);
router.delete('/comments/:commentId', authMiddleware, deleteComment);
router.post('/comments/:commentId/like', authMiddleware, toggleLikeComment);

export default router;
