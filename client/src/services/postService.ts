import api from './api';

export interface PollOptionItem {
  id: number;
  text: string;
  votes: number;
}

export interface PostAuthor {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  user?: PostAuthor;
  replies?: PostComment[];
}

export interface Post {
  id: string;
  userId: string;
  user: PostAuthor;
  content: string;
  mediaUrls: string[] | null;
  mediaType: 'text' | 'image' | 'video' | 'gif' | 'poll';
  pollOptions: PollOptionItem[] | null;
  pollExpiresAt?: string | null;
  isPollExpired?: boolean;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  bookmarksCount: number;
  isPinned: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  bookmarkCollection?: string | null;
  userVotedOption?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content?: string;
  mediaUrls?: string[];
  mediaType?: 'text' | 'image' | 'video' | 'gif' | 'poll';
  pollOptions?: string[];
  pollDuration?: string | null;
  pollExpiresIn?: string | number | null;
  pollExpiresAt?: string | null;
}

export interface FeedResponse {
  status: string;
  feedType: string;
  page: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
  posts: Post[];
}

export const postService = {
  async getFeed(feedType: 'for-you' | 'following' = 'for-you', page = 1, limit = 20): Promise<FeedResponse> {
    const res = await api.get<FeedResponse>(`/posts/feed?feedType=${feedType}&page=${page}&limit=${limit}`);
    return res.data;
  },

  async createPost(data: CreatePostData): Promise<Post> {
    const res = await api.post<{ status: string; post: Post }>('/posts', data);
    return res.data.post;
  },

  async getUserPosts(username: string, type: 'echoes' | 'media' | 'likes' = 'echoes'): Promise<Post[]> {
    const res = await api.get<{ status: string; posts: Post[] }>(
      `/posts/user/${encodeURIComponent(username)}?type=${type}`
    );
    return res.data.posts || [];
  },

  async getPostById(id: string): Promise<Post> {
    const res = await api.get<{ status: string; post: Post }>(`/posts/${encodeURIComponent(id)}`);
    return res.data.post;
  },

  async deletePost(id: string): Promise<void> {
    await api.delete(`/posts/${encodeURIComponent(id)}`);
  },

  async toggleLike(id: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const res = await api.post<{ status: string; isLiked: boolean; likesCount: number }>(
      `/posts/${encodeURIComponent(id)}/like`
    );
    return res.data;
  },

  async toggleBookmark(
    id: string,
    collectionName?: string
  ): Promise<{ isBookmarked: boolean; bookmarksCount: number; collectionName?: string }> {
    const res = await api.post<{
      status: string;
      isBookmarked: boolean;
      bookmarksCount: number;
      collectionName?: string;
    }>(`/posts/${encodeURIComponent(id)}/bookmark`, { collectionName });
    return res.data;
  },

  async updateBookmarkCollection(
    id: string,
    collectionName: string
  ): Promise<{ status: string; collectionName: string }> {
    const res = await api.put<{ status: string; collectionName: string }>(
      `/posts/${encodeURIComponent(id)}/bookmark/collection`,
      { collectionName }
    );
    return res.data;
  },

  async votePoll(id: string, optionIndex: number): Promise<{ pollOptions: PollOptionItem[]; userVotedOption: number }> {
    const res = await api.post<{ status: string; pollOptions: PollOptionItem[]; userVotedOption: number }>(
      `/posts/${encodeURIComponent(id)}/poll/vote`,
      { optionIndex }
    );
    return res.data;
  },

  async getComments(postId: string): Promise<PostComment[]> {
    const res = await api.get<{ status: string; comments: PostComment[] }>(
      `/posts/${encodeURIComponent(postId)}/comments`
    );
    return res.data.comments || [];
  },

  async addComment(postId: string, content: string, parentId?: string): Promise<{ comment: PostComment; commentsCount: number }> {
    const res = await api.post<{ status: string; comment: PostComment; commentsCount: number }>(
      `/posts/${encodeURIComponent(postId)}/comments`,
      { content, parentId }
    );
    return res.data;
  },

  async deleteComment(commentId: string): Promise<{ commentsCount: number }> {
    const res = await api.delete<{ status: string; commentsCount: number }>(
      `/posts/comments/${encodeURIComponent(commentId)}`
    );
    return res.data;
  },

  async toggleCommentLike(commentId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const res = await api.post<{ status: string; isLiked: boolean; likesCount: number }>(
      `/posts/comments/${encodeURIComponent(commentId)}/like`
    );
    return res.data;
  },

  async getSavedPosts(collection?: string): Promise<Post[]> {
    const query =
      collection && collection.toLowerCase() !== 'all'
        ? `?collection=${encodeURIComponent(collection)}`
        : '';
    const res = await api.get<{ status: string; posts: Post[] }>(`/posts/saved${query}`);
    return res.data.posts || [];
  },

  async getLikedPosts(): Promise<Post[]> {
    const res = await api.get<{ status: string; posts: Post[] }>('/posts/liked');
    return res.data.posts || [];
  },
};

export default postService;
