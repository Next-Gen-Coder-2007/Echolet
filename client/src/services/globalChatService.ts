import api from './api';

export interface GlobalMessageSender {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  gender?: string;
}

export interface GlobalMessageReplyInfo {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
}

export interface GlobalPollOptionItem {
  id: string;
  text: string;
  voterIds: string[];
}

export interface GlobalPoll {
  question: string;
  options: GlobalPollOptionItem[];
  expiresAt?: string | null;
}

export interface GlobalMessageItem {
  id: string;
  senderId?: string;
  sender?: GlobalMessageSender;
  content: string;
  messageType?:
    | 'text'
    | 'image'
    | 'video'
    | 'document'
    | 'poll'
    | 'voice'
    | 'audio'
    | 'reel'
    | 'system';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  poll?: GlobalPoll;
  audioUrl?: string;
  audioDuration?: number;
  replyTo?: GlobalMessageReplyInfo | null;
  reactions?: Record<string, string[]>;
  isEdited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface GlobalMessagesResponse {
  status: string;
  messages: GlobalMessageItem[];
  pinnedMessage?: GlobalMessageItem | null;
  onlineCount: number;
}

export const globalChatService = {
  async getMessages(limit = 50, before?: string): Promise<GlobalMessagesResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (before) params.set('before', before);

    const response = await api.get<GlobalMessagesResponse>(
      `/global-chat/messages?${params.toString()}`
    );
    return response.data;
  },

  async sendMessage(
    content: string,
    options?: {
      replyTo?: GlobalMessageReplyInfo | null;
      messageType?:
        | 'text'
        | 'image'
        | 'video'
        | 'document'
        | 'poll'
        | 'voice'
        | 'audio'
        | 'system';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string | number;
      poll?: {
        question: string;
        options: string[] | GlobalPollOptionItem[];
        expiresAt?: string | null;
        duration?: string | null;
      };
      audioUrl?: string;
      audioDuration?: number;
    }
  ): Promise<GlobalMessageItem> {
    const response = await api.post<{ status: string; message: GlobalMessageItem }>(
      '/global-chat/messages',
      {
        content,
        replyTo: options?.replyTo,
        messageType: options?.messageType || 'text',
        mediaUrl: options?.mediaUrl,
        fileName: options?.fileName,
        fileSize: options?.fileSize,
        poll: options?.poll,
        audioUrl: options?.audioUrl,
        audioDuration: options?.audioDuration,
      }
    );
    return response.data.message;
  },

  async reactToMessage(messageId: string, emoji: string): Promise<Record<string, string[]>> {
    const response = await api.post<{
      status: string;
      reactions: Record<string, string[]>;
    }>(`/global-chat/messages/${encodeURIComponent(messageId)}/react`, { emoji });
    return response.data.reactions;
  },

  async votePoll(messageId: string, optionId: string): Promise<GlobalMessageItem> {
    const response = await api.post<{
      status: string;
      message: GlobalMessageItem;
    }>(`/global-chat/messages/${encodeURIComponent(messageId)}/vote`, { optionId });
    return response.data.message;
  },

  async deleteMessage(messageId: string): Promise<string> {
    const response = await api.delete<{
      status: string;
      messageId: string;
    }>(`/global-chat/messages/${encodeURIComponent(messageId)}`);
    return response.data.messageId;
  },

  async editMessage(messageId: string, content: string): Promise<GlobalMessageItem> {
    const response = await api.put<{
      status: string;
      message: GlobalMessageItem;
    }>(`/global-chat/messages/${encodeURIComponent(messageId)}`, { content });
    return response.data.message;
  },

  async reportMessage(messageId: string, reason: string): Promise<string> {
    const response = await api.post<{
      status: string;
      message: string;
    }>(`/global-chat/messages/${encodeURIComponent(messageId)}/report`, { reason });
    return response.data.message;
  },

  async getStats(): Promise<{ onlineCount: number; totalCount: number }> {
    const response = await api.get<{
      status: string;
      onlineCount: number;
      totalCount: number;
    }>('/global-chat/stats');
    return {
      onlineCount: response.data.onlineCount,
      totalCount: response.data.totalCount,
    };
  },
};

export default globalChatService;
