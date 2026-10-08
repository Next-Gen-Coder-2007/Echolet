import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
} from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/:userId', getMessages);
router.post('/:userId', sendMessage);

export default router;
