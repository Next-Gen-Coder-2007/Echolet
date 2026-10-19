import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Follow } from '../entities/Follow';
import { FollowRequest } from '../entities/FollowRequest';
import { Notification } from '../entities/Notification';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  emitFollowUpdated,
  emitFollowRequestUpdated,
  emitNotification,
} from '../socket';

export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string || '').trim().toLowerCase();

    if (!query) {
      res.json({
        status: 'success',
        users: [],
      });
      return;
    }

    const currentUserId = req.user?.id;
    const userRepository = AppDataSource.getRepository(User);
    const followRepository = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    const queryBuilder = userRepository
      .createQueryBuilder('user')
      .where('(LOWER(user.username) LIKE :query OR LOWER(user.fullName) LIKE :query)', {
        query: `%${query}%`,
      })
      .select([
        'user.id',
        'user.fullName',
        'user.username',
        'user.avatarUrl',
        'user.bio',
        'user.createdAt',
        'user.isPrivate',
      ]);

    if (currentUserId) {
      queryBuilder.andWhere('user.id != :currentUserId', { currentUserId });
    }

    const users = await queryBuilder.take(20).getMany();

    const followedIds = currentUserId
      ? (
          await followRepository.find({
            where: { followerId: currentUserId },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      : [];

    const pendingRequestIds = currentUserId
      ? (
          await followRequestRepo.find({
            where: { requesterId: currentUserId, status: 'pending' },
            select: { targetId: true },
          })
        ).map((r) => r.targetId)
      : [];

    const usersWithFollow = users.map((u) => ({
      ...u,
      isPrivate: Boolean(u.isPrivate),
      isFollowing: followedIds.includes(u.id),
      hasPendingFollowRequest: pendingRequestIds.includes(u.id),
    }));

    res.json({
      status: 'success',
      users: usersWithFollow,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search users',
    });
  }
};

export const getUserByUsername = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawUsername = Array.isArray(req.params.username)
      ? req.params.username[0]
      : req.params.username;
    const username = (rawUsername || '').trim().toLowerCase();
    const userRepository = AppDataSource.getRepository(User);
    const followRepository = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    let user = await userRepository.findOne({
      where: { username },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        birthday: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        lastSeen: true,
        createdAt: true,
        isPrivate: true,
      },
    });

    if (!user) {
      user = await userRepository.findOne({
        where: { id: rawUsername },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          birthday: true,
          gender: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
          lastSeen: true,
          createdAt: true,
          isPrivate: true,
        },
      });
    }

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const currentUserId = req.user?.id;
    const followersCount = await followRepository.count({
      where: { followingId: user.id },
    });
    const followingCount = await followRepository.count({
      where: { followerId: user.id },
    });

    const isSelf = currentUserId === user.id;
    let isFollowing = false;
    let isFollowedBy = false;
    let hasPendingFollowRequest = false;
    let hasIncomingFollowRequest = false;

    if (currentUserId && !isSelf) {
      isFollowing = Boolean(
        await followRepository.findOne({
          where: { followerId: currentUserId, followingId: user.id },
        })
      );
      isFollowedBy = Boolean(
        await followRepository.findOne({
          where: { followerId: user.id, followingId: currentUserId },
        })
      );
      hasPendingFollowRequest = Boolean(
        await followRequestRepo.findOne({
          where: { requesterId: currentUserId, targetId: user.id, status: 'pending' },
        })
      );
      hasIncomingFollowRequest = Boolean(
        await followRequestRepo.findOne({
          where: { requesterId: user.id, targetId: currentUserId, status: 'pending' },
        })
      );
    }

    const isPrivate = Boolean(user.isPrivate);
    const canViewContent = !isPrivate || isSelf || isFollowing;
    const canMessageAndCall = !isPrivate || isSelf || isFollowing || isFollowedBy;

    const safeUserProfile = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      isPrivate,
      followersCount,
      followingCount,
      isFollowing,
      isFollowedBy,
      hasPendingFollowRequest,
      hasIncomingFollowRequest,
      canViewContent,
      canMessageAndCall,
      ...(isSelf
        ? {
            email: user.email,
            birthday: user.birthday,
            gender: user.gender,
          }
        : {}),
    };

    res.json({
      status: 'success',
      user: safeUserProfile,
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawUserId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const userId = (rawUserId || '').trim();
    const userRepository = AppDataSource.getRepository(User);
    const followRepository = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    const user = await userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        birthday: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        lastSeen: true,
        createdAt: true,
        isPrivate: true,
      },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const currentUserId = req.user?.id;
    const followersCount = await followRepository.count({
      where: { followingId: user.id },
    });
    const followingCount = await followRepository.count({
      where: { followerId: user.id },
    });

    const isSelf = currentUserId === user.id;
    let isFollowing = false;
    let isFollowedBy = false;
    let hasPendingFollowRequest = false;
    let hasIncomingFollowRequest = false;

    if (currentUserId && !isSelf) {
      isFollowing = Boolean(
        await followRepository.findOne({
          where: { followerId: currentUserId, followingId: user.id },
        })
      );
      isFollowedBy = Boolean(
        await followRepository.findOne({
          where: { followerId: user.id, followingId: currentUserId },
        })
      );
      hasPendingFollowRequest = Boolean(
        await followRequestRepo.findOne({
          where: { requesterId: currentUserId, targetId: user.id, status: 'pending' },
        })
      );
      hasIncomingFollowRequest = Boolean(
        await followRequestRepo.findOne({
          where: { requesterId: user.id, targetId: currentUserId, status: 'pending' },
        })
      );
    }

    const isPrivate = Boolean(user.isPrivate);
    const canViewContent = !isPrivate || isSelf || isFollowing;

    const safeUserProfile = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      isPrivate,
      followersCount,
      followingCount,
      isFollowing,
      isFollowedBy,
      hasPendingFollowRequest,
      hasIncomingFollowRequest,
      canViewContent,
      ...(isSelf
        ? {
            email: user.email,
            birthday: user.birthday,
            gender: user.gender,
          }
        : {}),
    };

    res.json({
      status: 'success',
      user: safeUserProfile,
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
    });
  }
};

