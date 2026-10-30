import api from './api';
import type { UserProfileResponse } from './userService';
import type { PollVotersData } from './postService';

export interface MessageReplyInfo {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
}

export interface PollOptionItem {
  id: string;
  text: string;
  voterIds: string[];
}

export interface MessagePoll {
  question: string;
  options: PollOptionItem[];
  expiresAt?: string | null;
}

export interface StoryMessageData {
  id: string;
  mediaType: 'image' | 'video' | 'text';
  mediaUrl?: string | null;
  duration?: number | null;
  content?: string | null;
  backgroundColor?: string | null;
  fontStyle?: string | null;
  expiresAt: string;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
}

export interface MessageReactionItem {
  emoji: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CallLogData {
  duration: number; // in seconds
  status: 'completed' | 'missed' | 'declined' | 'busy' | 'cancelled';
  callType?: 'voice' | 'video';
}

export interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
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
    | 'post'
    | 'story_reply'
    | 'system'
    | 'call';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  poll?: MessagePoll;
  callLog?: CallLogData | null;
  audioUrl?: string;
  audioDuration?: number;
  isRead: boolean;
  status?: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  starredBy?: string[];
  replyTo?: MessageReplyInfo | null;
  story?: StoryMessageData | null;
  isForwarded?: boolean;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
  reactions?: MessageReactionItem[];
  createdAt: string;
}

export interface ChatSettings {
  archivedChats: string[];
  mutedChats: string[];
  pinnedChats: string[];
  unreadChats: string[];
  favouriteChats: string[];
  blockedUsers: string[];
}

export interface ConversationItem {
  user: UserProfileResponse;
  lastMessage: MessageItem;
  unreadCount: number;
}

export interface MessagesResponse {
  messages: MessageItem[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export const messageService = {
  async getConversations(): Promise<ConversationItem[]> {
    const response = await api.get<{ status: string; conversations: ConversationItem[] }>(
      '/messages/conversations'
    );
    return response.data.conversations || [];
  },

  async getMessages(
    userId: string,
    options?: { limit?: number; before?: string }
  ): Promise<MessagesResponse> {
    const q = new URLSearchParams();
    if (options?.limit) q.append('limit', String(options.limit));
    if (options?.before) q.append('before', options.before);
    const qs = q.toString() ? `?${q.toString()}` : '';

    const response = await api.get<{
      status: string;
      messages: MessageItem[];
      hasMore?: boolean;
      nextCursor?: string | null;
    }>(`/messages/${encodeURIComponent(userId)}${qs}`);

    return {
      messages: response.data.messages || [],
      hasMore: Boolean(response.data.hasMore),
      nextCursor: response.data.nextCursor || null,
    };
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
      story?: StoryMessageData | null;
      messageType?:
        | 'text'
        | 'image'
        | 'video'
        | 'document'
        | 'poll'
        | 'voice'
        | 'audio'
        | 'reel'
        | 'post'
        | 'story_reply'
        | 'system'
        | 'call';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string | number;
      poll?: {
        question: string;
        options: string[] | PollOptionItem[];
        expiresAt?: string | null;
        duration?: string | null;
      };
      callLog?: CallLogData | null;
      audioUrl?: string;
      audioDuration?: number;
    }
  ): Promise<MessageItem> {
    const response = await api.post<{ status: string; message: MessageItem }>(
      `/messages/${encodeURIComponent(userId)}`,
      {
        content,
        replyTo: options?.replyTo,
        isForwarded: options?.isForwarded,
        story: options?.story,
        messageType: options?.messageType || 'text',
        mediaUrl: options?.mediaUrl,
        fileName: options?.fileName,
        fileSize: options?.fileSize,
        poll: options?.poll,
        callLog: options?.callLog,
        audioUrl: options?.audioUrl,
        audioDuration: options?.audioDuration,
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

  async toggleStarMessage(messageId: string): Promise<{ message: MessageItem; isStarred: boolean }> {
    const response = await api.post<{ status: string; message: MessageItem; isStarred: boolean }>(
      `/messages/item/${encodeURIComponent(messageId)}/star`
    );
    return response.data;
  },

  async togglePinMessage(messageId: string): Promise<{ message: MessageItem; isPinned: boolean }> {
    const response = await api.post<{ status: string; message: MessageItem; isPinned: boolean }>(
      `/messages/item/${encodeURIComponent(messageId)}/pin`
    );
    return response.data;
  },

  async votePoll(messageId: string, optionId: string): Promise<MessageItem> {
    const response = await api.post<{ status: string; message: MessageItem }>(
      `/messages/item/${encodeURIComponent(messageId)}/vote`,
      { optionId }
    );
    return response.data.message;
  },

  async getPollVoters(messageId: string): Promise<PollVotersData> {
    const response = await api.get<{ status: string; data: PollVotersData }>(
      `/messages/item/${encodeURIComponent(messageId)}/poll/voters`
    );
    return response.data.data;
  },

  async clearConversation(userId: string): Promise<void> {
    await api.post(`/messages/${encodeURIComponent(userId)}/clear`);
  },

  async getChatSettings(): Promise<ChatSettings> {
    const response = await api.get<{ status: string; settings: ChatSettings }>(
      '/messages/chat-settings'
    );
    return (
      response.data.settings || {
        archivedChats: [],
        mutedChats: [],
        pinnedChats: [],
        unreadChats: [],
        favouriteChats: [],
        blockedUsers: [],
      }
    );
  },

  async updateChatSettings(
    action:
      | 'toggle_archive'
      | 'toggle_mute'
      | 'toggle_pin'
      | 'toggle_unread'
      | 'toggle_favourite'
      | 'toggle_block',
    chatId: string
  ): Promise<ChatSettings> {
    const response = await api.post<{ status: string; settings: ChatSettings }>(
      '/messages/chat-settings',
      { action, chatId }
    );
    return response.data.settings;
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

  async getConversationMedia(
    userId: string,
    options?: { type?: string; search?: string; page?: number; limit?: number }
  ): Promise<{
    status: string;
    media: MessageItem[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    counts: {
      all: number;
      photos: number;
      videos: number;
      documents: number;
      audio: number;
      links: number;
    };
  }> {
    const params: Record<string, any> = {};
    if (options?.type) params.type = options.type;
    if (options?.search) params.search = options.search;
    if (options?.page) params.page = options.page;
    if (options?.limit) params.limit = options.limit;

    const response = await api.get<{
      status: string;
      media: MessageItem[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
      counts: {
        all: number;
        photos: number;
        videos: number;
        documents: number;
        audio: number;
        links: number;
      };
    }>(`/messages/${encodeURIComponent(userId)}/media`, { params });
    return response.data;
  },

  async toggleReaction(
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string; reactions: MessageReactionItem[] }> {
    const response = await api.post<{
      status: string;
      messageId: string;
      reactions: MessageReactionItem[];
    }>(`/messages/item/${encodeURIComponent(messageId)}/reaction`, { emoji });
    return response.data;
  },
};

export default messageService;

