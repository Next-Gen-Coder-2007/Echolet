import { Router } from 'express';
import {
  searchUsers,
  getUserByUsername,
  getUserById,
  followUser,
  unfollowUser,
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/id/:userId', authMiddleware, getUserById);
router.get('/:username', authMiddleware, getUserByUsername);
router.post('/:userId/follow', authMiddleware, followUser);
router.delete('/:userId/follow', authMiddleware, unfollowUser);

export default router;
