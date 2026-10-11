import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Follow } from '../entities/Follow';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

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

    const usersWithFollow = users.map((u) => ({
      ...u,
      isFollowing: followedIds.includes(u.id),
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
    const isFollowing = currentUserId
      ? Boolean(
          await followRepository.findOne({
            where: { followerId: currentUserId, followingId: user.id },
          })
        )
      : false;

    const isSelf = currentUserId === user.id;
    const safeUserProfile = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      followersCount,
      followingCount,
      isFollowing,
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
    const isFollowing = currentUserId
      ? Boolean(
          await followRepository.findOne({
            where: { followerId: currentUserId, followingId: user.id },
          })
        )
      : false;

    const isSelf = currentUserId === user.id;
    const safeUserProfile = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      followersCount,
      followingCount,
      isFollowing,
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

    const targetUser = await userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User to follow not found' });
      return;
    }

    const existingFollow = await followRepository.findOne({
      where: { followerId: currentUserId, followingId: targetUserId },
    });

    if (!existingFollow) {
      const newFollow = followRepository.create({
        followerId: currentUserId,
        followingId: targetUserId,
      });
      await followRepository.save(newFollow);
    }

    const followersCount = await followRepository.count({
      where: { followingId: targetUserId },
    });

    res.json({
      status: 'success',
      isFollowing: true,
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

    await followRepository.delete({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    const followersCount = await followRepository.count({
      where: { followingId: targetUserId },
    });

    res.json({
      status: 'success',
      isFollowing: false,
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

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { fullName, bio, avatarUrl, bannerUrl } = req.body;
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

    await userRepository.save(user);

    const { password: _, googleId: __, ...safeUser } = user as any;

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update profile',
    });
  }
};

