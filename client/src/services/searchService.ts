import api from './api';
import type { UserProfileResponse } from './userService';
import type { Post } from './postService';
import type { Reel } from './reelService';

export interface UnifiedSearchResponse {
  status: string;
  query: string;
  type: 'all' | 'accounts' | 'posts' | 'reels';
  accounts: UserProfileResponse[];
  posts: Post[];
  reels: Reel[];
}

export const searchService = {
  async search(
    query: string,
    type: 'all' | 'accounts' | 'posts' | 'reels' = 'all',
    limit = 20
  ): Promise<UnifiedSearchResponse> {
    const res = await api.get('/search', {
      params: { q: query, type, limit },
    });
    return {
      status: res.data.status || 'success',
      query: res.data.query || query,
      type: res.data.type || type,
      accounts: res.data.accounts || [],
      posts: res.data.posts || [],
      reels: res.data.reels || [],
    };
  },
};

export default searchService;
