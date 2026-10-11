import api from './api';
import type { UserProfileResponse } from './userService';

export interface MessageReplyInfo {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
}

export interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  status?: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: MessageReplyInfo | null;
  isForwarded?: boolean;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
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

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ status: string; count: number }>(
      '/messages/unread-count'
    );
    return response.data.count || 0;
  },

  async markMessagesAsRead(userId: string): Promise<void> {
    await api.post(`/messages/${encodeURIComponent(userId)}/read`);
  },

  async sendMessage(
    userId: string,
    content: string,
    options?: {
      replyTo?: MessageReplyInfo | null;
      isForwarded?: boolean;
    }
  ): Promise<MessageItem> {
    const response = await api.post<{ status: string; message: MessageItem }>(
      `/messages/${encodeURIComponent(userId)}`,
      {
        content,
        replyTo: options?.replyTo,
        isForwarded: options?.isForwarded,
      }
    );
    return response.data.message;
  },

  async editMessage(messageId: string, content: string): Promise<MessageItem> {
    const response = await api.put<{ status: string; message: MessageItem }>(
      `/messages/item/${encodeURIComponent(messageId)}`,
      { content }
    );
    return response.data.message;
  },

  async deleteMessage(
    messageId: string,
    mode: 'for_me' | 'for_everyone'
  ): Promise<{ status: string; mode: string; messageId?: string; message?: MessageItem }> {
    const response = await api.delete<{
      status: string;
      mode: string;
      messageId?: string;
      message?: MessageItem;
    }>(`/messages/item/${encodeURIComponent(messageId)}`, {
      data: { mode },
    });
    return response.data;
  },
};

export default messageService;
