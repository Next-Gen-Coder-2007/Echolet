import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  googleAuth,
  googleOAuthRedirect,
  googleOAuthCallback,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

// Google OAuth routes
router.post('/google', googleAuth);
router.get('/google', googleOAuthRedirect);
router.get('/google/callback', googleOAuthCallback);

export default router;

