import api from './api';

export interface StoryViewer {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  viewedAt: string;
}

export interface StoryLikeItem {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  likedAt: string;
}

export interface StoryItem {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  mediaUrl?: string | null;
  mediaType: 'image' | 'video' | 'text';
  duration?: number | null;
  content?: string | null;
  backgroundColor?: string | null;
  fontStyle?: string | null;
  viewsCount: number;
  viewers?: StoryViewer[];
  likesCount?: number;
  likes?: StoryLikeItem[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isViewed?: boolean;
  isLiked?: boolean;
}

export interface UserStoryGroup {
  userId: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  hasUnviewed: boolean;
  lastStoryTimestamp: string;
  stories: StoryItem[];
}

export interface CreateStoryData {
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  duration?: number;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
}

const storyService = {
  getStories: async (): Promise<{
    stories: StoryItem[];
    userStoryGroups: UserStoryGroup[];
  }> => {
    const response = await api.get('/stories');
    return response.data;
  },

  createStory: async (data: CreateStoryData): Promise<{ story: StoryItem; message: string }> => {
    const response = await api.post('/stories', data);
    return response.data;
  },

  viewStory: async (storyId: string): Promise<{ viewsCount: number; viewers: StoryViewer[] }> => {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data;
  },

  deleteStory: async (storyId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/stories/${storyId}`);
    return response.data;
  },

  likeStory: async (
    storyId: string
  ): Promise<{ status: string; isLiked: boolean; likesCount: number; likes?: StoryLikeItem[] }> => {
    const response = await api.post(`/stories/${storyId}/like`);
    return response.data;
  },
};

export const markOwnStoryAsViewed = (storyId: string, userId: string) => {
  try {
    const key = `echolet_viewed_own_stories_${userId}`;
    const stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!stored.includes(storyId)) {
      stored.push(storyId);
      localStorage.setItem(key, JSON.stringify(stored));
      window.dispatchEvent(new CustomEvent('own_story_viewed', { detail: { storyId, userId } }));
    }
  } catch (e) {
    console.error('Error saving viewed own story:', e);
  }
};

export const getHasUnviewedOwnStory = (stories: StoryItem[], userId: string): boolean => {
  try {
    const key = `echolet_viewed_own_stories_${userId}`;
    const stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    return stories.some((s) => !stored.includes(s.id));
  } catch {
    return false;
  }
};

export default storyService;
