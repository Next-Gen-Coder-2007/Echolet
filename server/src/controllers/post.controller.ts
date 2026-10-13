import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Post, PollOptionItem } from '../entities/Post';
import { PostLike } from '../entities/PostLike';
import { PostBookmark } from '../entities/PostBookmark';
import { Comment } from '../entities/Comment';
import { CommentLike } from '../entities/CommentLike';
import { PollVote } from '../entities/PollVote';
import { User } from '../entities/User';
import { Follow } from '../entities/Follow';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  emitNewPost,
  emitPostDeleted,
  emitPostLiked,
  emitNewComment,
  emitPostPollVoted,
} from '../socket';

/**
 * Helper to calculate expiration date from expiresIn duration or explicit expiresAt date
 */
const calculateExpiresAt = (
  expiresIn?: string | number | null,
  expiresAt?: string | null
): Date | null => {
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed;
    }
  }

  if (!expiresIn || expiresIn === 'none' || expiresIn === '0') {
    return null;
  }

  const now = Date.now();
  if (typeof expiresIn === 'number' && expiresIn > 0) {
    return new Date(now + expiresIn * 60 * 1000);
  }

  if (typeof expiresIn === 'string') {
    const trimmed = expiresIn.trim().toLowerCase();
    if (trimmed === '5m') return new Date(now + 5 * 60 * 1000);
    if (trimmed === '15m') return new Date(now + 15 * 60 * 1000);
    if (trimmed === '30m') return new Date(now + 30 * 60 * 1000);
    if (trimmed === '1h') return new Date(now + 60 * 60 * 1000);
    if (trimmed === '6h') return new Date(now + 6 * 60 * 60 * 1000);
    if (trimmed === '12h') return new Date(now + 12 * 60 * 60 * 1000);
    if (trimmed === '24h' || trimmed === '1d') return new Date(now + 24 * 60 * 60 * 1000);
    if (trimmed === '3d') return new Date(now + 3 * 24 * 60 * 60 * 1000);
    if (trimmed === '7d' || trimmed === '1w') return new Date(now + 7 * 24 * 60 * 60 * 1000);

    const numeric = parseInt(trimmed, 10);
    if (!isNaN(numeric) && numeric > 0) {
      return new Date(now + numeric * 60 * 1000);
    }
  }

  return null;
};

/**
 * Safely parse Express 5 string parameter
 */
const getParamString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

/**
 * Helper to enrich posts with current user's interaction status
 */
const enrichPostsWithUserData = async (
  posts: Post[],
  currentUserId?: string
) => {
  const now = new Date();
  if (!posts.length || !currentUserId) {
    return posts.map((post) => ({
      ...post,
      isPollExpired: Boolean(post.pollExpiresAt && new Date(post.pollExpiresAt) <= now),
      isLiked: false,
      isBookmarked: false,
      userVotedOption: null,
    }));
  }

  const postIds = posts.map((p) => p.id);

  const likeRepo = AppDataSource.getRepository(PostLike);
  const bookmarkRepo = AppDataSource.getRepository(PostBookmark);
  const pollVoteRepo = AppDataSource.getRepository(PollVote);

  const [likes, bookmarks, votes] = await Promise.all([
    likeRepo.find({
      where: {
        userId: currentUserId,
        postId: In(postIds),
      },
      select: { postId: true },
    }),
    bookmarkRepo.find({
      where: {
        userId: currentUserId,
        postId: In(postIds),
      },
      select: { postId: true },
    }),
    pollVoteRepo.find({
      where: {
        userId: currentUserId,
        postId: In(postIds),
      },
      select: { postId: true, optionIndex: true },
    }),
  ]);

  const likedSet = new Set(likes.map((l) => l.postId));
  const bookmarkedSet = new Set(bookmarks.map((b) => b.postId));
  const voteMap = new Map(votes.map((v) => [v.postId, v.optionIndex]));

  return posts.map((post) => ({
    ...post,
    isPollExpired: Boolean(post.pollExpiresAt && new Date(post.pollExpiresAt) <= now),
    isLiked: likedSet.has(post.id),
    isBookmarked: bookmarkedSet.has(post.id),
    userVotedOption: voteMap.has(post.id) ? voteMap.get(post.id) : null,
  }));
};

/**
 * Create a new Post
 */
