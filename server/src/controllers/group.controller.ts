import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { GroupMessage } from '../entities/GroupMessage';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  isUserOnline,
  emitNewGroupMessage,
  emitGroupMessageEdited,
  emitGroupMessageDeleted,
  emitGroupUpdated,
  emitGroupCreated,
  emitGroupMemberUpdate,
  emitGroupMessageStarred,
  emitGroupMessagePinned,
  emitGroupChatCleared,
  addUsersToGroupSocketRoom,
  removeUsersFromGroupSocketRoom,
} from '../socket';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return (param[0] || '').trim();
  return (param || '').trim();
};

export const createGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { name, description, avatarUrl, memberIds = [] } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Group name is required' });
      return;
    }

    const groupRepository = AppDataSource.getRepository(Group);
    const memberRepository = AppDataSource.getRepository(GroupMember);
    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const userRepository = AppDataSource.getRepository(User);

    // 1. Create Group
    const newGroup = groupRepository.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      avatarUrl: avatarUrl?.trim() || undefined,
      creatorId: currentUserId,
    });
    const savedGroup = await groupRepository.save(newGroup);

    // 2. Add creator as admin
    const creatorMember = memberRepository.create({
      groupId: savedGroup.id,
      userId: currentUserId,
      role: 'admin',
      lastReadAt: new Date(),
    });
    await memberRepository.save(creatorMember);

    // 3. Add initial members
    const validMemberIds = Array.isArray(memberIds)
      ? Array.from(new Set(memberIds.filter((id) => id && id !== currentUserId)))
      : [];

    if (validMemberIds.length > 0) {
      const existingUsers = await userRepository
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: validMemberIds })
        .getMany();

      const memberEntities = existingUsers.map((u) =>
        memberRepository.create({
          groupId: savedGroup.id,
          userId: u.id,
          role: 'member',
          lastReadAt: new Date(),
        })
      );
      if (memberEntities.length > 0) {
        await memberRepository.save(memberEntities);
      }
    }

    // 4. Create initial system message
    const currentUser = await userRepository.findOne({ where: { id: currentUserId } });
    const creatorName = currentUser?.fullName || currentUser?.username || 'Someone';

    const systemMessage = messageRepository.create({
      groupId: savedGroup.id,
      senderId: currentUserId,
      content: `${creatorName} created group "${savedGroup.name}"`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    // 5. Notify sockets
    const allMemberUserIds = [currentUserId, ...validMemberIds];
    emitGroupCreated(savedGroup, allMemberUserIds);
    emitNewGroupMessage({
      ...savedMessage,
      sender: currentUser,
    });

    res.status(201).json({
      status: 'success',
      group: savedGroup,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create group' });
  }
};

export const getGroups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const groupRepository = AppDataSource.getRepository(Group);

    // Find all memberships of this user
    const userMemberships = await memberRepository.find({
      where: { userId: currentUserId },
      relations: { group: true },
    });

    if (userMemberships.length === 0) {
      res.json({ status: 'success', groups: [] });
      return;
    }

    const groupIds = userMemberships.map((m) => m.groupId);

    // Fetch groups with members and member users
    const groups = await groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.members', 'm')
      .leftJoinAndSelect('m.user', 'u')
      .where('g.id IN (:...groupIds)', { groupIds })
      .orderBy('g.updatedAt', 'DESC')
      .getMany();

    // Map each group with last message and unread count
    const groupsWithMeta = await Promise.all(
      groups.map(async (group) => {
        const membership = userMemberships.find((m) => m.groupId === group.id);

        // Get last visible message
        const lastMessages = await messageRepository
          .createQueryBuilder('msg')
          .leftJoinAndSelect('msg.sender', 's')
          .where('msg.groupId = :groupId', { groupId: group.id })
          .orderBy('msg.createdAt', 'DESC')
          .take(5)
          .getMany();

        const lastMessage = lastMessages.find(
          (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
        );

        // Calculate unread count
        let unreadCount = 0;
        if (membership?.lastReadAt) {
          const unread = await messageRepository
            .createQueryBuilder('msg')
            .where('msg.groupId = :groupId', { groupId: group.id })
            .andWhere('msg.createdAt > :lastReadAt', {
              lastReadAt: membership.lastReadAt,
            })
            .andWhere('msg.senderId != :currentUserId', { currentUserId })
            .getMany();

          unreadCount = unread.filter(
            (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
          ).length;
        } else {
          const unread = await messageRepository
            .createQueryBuilder('msg')
            .where('msg.groupId = :groupId', { groupId: group.id })
            .andWhere('msg.senderId != :currentUserId', { currentUserId })
            .getMany();

          unreadCount = unread.filter(
            (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
          ).length;
        }

        const membersPreview = (group.members || []).map((mem) => ({
          id: mem.user?.id,
          fullName: mem.user?.fullName,
          username: mem.user?.username,
          avatarUrl: mem.user?.avatarUrl,
          role: mem.role,
          isOnline: mem.user ? isUserOnline(mem.user.id) : false,
        }));

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          avatarUrl: group.avatarUrl,
          creatorId: group.creatorId,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          memberCount: group.members?.length || 0,
          currentUserRole: membership?.role || 'member',
          membersPreview,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                groupId: lastMessage.groupId,
                senderId: lastMessage.senderId,
                content: lastMessage.content,
                messageType: lastMessage.messageType,
                isEdited: lastMessage.isEdited,
                isDeletedForEveryone: lastMessage.isDeletedForEveryone,
                createdAt: lastMessage.createdAt,
                sender: lastMessage.sender
                  ? {
                      id: lastMessage.sender.id,
                      fullName: lastMessage.sender.fullName,
                      username: lastMessage.sender.username,
                      avatarUrl: lastMessage.sender.avatarUrl,
                    }
                  : null,
              }
            : null,
          unreadCount,
        };
      })
    );

    // Sort by latest message date or group updatedAt
    groupsWithMeta.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt).getTime();
      return timeB - timeA;
    });

    res.json({
      status: 'success',
      groups: groupsWithMeta,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve groups' });
  }
};

