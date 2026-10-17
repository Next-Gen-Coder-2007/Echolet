import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Message, MessageReactionItem } from '../entities/Message';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  emitNewMessage,
  emitMessagesRead,
  emitMessageEdited,
  emitMessageDeletedForEveryone,
  emitMessageStarred,
  emitMessagePinned,
  emitChatCleared,
  emitChatSettingsUpdated,
  emitMessageReactionUpdated,
  isUserOnline,
} from '../socket';

export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const userRepository = AppDataSource.getRepository(User);

    const rawMessages = await messageRepository
      .createQueryBuilder('m')
      .where('m.senderId = :currentUserId OR m.receiverId = :currentUserId', {
        currentUserId,
      })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    const visibleMessages = rawMessages.filter(
      (msg) => !(msg.deletedFor && msg.deletedFor.includes(currentUserId))
    );

    const conversationPartnerIds: string[] = [];
    const lastMessagesMap: Record<string, Message> = {};

    for (const msg of visibleMessages) {
      const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      if (!lastMessagesMap[partnerId]) {
        if (msg.isDeletedForEveryone) {
          msg.content = 'This message was deleted';
          msg.messageType = 'text';
          msg.audioUrl = undefined;
          msg.audioDuration = undefined;
          msg.mediaUrl = undefined;
          msg.poll = undefined;
        }
        lastMessagesMap[partnerId] = msg;
        conversationPartnerIds.push(partnerId);
      }
    }

    if (conversationPartnerIds.length === 0) {
      res.json({
        status: 'success',
        conversations: [],
      });
      return;
    }

    // Include avatarUrl and lastSeen so avatars and presence work properly!
    const partners = await userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: conversationPartnerIds })
      .select([
        'u.id',
        'u.fullName',
        'u.username',
        'u.email',
        'u.avatarUrl',
        'u.lastSeen',
        'u.createdAt',
      ])
      .getMany();

    const partnersMap = new Map(partners.map((p) => [p.id, p]));

    const unreadCounts = await messageRepository
      .createQueryBuilder('m')
      .select('m.senderId', 'senderId')
      .addSelect('COUNT(m.id)', 'count')
      .where('m.receiverId = :currentUserId AND m.isRead = :isRead', {
        currentUserId,
        isRead: false,
      })
      .groupBy('m.senderId')
      .getRawMany();

    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach((row) => {
      unreadMap[row.senderId] = parseInt(row.count, 10) || 0;
    });

    const conversations = conversationPartnerIds
      .map((partnerId) => {
        const partner = partnersMap.get(partnerId);
        if (!partner) return null;
        return {
          user: {
            ...partner,
            isOnline: isUserOnline(partner.id),
          },
          lastMessage: lastMessagesMap[partnerId],
          unreadCount: unreadMap[partnerId] || 0,
        };
      })
      .filter(Boolean);

    res.json({
      status: 'success',
      conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve conversations',
    });
  }
};

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawTargetId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const targetUserId = (rawTargetId || '').trim();

    if (!targetUserId) {
      res.status(400).json({ status: 'error', message: 'Target user ID is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);

    const rawMessages = await messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :currentUserId AND m.receiverId = :targetUserId) OR (m.senderId = :targetUserId AND m.receiverId = :currentUserId)',
        { currentUserId, targetUserId }
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    // Filter out messages that were deleted "for me"
    const messages = rawMessages.filter(
      (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
    );

    // Find unread messages sent by targetUser to current user
    const unreadMessages = messages.filter(
      (m) => m.senderId === targetUserId && m.receiverId === currentUserId && !m.isRead
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m.id);
      await messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ isRead: true, status: 'read' })
        .where('id IN (:...unreadIds)', { unreadIds })
        .execute();

      // Update in memory array for response
      unreadMessages.forEach((m) => {
        m.isRead = true;
        m.status = 'read';
      });

      // Emit read status to sender via Socket.IO
      emitMessagesRead(currentUserId, targetUserId, unreadIds);
    }

    res.json({
      status: 'success',
      messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve messages',
    });
  }
};

