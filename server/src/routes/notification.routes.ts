import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadNotificationCount);
router.put('/read-all', authMiddleware, markAllNotificationsAsRead);
router.put('/:id/read', authMiddleware, markNotificationAsRead);
router.delete('/:id', authMiddleware, deleteNotification);

export default router;