export const getGroupDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    if (!groupId) {
      res.status(400).json({ status: 'error', message: 'Group ID is required' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const groupRepository = AppDataSource.getRepository(Group);

    // Check membership
    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const group = await groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.members', 'm')
      .leftJoinAndSelect('m.user', 'u')
      .where('g.id = :groupId', { groupId })
      .getOne();

    if (!group) {
      res.status(404).json({ status: 'error', message: 'Group not found' });
      return;
    }

    const members = (group.members || []).map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user
        ? {
            id: m.user.id,
            fullName: m.user.fullName,
            username: m.user.username,
            avatarUrl: m.user.avatarUrl,
            lastSeen: m.user.lastSeen,
            isOnline: isUserOnline(m.user.id),
          }
        : null,
    }));

    res.json({
      status: 'success',
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatarUrl: group.avatarUrl,
        creatorId: group.creatorId,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        currentUserRole: membership.role,
        members,
      },
    });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve group details' });
  }
};

export const updateGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const { name, description, avatarUrl } = req.body;

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const groupRepository = AppDataSource.getRepository(Group);
    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const userRepository = AppDataSource.getRepository(User);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Only admins can update group info' });
      return;
    }

    const group = await groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ status: 'error', message: 'Group not found' });
      return;
    }

    if (name && typeof name === 'string') group.name = name.trim();
    if (description !== undefined) group.description = description ? description.trim() : undefined;
    if (avatarUrl !== undefined) group.avatarUrl = avatarUrl ? avatarUrl.trim() : undefined;

    const updatedGroup = await groupRepository.save(group);

    const currentUser = await userRepository.findOne({ where: { id: currentUserId } });
    const adminName = currentUser?.fullName || currentUser?.username || 'An admin';

    const systemMessage = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content: `${adminName} updated group details`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    emitGroupUpdated(updatedGroup);
    emitNewGroupMessage({
      ...savedMessage,
      sender: currentUser,
    });

    res.json({
      status: 'success',
      group: updatedGroup,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update group' });
  }
};