export const createPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const {
      content,
      mediaUrls,
      mediaType,
      pollOptions,
      pollExpiresIn,
      pollDuration,
      pollExpiresAt,
      expiresIn,
      expiresAt,
    } = req.body;

    const trimmedContent = (content || '').trim();
    const hasMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0;
    const rawPollOptions = Array.isArray(pollOptions)
      ? pollOptions.filter((opt: any) => typeof opt === 'string' && opt.trim().length > 0)
      : [];
    const hasPoll = rawPollOptions.length >= 2;

    if (!trimmedContent && !hasMedia && !hasPoll) {
      res.status(400).json({
        status: 'error',
        message: 'Post must contain text content, media attachments, or poll options.',
      });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);

    let formattedPollOptions: PollOptionItem[] | null = null;
    let computedMediaType: 'text' | 'image' | 'video' | 'gif' | 'poll' = 'text';

    if (hasPoll) {
      computedMediaType = 'poll';
      formattedPollOptions = rawPollOptions
        .slice(0, 6)
        .map((text: string, idx: number) => ({
          id: idx,
          text: text.trim(),
          votes: 0,
        }));

      if (formattedPollOptions.length < 2) {
        res.status(400).json({
          status: 'error',
          message: 'Poll must have at least 2 valid options.',
        });
        return;
      }
    } else if (hasMedia) {
      computedMediaType = mediaType || 'image';

      // Enforce 1MB image payload limit on backend
      for (const url of mediaUrls) {
        if (typeof url === 'string' && url.startsWith('data:image/') && url.length > 2 * 1024 * 1024) {
          res.status(400).json({
            status: 'error',
            message: 'Image size exceeds the 1MB limit. Please choose a smaller image.',
          });
          return;
        }
      }
    }

    // Timer is specifically for the poll (or null for permanent / no timer)
    const calculatedPollExpiresAt = hasPoll
      ? calculateExpiresAt(
          pollExpiresIn || pollDuration || expiresIn,
          pollExpiresAt || expiresAt
        )
      : null;

    const newPost = new Post();
    newPost.userId = currentUserId;
    newPost.content = trimmedContent;
    newPost.mediaUrls = hasMedia ? mediaUrls : null;
    newPost.mediaType = computedMediaType;
    newPost.pollOptions = formattedPollOptions;
    newPost.pollExpiresAt = calculatedPollExpiresAt;
    newPost.likesCount = 0;
    newPost.commentsCount = 0;
    newPost.repostsCount = 0;
    newPost.bookmarksCount = 0;
    newPost.isPinned = false;

    const savedPost = await postRepo.save(newPost);

    // Fetch with author info
    const fullPost = await postRepo.findOne({
      where: { id: savedPost.id },
      relations: { user: true },
    });

    const responsePost = {
      ...fullPost,
      isPollExpired: Boolean(fullPost?.pollExpiresAt && new Date(fullPost.pollExpiresAt) <= new Date()),
      isLiked: false,
      isBookmarked: false,
      userVotedOption: null,
    };

    emitNewPost(responsePost);

    res.status(201).json({
      status: 'success',
      post: responsePost,
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
};

/**
 * Get feed posts (For You vs. Following)
 */
export const getFeedPosts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const feedType = (req.query.feedType as string) || 'for-you';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const postRepo = AppDataSource.getRepository(Post);
    const followRepo = AppDataSource.getRepository(Follow);

    let queryBuilder = postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (feedType === 'following' && currentUserId) {
      const followings = await followRepo.find({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = followings.map((f) => f.followingId);

      if (followingIds.length === 0) {
        res.json({
          status: 'success',
          feedType,
          page,
          limit,
          totalCount: 0,
          hasMore: false,
          posts: [],
        });
        return;
      }

      queryBuilder = queryBuilder.where('post.userId IN (:...followingIds)', {
        followingIds,
      });
    }

    const [posts, totalCount] = await queryBuilder.getManyAndCount();
    const enrichedPosts = await enrichPostsWithUserData(posts, currentUserId);

    res.json({
      status: 'success',
      feedType,
      page,
      limit,
      totalCount,
      hasMore: skip + posts.length < totalCount,
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feed',
    });
  }
};

/**
 * Get posts by username (User Profile tabs: echoes, media, likes)
 */
export const getUserPosts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const username = getParamString(req.params.username);
    const type = (req.query.type as string) || 'echoes';
    const currentUserId = req.user?.id;

    const userRepo = AppDataSource.getRepository(User);
    const targetUser = await userRepo.findOne({
      where: { username: username.toLowerCase().trim() },
    });

    if (!targetUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);

    let posts: Post[] = [];

    if (type === 'likes') {
      posts = await postRepo
        .createQueryBuilder('post')
        .innerJoin(PostLike, 'pl', 'pl.postId = post.id AND pl.userId = :targetUserId', {
          targetUserId: targetUser.id,
        })
        .leftJoinAndSelect('post.user', 'user')
        .orderBy('pl.createdAt', 'DESC')
        .take(50)
        .getMany();
    } else {
      let qb = postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.userId = :userId', { userId: targetUser.id })
        .orderBy('post.createdAt', 'DESC')
        .take(50);

      if (type === 'media') {
        qb = qb.andWhere('post.mediaUrls IS NOT NULL');
      }

      posts = await qb.getMany();
    }

    const enrichedPosts = await enrichPostsWithUserData(posts, currentUserId);

    res.json({
      status: 'success',
      user: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
      },
      type,
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user posts',
    });
  }
};

