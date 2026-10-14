import api from './api';
import type { PostAuthor } from './postService';

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  dislikesCount: number;
  isPinned: boolean;
  pinnedAt?: string | null;
  user?: PostAuthor;
  replies?: ReelComment[];
  userReaction?: 'like' | 'dislike' | null;
  createdAt: string;
}

export interface Reel {
  id: string;
  userId: string;
  user: PostAuthor;
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  audioTitle?: string | null;
  duration?: number | null;
  displayMode?: 'cover' | 'contain';
  likesCount: number;
  commentsCount: number;
  bookmarksCount?: number;
  sharesCount: number;
  viewsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReelData {
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption?: string;
  audioTitle?: string;
  duration?: number | null;
  displayMode?: 'cover' | 'contain';
}

export interface ReelsResponse {
  reels: Reel[];
  total: number;
  hasMore: boolean;
}

export const reelService = {
  async createReel(data: CreateReelData): Promise<Reel> {
    const res = await api.post('/reels', data);
    return res.data.reel;
  },

  async getReels(offset = 0, limit = 20): Promise<ReelsResponse> {
    const res = await api.get('/reels', {
      params: { offset, limit },
    });
    return {
      reels: res.data.reels || [],
      total: res.data.total || 0,
      hasMore: Boolean(res.data.hasMore),
    };
  },

  async getReelById(reelId: string): Promise<Reel> {
    const res = await api.get(`/reels/${reelId}`);
    return res.data.reel;
  },

  async getUserReels(
    username: string,
    offset = 0,
    limit = 15
  ): Promise<{ reels: Reel[]; hasMore: boolean; total: number }> {
    const res = await api.get(`/reels/user/${username}`, {
      params: { offset, limit },
    });
    return {
      reels: res.data.reels || [],
      hasMore: Boolean(res.data.hasMore),
      total: res.data.total || 0,
    };
  },

  async toggleLikeReel(reelId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const res = await api.post(`/reels/${reelId}/like`);
    return res.data;
  },

  async toggleBookmarkReel(
    reelId: string
  ): Promise<{ isBookmarked: boolean; bookmarksCount: number }> {
    const res = await api.post(`/reels/${reelId}/bookmark`);
    return res.data;
  },

  async shareReel(reelId: string): Promise<{ success: boolean; sharesCount: number }> {
    const res = await api.post(`/reels/${reelId}/share`);
    return res.data;
  },

  async getSavedReels(
    offset = 0,
    limit = 15
  ): Promise<{ reels: Reel[]; hasMore: boolean; total: number }> {
    const res = await api.get('/reels/saved', {
      params: { offset, limit },
    });
    return {
      reels: res.data.reels || [],
      hasMore: Boolean(res.data.hasMore),
      total: res.data.total || 0,
    };
  },

  async getLikedReels(
    offset = 0,
    limit = 15
  ): Promise<{ reels: Reel[]; hasMore: boolean; total: number }> {
    const res = await api.get('/reels/liked', {
      params: { offset, limit },
    });
    return {
      reels: res.data.reels || [],
      hasMore: Boolean(res.data.hasMore),
      total: res.data.total || 0,
    };
  },

  async deleteReel(reelId: string): Promise<void> {
    await api.delete(`/reels/${reelId}`);
  },

  async getComments(reelId: string): Promise<ReelComment[]> {
    const res = await api.get(`/reels/${reelId}/comments`);
    return res.data.comments || [];
  },

  async addComment(
    reelId: string,
    content: string,
    parentId?: string | null
  ): Promise<{ comment: ReelComment; commentsCount: number }> {
    const res = await api.post(`/reels/${reelId}/comments`, { content, parentId });
    return res.data;
  },

  async deleteComment(commentId: string): Promise<{ commentsCount: number }> {
    const res = await api.delete(`/reels/comments/${commentId}`);
    return res.data;
  },

  async toggleCommentReaction(
    commentId: string,
    type: 'like' | 'dislike'
  ): Promise<{
    userReaction: 'like' | 'dislike' | null;
    likesCount: number;
    dislikesCount: number;
  }> {
    const res = await api.post(`/reels/comments/${commentId}/reaction`, { type });
    return res.data;
  },

  async togglePinComment(
    reelId: string,
    commentId: string
  ): Promise<{ isPinned: boolean; message: string }> {
    const res = await api.post(`/reels/${reelId}/comments/${commentId}/pin`);
    return res.data;
  },
};

export default reelService;
