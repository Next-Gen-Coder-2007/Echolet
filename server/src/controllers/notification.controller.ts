import { Response } from 'express';
import { In, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { Follow } from '../entities/Follow';
import { FollowRequest } from '../entities/FollowRequest';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emitNotificationCount } from '../socket';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const notificationRepo = AppDataSource.getRepository(Notification);
    const followRepo = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    // Keep notifications for 30 days:
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Prune expired notifications older than 30 days
    await notificationRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :thirtyDaysAgo', { thirtyDaysAgo })
      .execute()
      .catch((err) => console.error('Error auto-pruning expired notifications:', err));

    const notifications = await notificationRepo.find({
      where: {
        recipientId: currentUserId,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    // Check which actors the current user is following (for "Follow back" buttons)
    const actorIds = Array.from(new Set(notifications.map((n) => n.actorId).filter(Boolean)));
    const myFollows = actorIds.length > 0
      ? await followRepo.find({
          where: {
            followerId: currentUserId,
            followingId: In(actorIds),
          },
          select: { followingId: true },
        })
      : [];
    const followedActorIds = new Set(myFollows.map((f) => f.followingId));

    // Also get active pending follow requests to verify status of follow_request notifications
    const pendingRequests = await followRequestRepo.find({
      where: { targetId: currentUserId, status: 'pending' },
    });
    const pendingRequestMap = new Map<string, string>();
    pendingRequests.forEach((r) => {
      pendingRequestMap.set(r.requesterId, r.id);
    });

    const enrichedNotifications = notifications.map((n) => {
      const isActorFollowed = followedActorIds.has(n.actorId);
      const pendingRequestId = pendingRequestMap.get(n.actorId) || (n.entityType === 'follow_request' ? n.entityId : undefined);
      const isRequestPending = n.requestStatus
        ? n.requestStatus === 'pending'
        : Boolean(pendingRequestMap.has(n.actorId));

      return {
        id: n.id,
        type: n.type,
        entityType: n.entityType,
        entityId: n.entityId,
        message: n.message,
        isRead: n.isRead,
        requestStatus: n.requestStatus || (isRequestPending ? 'pending' : undefined),
        createdAt: n.createdAt,
        actor: {
          id: n.actor?.id,
          fullName: n.actor?.fullName,
          username: n.actor?.username,
          avatarUrl: n.actor?.avatarUrl,
        },
        isActorFollowed,
        isRequestPending: n.type === 'follow_request' ? isRequestPending : undefined,
        followRequestId: n.type === 'follow_request' ? pendingRequestId : undefined,
      };
    });

    res.json({
      status: 'success',
      notifications: enrichedNotifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notifications',
    });
  }
};

export const getUnreadNotificationCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const notificationRepo = AppDataSource.getRepository(Notification);
    const count = await notificationRepo.count({
      where: {
        recipientId: currentUserId,
        isRead: false,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    res.json({
      status: 'success',
      count,
    });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread notification count',
    });
  }
};

export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const notificationRepo = AppDataSource.getRepository(Notification);
    await notificationRepo.update(
      { recipientId: currentUserId, isRead: false },
      { isRead: true }
    );

    await emitNotificationCount(currentUserId);

    res.json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notifications as read',
    });
  }
};

export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = (rawId || '').trim();

    const notificationRepo = AppDataSource.getRepository(Notification);
    await notificationRepo.update(
      { id: notificationId, recipientId: currentUserId },
      { isRead: true }
    );

    await emitNotificationCount(currentUserId);

    res.json({
      status: 'success',
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read',
    });
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = (rawId || '').trim();

    const notificationRepo = AppDataSource.getRepository(Notification);
    await notificationRepo.delete({
      id: notificationId,
      recipientId: currentUserId,
    });

    await emitNotificationCount(currentUserId);

    res.json({
      status: 'success',
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete notification',
    });
  }
};