export const getGroupMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const memberRepository = AppDataSource.getRepository(GroupMember);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const rawMessages = await messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .where('m.groupId = :groupId', { groupId })
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    const visibleMessages = rawMessages.filter(
      (msg) => !(msg.deletedFor && msg.deletedFor.includes(currentUserId))
    );

    // Update lastReadAt
    await memberRepository.update(membership.id, { lastReadAt: new Date() });

    const messages = visibleMessages.map((msg) => ({
      id: msg.id,
      groupId: msg.groupId,
      senderId: msg.senderId,
      content: msg.content,
      messageType: msg.messageType,
      audioUrl: msg.audioUrl,
      audioDuration: msg.audioDuration,
      isPinned: msg.isPinned,
      pinnedAt: msg.pinnedAt,
      pinnedBy: msg.pinnedBy,
      starredBy: msg.starredBy,
      replyTo: msg.replyTo,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      isDeletedForEveryone: msg.isDeletedForEveryone,
      deletedFor: msg.deletedFor,
      createdAt: msg.createdAt,
      sender: msg.sender
        ? {
            id: msg.sender.id,
            fullName: msg.sender.fullName,
            username: msg.sender.username,
            avatarUrl: msg.sender.avatarUrl,
          }
        : null,
    }));

    res.json({
      status: 'success',
      messages,
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve group messages' });
  }
};

export const sendGroupMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageType = req.body.messageType || 'text';
    let content = (typeof req.body.content === 'string' ? req.body.content : '').trim();
    if (!content && (messageType === 'voice' || messageType === 'audio')) {
      content = 'Voice note';
    } else if (!content && (messageType === 'image' || messageType === 'video')) {
      content = messageType === 'image' ? 'Photo' : 'Video';
    } else if (!content && messageType === 'document') {
      content = req.body.fileName || 'Document';
    } else if (!content && messageType === 'poll') {
      content = req.body.poll?.question || 'Poll';
    } else if (!content && messageType === 'post') {
      content = 'Shared an echo';
    } else if (!content && messageType === 'reel') {
      content = 'Shared a reel';
    }

    if (!content && !req.body.mediaUrl && !req.body.poll) {
      res.status(400).json({ status: 'error', message: 'Message content or attachment is required' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const groupRepository = AppDataSource.getRepository(Group);
    const userRepository = AppDataSource.getRepository(User);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    let formattedPoll = null;
    if (req.body.poll && typeof req.body.poll === 'object') {
      const q = (req.body.poll.question || '').trim();
      const rawOpts = Array.isArray(req.body.poll.options) ? req.body.poll.options : [];
      const opts = rawOpts.map((opt: any, idx: number) => {
        if (typeof opt === 'string') {
          return { id: String(idx), text: opt.trim(), voterIds: [] };
        }
        return {
          id: opt.id !== undefined ? String(opt.id) : String(idx),
          text: (opt.text || '').trim(),
          voterIds: Array.isArray(opt.voterIds) ? opt.voterIds : [],
        };
      });

      let expiresAt: string | null = req.body.poll.expiresAt || null;
      const dur = req.body.poll.duration || req.body.poll.expiresIn;
      if (!expiresAt && dur && dur !== 'none') {
        const durMap: Record<string, number> = {
          '5m': 5 * 60 * 1000,
          '1h': 60 * 60 * 1000,
          '6h': 6 * 3600 * 1000,
          '12h': 12 * 3600 * 1000,
          '24h': 24 * 3600 * 1000,
          '1d': 24 * 3600 * 1000,
          '3d': 3 * 24 * 3600 * 1000,
          '7d': 7 * 24 * 3600 * 1000,
        };
        if (durMap[dur]) {
          expiresAt = new Date(Date.now() + durMap[dur]).toISOString();
        }
      }

      formattedPoll = {
        question: q,
        options: opts,
        expiresAt,
      };
    }

    const newMsg = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content,
      messageType,
      mediaUrl: req.body.mediaUrl || null,
      fileName: req.body.fileName || null,
      fileSize: req.body.fileSize || null,
      poll: formattedPoll,
      audioUrl: req.body.audioUrl || null,
      audioDuration: req.body.audioDuration ? Number(req.body.audioDuration) : undefined,
      replyTo: req.body.replyTo || undefined,
    });
    const savedMsg = await messageRepository.save(newMsg);

    // Update group timestamp and user lastReadAt
    await groupRepository.update(groupId, { updatedAt: new Date() });
    await memberRepository.update(membership.id, { lastReadAt: new Date() });

    const currentUser = await userRepository.findOne({
      where: { id: currentUserId },
      select: { id: true, fullName: true, username: true, avatarUrl: true },
    });

    const fullMessage = {
      ...savedMsg,
      sender: currentUser,
    };

    emitNewGroupMessage(fullMessage);

    res.status(201).json({
      status: 'success',
      message: fullMessage,
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send group message' });
  }
};

export const editGroupMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageId = getParam(req.params.messageId);
    const { content } = req.body;

    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const message = await messageRepository.findOne({
      where: { id: messageId, groupId },
      relations: { sender: true },
    });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (message.senderId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'You can only edit your own messages' });
      return;
    }

    // Disallow editing for posts, reels, story replies, polls, voice notes, documents, system messages
    const isSpecialNonEditable =
      message.messageType === 'post' ||
      message.messageType === 'reel' ||
      message.messageType === 'poll' ||
      message.messageType === 'system' ||
      message.messageType === 'voice' ||
      message.messageType === 'audio' ||
      message.messageType === 'document' ||
      !!message.audioUrl ||
      /\/post(?:s)?\/[a-zA-Z0-9_-]+/i.test(message.content) ||
      /\/reels\/[a-zA-Z0-9_-]+/i.test(message.content);

    if (isSpecialNonEditable) {
      res.status(400).json({
        status: 'error',
        message: 'Only messages and media captions can be edited',
      });
      return;
    }

    let finalContent = typeof content === 'string' ? content.trim() : '';
    if (!finalContent) {
      if (message.mediaUrl || message.messageType === 'image' || message.messageType === 'video') {
        finalContent = message.messageType === 'video' ? 'Video' : 'Photo';
      } else {
        res.status(400).json({ status: 'error', message: 'New content is required' });
        return;
      }
    }

    message.content = finalContent;
    message.isEdited = true;
    message.editedAt = new Date();

    const updated = await messageRepository.save(message);

    emitGroupMessageEdited(updated);

    res.json({
      status: 'success',
      message: updated,
    });
  } catch (error) {
    console.error('Edit group message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to edit group message' });
  }
};