/**
 * Get single post by ID
 */
export const getPostById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;

    const postRepo = AppDataSource.getRepository(Post);
    const post = await postRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!post) {
      res.status(404).json({
        status: 'error',
        message: 'Post not found',
      });
      return;
    }

    const [enrichedPost] = await enrichPostsWithUserData([post], currentUserId);

    res.json({
      status: 'success',
      post: enrichedPost,
    });
  } catch (error) {
    console.error('Get post by id error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch post',
    });
  }
};

/**
 * Delete Post
 */
export const deletePost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;

    const postRepo = AppDataSource.getRepository(Post);
    const post = await postRepo.findOne({
      where: { id },
    });

    if (!post) {
      res.status(404).json({
        status: 'error',
        message: 'Post not found',
      });
      return;
    }

    if (post.userId !== currentUserId) {
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this post',
      });
      return;
    }

    await postRepo.remove(post);
    emitPostDeleted(id);

    res.json({
      status: 'success',
      message: 'Post successfully deleted',
      postId: id,
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete post',
    });
  }
};

/**
 * Toggle Like on Post
 */
export const toggleLikePost = async (
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

    const postRepo = AppDataSource.getRepository(Post);
    const likeRepo = AppDataSource.getRepository(PostLike);

    const post = await postRepo.findOne({ where: { id } });
    if (!post) {
      res.status(404).json({ status: 'error', message: 'Post not found' });
      return;
    }

    const existingLike = await likeRepo.findOne({
      where: { postId: id, userId: currentUserId },
    });

    let isLiked = false;

    if (existingLike) {
      await likeRepo.remove(existingLike);
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
      isLiked = false;
    } else {
      const newLike = new PostLike();
      newLike.postId = id;
      newLike.userId = currentUserId;
      await likeRepo.save(newLike);
      post.likesCount = (post.likesCount || 0) + 1;
      isLiked = true;
    }

    await postRepo.save(post);

    emitPostLiked({
      postId: id,
      userId: currentUserId,
      likesCount: post.likesCount,
      isLiked,
    });

    res.json({
      status: 'success',
      isLiked,
      likesCount: post.likesCount,
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update like status',
    });
  }
};

/**
 * Toggle Bookmark / Save on Post
 */
export const toggleBookmarkPost = async (
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

    const postRepo = AppDataSource.getRepository(Post);
    const bookmarkRepo = AppDataSource.getRepository(PostBookmark);

    const post = await postRepo.findOne({ where: { id } });
    if (!post) {
      res.status(404).json({ status: 'error', message: 'Post not found' });
      return;
    }

    const existingBookmark = await bookmarkRepo.findOne({
      where: { postId: id, userId: currentUserId },
    });

    let isBookmarked = false;

    if (existingBookmark) {
      await bookmarkRepo.remove(existingBookmark);
      post.bookmarksCount = Math.max(0, (post.bookmarksCount || 0) - 1);
      isBookmarked = false;
    } else {
      const newBookmark = new PostBookmark();
      newBookmark.postId = id;
      newBookmark.userId = currentUserId;
      newBookmark.collectionName = 'Default';
      await bookmarkRepo.save(newBookmark);
      post.bookmarksCount = (post.bookmarksCount || 0) + 1;
      isBookmarked = true;
    }

    await postRepo.save(post);

    res.json({
      status: 'success',
      isBookmarked,
      bookmarksCount: post.bookmarksCount,
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update bookmark status',
    });
  }
};

