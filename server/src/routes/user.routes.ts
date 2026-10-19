import { Router } from 'express';
import {
  searchUsers,
  getConnections,
  getUserByUsername,
  getUserById,
  getFollowingUsers,
  getUserFollowers,
  getUserFollowing,
  removeFollower,
  followUser,
  unfollowUser,
  updateProfile,
  acceptFollowRequest,
  declineFollowRequest,
  getPendingFollowRequests,
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.put('/profile', authMiddleware, updateProfile);
router.get('/search', authMiddleware, searchUsers);
router.get('/connections', authMiddleware, getConnections);
router.get('/following', authMiddleware, getFollowingUsers);
router.get('/follow-requests/pending', authMiddleware, getPendingFollowRequests);
router.post('/follow-requests/:requestId/accept', authMiddleware, acceptFollowRequest);
router.post('/follow-requests/:requestId/decline', authMiddleware, declineFollowRequest);
router.delete('/followers/:userId', authMiddleware, removeFollower);
router.get('/id/:userId', authMiddleware, getUserById);
router.get('/:username/followers', authMiddleware, getUserFollowers);
router.get('/:username/following', authMiddleware, getUserFollowing);
router.get('/:username', authMiddleware, getUserByUsername);
router.post('/:userId/follow', authMiddleware, followUser);
router.delete('/:userId/follow', authMiddleware, unfollowUser);

export default router;