export const getFollowingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const followRepository = AppDataSource.getRepository(Follow);
    const follows = await followRepository.find({
      where: { followerId: currentUserId },
      relations: { following: true },
      order: { createdAt: 'DESC' },
    });

    const followingUsers = follows
      .map((f) => f.following)
      .filter(Boolean)
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      }));

    res.json({
      status: 'success',
      users: followingUsers,
    });
  } catch (error) {
    console.error('Get following users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch following users',
    });
  }
};

/**
 * Get all connected users (people we followed OR our followers)
 */
export const getConnections = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawQuery = (req.query.q as string) || '';
    const query = rawQuery.trim().toLowerCase();

    const followRepository = AppDataSource.getRepository(Follow);

    // Fetch people we follow AND our followers in parallel
    const [followingRows, followerRows] = await Promise.all([
      followRepository.find({
        where: { followerId: currentUserId },
        relations: { following: true },
        order: { createdAt: 'DESC' },
      }),
      followRepository.find({
        where: { followingId: currentUserId },
        relations: { follower: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const followingIdSet = new Set(followingRows.map((f) => f.followingId));
    const followerIdSet = new Set(followerRows.map((f) => f.followerId));

    const userMap = new Map<
      string,
      {
        id: string;
        fullName: string;
        username: string;
        avatarUrl?: string;
        bio?: string;
        isFollowing: boolean;
        isFollower: boolean;
      }
    >();

    for (const f of followingRows) {
      if (f.following && f.following.id !== currentUserId) {
        userMap.set(f.following.id, {
          id: f.following.id,
          fullName: f.following.fullName,
          username: f.following.username,
          avatarUrl: f.following.avatarUrl,
          bio: f.following.bio,
          isFollowing: true,
          isFollower: followerIdSet.has(f.following.id),
        });
      }
    }

    for (const f of followerRows) {
      if (f.follower && f.follower.id !== currentUserId) {
        if (!userMap.has(f.follower.id)) {
          userMap.set(f.follower.id, {
            id: f.follower.id,
            fullName: f.follower.fullName,
            username: f.follower.username,
            avatarUrl: f.follower.avatarUrl,
            bio: f.follower.bio,
            isFollowing: followingIdSet.has(f.follower.id),
            isFollower: true,
          });
        }
      }
    }

    let connectedUsers = Array.from(userMap.values());

    if (query) {
      connectedUsers = connectedUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(query) ||
          (u.fullName && u.fullName.toLowerCase().includes(query))
      );
    }

    connectedUsers.sort((a, b) => {
      const aMutual = a.isFollowing && a.isFollower ? 1 : 0;
      const bMutual = b.isFollowing && b.isFollower ? 1 : 0;
      if (aMutual !== bMutual) return bMutual - aMutual;
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    });

    res.json({
      status: 'success',
      users: connectedUsers,
      totalCount: connectedUsers.length,
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch connections',
    });
  }
};

export const getUserFollowers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawUsername = Array.isArray(req.params.username)
      ? req.params.username[0]
      : req.params.username;
    const username = (rawUsername || '').trim().toLowerCase();
    const currentUserId = req.user?.id;

    const userRepo = AppDataSource.getRepository(User);
    const followRepo = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    let targetUser = await userRepo.findOne({ where: { username } });
    if (!targetUser) {
      targetUser = await userRepo.findOne({ where: { id: rawUsername } });
    }

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    // Privacy check: If user is private and visitor is not self, verify visitor follows targetUser
    const isSelf = currentUserId === targetUser.id;
    if (targetUser.isPrivate && !isSelf) {
      const isFollowingTarget = currentUserId
        ? Boolean(await followRepo.findOne({ where: { followerId: currentUserId, followingId: targetUser.id } }))
        : false;

      if (!isFollowingTarget) {
        res.status(403).json({
          status: 'error',
          isPrivate: true,
          message: 'This account is private. Follow to view followers.',
        });
        return;
      }
    }

    // Find all follows where followingId = targetUser.id
    const follows = await followRepo.find({
      where: { followingId: targetUser.id },
      relations: { follower: true },
      order: { createdAt: 'DESC' },
    });

    const followerUsers = follows
      .map((f) => f.follower)
      .filter(Boolean);

    const followerIds = followerUsers.map((u) => u.id);

    // Current user's relationship with these followers
    let followedIds = new Set<string>();
    let pendingRequestIds = new Set<string>();
    let followersOfCurrent = new Set<string>();

    if (currentUserId && followerIds.length > 0) {
      const [myFollows, myRequests, followersOfMe] = await Promise.all([
        followRepo.find({
          where: { followerId: currentUserId, followingId: In(followerIds) },
          select: { followingId: true },
        }),
        followRequestRepo.find({
          where: { requesterId: currentUserId, targetId: In(followerIds), status: 'pending' },
          select: { targetId: true },
        }),
        followRepo.find({
          where: { followerId: In(followerIds), followingId: currentUserId },
          select: { followerId: true },
        }),
      ]);

      followedIds = new Set(myFollows.map((f) => f.followingId));
      pendingRequestIds = new Set(myRequests.map((r) => r.targetId));
      followersOfCurrent = new Set(followersOfMe.map((f) => f.followerId));
    }

    const result = followerUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isPrivate: Boolean(u.isPrivate),
      isSelf: currentUserId === u.id,
      isFollowing: followedIds.has(u.id),
      hasPendingFollowRequest: pendingRequestIds.has(u.id),
      isFollowedBy: followersOfCurrent.has(u.id),
    }));

    res.json({
      status: 'success',
      followers: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Get user followers error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch followers' });
  }
};