export const deleteGroupMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageId = getParam(req.params.messageId);
    const { mode } = req.body; // 'for_me' | 'for_everyone'

    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const memberRepository = AppDataSource.getRepository(GroupMember);

    const message = await messageRepository.findOne({
      where: { id: messageId, groupId },
      relations: { sender: true },
    });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    if (mode === 'for_everyone') {
      // Only sender or group admin can delete for everyone
      const isSender = message.senderId === currentUserId;
      const isAdmin = membership.role === 'admin';

      if (!isSender && !isAdmin) {
        res.status(403).json({
          status: 'error',
          message: 'Only the sender or a group admin can delete for everyone',
        });
        return;
      }

      message.isDeletedForEveryone = true;
      message.content = 'This message was deleted';
      message.messageType = 'text';
      message.isPinned = false;
      message.pinnedAt = undefined;
      message.pinnedBy = undefined;
      message.starredBy = [];
      message.audioUrl = undefined;
      message.mediaUrl = undefined;
      message.poll = undefined;
      await messageRepository.save(message);

      emitGroupMessageDeleted(groupId, messageId, true);
      emitGroupMessagePinned(message);
      emitGroupMessageStarred(message);

      res.json({
        status: 'success',
        mode: 'for_everyone',
        messageId,
      });
      return;
    }

    // Default: delete for me
    const currentDeletedFor = message.deletedFor || [];
    if (!currentDeletedFor.includes(currentUserId)) {
      message.deletedFor = [...currentDeletedFor, currentUserId];
    }
    // Remove from starredBy for me
    if (Array.isArray(message.starredBy) && message.starredBy.includes(currentUserId)) {
      message.starredBy = message.starredBy.filter((id) => id !== currentUserId);
    }
    await messageRepository.save(message);

    res.json({
      status: 'success',
      mode: 'for_me',
      messageId,
    });
    return;
  } catch (error) {
    console.error('Delete group message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete message' });
  }
};

export const toggleStarGroupMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageId = getParam(req.params.messageId);

    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const memberRepository = AppDataSource.getRepository(GroupMember);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const message = await messageRepository.findOne({
      where: { id: messageId, groupId },
      relations: { sender: true },
    });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    let starredBy = Array.isArray(message.starredBy) ? [...message.starredBy] : [];
    if (starredBy.includes(currentUserId)) {
      starredBy = starredBy.filter((id) => id !== currentUserId);
    } else {
      starredBy.push(currentUserId);
    }
    message.starredBy = starredBy;

    const saved = await messageRepository.save(message);
    emitGroupMessageStarred(saved);

    res.json({
      status: 'success',
      message: saved,
      isStarred: starredBy.includes(currentUserId),
    });
  } catch (error) {
    console.error('Toggle star group message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle star' });
  }
};