export const markMessagesAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawTargetId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const targetUserId = (rawTargetId || '').trim();

    if (!targetUserId) {
      res.status(400).json({ status: 'error', message: 'Target user ID is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const unreadMessages = await messageRepository.find({
      where: {
        senderId: targetUserId,
        receiverId: currentUserId,
        isRead: false,
      },
    });

    if (unreadMessages.length > 0) {
      const ids = unreadMessages.map((m) => m.id);
      await messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ isRead: true, status: 'read' })
        .where('id IN (:...ids)', { ids })
        .execute();

      emitMessagesRead(currentUserId, targetUserId, ids);
    }

    res.json({ status: 'success', count: unreadMessages.length });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark messages as read' });
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawTargetId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const targetUserId = (rawTargetId || '').trim();

    if (!targetUserId) {
      res.status(400).json({ status: 'error', message: 'Target user ID is required' });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ status: 'error', message: 'You cannot message yourself' });
      return;
    }

    const messageType = req.body.messageType || 'text';
    let content = (req.body.content || '').trim();
    if (!content && (messageType === 'voice' || messageType === 'audio')) {
      content = 'Voice note';
    } else if (!content && (messageType === 'image' || messageType === 'video')) {
      content = messageType === 'image' ? 'Photo' : 'Video';
    } else if (!content && messageType === 'document') {
      content = req.body.fileName || 'Document';
    } else if (!content && messageType === 'poll') {
      content = req.body.poll?.question || 'Poll';
    } else if (!content && messageType === 'story_reply') {
      content = req.body.story ? 'Replied to story' : 'Story reaction';
    } else if (!content && messageType === 'post') {
      content = 'Shared an echo';
    } else if (!content && messageType === 'reel') {
      content = 'Shared a reel';
    }

    if (!content && !req.body.mediaUrl && !req.body.poll && !req.body.story) {
      res.status(400).json({ status: 'error', message: 'Message content or attachment is required' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const currentUser = await userRepository.findOne({ where: { id: currentUserId } });
    const targetUser = await userRepository.findOne({ where: { id: targetUserId } });

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Recipient not found' });
      return;
    }

    // Check if either user has blocked the other
    if (currentUser?.blockedUsers && currentUser.blockedUsers.includes(targetUserId)) {
      res.status(403).json({
        status: 'error',
        message: 'You have blocked this contact. Unblock to send messages.',
      });
      return;
    }

    if (targetUser.blockedUsers && targetUser.blockedUsers.includes(currentUserId)) {
      res.status(403).json({
        status: 'error',
        message: 'You cannot send messages to this contact.',
      });
      return;
    }

    // Determine initial status based on recipient socket presence
    const receiverOnline = isUserOnline(targetUserId);
    const initialStatus = receiverOnline ? 'delivered' : 'sent';

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

    const messageRepository = AppDataSource.getRepository(Message);
    const message = messageRepository.create({
      senderId: currentUserId,
      receiverId: targetUserId,
      content,
      messageType,
      mediaUrl: req.body.mediaUrl || null,
      fileName: req.body.fileName || null,
      fileSize: req.body.fileSize || null,
      poll: formattedPoll,
      audioUrl: req.body.audioUrl || null,
      audioDuration: req.body.audioDuration ? Number(req.body.audioDuration) : undefined,
      isRead: false,
      status: initialStatus,
      replyTo: req.body.replyTo || null,
      story: req.body.story || null,
      isForwarded: Boolean(req.body.isForwarded),
    });

    const savedMessage = await messageRepository.save(message);

    emitNewMessage(savedMessage);

    res.status(201).json({
      status: 'success',
      message: savedMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
    });
  }
};