export const getUserFollowing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawUsername = Array.isArray(req.params.username)
      ? req.params.username[0]
      : req.params.username;
    const username = (rawUsername || '').trim().toLowerCase();
    const currentUserId = req.user?.id;

    const userRepo = AppDataSource.getRepository(User);
    const followRepo = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);

    let targetUser = await userRepo.findOne({ where: { username } });
    if (!targetUser) {
      targetUser = await userRepo.findOne({ where: { id: rawUsername } });
    }

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    // Privacy check: If user is private and visitor is not self, verify visitor follows targetUser
    const isSelf = currentUserId === targetUser.id;
    if (targetUser.isPrivate && !isSelf) {
      const isFollowingTarget = currentUserId
        ? Boolean(await followRepo.findOne({ where: { followerId: currentUserId, followingId: targetUser.id } }))
        : false;

      if (!isFollowingTarget) {
        res.status(403).json({
          status: 'error',
          isPrivate: true,
          message: 'This account is private. Follow to view following.',
        });
        return;
      }
    }

    // Find all follows where followerId = targetUser.id
    const follows = await followRepo.find({
      where: { followerId: targetUser.id },
      relations: { following: true },
      order: { createdAt: 'DESC' },
    });

    const followingUsers = follows
      .map((f) => f.following)
      .filter(Boolean);

    const followingIds = followingUsers.map((u) => u.id);

    // Current user's relationship with these users
    let followedIds = new Set<string>();
    let pendingRequestIds = new Set<string>();
    let followersOfCurrent = new Set<string>();

    if (currentUserId && followingIds.length > 0) {
      const [myFollows, myRequests, followersOfMe] = await Promise.all([
        followRepo.find({
          where: { followerId: currentUserId, followingId: In(followingIds) },
          select: { followingId: true },
        }),
        followRequestRepo.find({
          where: { requesterId: currentUserId, targetId: In(followingIds), status: 'pending' },
          select: { targetId: true },
        }),
        followRepo.find({
          where: { followerId: In(followingIds), followingId: currentUserId },
          select: { followerId: true },
        }),
      ]);

      followedIds = new Set(myFollows.map((f) => f.followingId));
      pendingRequestIds = new Set(myRequests.map((r) => r.targetId));
      followersOfCurrent = new Set(followersOfMe.map((f) => f.followerId));
    }

    const result = followingUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isPrivate: Boolean(u.isPrivate),
      isSelf: currentUserId === u.id,
      isFollowing: followedIds.has(u.id),
      hasPendingFollowRequest: pendingRequestIds.has(u.id),
      isFollowedBy: followersOfCurrent.has(u.id),
    }));

    res.json({
      status: 'success',
      following: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Get user following error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch following users' });
  }
};