export const togglePinGroupMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageId = getParam(req.params.messageId);

    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const memberRepository = AppDataSource.getRepository(GroupMember);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const message = await messageRepository.findOne({
      where: { id: messageId, groupId },
      relations: { sender: true },
    });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    const isNowPinned = !message.isPinned;
    if (isNowPinned) {
      // Unpin any other message in this group
      await messageRepository
        .createQueryBuilder()
        .update(GroupMessage)
        .set({ isPinned: false, pinnedAt: undefined, pinnedBy: undefined })
        .where('groupId = :groupId AND id != :msgId', {
          groupId,
          msgId: message.id,
        })
        .execute();
    }

    message.isPinned = isNowPinned;
    message.pinnedAt = isNowPinned ? new Date() : undefined;
    message.pinnedBy = isNowPinned ? currentUserId : undefined;

    const saved = await messageRepository.save(message);
    emitGroupMessagePinned(saved);

    res.json({
      status: 'success',
      message: saved,
      isPinned: isNowPinned,
    });
  } catch (error) {
    console.error('Toggle pin group message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle pin' });
  }
};

export const voteGroupMessagePoll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageId = getParam(req.params.messageId);
    const { optionId } = req.body;

    if (!optionId) {
      res.status(400).json({ status: 'error', message: 'Option ID is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const message = await messageRepository.findOne({
      where: { id: messageId, groupId },
      relations: { sender: true },
    });

    if (!message || !message.poll || !Array.isArray(message.poll.options)) {
      res.status(404).json({ status: 'error', message: 'Poll message not found' });
      return;
    }

    if (message.poll.expiresAt && new Date(message.poll.expiresAt).getTime() <= Date.now()) {
      res.status(400).json({ status: 'error', message: 'This poll has ended and voting is closed' });
      return;
    }

    const poll = { ...message.poll };
    poll.options = poll.options.map((opt) => {
      const voters = Array.isArray(opt.voterIds) ? [...opt.voterIds] : [];
      if (opt.id === optionId) {
        if (voters.includes(currentUserId)) {
          return { ...opt, voterIds: voters.filter((id) => id !== currentUserId) };
        } else {
          return { ...opt, voterIds: [...voters, currentUserId] };
        }
      } else {
        return { ...opt, voterIds: voters.filter((id) => id !== currentUserId) };
      }
    });

    message.poll = poll;
    const saved = await messageRepository.save(message);
    emitGroupMessageEdited(saved);

    res.json({
      status: 'success',
      message: saved,
    });
  } catch (error) {
    console.error('Vote group message poll error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to vote on poll' });
  }
};

export const clearGroupChat = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const messageRepository = AppDataSource.getRepository(GroupMessage);
    const memberRepository = AppDataSource.getRepository(GroupMember);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const messages = await messageRepository.find({
      where: { groupId },
    });

    for (const msg of messages) {
      const deletedFor = Array.isArray(msg.deletedFor) ? [...msg.deletedFor] : [];
      if (!deletedFor.includes(currentUserId)) {
        deletedFor.push(currentUserId);
        msg.deletedFor = deletedFor;
      }
    }

    if (messages.length > 0) {
      await messageRepository.save(messages);
    }

    emitGroupChatCleared(groupId, currentUserId);

    res.json({
      status: 'success',
      message: 'Group chat cleared successfully',
    });
  } catch (error) {
    console.error('Clear group chat error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to clear group chat' });
  }
};

