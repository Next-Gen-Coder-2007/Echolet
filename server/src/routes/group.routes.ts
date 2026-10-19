import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupDetails,
  updateGroup,
  getGroupMessages,
  sendGroupMessage,
  editGroupMessage,
  deleteGroupMessage,
  addMembers,
  removeMember,
  changeMemberRole,
  leaveGroup,
  markGroupAsRead,
  toggleStarGroupMessage,
  togglePinGroupMessage,
  voteGroupMessagePoll,
  getGroupPollVoters,
  clearGroupChat,
  getGroupMedia,
  toggleGroupMessageReaction,
} from '../controllers/group.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.get('/:groupId/media', getGroupMedia);
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);
router.post('/:groupId/messages/:messageId/reaction', toggleGroupMessageReaction);
router.post('/:groupId/messages/:messageId/star', toggleStarGroupMessage);
router.post('/:groupId/messages/:messageId/pin', togglePinGroupMessage);
router.post('/:groupId/messages/:messageId/vote', voteGroupMessagePoll);
router.get('/:groupId/messages/:messageId/poll/voters', getGroupPollVoters);
router.put('/:groupId/messages/:messageId', editGroupMessage);
router.delete('/:groupId/messages/:messageId', deleteGroupMessage);
router.post('/:groupId/clear', clearGroupChat);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);
router.put('/:groupId/members/:userId/role', changeMemberRole);
router.post('/:groupId/leave', leaveGroup);
router.post('/:groupId/read', markGroupAsRead);

export default router;