export const removeFollower = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      res.status(400).json({ status: 'error', message: 'Follower user ID is required' });
      return;
    }

    const followRepo = AppDataSource.getRepository(Follow);

    // Remove where followerId = targetUserId and followingId = currentUserId
    await followRepo.delete({
      followerId: targetUserId,
      followingId: currentUserId,
    });

    emitFollowUpdated({
      followerId: targetUserId,
      followingId: currentUserId,
      isFollowing: false,
    });

    const followersCount = await followRepo.count({
      where: { followingId: currentUserId },
    });

    res.json({
      status: 'success',
      message: 'Follower removed successfully',
      followersCount,
    });
  } catch (error) {
    console.error('Remove follower error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove follower' });
  }
};

export const followUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      res.status(400).json({ status: 'error', message: 'You cannot follow yourself' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const followRepository = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);
    const notificationRepo = AppDataSource.getRepository(Notification);

    const targetUser = await userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User to follow not found' });
      return;
    }

    const isTargetPrivate = Boolean(targetUser.isPrivate);

    // If target user is private:
    if (isTargetPrivate) {
      const existingFollow = await followRepository.findOne({
        where: { followerId: currentUserId, followingId: targetUserId },
      });

      if (existingFollow) {
        const followersCount = await followRepository.count({
          where: { followingId: targetUserId },
        });
        res.json({
          status: 'success',
          isFollowing: true,
          isRequested: false,
          followersCount,
        });
        return;
      }

      let existingReq = await followRequestRepo.findOne({
        where: { requesterId: currentUserId, targetId: targetUserId },
      });

      if (!existingReq) {
        existingReq = followRequestRepo.create({
          requesterId: currentUserId,
          targetId: targetUserId,
          status: 'pending',
        });
        await followRequestRepo.save(existingReq);

        // Create notification for target user
        const notif = notificationRepo.create({
          recipientId: targetUserId,
          actorId: currentUserId,
          type: 'follow_request',
          entityType: 'follow_request',
          entityId: existingReq.id,
          message: 'requested to follow you',
        });
        const savedNotif = await notificationRepo.save(notif);
        const fullNotif = await notificationRepo.findOne({
          where: { id: savedNotif.id },
          relations: { actor: true },
        });
        if (fullNotif) {
          emitNotification(fullNotif);
        }
      }

      emitFollowRequestUpdated({
        requesterId: currentUserId,
        targetId: targetUserId,
        status: 'pending',
        requestId: existingReq.id,
      });

      const followersCount = await followRepository.count({
        where: { followingId: targetUserId },
      });

      res.json({
        status: 'success',
        isFollowing: false,
        isRequested: true,
        followersCount,
      });
      return;
    }

    // Public account follow flow:
    const existingFollow = await followRepository.findOne({
      where: { followerId: currentUserId, followingId: targetUserId },
    });

    if (!existingFollow) {
      const newFollow = followRepository.create({
        followerId: currentUserId,
        followingId: targetUserId,
      });
      await followRepository.save(newFollow);

      // Create notification for target user
      const notif = notificationRepo.create({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: 'follow',
        entityType: 'user',
        entityId: currentUserId,
        message: 'started following you',
      });
      const savedNotif = await notificationRepo.save(notif);
      const fullNotif = await notificationRepo.findOne({
        where: { id: savedNotif.id },
        relations: { actor: true },
      });
      if (fullNotif) {
        emitNotification(fullNotif);
      }
    }

    emitFollowUpdated({
      followerId: currentUserId,
      followingId: targetUserId,
      isFollowing: true,
    });

    const followersCount = await followRepository.count({
      where: { followingId: targetUserId },
    });

    res.json({
      status: 'success',
      isFollowing: true,
      isRequested: false,
      followersCount,
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to follow user',
    });
  }
};