export const addMembers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const { memberIds = [] } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ status: 'error', message: 'memberIds array is required' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const userRepository = AppDataSource.getRepository(User);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Only admins can add members' });
      return;
    }

    // Find already existing members
    const existingMembers = await memberRepository.find({ where: { groupId } });
    const existingUserIds = new Set(existingMembers.map((m) => m.userId));

    const newMemberIds = memberIds.filter((id) => !existingUserIds.has(id));

    if (newMemberIds.length === 0) {
      res.status(400).json({ status: 'error', message: 'All selected users are already members' });
      return;
    }

    const usersToAdd = await userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: newMemberIds })
      .getMany();

    const createdMembers = usersToAdd.map((u) =>
      memberRepository.create({
        groupId,
        userId: u.id,
        role: 'member',
        lastReadAt: new Date(),
      })
    );
    await memberRepository.save(createdMembers);

    // Notify room
    addUsersToGroupSocketRoom(groupId, newMemberIds);

    const adminUser = await userRepository.findOne({ where: { id: currentUserId } });
    const adminName = adminUser?.fullName || adminUser?.username || 'An admin';
    const addedNames = usersToAdd.map((u) => u.fullName || u.username).join(', ');

    const systemMessage = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content: `${adminName} added ${addedNames}`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    emitGroupMemberUpdate(groupId, 'joined', {
      newMembers: usersToAdd.map((u) => ({
        userId: u.id,
        role: 'member',
        user: {
          id: u.id,
          fullName: u.fullName,
          username: u.username,
          avatarUrl: u.avatarUrl,
          isOnline: isUserOnline(u.id),
        },
      })),
    });

    emitNewGroupMessage({
      ...savedMessage,
      sender: adminUser,
    });

    res.json({
      status: 'success',
      addedCount: usersToAdd.length,
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add members' });
  }
};

export const removeMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const targetUserId = getParam(req.params.userId);

    if (targetUserId === currentUserId) {
      res.status(400).json({ status: 'error', message: 'Use leave group endpoint to leave' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const userRepository = AppDataSource.getRepository(User);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const callerMembership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!callerMembership || callerMembership.role !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Only admins can remove members' });
      return;
    }

    const targetMembership = await memberRepository.findOne({
      where: { groupId, userId: targetUserId },
      relations: { user: true },
    });

    if (!targetMembership) {
      res.status(404).json({ status: 'error', message: 'Member not found in group' });
      return;
    }

    await memberRepository.remove(targetMembership);

    removeUsersFromGroupSocketRoom(groupId, [targetUserId]);

    const adminUser = await userRepository.findOne({ where: { id: currentUserId } });
    const adminName = adminUser?.fullName || adminUser?.username || 'An admin';
    const targetName =
      targetMembership.user?.fullName || targetMembership.user?.username || 'A member';

    const systemMessage = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content: `${adminName} removed ${targetName}`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    emitGroupMemberUpdate(groupId, 'removed', { userId: targetUserId });
    emitNewGroupMessage({
      ...savedMessage,
      sender: adminUser,
    });

    res.json({
      status: 'success',
      message: 'Member removed',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove member' });
  }
};

export const changeMemberRole = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const targetUserId = getParam(req.params.userId);
    const { role } = req.body;

    if (role !== 'admin' && role !== 'member') {
      res.status(400).json({ status: 'error', message: 'Role must be admin or member' });
      return;
    }

    const memberRepository = AppDataSource.getRepository(GroupMember);
    const userRepository = AppDataSource.getRepository(User);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const callerMembership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!callerMembership || callerMembership.role !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Only admins can change roles' });
      return;
    }

    const targetMembership = await memberRepository.findOne({
      where: { groupId, userId: targetUserId },
      relations: { user: true },
    });

    if (!targetMembership) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    targetMembership.role = role;
    await memberRepository.save(targetMembership);

    const adminUser = await userRepository.findOne({ where: { id: currentUserId } });
    const adminName = adminUser?.fullName || adminUser?.username || 'An admin';
    const targetName =
      targetMembership.user?.fullName || targetMembership.user?.username || 'A member';

    const systemMessage = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content: `${adminName} changed ${targetName}'s role to ${role}`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    emitGroupMemberUpdate(groupId, 'role_changed', { userId: targetUserId, role });
    emitNewGroupMessage({
      ...savedMessage,
      sender: adminUser,
    });

    res.json({
      status: 'success',
      role,
    });
  } catch (error) {
    console.error('Change member role error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update member role' });
  }
};

