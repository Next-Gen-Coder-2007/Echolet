import api from './api';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  birthday?: string;
  gender?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followersCount?: number;
  followingCount?: number;
  lastSeen?: string;
  isOnline?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message: string;
  user?: User;
}

export interface RegisterData {
  fullName: string;
  username: string;
  email: string;
  birthday: string;
  gender: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ status: string; user: User }>('/auth/me');
    return response.data.user;
  },

  async googleAuth(data: { credential?: string; accessToken?: string }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/google', data);
    return response.data;
  },
};

export default authService;
