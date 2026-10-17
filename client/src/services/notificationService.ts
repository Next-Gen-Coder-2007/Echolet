import api from './api';

export interface NotificationActor {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}

export type NotificationType =
  | 'follow'
  | 'follow_request'
  | 'follow_accept'
  | 'like'
  | 'comment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityType?: 'post' | 'reel' | 'comment' | 'user' | 'follow_request';
  entityId?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor;
  isActorFollowed?: boolean;
  isRequestPending?: boolean;
  requestStatus?: 'pending' | 'accepted' | 'declined' | 'cancelled';
  followRequestId?: string;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await api.get<{ status: string; notifications: NotificationItem[] }>(
      '/notifications'
    );
    return response.data.notifications || [];
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ status: string; count: number }>(
      '/notifications/unread-count'
    );
    return response.data.count || 0;
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${encodeURIComponent(id)}/read`);
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${encodeURIComponent(id)}`);
  },
};

export default notificationService;