export const editMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();
    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

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
      message.messageType === 'story_reply' ||
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

    let content = (req.body.content || '').trim();
    if (!content) {
      if (message.mediaUrl || message.messageType === 'image' || message.messageType === 'video') {
        content = message.messageType === 'video' ? 'Video' : 'Photo';
      } else {
        res.status(400).json({ status: 'error', message: 'Message content cannot be empty' });
        return;
      }
    }

    // Enforce 10-minute edit limit
    const elapsedMs = Date.now() - new Date(message.createdAt).getTime();
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    if (elapsedMs > TEN_MINUTES_MS) {
      res.status(400).json({
        status: 'error',
        message: 'Messages can only be edited within 10 minutes of sending',
      });
      return;
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    const saved = await messageRepository.save(message);
    emitMessageEdited(saved);

    res.json({
      status: 'success',
      message: saved,
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to edit message' });
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const count = await messageRepository.count({
      where: {
        receiverId: currentUserId,
        isRead: false,
      },
    });

    res.json({
      status: 'success',
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get unread count' });
  }
};

export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();
    const mode = req.body?.mode || 'for_me'; // 'for_me' | 'for_everyone'

    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (message.senderId !== currentUserId && message.receiverId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'You are not part of this conversation' });
      return;
    }

    if (mode === 'for_everyone') {
      // Only sender can delete for everyone
      if (message.senderId !== currentUserId) {
        res.status(403).json({
          status: 'error',
          message: 'You can only delete your own messages for everyone',
        });
        return;
      }

      // 24-hour limit
      const elapsedMs = Date.now() - new Date(message.createdAt).getTime();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      if (elapsedMs > TWENTY_FOUR_HOURS_MS) {
        res.status(400).json({
          status: 'error',
          message: 'Delete for everyone is only available within 24 hours of sending',
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
      message.audioDuration = undefined;
      message.mediaUrl = undefined;
      message.poll = undefined;
      const saved = await messageRepository.save(message);

      emitMessageDeletedForEveryone(saved);
      emitMessagePinned(saved);
      emitMessageStarred(saved);

      res.json({
        status: 'success',
        mode: 'for_everyone',
        message: saved,
      });
      return;
    } else {
      // Delete for me
      const deletedFor = Array.isArray(message.deletedFor) ? [...message.deletedFor] : [];
      if (!deletedFor.includes(currentUserId)) {
        deletedFor.push(currentUserId);
      }
      message.deletedFor = deletedFor;

      // Remove from starredBy for me if I starred it
      if (Array.isArray(message.starredBy) && message.starredBy.includes(currentUserId)) {
        message.starredBy = message.starredBy.filter((id) => id !== currentUserId);
      }

      const saved = await messageRepository.save(message);

      res.json({
        status: 'success',
        mode: 'for_me',
        messageId: saved.id,
      });
      return;
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete message' });
  }
};

export const toggleStarMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();

    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

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
    emitMessageStarred(saved);

    res.json({
      status: 'success',
      message: saved,
      isStarred: starredBy.includes(currentUserId),
    });
  } catch (error) {
    console.error('Toggle star message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle star' });
  }
};

export const togglePinMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();

    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    const isNowPinned = !message.isPinned;
    if (isNowPinned) {
      // Unpin any other message between these two conversation partners
      const partnerId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      await messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ isPinned: false, pinnedAt: undefined, pinnedBy: undefined })
        .where(
          '((senderId = :u1 AND receiverId = :u2) OR (senderId = :u2 AND receiverId = :u1)) AND id != :msgId',
          { u1: currentUserId, u2: partnerId, msgId: message.id }
        )
        .execute();
    }

    message.isPinned = isNowPinned;
    message.pinnedAt = isNowPinned ? new Date() : undefined;
    message.pinnedBy = isNowPinned ? currentUserId : undefined;

    const saved = await messageRepository.save(message);
    emitMessagePinned(saved);

    res.json({
      status: 'success',
      message: saved,
      isPinned: isNowPinned,
    });
  } catch (error) {
    console.error('Toggle pin message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle pin' });
  }
};

export const voteMessagePoll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();
    const { optionId } = req.body;

    if (!optionId) {
      res.status(400).json({ status: 'error', message: 'Option ID is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

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
    emitMessageEdited(saved);

    res.json({
      status: 'success',
      message: saved,
    });
  } catch (error) {
    console.error('Vote message poll error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to vote on poll' });
  }
};

export const clearConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawTargetId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const targetUserId = (rawTargetId || '').trim();

    if (!targetUserId) {
      res.status(400).json({ status: 'error', message: 'Target user ID is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const messages = await messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :currentUserId AND m.receiverId = :targetUserId) OR (m.senderId = :targetUserId AND m.receiverId = :currentUserId)',
        { currentUserId, targetUserId }
      )
      .getMany();

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

    emitChatCleared(currentUserId, targetUserId);

    res.json({
      status: 'success',
      message: 'Chat cleared successfully',
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to clear conversation' });
  }
};

export const getChatSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: currentUserId } });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    res.json({
      status: 'success',
      settings: {
        archivedChats: user.archivedChats || [],
        mutedChats: user.mutedChats || [],
        pinnedChats: user.pinnedChats || [],
        unreadChats: user.unreadChats || [],
        favouriteChats: user.favouriteChats || [],
        blockedUsers: user.blockedUsers || [],
      },
    });
  } catch (error) {
    console.error('Get chat settings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve chat settings' });
  }
};

