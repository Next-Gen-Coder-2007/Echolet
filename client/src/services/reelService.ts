import api from './api';
import type { PostAuthor } from './postService';

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  likesCount: number;
  user?: PostAuthor;
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
  likesCount: number;
  commentsCount: number;
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

  async getUserReels(username: string): Promise<Reel[]> {
    const res = await api.get(`/reels/user/${username}`);
    return res.data.reels || [];
  },

  async toggleLikeReel(reelId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const res = await api.post(`/reels/${reelId}/like`);
    return res.data;
  },

  async deleteReel(reelId: string): Promise<void> {
    await api.delete(`/reels/${reelId}`);
  },

  async getComments(reelId: string): Promise<ReelComment[]> {
    const res = await api.get(`/reels/${reelId}/comments`);
    return res.data.comments || [];
  },

  async addComment(reelId: string, content: string): Promise<{ comment: ReelComment; commentsCount: number }> {
    const res = await api.post(`/reels/${reelId}/comments`, { content });
    return res.data;
  },

  async deleteComment(commentId: string): Promise<{ commentsCount: number }> {
    const res = await api.delete(`/reels/comments/${commentId}`);
    return res.data;
  },
};

export default reelService;
