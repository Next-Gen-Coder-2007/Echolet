import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Reel } from '../entities/Reel';
import { ReelLike } from '../entities/ReelLike';
import { ReelBookmark } from '../entities/ReelBookmark';
import { ReelComment } from '../entities/ReelComment';
import { ReelCommentReaction } from '../entities/ReelCommentReaction';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getParamString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return (param[0] || '').trim();
  return (param || '').trim();
};

/**
 * Helper: Enrich reels with isLiked and isBookmarked status for the user
 */
const enrichReels = async (reels: Reel[], currentUserId?: string) => {
  if (!reels.length) return [];

  let likedReelIds = new Set<string>();
  let bookmarkedReelIds = new Set<string>();

  if (currentUserId) {
    const reelIds = reels.map((r) => r.id);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);
    const reelBookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const [likes, bookmarks] = await Promise.all([
      reelLikeRepo
        .createQueryBuilder('like')
        .where('like.userId = :currentUserId AND like.reelId IN (:...reelIds)', {
          currentUserId,
          reelIds,
        })
        .getMany(),
      reelBookmarkRepo
        .createQueryBuilder('bookmark')
        .where('bookmark.userId = :currentUserId AND bookmark.reelId IN (:...reelIds)', {
          currentUserId,
          reelIds,
        })
        .getMany(),
    ]);

    likedReelIds = new Set(likes.map((l) => l.reelId));
    bookmarkedReelIds = new Set(bookmarks.map((b) => b.reelId));
    const bookmarkCollectionMap = new Map(
      bookmarks.map((b) => [b.reelId, b.collectionName || 'Default'])
    );

    return reels.map((reel) => ({
      ...reel,
      isLiked: likedReelIds.has(reel.id),
      isBookmarked: bookmarkedReelIds.has(reel.id),
      bookmarkCollection: bookmarkCollectionMap.get(reel.id) || null,
    }));
  }

  return reels.map((reel) => ({
    ...reel,
    isLiked: false,
    isBookmarked: false,
    bookmarkCollection: null,
  }));
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

    const { videoUrl, thumbnailUrl, caption, audioTitle, duration, displayMode } = req.body;

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
    newReel.displayMode = displayMode === 'contain' ? 'contain' : 'cover';
    newReel.likesCount = 0;
    newReel.commentsCount = 0;
    newReel.bookmarksCount = 0;
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
        isBookmarked: false,
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

    const [reels, total] = await reelRepo.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const enrichedReels = await enrichReels(reels, currentUserId);

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

    const reel = await reelRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    const [enriched] = await enrichReels([reel], currentUserId);

    res.json({
      status: 'success',
      reel: enriched,
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

    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 15));

    const reelRepo = AppDataSource.getRepository(Reel);

    const [reels, total] = await reelRepo.findAndCount({
      where: { userId: targetUser.id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const enrichedReels = await enrichReels(reels, currentUserId);

    res.json({
      status: 'success',
      reels: enrichedReels,
      hasMore: offset + reels.length < total,
      total,
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
 * Toggle bookmark / save reel
 */
export const toggleBookmarkReel = async (
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
    const reelBookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const reel = await reelRepo.findOne({ where: { id } });
    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    const existingBookmark = await reelBookmarkRepo.findOne({
      where: { reelId: id, userId: currentUserId },
    });

    const requestedCollection =
      typeof req.body.collectionName === 'string' && req.body.collectionName.trim()
        ? req.body.collectionName.trim()
        : undefined;

    let isBookmarked = false;
    let savedCollection = 'Default';

    if (existingBookmark) {
      if (requestedCollection && requestedCollection !== existingBookmark.collectionName) {
        // Move to new collection
        existingBookmark.collectionName = requestedCollection;
        await reelBookmarkRepo.save(existingBookmark);
        isBookmarked = true;
        savedCollection = existingBookmark.collectionName;
      } else {
        await reelBookmarkRepo.remove(existingBookmark);
        reel.bookmarksCount = Math.max(0, (reel.bookmarksCount || 0) - 1);
        isBookmarked = false;
      }
    } else {
      const newBookmark = new ReelBookmark();
      newBookmark.reelId = id;
      newBookmark.userId = currentUserId;
      newBookmark.collectionName = requestedCollection || 'Default';
      await reelBookmarkRepo.save(newBookmark);
      reel.bookmarksCount = (reel.bookmarksCount || 0) + 1;
      isBookmarked = true;
      savedCollection = newBookmark.collectionName;
    }

    await reelRepo.save(reel);

    res.json({
      status: 'success',
      isBookmarked,
      bookmarksCount: reel.bookmarksCount,
      collectionName: isBookmarked ? savedCollection : null,
    });
  } catch (error) {
    console.error('Toggle bookmark reel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle bookmark on reel',
    });
  }
};

/**
 * Update collection of an existing reel bookmark
 */
export const updateReelBookmarkCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;
    const { collectionName } = req.body;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const targetCollection = (collectionName || 'Default').trim();
    const bookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const bookmark = await bookmarkRepo.findOne({
      where: { reelId: id, userId: currentUserId },
    });

    if (!bookmark) {
      res.status(404).json({ status: 'error', message: 'Reel bookmark not found' });
      return;
    }

    bookmark.collectionName = targetCollection;
    await bookmarkRepo.save(bookmark);

    res.json({
      status: 'success',
      collectionName: bookmark.collectionName,
    });
  } catch (error) {
    console.error('Update reel bookmark collection error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update collection' });
  }
};

