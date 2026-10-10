import api from './api';
import type { User } from './authService';

export interface FollowResponse {
  status: string;
  isFollowing: boolean;
  followersCount: number;
}

export interface UserProfileResponse extends User {
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export const userService = {
  async searchUsers(query: string): Promise<UserProfileResponse[]> {
    const response = await api.get<{ status: string; users: UserProfileResponse[] }>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data.users || [];
  },

  async getUserByUsername(username: string): Promise<UserProfileResponse> {
    const response = await api.get<{ status: string; user: UserProfileResponse }>(
      `/users/${encodeURIComponent(username)}`
    );
    return response.data.user;
  },

  async getUserById(userId: string): Promise<UserProfileResponse> {
    const response = await api.get<{ status: string; user: UserProfileResponse }>(
      `/users/id/${encodeURIComponent(userId)}`
    );
    return response.data.user;
  },

  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post<FollowResponse>(`/users/${encodeURIComponent(userId)}/follow`);
    return response.data;
  },

  async unfollowUser(userId: string): Promise<FollowResponse> {
    const response = await api.delete<FollowResponse>(`/users/${encodeURIComponent(userId)}/follow`);
    return response.data;
  },

  async updateProfile(data: {
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<{ status: string; message: string; user: UserProfileResponse }> {
    const response = await api.put<{ status: string; message: string; user: UserProfileResponse }>(
      '/users/profile',
      data
    );
    return response.data;
  },
};

export default userService;