/**
 * Vote on Poll option
 */
export const votePoll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const { optionIndex } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);
    const voteRepo = AppDataSource.getRepository(PollVote);

    const post = await postRepo.findOne({ where: { id } });
    if (!post || !post.pollOptions || post.pollOptions.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'This post does not contain a poll',
      });
      return;
    }

    if (post.pollExpiresAt && new Date(post.pollExpiresAt) <= new Date()) {
      res.status(400).json({
        status: 'error',
        message: 'This poll has ended and voting is closed',
      });
      return;
    }

    if (
      typeof optionIndex !== 'number' ||
      optionIndex < 0 ||
      optionIndex >= post.pollOptions.length
    ) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid poll option index',
      });
      return;
    }

    const existingVote = await voteRepo.findOne({
      where: { postId: id, userId: currentUserId },
    });

    let nextUserVotedOption: number | null = optionIndex;
    let updatedOptions = [...post.pollOptions];

    if (existingVote) {
      if (existingVote.optionIndex === optionIndex) {
        // Toggle off / remove vote
        await voteRepo.remove(existingVote);
        nextUserVotedOption = null;
        updatedOptions = post.pollOptions.map((opt, idx) => {
          if (idx === optionIndex) {
            return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
          }
          return opt;
        });
      } else {
        // Switch vote from previous option to new option
        const prevIndex = existingVote.optionIndex;
        existingVote.optionIndex = optionIndex;
        await voteRepo.save(existingVote);
        nextUserVotedOption = optionIndex;
        updatedOptions = post.pollOptions.map((opt, idx) => {
          if (idx === prevIndex) {
            return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
          }
          if (idx === optionIndex) {
            return { ...opt, votes: (opt.votes || 0) + 1 };
          }
          return opt;
        });
      }
    } else {
      const vote = new PollVote();
      vote.postId = id;
      vote.userId = currentUserId;
      vote.optionIndex = optionIndex;
      await voteRepo.save(vote);
      nextUserVotedOption = optionIndex;
      updatedOptions = post.pollOptions.map((opt, idx) => {
        if (idx === optionIndex) {
          return { ...opt, votes: (opt.votes || 0) + 1 };
        }
        return opt;
      });
    }

    post.pollOptions = updatedOptions;
    await postRepo.save(post);

    emitPostPollVoted({
      postId: post.id,
      pollOptions: post.pollOptions,
      userVotedOption: nextUserVotedOption,
      userId: currentUserId,
    });

    res.json({
      status: 'success',
      pollOptions: post.pollOptions,
      userVotedOption: nextUserVotedOption,
    });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record vote',
    });
  }
};

/**
 * Get comments for a post with current user's like state
 */
export const getComments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const currentUserId = req.user?.id;
    const commentRepo = AppDataSource.getRepository(Comment);
    const commentLikeRepo = AppDataSource.getRepository(CommentLike);

    const comments = await commentRepo.find({
      where: { postId: id },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    const commentIds = comments.map((c) => c.id);
    let likedCommentIds = new Set<string>();

    if (currentUserId && commentIds.length > 0) {
      const userLikes = await commentLikeRepo.find({
        where: {
          userId: currentUserId,
          commentId: In(commentIds),
        },
        select: { commentId: true },
      });
      likedCommentIds = new Set(userLikes.map((ul) => ul.commentId));
    }

    const enriched = comments.map((c) => ({
      ...c,
      isLiked: likedCommentIds.has(c.id),
    }));

    res.json({
      status: 'success',
      comments: enriched,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch comments',
    });
  }
};

/**
 * Toggle Like on Comment
 */
export const toggleLikeComment = async (
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

    const commentRepo = AppDataSource.getRepository(Comment);
    const commentLikeRepo = AppDataSource.getRepository(CommentLike);

    const comment = await commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ status: 'error', message: 'Comment not found' });
      return;
    }

    const existingLike = await commentLikeRepo.findOne({
      where: { commentId, userId: currentUserId },
    });

    let isLiked = false;

    if (existingLike) {
      await commentLikeRepo.remove(existingLike);
      comment.likesCount = Math.max(0, (comment.likesCount || 0) - 1);
      isLiked = false;
    } else {
      const newLike = new CommentLike();
      newLike.commentId = commentId;
      newLike.userId = currentUserId;
      await commentLikeRepo.save(newLike);
      comment.likesCount = (comment.likesCount || 0) + 1;
      isLiked = true;
    }

    await commentRepo.save(comment);

    res.json({
      status: 'success',
      isLiked,
      likesCount: comment.likesCount,
    });
  } catch (error) {
    console.error('Toggle like comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update comment like status',
    });
  }
};