/**
 * Get saved reels for the logged in user
 */
export const getSavedReels = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 15));
    const requestedCollection = req.query.collection as string | undefined;

    const bookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const whereClause: any = { userId: currentUserId };
    if (requestedCollection && requestedCollection.toLowerCase() !== 'all') {
      whereClause.collectionName = requestedCollection;
    }

    const [bookmarks, total] = await bookmarkRepo.findAndCount({
      where: whereClause,
      relations: {
        reel: {
          user: true,
        },
      },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const reels = bookmarks
      .map((b) => b.reel)
      .filter((r): r is Reel => Boolean(r && r.id));

    const enrichedReels = await enrichReels(reels, currentUserId);

    res.json({
      status: 'success',
      reels: enrichedReels,
      hasMore: offset + bookmarks.length < total,
      total,
    });
  } catch (error) {
    console.error('Get saved reels error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get saved reels',
    });
  }
};

/**
 * Get liked reels for the logged in user
 */
export const getLikedReels = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 15));

    const likeRepo = AppDataSource.getRepository(ReelLike);
    const [likes, total] = await likeRepo.findAndCount({
      where: { userId: currentUserId },
      relations: {
        reel: {
          user: true,
        },
      },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const reels = likes
      .map((l) => l.reel)
      .filter((r): r is Reel => Boolean(r && r.id));

    const enrichedReels = await enrichReels(reels, currentUserId);

    res.json({
      status: 'success',
      reels: enrichedReels,
      hasMore: offset + likes.length < total,
      total,
    });
  } catch (error) {
    console.error('Get liked reels error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get liked reels',
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
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this reel',
      });
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
 * Get comments for a Reel (nested with replies, like/dislike reactions, and pinned comment first)
 */
export const getReelComments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reelId = getParamString(req.params.id);
    const currentUserId = req.user?.id;
    const commentRepo = AppDataSource.getRepository(ReelComment);
    const reactionRepo = AppDataSource.getRepository(ReelCommentReaction);

    const allComments = await commentRepo.find({
      where: { reelId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    // Fetch reactions for current user if logged in
    const reactionMap = new Map<string, 'like' | 'dislike'>();
    if (currentUserId && allComments.length > 0) {
      const commentIds = allComments.map((c) => c.id);
      const userReactions = await reactionRepo.find({
        where: {
          userId: currentUserId,
          commentId: In(commentIds),
        },
      });
      userReactions.forEach((r) => {
        reactionMap.set(r.commentId, r.type);
      });
    }

    // Attach reaction and split into top-level comments and replies
    const commentMap = new Map<string, any>();
    const topLevelComments: any[] = [];
    const repliesList: any[] = [];

    allComments.forEach((c) => {
      const formattedComment = {
        ...c,
        likesCount: c.likesCount || 0,
        dislikesCount: c.dislikesCount || 0,
        isPinned: Boolean(c.isPinned),
        userReaction: reactionMap.get(c.id) || null,
        replies: [] as any[],
      };
      commentMap.set(c.id, formattedComment);

      if (c.parentId) {
        repliesList.push(formattedComment);
      } else {
        topLevelComments.push(formattedComment);
      }
    });

    // Nest replies under their parent comments
    repliesList.forEach((reply) => {
      const parent = commentMap.get(reply.parentId);
      if (parent) {
        parent.replies.push(reply);
      } else {
        topLevelComments.push(reply);
      }
    });

    // Sort top-level comments:
    // 1. Pinned comment first
    // 2. Then newest first (createdAt DESC)
    topLevelComments.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({
      status: 'success',
      comments: topLevelComments,
      totalCount: allComments.length,
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
 * Add comment or reply to Reel
 */
export const addReelComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reelId = getParamString(req.params.id);
    const currentUserId = req.user?.id;
    const content = (req.body.content || '').trim();
    const parentId = req.body.parentId ? String(req.body.parentId).trim() : null;

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

    // If this is a reply, verify parent comment exists
    if (parentId) {
      const parentComment = await commentRepo.findOne({
        where: { id: parentId, reelId },
      });
      if (!parentComment) {
        res.status(404).json({ status: 'error', message: 'Parent comment not found' });
        return;
      }
    }

    const newComment = new ReelComment();
    newComment.reelId = reelId;
    newComment.userId = currentUserId;
    newComment.content = content;
    newComment.parentId = parentId;
    newComment.likesCount = 0;
    newComment.dislikesCount = 0;
    newComment.isPinned = false;

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
      comment: {
        ...populated,
        replies: [],
        likesCount: 0,
        dislikesCount: 0,
        userReaction: null,
        isPinned: false,
      },
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

    const reel = await reelRepo.findOne({ where: { id: comment.reelId } });

    // Allow author of comment OR creator of the reel to delete
    if (comment.userId !== currentUserId && reel?.userId !== currentUserId) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    // Count replies to deduct from total commentsCount
    const repliesCount = await commentRepo.count({ where: { parentId: commentId } });
    const totalDeduction = 1 + repliesCount;

    if (reel) {
      reel.commentsCount = Math.max(0, (reel.commentsCount || 0) - totalDeduction);
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

/**
 * Toggle like/dislike reaction on a reel comment
 */
export const toggleReelCommentReaction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const commentId = getParamString(req.params.commentId);
    const currentUserId = req.user?.id;
    const { type } = req.body; // 'like' | 'dislike'

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (type !== 'like' && type !== 'dislike') {
      res.status(400).json({ status: 'error', message: 'Reaction type must be "like" or "dislike"' });
      return;
    }

    const commentRepo = AppDataSource.getRepository(ReelComment);
    const reactionRepo = AppDataSource.getRepository(ReelCommentReaction);

    const comment = await commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ status: 'error', message: 'Comment not found' });
      return;
    }

    const existingReaction = await reactionRepo.findOne({
      where: { commentId, userId: currentUserId },
    });

    let nextReaction: 'like' | 'dislike' | null = null;

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Undo reaction
        await reactionRepo.remove(existingReaction);
        if (type === 'like') {
          comment.likesCount = Math.max(0, (comment.likesCount || 0) - 1);
        } else {
          comment.dislikesCount = Math.max(0, (comment.dislikesCount || 0) - 1);
        }
        nextReaction = null;
      } else {
        // Switch reaction (e.g. dislike -> like)
        existingReaction.type = type;
        await reactionRepo.save(existingReaction);
        if (type === 'like') {
          comment.likesCount = (comment.likesCount || 0) + 1;
          comment.dislikesCount = Math.max(0, (comment.dislikesCount || 0) - 1);
        } else {
          comment.dislikesCount = (comment.dislikesCount || 0) + 1;
          comment.likesCount = Math.max(0, (comment.likesCount || 0) - 1);
        }
        nextReaction = type;
      }
    } else {
      // New reaction
      const newReaction = new ReelCommentReaction();
      newReaction.commentId = commentId;
      newReaction.userId = currentUserId;
      newReaction.type = type;
      await reactionRepo.save(newReaction);

      if (type === 'like') {
        comment.likesCount = (comment.likesCount || 0) + 1;
      } else {
        comment.dislikesCount = (comment.dislikesCount || 0) + 1;
      }
      nextReaction = type;
    }

    await commentRepo.save(comment);

    res.json({
      status: 'success',
      userReaction: nextReaction,
      likesCount: comment.likesCount,
      dislikesCount: comment.dislikesCount,
    });
  } catch (error) {
    console.error('Toggle reel comment reaction error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to react to comment',
    });
  }
};

