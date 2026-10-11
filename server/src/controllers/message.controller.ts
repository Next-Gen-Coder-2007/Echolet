import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Message } from '../entities/Message';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  emitNewMessage,
  emitMessagesRead,
  emitMessageEdited,
  emitMessageDeletedForEveryone,
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

    const content = (req.body.content || '').trim();
    if (!content) {
      res.status(400).json({ status: 'error', message: 'Message content cannot be empty' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const targetUser = await userRepository.findOne({ where: { id: targetUserId } });

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Recipient not found' });
      return;
    }

    // Determine initial status based on recipient socket presence
    const receiverOnline = isUserOnline(targetUserId);
    const initialStatus = receiverOnline ? 'delivered' : 'sent';

    const messageRepository = AppDataSource.getRepository(Message);
    const message = messageRepository.create({
      senderId: currentUserId,
      receiverId: targetUserId,
      content,
      isRead: false,
      status: initialStatus,
      replyTo: req.body.replyTo || null,
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
    const content = (req.body.content || '').trim();

    if (!content) {
      res.status(400).json({ status: 'error', message: 'Message content cannot be empty' });
      return;
    }

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
      const saved = await messageRepository.save(message);

      emitMessageDeletedForEveryone(saved);

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