/**
 * Add Comment
 */
export const addComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamString(req.params.id);
    const { content, parentId } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      res.status(400).json({
        status: 'error',
        message: 'Comment cannot be empty',
      });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);
    const commentRepo = AppDataSource.getRepository(Comment);

    const post = await postRepo.findOne({ where: { id } });
    if (!post) {
      res.status(404).json({ status: 'error', message: 'Post not found' });
      return;
    }

    const newComment = new Comment();
    newComment.postId = id;
    newComment.userId = currentUserId;
    newComment.parentId = parentId || null;
    newComment.content = trimmedContent;
    newComment.likesCount = 0;

    const savedComment = await commentRepo.save(newComment);

    post.commentsCount = (post.commentsCount || 0) + 1;
    await postRepo.save(post);

    const populatedComment = await commentRepo.findOne({
      where: { id: savedComment.id },
      relations: { user: true },
    });

    emitNewComment(populatedComment);

    res.status(201).json({
      status: 'success',
      comment: populatedComment,
      commentsCount: post.commentsCount,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add comment',
    });
  }
};

/**
 * Delete Comment
 */
export const deleteComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const commentId = getParamString(req.params.commentId);
    const currentUserId = req.user?.id;

    const commentRepo = AppDataSource.getRepository(Comment);
    const postRepo = AppDataSource.getRepository(Post);

    const comment = await commentRepo.findOne({
      where: { id: commentId },
      relations: { post: true },
    });

    if (!comment) {
      res.status(404).json({ status: 'error', message: 'Comment not found' });
      return;
    }

    // Owner of comment OR owner of post can delete
    if (comment.userId !== currentUserId && comment.post?.userId !== currentUserId) {
      res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this comment',
      });
      return;
    }

    const postId = comment.postId;

    // Collect all descendant comment IDs recursively to cascade delete
    const allCommentsForPost = await commentRepo.find({ where: { postId } });
    const toDeleteIds = new Set<string>([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCommentsForPost) {
        if (c.parentId && toDeleteIds.has(c.parentId) && !toDeleteIds.has(c.id)) {
          toDeleteIds.add(c.id);
          added = true;
        }
      }
    }

    const commentsToDelete = allCommentsForPost.filter((c) => toDeleteIds.has(c.id));
    await commentRepo.remove(commentsToDelete);

    const post = await postRepo.findOne({ where: { id: postId } });
    if (post) {
      post.commentsCount = Math.max(0, (post.commentsCount || 0) - commentsToDelete.length);
      await postRepo.save(post);
    }

    res.json({
      status: 'success',
      message: 'Comment deleted',
      commentsCount: post?.commentsCount || 0,
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete comment',
    });
  }
};

/**
 * Get Saved (Bookmarked) Posts for logged-in user
 */
export const getSavedPosts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);
    const posts = await postRepo
      .createQueryBuilder('post')
      .innerJoin(PostBookmark, 'pb', 'pb.postId = post.id AND pb.userId = :currentUserId', {
        currentUserId,
      })
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('pb.createdAt', 'DESC')
      .getMany();

    const enrichedPosts = await enrichPostsWithUserData(posts, currentUserId);

    res.json({
      status: 'success',
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch saved posts',
    });
  }
};

/**
 * Get Liked Posts for logged-in user
 */
export const getLikedPosts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const postRepo = AppDataSource.getRepository(Post);
    const posts = await postRepo
      .createQueryBuilder('post')
      .innerJoin(PostLike, 'pl', 'pl.postId = post.id AND pl.userId = :currentUserId', {
        currentUserId,
      })
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('pl.createdAt', 'DESC')
      .getMany();

    const enrichedPosts = await enrichPostsWithUserData(posts, currentUserId);

    res.json({
      status: 'success',
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error('Get liked posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch liked posts',
    });
  }
};