export const updateChatSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { action, chatId, targetUserId } = req.body;
    const targetId = (chatId || targetUserId || '').trim();

    if (!targetId) {
      res.status(400).json({ status: 'error', message: 'chatId or targetUserId is required' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: currentUserId } });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const toggle = (list?: string[], item?: string) => {
      if (!item) return list || [];
      const arr = Array.isArray(list) ? [...list] : [];
      return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
    };

    if (action === 'toggle_archive') {
      user.archivedChats = toggle(user.archivedChats, targetId);
    } else if (action === 'toggle_mute') {
      user.mutedChats = toggle(user.mutedChats, targetId);
    } else if (action === 'toggle_pin') {
      user.pinnedChats = toggle(user.pinnedChats, targetId);
    } else if (action === 'toggle_unread') {
      user.unreadChats = toggle(user.unreadChats, targetId);
    } else if (action === 'toggle_favourite') {
      user.favouriteChats = toggle(user.favouriteChats, targetId);
    } else if (action === 'toggle_block') {
      user.blockedUsers = toggle(user.blockedUsers, targetId);
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid action' });
      return;
    }

    await userRepository.save(user);

    const updatedSettings = {
      archivedChats: user.archivedChats || [],
      mutedChats: user.mutedChats || [],
      pinnedChats: user.pinnedChats || [],
      unreadChats: user.unreadChats || [],
      favouriteChats: user.favouriteChats || [],
      blockedUsers: user.blockedUsers || [],
    };

    emitChatSettingsUpdated(currentUserId, updatedSettings);

    res.json({
      status: 'success',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Update chat settings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update chat settings' });
  }
};

export const getConversationMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawTargetId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const targetUserId = (rawTargetId || '').trim();

    if (!targetUserId) {
      res.status(400).json({ status: 'error', message: 'Target user ID is required' });
      return;
    }

    const type = (req.query.type as string) || 'all';
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 40));
    const offset = (page - 1) * limit;

    const messageRepository = AppDataSource.getRepository(Message);

    const baseQb = messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .where(
        '((m.senderId = :currentUserId AND m.receiverId = :targetUserId) OR (m.senderId = :targetUserId AND m.receiverId = :currentUserId))',
        { currentUserId, targetUserId }
      )
      .andWhere('m.isDeletedForEveryone = :isDel', { isDel: false });

    const rawAll = await baseQb.orderBy('m.createdAt', 'DESC').getMany();

    const visible = rawAll.filter(
      (m) => !(m.deletedFor && m.deletedFor.includes(currentUserId))
    );

    const isPhoto = (m: Message) =>
      m.messageType === 'image' || (!!m.mediaUrl && !['video', 'document', 'audio', 'voice'].includes(m.messageType));
    const isVideo = (m: Message) => m.messageType === 'video';
    const isDoc = (m: Message) => m.messageType === 'document' || (!!m.fileName && !isPhoto(m) && !isVideo(m));
    const isAudio = (m: Message) => m.messageType === 'audio' || m.messageType === 'voice' || !!m.audioUrl;
    const isLink = (m: Message) =>
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
    console.error('Get conversation media error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve conversation media' });
  }
};

export const toggleMessageReaction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId || !req.user) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawMessageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const messageId = (rawMessageId || '').trim();
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 20) {
      res.status(400).json({ status: 'error', message: 'Valid emoji is required' });
      return;
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const message = await messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (message.senderId !== currentUserId && message.receiverId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    let reactions: MessageReactionItem[] = Array.isArray(message.reactions)
      ? [...message.reactions]
      : [];

    const existingIndex = reactions.findIndex((r) => r.userId === currentUserId);
    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex] = {
          emoji,
          userId: currentUserId,
          fullName: req.user.fullName,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl,
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      reactions.push({
        emoji,
        userId: currentUserId,
        fullName: req.user.fullName,
        username: req.user.username,
        avatarUrl: req.user.avatarUrl,
        createdAt: new Date().toISOString(),
      });
    }

    message.reactions = reactions;
    await messageRepository.save(message);

    emitMessageReactionUpdated({
      messageId: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      reactions,
    });

    res.json({
      status: 'success',
      messageId: message.id,
      reactions,
    });
  } catch (error) {
    console.error('Toggle message reaction error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update reaction' });
  }
};

