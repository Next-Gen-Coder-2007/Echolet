import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadCount,
  toggleStarMessage,
  togglePinMessage,
  voteMessagePoll,
  clearConversation,
  getChatSettings,
  updateChatSettings,
  getConversationMedia,
} from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.get('/chat-settings', getChatSettings);
router.post('/chat-settings', updateChatSettings);
router.post('/item/:messageId/star', toggleStarMessage);
router.post('/item/:messageId/pin', togglePinMessage);
router.post('/item/:messageId/vote', voteMessagePoll);
router.put('/item/:messageId', editMessage);
router.delete('/item/:messageId', deleteMessage);
router.get('/:userId/media', getConversationMedia);
router.post('/:userId/clear', clearConversation);
router.post('/:userId/read', markMessagesAsRead);
router.get('/:userId', getMessages);
router.post('/:userId', sendMessage);

export default router;
