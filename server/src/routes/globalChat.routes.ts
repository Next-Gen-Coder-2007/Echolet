import { Router } from 'express';
import {
  getGlobalMessages,
  sendGlobalMessage,
  reactGlobalMessage,
  deleteGlobalMessage,
  editGlobalMessage,
  reportGlobalMessage,
  getGlobalStats,
  voteGlobalMessagePoll,
} from '../controllers/globalChat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/messages', getGlobalMessages);
router.post('/messages', sendGlobalMessage);
router.post('/messages/:id/react', reactGlobalMessage);
router.post('/messages/:id/vote', voteGlobalMessagePoll);
router.delete('/messages/:id', deleteGlobalMessage);
router.put('/messages/:id', editGlobalMessage);
router.post('/messages/:id/report', reportGlobalMessage);
router.get('/stats', getGlobalStats);

export default router;
