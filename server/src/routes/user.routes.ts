import { Router } from 'express';
import {
  searchUsers,
  getUserByUsername,
  getUserById,
  followUser,
  unfollowUser,
  updateProfile,
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.put('/profile', authMiddleware, updateProfile);
router.get('/search', authMiddleware, searchUsers);
router.get('/id/:userId', authMiddleware, getUserById);
router.get('/:username', authMiddleware, getUserByUsername);
router.post('/:userId/follow', authMiddleware, followUser);
router.delete('/:userId/follow', authMiddleware, unfollowUser);

export default router;

