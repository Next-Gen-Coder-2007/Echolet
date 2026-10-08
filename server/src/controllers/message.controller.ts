import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Message } from '../entities/Message';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emitNewMessage } from '../socket';

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

    const conversationPartnerIds: string[] = [];
    const lastMessagesMap: Record<string, Message> = {};

    for (const msg of rawMessages) {
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

    const partners = await userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: conversationPartnerIds })
      .select(['u.id', 'u.fullName', 'u.username', 'u.email', 'u.createdAt'])
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
          user: partner,
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

    const messages = await messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :currentUserId AND m.receiverId = :targetUserId) OR (m.senderId = :targetUserId AND m.receiverId = :currentUserId)',
        { currentUserId, targetUserId }
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    await messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('senderId = :targetUserId AND receiverId = :currentUserId AND isRead = :isRead', {
        targetUserId,
        currentUserId,
        isRead: false,
      })
      .execute();

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

    const messageRepository = AppDataSource.getRepository(Message);
    const message = messageRepository.create({
      senderId: currentUserId,
      receiverId: targetUserId,
      content,
      isRead: false,
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
