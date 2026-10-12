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
} from '../controllers/group.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);
router.put('/:groupId/messages/:messageId', editGroupMessage);
router.delete('/:groupId/messages/:messageId', deleteGroupMessage);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);
router.put('/:groupId/members/:userId/role', changeMemberRole);
router.post('/:groupId/leave', leaveGroup);
router.post('/:groupId/read', markGroupAsRead);

export default router;