export const unfollowUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const followRepository = AppDataSource.getRepository(Follow);
    const followRequestRepo = AppDataSource.getRepository(FollowRequest);
    const notificationRepo = AppDataSource.getRepository(Notification);

    await followRepository.delete({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    await followRequestRepo.delete({
      requesterId: currentUserId,
      targetId: targetUserId,
    });

    // Keep notification for 30 days and update requestStatus
    await notificationRepo.update(
      { recipientId: targetUserId, actorId: currentUserId, type: 'follow_request' },
      { requestStatus: 'cancelled' }
    );

    emitFollowUpdated({
      followerId: currentUserId,
      followingId: targetUserId,
      isFollowing: false,
    });

    emitFollowRequestUpdated({
      requesterId: currentUserId,
      targetId: targetUserId,
      status: 'cancelled',
    });

    const followersCount = await followRepository.count({
      where: { followingId: targetUserId },
    });

    res.json({
      status: 'success',
      isFollowing: false,
      isRequested: false,
      followersCount,
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unfollow user',
    });
  }
};

export const acceptFollowRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(req.params.requestId)
      ? req.params.requestId[0]
      : req.params.requestId;
    const requestId = (rawId || '').trim();

    const followRequestRepo = AppDataSource.getRepository(FollowRequest);
    const followRepo = AppDataSource.getRepository(Follow);
    const notificationRepo = AppDataSource.getRepository(Notification);

    const followRequest = await followRequestRepo.findOne({
      where: { id: requestId, targetId: currentUserId },
      relations: { requester: true },
    });

    if (!followRequest) {
      res.status(404).json({
        status: 'error',
        message: 'Follow request not found or unauthorized',
      });
      return;
    }

    // Create follow relationship (requester follows current user)
    const existingFollow = await followRepo.findOne({
      where: {
        followerId: followRequest.requesterId,
        followingId: currentUserId,
      },
    });

    if (!existingFollow) {
      const newFollow = followRepo.create({
        followerId: followRequest.requesterId,
        followingId: currentUserId,
      });
      await followRepo.save(newFollow);
    }

    // Delete the request
    await followRequestRepo.delete({ id: requestId });

    // Keep notification for 30 days and mark as accepted
    await notificationRepo.update(
      { recipientId: currentUserId, actorId: followRequest.requesterId, type: 'follow_request' },
      { requestStatus: 'accepted', isRead: true }
    );

    // Notify requester that their request was accepted
    const acceptNotif = notificationRepo.create({
      recipientId: followRequest.requesterId,
      actorId: currentUserId,
      type: 'follow_accept',
      entityType: 'user',
      entityId: currentUserId,
      message: 'accepted your follow request',
    });
    const savedAcceptNotif = await notificationRepo.save(acceptNotif);
    const fullAcceptNotif = await notificationRepo.findOne({
      where: { id: savedAcceptNotif.id },
      relations: { actor: true },
    });
    if (fullAcceptNotif) {
      emitNotification(fullAcceptNotif);
    }

    emitFollowUpdated({
      followerId: followRequest.requesterId,
      followingId: currentUserId,
      isFollowing: true,
    });

    emitFollowRequestUpdated({
      requesterId: followRequest.requesterId,
      targetId: currentUserId,
      status: 'accepted',
      requestId,
    });

    // Check if current user is following the requester (for follow back option)
    const isFollowingRequester = Boolean(
      await followRepo.findOne({
        where: { followerId: currentUserId, followingId: followRequest.requesterId },
      })
    );

    res.json({
      status: 'success',
      message: 'Follow request accepted',
      isFollowingRequester,
      requesterId: followRequest.requesterId,
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept follow request',
    });
  }
};