export const leaveGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const memberRepository = AppDataSource.getRepository(GroupMember);
    const groupRepository = AppDataSource.getRepository(Group);
    const userRepository = AppDataSource.getRepository(User);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
      relations: { user: true },
    });

    if (!membership) {
      res.status(404).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    await memberRepository.remove(membership);
    removeUsersFromGroupSocketRoom(groupId, [currentUserId]);

    // Check remaining members
    const remainingMembers = await memberRepository.find({
      where: { groupId },
      order: { joinedAt: 'ASC' },
    });

    if (remainingMembers.length === 0) {
      // Delete group and messages
      await groupRepository.delete(groupId);
      res.json({ status: 'success', message: 'Group deleted as all members left' });
      return;
    }

    // If no admin left, promote the oldest member to admin
    const hasAdmin = remainingMembers.some((m) => m.role === 'admin');
    if (!hasAdmin && remainingMembers.length > 0) {
      remainingMembers[0].role = 'admin';
      await memberRepository.save(remainingMembers[0]);
      emitGroupMemberUpdate(groupId, 'role_changed', {
        userId: remainingMembers[0].userId,
        role: 'admin',
      });
    }

    const userName = membership.user?.fullName || membership.user?.username || 'A member';
    const systemMessage = messageRepository.create({
      groupId,
      senderId: currentUserId,
      content: `${userName} left the group`,
      messageType: 'system',
    });
    const savedMessage = await messageRepository.save(systemMessage);

    emitGroupMemberUpdate(groupId, 'left', { userId: currentUserId });
    emitNewGroupMessage(savedMessage);

    res.json({ status: 'success', message: 'You left the group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to leave group' });
  }
};

export const markGroupAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const memberRepository = AppDataSource.getRepository(GroupMember);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (membership) {
      membership.lastReadAt = new Date();
      await memberRepository.save(membership);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mark group read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark group as read' });
  }
};

export const getGroupMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = getParam(req.params.groupId);
    const memberRepository = AppDataSource.getRepository(GroupMember);
    const messageRepository = AppDataSource.getRepository(GroupMessage);

    const membership = await memberRepository.findOne({
      where: { groupId, userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ status: 'error', message: 'You are not a member of this group' });
      return;
    }

    const type = (req.query.type as string) || 'all';
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 40));
    const offset = (page - 1) * limit;

    const rawAll = await messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .where('m.groupId = :groupId', { groupId })
      .andWhere('m.isDeletedForEveryone = :isDel', { isDel: false })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    const visible = rawAll.filter(
      (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
    );

    const isPhoto = (m: GroupMessage) =>
      m.messageType === 'image' || (!!m.mediaUrl && !['video', 'document', 'audio', 'voice'].includes(m.messageType));
    const isVideo = (m: GroupMessage) => m.messageType === 'video';
    const isDoc = (m: GroupMessage) => m.messageType === 'document' || (!!m.fileName && !isPhoto(m) && !isVideo(m));
    const isAudio = (m: GroupMessage) => m.messageType === 'audio' || m.messageType === 'voice' || !!m.audioUrl;
    const isLink = (m: GroupMessage) =>
      Boolean(m.content && /https?:\/\/[^\s]+/i.test(m.content));

    const counts = {
      all: visible.filter((m) => isPhoto(m) || isVideo(m) || isDoc(m) || isAudio(m) || isLink(m)).length,
      photos: visible.filter(isPhoto).length,
      videos: visible.filter(isVideo).length,
      documents: visible.filter(isDoc).length,
      audio: visible.filter(isAudio).length,
      links: visible.filter(isLink).length,
    };

    let filtered = visible.filter((m) => {
      switch (type) {
        case 'photo':
        case 'photos':
        case 'image':
          return isPhoto(m);
        case 'video':
        case 'videos':
          return isVideo(m);
        case 'document':
        case 'documents':
        case 'docs':
          return isDoc(m);
        case 'audio':
        case 'voice':
          return isAudio(m);
        case 'link':
        case 'links':
          return isLink(m);
        case 'all':
        default:
          return isPhoto(m) || isVideo(m) || isDoc(m) || isAudio(m) || isLink(m);
      }
    });

    if (search) {
      filtered = filtered.filter((m) => {
        const nameMatch = m.fileName?.toLowerCase().includes(search);
        const contentMatch = m.content?.toLowerCase().includes(search);
        const senderMatch =
          m.sender?.fullName?.toLowerCase().includes(search) ||
          m.sender?.username?.toLowerCase().includes(search);
        return nameMatch || contentMatch || senderMatch;
      });
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    const hasMore = offset + items.length < total;

    res.json({
      status: 'success',
      media: items,
      page,
      limit,
      total,
      hasMore,
      counts,
    });
  } catch (error) {
    console.error('Get group media error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve group media' });
  }
};
