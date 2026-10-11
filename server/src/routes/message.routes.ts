import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadCount,
} from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.put('/item/:messageId', editMessage);
router.delete('/item/:messageId', deleteMessage);
router.post('/:userId/read', markMessagesAsRead);
router.get('/:userId', getMessages);
router.post('/:userId', sendMessage);

export default router;
