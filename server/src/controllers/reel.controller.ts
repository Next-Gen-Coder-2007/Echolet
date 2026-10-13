import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Reel } from '../entities/Reel';
import { ReelLike } from '../entities/ReelLike';
import { ReelComment } from '../entities/ReelComment';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getParamString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return (param[0] || '').trim();
  return (param || '').trim();
};

/**
 * Create a new Reel
 */
export const createReel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { videoUrl, thumbnailUrl, caption, audioTitle, duration } = req.body;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'A video is required to create a reel.',
      });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const userRepo = AppDataSource.getRepository(User);

    const currentUser = await userRepo.findOne({ where: { id: currentUserId } });
    if (!currentUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const newReel = new Reel();
    newReel.userId = currentUserId;
    newReel.videoUrl = videoUrl.trim();
    newReel.thumbnailUrl = thumbnailUrl ? thumbnailUrl.trim() : null;
    newReel.caption = (caption || '').trim();
    newReel.audioTitle = audioTitle?.trim() || `Original Audio · @${currentUser.username}`;
    newReel.duration = duration ? Number(duration) : null;
    newReel.likesCount = 0;
    newReel.commentsCount = 0;
    newReel.sharesCount = 0;
    newReel.viewsCount = 0;

    const savedReel = await reelRepo.save(newReel);

    const populatedReel = await reelRepo.findOne({
      where: { id: savedReel.id },
      relations: { user: true },
    });

    res.status(201).json({
      status: 'success',
      reel: {
        ...populatedReel,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create reel',
    });
  }
};

/**
 * Get Reels feed
 */
export const getReels = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

    const reelRepo = AppDataSource.getRepository(Reel);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);

    const [reels, total] = await reelRepo.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    let likedReelIds = new Set<string>();
    if (currentUserId && reels.length > 0) {
      const reelIds = reels.map((r) => r.id);
      const likes = await reelLikeRepo
        .createQueryBuilder('like')
        .where('like.userId = :currentUserId AND like.reelId IN (:...reelIds)', {
          currentUserId,
          reelIds,
        })
        .getMany();
      likedReelIds = new Set(likes.map((l) => l.reelId));
    }

    const enrichedReels = reels.map((reel) => ({
      ...reel,
      isLiked: likedReelIds.has(reel.id),
    }));

    res.json({
      status: 'success',
      reels: enrichedReels,
      total,
      hasMore: offset + reels.length < total,
    });
  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reels',
    });
  }
};

/**
 * Get a single reel by ID
 */
export const getReelById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;

    const reelRepo = AppDataSource.getRepository(Reel);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);

    const reel = await reelRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    let isLiked = false;
    if (currentUserId) {
      const like = await reelLikeRepo.findOne({
        where: { reelId: reel.id, userId: currentUserId },
      });
      isLiked = Boolean(like);
    }

    res.json({
      status: 'success',
      reel: {
        ...reel,
        isLiked,
      },
    });
  } catch (error) {
    console.error('Get reel by ID error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch reel' });
  }
};

/**
 * Get user reels
 */
export const getUserReels = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const username = getParamString(req.params.username);
    const currentUserId = req.user?.id;

    const userRepo = AppDataSource.getRepository(User);
    const targetUser = await userRepo.findOne({ where: { username } });

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);

    const reels = await reelRepo.find({
      where: { userId: targetUser.id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    let likedReelIds = new Set<string>();
    if (currentUserId && reels.length > 0) {
      const reelIds = reels.map((r) => r.id);
      const likes = await reelLikeRepo
        .createQueryBuilder('like')
        .where('like.userId = :currentUserId AND like.reelId IN (:...reelIds)', {
          currentUserId,
          reelIds,
        })
        .getMany();
      likedReelIds = new Set(likes.map((l) => l.reelId));
    }

    const enrichedReels = reels.map((reel) => ({
      ...reel,
      isLiked: likedReelIds.has(reel.id),
    }));

    res.json({
      status: 'success',
      reels: enrichedReels,
    });
  } catch (error) {
    console.error('Get user reels error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user reels',
    });
  }
};

/**
 * Toggle like reel
 */
export const toggleLikeReel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);

    const reel = await reelRepo.findOne({ where: { id } });
    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    const existingLike = await reelLikeRepo.findOne({
      where: { reelId: id, userId: currentUserId },
    });

    let isLiked = false;
    if (existingLike) {
      await reelLikeRepo.remove(existingLike);
      reel.likesCount = Math.max(0, (reel.likesCount || 0) - 1);
      isLiked = false;
    } else {
      const newLike = new ReelLike();
      newLike.reelId = id;
      newLike.userId = currentUserId;
      await reelLikeRepo.save(newLike);
      reel.likesCount = (reel.likesCount || 0) + 1;
      isLiked = true;
    }

    await reelRepo.save(reel);

    res.json({
      status: 'success',
      isLiked,
      likesCount: reel.likesCount,
    });
  } catch (error) {
    console.error('Toggle like reel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle like on reel',
    });
  }
};

/**
 * Delete Reel
 */
export const deleteReel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const reel = await reelRepo.findOne({ where: { id } });

    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    if (reel.userId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'You are not authorized to delete this reel' });
      return;
    }

    await reelRepo.remove(reel);

    res.json({
      status: 'success',
      message: 'Reel deleted successfully',
    });
  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reel',
    });
  }
};

/**
 * Get comments for a Reel
 */
export const getReelComments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reelId = getParamString(req.params.id);
    const commentRepo = AppDataSource.getRepository(ReelComment);

    const comments = await commentRepo.find({
      where: { reelId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    res.json({
      status: 'success',
      comments,
    });
  } catch (error) {
    console.error('Get reel comments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get reel comments',
    });
  }
};

/**
 * Add comment to Reel
 */
export const addReelComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reelId = getParamString(req.params.id);
    const currentUserId = req.user?.id;
    const content = (req.body.content || '').trim();

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (!content) {
      res.status(400).json({ status: 'error', message: 'Comment content cannot be empty' });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const commentRepo = AppDataSource.getRepository(ReelComment);

    const reel = await reelRepo.findOne({ where: { id: reelId } });
    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    const newComment = new ReelComment();
    newComment.reelId = reelId;
    newComment.userId = currentUserId;
    newComment.content = content;
    newComment.likesCount = 0;

    const saved = await commentRepo.save(newComment);

    // Update commentsCount on reel
    reel.commentsCount = (reel.commentsCount || 0) + 1;
    await reelRepo.save(reel);

    const populated = await commentRepo.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    res.status(201).json({
      status: 'success',
      comment: populated,
      commentsCount: reel.commentsCount,
    });
  } catch (error) {
    console.error('Add reel comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add comment',
    });
  }
};

/**
 * Delete comment from Reel
 */
export const deleteReelComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const commentId = getParamString(req.params.commentId);
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const commentRepo = AppDataSource.getRepository(ReelComment);
    const reelRepo = AppDataSource.getRepository(Reel);

    const comment = await commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ status: 'error', message: 'Comment not found' });
      return;
    }

    if (comment.userId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const reel = await reelRepo.findOne({ where: { id: comment.reelId } });
    if (reel) {
      reel.commentsCount = Math.max(0, (reel.commentsCount || 0) - 1);
      await reelRepo.save(reel);
    }

    await commentRepo.remove(comment);

    res.json({
      status: 'success',
      message: 'Comment deleted successfully',
      commentsCount: reel?.commentsCount || 0,
    });
  } catch (error) {
    console.error('Delete reel comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete comment',
    });
  }
};
