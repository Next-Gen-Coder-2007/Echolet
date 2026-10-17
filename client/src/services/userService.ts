import api from './api';
import type { User } from './authService';

export interface FollowResponse {
  status: string;
  isFollowing: boolean;
  isRequested?: boolean;
  followersCount: number;
}

export interface UserProfileResponse extends User {
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  hasPendingFollowRequest?: boolean;
  hasIncomingFollowRequest?: boolean;
  canViewContent?: boolean;
  canMessageAndCall?: boolean;
  isPrivate?: boolean;
}

export interface PendingFollowRequest {
  id: string;
  requesterId: string;
  status: string;
  createdAt: string;
  isFollowingRequester: boolean;
  requester: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export interface FollowUserItem {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isPrivate?: boolean;
  isSelf?: boolean;
  isFollowing?: boolean;
  hasPendingFollowRequest?: boolean;
  isFollowedBy?: boolean;
}

export const userService = {
  async searchUsers(query: string): Promise<UserProfileResponse[]> {
    const response = await api.get<{ status: string; users: UserProfileResponse[] }>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data.users || [];
  },

  async getFollowing(): Promise<UserProfileResponse[]> {
    const response = await api.get<{ status: string; users: UserProfileResponse[] }>(
      '/users/following'
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

  async getUserFollowers(username: string): Promise<FollowUserItem[]> {
    const response = await api.get<{ status: string; followers: FollowUserItem[]; count: number }>(
      `/users/${encodeURIComponent(username)}/followers`
    );
    return response.data.followers || [];
  },

  async getUserFollowing(username: string): Promise<FollowUserItem[]> {
    const response = await api.get<{ status: string; following: FollowUserItem[]; count: number }>(
      `/users/${encodeURIComponent(username)}/following`
    );
    return response.data.following || [];
  },

  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post<FollowResponse>(`/users/${encodeURIComponent(userId)}/follow`);
    return response.data;
  },

  async unfollowUser(userId: string): Promise<FollowResponse> {
    const response = await api.delete<FollowResponse>(`/users/${encodeURIComponent(userId)}/follow`);
    return response.data;
  },

  async removeFollower(userId: string): Promise<{ status: string; message: string; followersCount: number }> {
    const response = await api.delete<{ status: string; message: string; followersCount: number }>(
      `/users/followers/${encodeURIComponent(userId)}`
    );
    return response.data;
  },

  async getPendingFollowRequests(): Promise<PendingFollowRequest[]> {
    const response = await api.get<{ status: string; requests: PendingFollowRequest[] }>(
      '/users/follow-requests/pending'
    );
    return response.data.requests || [];
  },

  async acceptFollowRequest(requestId: string): Promise<{
    status: string;
    message: string;
    isFollowingRequester: boolean;
    requesterId: string;
  }> {
    const response = await api.post<{
      status: string;
      message: string;
      isFollowingRequester: boolean;
      requesterId: string;
    }>(`/users/follow-requests/${encodeURIComponent(requestId)}/accept`);
    return response.data;
  },

  async declineFollowRequest(requestId: string): Promise<{ status: string; message: string }> {
    const response = await api.post<{ status: string; message: string }>(
      `/users/follow-requests/${encodeURIComponent(requestId)}/decline`
    );
    return response.data;
  },

  async updateProfile(data: {
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    isPrivate?: boolean;
  }): Promise<{ status: string; message: string; user: UserProfileResponse }> {
    const response = await api.put<{ status: string; message: string; user: UserProfileResponse }>(
      '/users/profile',
      data
    );
    return response.data;
  },
};

export default userService;
