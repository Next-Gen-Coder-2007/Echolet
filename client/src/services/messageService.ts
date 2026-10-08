import api from './api';
import type { UserProfileResponse } from './userService';

export interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationItem {
  user: UserProfileResponse;
  lastMessage: MessageItem;
  unreadCount: number;
}

export const messageService = {
  async getConversations(): Promise<ConversationItem[]> {
    const response = await api.get<{ status: string; conversations: ConversationItem[] }>(
      '/messages/conversations'
    );
    return response.data.conversations || [];
  },

  async getMessages(userId: string): Promise<MessageItem[]> {
    const response = await api.get<{ status: string; messages: MessageItem[] }>(
      `/messages/${encodeURIComponent(userId)}`
    );
    return response.data.messages || [];
  },

  async sendMessage(userId: string, content: string): Promise<MessageItem> {
    const response = await api.post<{ status: string; message: MessageItem }>(
      `/messages/${encodeURIComponent(userId)}`,
      { content }
    );
    return response.data.message;
  },
};

export default messageService;