export const declineFollowRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(req.params.requestId)
      ? req.params.requestId[0]
      : req.params.requestId;
    const requestId = (rawId || '').trim();

    const followRequestRepo = AppDataSource.getRepository(FollowRequest);
    const notificationRepo = AppDataSource.getRepository(Notification);

    const followRequest = await followRequestRepo.findOne({
      where: { id: requestId, targetId: currentUserId },
    });

    if (!followRequest) {
      res.status(404).json({
        status: 'error',
        message: 'Follow request not found or unauthorized',
      });
      return;
    }

    const requesterId = followRequest.requesterId;
    await followRequestRepo.delete({ id: requestId });

    // Keep notification for 30 days and mark as declined
    await notificationRepo.update(
      { recipientId: currentUserId, actorId: requesterId, type: 'follow_request' },
      { requestStatus: 'declined', isRead: true }
    );

    emitFollowRequestUpdated({
      requesterId,
      targetId: currentUserId,
      status: 'declined',
      requestId,
    });

    res.json({
      status: 'success',
      message: 'Follow request declined',
    });
  } catch (error) {
    console.error('Decline follow request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to decline follow request',
    });
  }
};

export const getPendingFollowRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const followRequestRepo = AppDataSource.getRepository(FollowRequest);
    const followRepo = AppDataSource.getRepository(Follow);

    const pendingRequests = await followRequestRepo.find({
      where: { targetId: currentUserId, status: 'pending' },
      relations: { requester: true },
      order: { createdAt: 'DESC' },
    });

    const requesterIds = pendingRequests.map((r) => r.requesterId);
    const myFollows = requesterIds.length > 0
      ? await followRepo.find({
          where: {
            followerId: currentUserId,
            followingId: In(requesterIds),
          },
          select: { followingId: true },
        })
      : [];
    const followedIds = new Set(myFollows.map((f) => f.followingId));

    const requestsWithFollowBack = pendingRequests.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      status: r.status,
      createdAt: r.createdAt,
      isFollowingRequester: followedIds.has(r.requesterId),
      requester: {
        id: r.requester?.id,
        fullName: r.requester?.fullName,
        username: r.requester?.username,
        avatarUrl: r.requester?.avatarUrl,
        bio: r.requester?.bio,
      },
    }));

    res.json({
      status: 'success',
      requests: requestsWithFollowBack,
    });
  } catch (error) {
    console.error('Get pending follow requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending follow requests',
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { fullName, bio, avatarUrl, bannerUrl, isPrivate } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: currentUserId },
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    if (fullName !== undefined) {
      const trimmedName = String(fullName).trim();
      if (trimmedName.length > 0) {
        user.fullName = trimmedName;
      }
    }

    if (bio !== undefined) {
      user.bio = String(bio).trim();
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    if (bannerUrl !== undefined) {
      user.bannerUrl = bannerUrl;
    }

    if (isPrivate !== undefined) {
      const wasPrivate = Boolean(user.isPrivate);
      const willBePrivate = Boolean(isPrivate);
      user.isPrivate = willBePrivate;

      // If switching from private to public, auto-approve pending follow requests
      if (wasPrivate && !willBePrivate) {
        const followRequestRepo = AppDataSource.getRepository(FollowRequest);
        const followRepo = AppDataSource.getRepository(Follow);
        const notificationRepo = AppDataSource.getRepository(Notification);

        const pendingRequests = await followRequestRepo.find({
          where: { targetId: currentUserId, status: 'pending' },
        });

        for (const req of pendingRequests) {
          const existingFollow = await followRepo.findOne({
            where: { followerId: req.requesterId, followingId: currentUserId },
          });
          if (!existingFollow) {
            await followRepo.save(
              followRepo.create({
                followerId: req.requesterId,
                followingId: currentUserId,
              })
            );
          }

          // Send follow_accept notification
          const notif = notificationRepo.create({
            recipientId: req.requesterId,
            actorId: currentUserId,
            type: 'follow_accept',
            entityType: 'user',
            entityId: currentUserId,
            message: 'accepted your follow request',
          });
          const savedNotif = await notificationRepo.save(notif);
          const fullNotif = await notificationRepo.findOne({
            where: { id: savedNotif.id },
            relations: { actor: true },
          });
          if (fullNotif) {
            emitNotification(fullNotif);
          }

          // Keep follow_request notification for 30 days and mark as accepted
          await notificationRepo.update(
            { recipientId: currentUserId, actorId: req.requesterId, type: 'follow_request' },
            { requestStatus: 'accepted', isRead: true }
          );

          emitFollowUpdated({
            followerId: req.requesterId,
            followingId: currentUserId,
            isFollowing: true,
          });

          emitFollowRequestUpdated({
            requesterId: req.requesterId,
            targetId: currentUserId,
            status: 'accepted',
            requestId: req.id,
          });
        }

        await followRequestRepo.delete({ targetId: currentUserId, status: 'pending' });
      }
    }

    await userRepository.save(user);

    const { password: _, googleId: __, ...safeUser } = user as any;

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        ...safeUser,
        isPrivate: Boolean(safeUser.isPrivate),
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update profile',
    });
  }
};
