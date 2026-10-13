import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Post } from '../entities/Post';
import { Reel } from '../entities/Reel';
import { Follow } from '../entities/Follow';
import { PostLike } from '../entities/PostLike';
import { PostBookmark } from '../entities/PostBookmark';
import { PollVote } from '../entities/PollVote';
import { ReelLike } from '../entities/ReelLike';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const searchAll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const rawQuery = (req.query.q as string || '').trim();
    const type = ((req.query.type as string) || 'all').toLowerCase();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const currentUserId = req.user?.id;

    if (!rawQuery) {
      res.json({
        status: 'success',
        query: '',
        type,
        accounts: [],
        posts: [],
        reels: [],
      });
      return;
    }

    const searchParam = `%${rawQuery.toLowerCase()}%`;

    const userRepo = AppDataSource.getRepository(User);
    const postRepo = AppDataSource.getRepository(Post);
    const reelRepo = AppDataSource.getRepository(Reel);
    const followRepo = AppDataSource.getRepository(Follow);
    const postLikeRepo = AppDataSource.getRepository(PostLike);
    const postBookmarkRepo = AppDataSource.getRepository(PostBookmark);
    const pollVoteRepo = AppDataSource.getRepository(PollVote);
    const reelLikeRepo = AppDataSource.getRepository(ReelLike);

    const searchAccounts = async () => {
      const qb = userRepo
        .createQueryBuilder('user')
        .where('(LOWER(user.username) LIKE :query OR LOWER(user.fullName) LIKE :query)', {
          query: searchParam,
        })
        .select([
          'user.id',
          'user.fullName',
          'user.username',
          'user.avatarUrl',
          'user.bio',
          'user.createdAt',
        ])
        .take(limit);

      const users = await qb.getMany();

      let followedIds = new Set<string>();
      if (currentUserId && users.length > 0) {
        const follows = await followRepo.find({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        followedIds = new Set(follows.map((f) => f.followingId));
      }

      return users.map((u) => ({
        ...u,
        isFollowing: followedIds.has(u.id),
      }));
    };

    const searchPosts = async () => {
      const posts = await postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('LOWER(post.content) LIKE :query', { query: searchParam })
        .orderBy('post.createdAt', 'DESC')
        .take(limit)
        .getMany();

      if (posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);
      const now = new Date();

      let likedPostIds = new Set<string>();
      let bookmarkedPostIds = new Set<string>();
      let voteMap = new Map<string, number>();

      if (currentUserId) {
        const [likes, bookmarks, votes] = await Promise.all([
          postLikeRepo.find({
            where: { userId: currentUserId, postId: In(postIds) },
            select: { postId: true },
          }),
          postBookmarkRepo.find({
            where: { userId: currentUserId, postId: In(postIds) },
            select: { postId: true },
          }),
          pollVoteRepo.find({
            where: { userId: currentUserId, postId: In(postIds) },
            select: { postId: true, optionIndex: true },
          }),
        ]);

        likedPostIds = new Set(likes.map((l) => l.postId));
        bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));
        voteMap = new Map(votes.map((v) => [v.postId, v.optionIndex]));
      }

      return posts.map((post) => ({
        ...post,
        isPollExpired: Boolean(post.pollExpiresAt && new Date(post.pollExpiresAt) <= now),
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
        userVotedOption: voteMap.has(post.id) ? voteMap.get(post.id) : null,
      }));
    };

    const searchReels = async () => {
      const reels = await reelRepo
        .createQueryBuilder('reel')
        .leftJoinAndSelect('reel.user', 'user')
        .where('(LOWER(reel.caption) LIKE :query OR LOWER(reel.audioTitle) LIKE :query)', {
          query: searchParam,
        })
        .orderBy('reel.createdAt', 'DESC')
        .take(limit)
        .getMany();

      if (reels.length === 0) return [];

      let likedReelIds = new Set<string>();
      if (currentUserId) {
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

      return reels.map((reel) => ({
        ...reel,
        isLiked: likedReelIds.has(reel.id),
      }));
    };

    let accounts: any[] = [];
    let posts: any[] = [];
    let reels: any[] = [];

    if (type === 'accounts') {
      accounts = await searchAccounts();
    } else if (type === 'posts') {
      posts = await searchPosts();
    } else if (type === 'reels') {
      reels = await searchReels();
    } else {
      // 'all'
      [accounts, posts, reels] = await Promise.all([
        searchAccounts(),
        searchPosts(),
        searchReels(),
      ]);
    }

    res.json({
      status: 'success',
      query: rawQuery,
      type,
      accounts,
      posts,
      reels,
    });
  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform search',
    });
  }
};