/**
 * Toggle pin comment (creator only - single pinned comment per reel)
 */
export const togglePinReelComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reelId = getParamString(req.params.reelId || req.params.id);
    const commentId = getParamString(req.params.commentId);
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const reelRepo = AppDataSource.getRepository(Reel);
    const commentRepo = AppDataSource.getRepository(ReelComment);

    const reel = await reelRepo.findOne({ where: { id: reelId } });
    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    // Only creator of the reel can pin a comment!
    if (reel.userId !== currentUserId) {
      res.status(403).json({
        status: 'error',
        message: 'Only the reel creator can pin a comment on this reel',
      });
      return;
    }

    const comment = await commentRepo.findOne({ where: { id: commentId, reelId } });
    if (!comment) {
      res.status(404).json({ status: 'error', message: 'Comment not found on this reel' });
      return;
    }

    let isPinned = false;

    if (comment.isPinned) {
      // Unpin this comment
      comment.isPinned = false;
      comment.pinnedAt = null;
      await commentRepo.save(comment);
      isPinned = false;
    } else {
      // Unpin any previously pinned comment for this reel (single pinned comment rule)
      await commentRepo
        .createQueryBuilder()
        .update(ReelComment)
        .set({ isPinned: false, pinnedAt: null })
        .where('reelId = :reelId AND isPinned = :isPinned', { reelId, isPinned: true })
        .execute();

      // Pin this comment
      comment.isPinned = true;
      comment.pinnedAt = new Date();
      await commentRepo.save(comment);
      isPinned = true;
    }

    res.json({
      status: 'success',
      isPinned,
      message: isPinned ? 'Comment pinned to top' : 'Comment unpinned',
    });
  } catch (error) {
    console.error('Toggle pin reel comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to pin/unpin comment',
    });
  }
};

/**
 * Increment and record share on a reel
 */
export const shareReel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const reelRepo = AppDataSource.getRepository(Reel);
    const reel = await reelRepo.findOne({ where: { id } });

    if (!reel) {
      res.status(404).json({ status: 'error', message: 'Reel not found' });
      return;
    }

    reel.sharesCount = (reel.sharesCount || 0) + 1;
    await reelRepo.save(reel);

    res.json({
      status: 'success',
      sharesCount: reel.sharesCount,
      message: 'Reel shared successfully',
    });
  } catch (error) {
    console.error('Share reel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record reel share',
    });
  }
};
