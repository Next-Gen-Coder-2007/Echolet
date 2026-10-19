import api from './api';
import type { StoryMessageData, MessageReactionItem } from './messageService';
import type { PollVotersData } from './postService';

export interface GroupMemberUser {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface GroupMemberItem {
  id: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  user: GroupMemberUser | null;
}

export interface GroupPollOptionItem {
  id: string;
  text: string;
  voterIds: string[];
}

export interface GroupPoll {
  question: string;
  options: GroupPollOptionItem[];
  expiresAt?: string | null;
}

export interface GroupMessageItem {
  id: string;
  groupId: string;
  senderId?: string;
  content: string;
  messageType:
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
    | 'system';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  poll?: GroupPoll;
  audioUrl?: string;
  audioDuration?: number;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  starredBy?: string[];
  replyTo?: { id: string; senderId: string; senderName: string; content: string } | null;
  story?: StoryMessageData | null;
  isEdited?: boolean;
  editedAt?: string;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
  reactions?: MessageReactionItem[];
  createdAt: string;
  sender?: GroupMemberUser | null;
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  currentUserRole: 'admin' | 'member';
  membersPreview?: {
    id: string;
    fullName?: string;
    username?: string;
    avatarUrl?: string;
    role: 'admin' | 'member';
    isOnline?: boolean;
  }[];
  lastMessage?: GroupMessageItem | null;
  unreadCount: number;
}

export interface GroupDetails {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole: 'admin' | 'member';
  members: GroupMemberItem[];
}

export const groupService = {
  async getGroups(): Promise<GroupItem[]> {
    const response = await api.get<{ status: string; groups: GroupItem[] }>('/groups');
    return response.data.groups || [];
  },

  async getGroupDetails(groupId: string): Promise<GroupDetails> {
    const response = await api.get<{ status: string; group: GroupDetails }>(
      `/groups/${encodeURIComponent(groupId)}`
    );
    return response.data.group;
  },

  async createGroup(payload: {
    name: string;
    description?: string;
    avatarUrl?: string;
    memberIds?: string[];
  }): Promise<GroupItem> {
    const response = await api.post<{ status: string; group: GroupItem }>('/groups', payload);
    return response.data.group;
  },

  async updateGroup(
    groupId: string,
    payload: { name?: string; description?: string; avatarUrl?: string }
  ): Promise<GroupItem> {
    const response = await api.put<{ status: string; group: GroupItem }>(
      `/groups/${encodeURIComponent(groupId)}`,
      payload
    );
    return response.data.group;
  },

  async getGroupMessages(groupId: string): Promise<GroupMessageItem[]> {
    const response = await api.get<{ status: string; messages: GroupMessageItem[] }>(
      `/groups/${encodeURIComponent(groupId)}/messages`
    );
    return response.data.messages || [];
  },

  async sendGroupMessage(
    groupId: string,
    content: string,
    options?: {
      replyTo?: { id: string; senderId: string; senderName: string; content: string } | null;
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
        | 'system';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string | number;
      poll?: {
        question: string;
        options: string[] | GroupPollOptionItem[];
        expiresAt?: string | null;
        duration?: string | null;
      };
      audioUrl?: string;
      audioDuration?: number;
    }
  ): Promise<GroupMessageItem> {
    const response = await api.post<{ status: string; message: GroupMessageItem }>(
      `/groups/${encodeURIComponent(groupId)}/messages`,
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

  async toggleStarGroupMessage(
    groupId: string,
    messageId: string
  ): Promise<{ message: GroupMessageItem; isStarred: boolean }> {
    const response = await api.post<{ status: string; message: GroupMessageItem; isStarred: boolean }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/star`
    );
    return response.data;
  },

  async togglePinGroupMessage(
    groupId: string,
    messageId: string
  ): Promise<{ message: GroupMessageItem; isPinned: boolean }> {
    const response = await api.post<{ status: string; message: GroupMessageItem; isPinned: boolean }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/pin`
    );
    return response.data;
  },

  async votePoll(
    groupId: string,
    messageId: string,
    optionId: string
  ): Promise<GroupMessageItem> {
    const response = await api.post<{ status: string; message: GroupMessageItem }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/vote`,
      { optionId }
    );
    return response.data.message;
  },

  async getPollVoters(
    groupId: string,
    messageId: string
  ): Promise<PollVotersData> {
    const response = await api.get<{ status: string; data: PollVotersData }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/poll/voters`
    );
    return response.data.data;
  },

  async clearGroupChat(groupId: string): Promise<void> {
    await api.post(`/groups/${encodeURIComponent(groupId)}/clear`);
  },

  async editGroupMessage(
    groupId: string,
    messageId: string,
    content: string
  ): Promise<GroupMessageItem> {
    const response = await api.put<{ status: string; message: GroupMessageItem }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
      { content }
    );
    return response.data.message;
  },

  async deleteGroupMessage(
    groupId: string,
    messageId: string,
    mode: 'for_me' | 'for_everyone'
  ): Promise<{ status: string; mode: string; messageId: string }> {
    const response = await api.delete<{ status: string; mode: string; messageId: string }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
      { data: { mode } }
    );
    return response.data;
  },

  async addMembers(groupId: string, memberIds: string[]): Promise<void> {
    await api.post(`/groups/${encodeURIComponent(groupId)}/members`, { memberIds });
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await api.delete(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`
    );
  },

  async changeMemberRole(
    groupId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await api.put(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`,
      { role }
    );
  },

  async leaveGroup(groupId: string): Promise<void> {
    await api.post(`/groups/${encodeURIComponent(groupId)}/leave`);
  },

  async markGroupAsRead(groupId: string): Promise<void> {
    await api.post(`/groups/${encodeURIComponent(groupId)}/read`);
  },

  async getGroupMedia(
    groupId: string,
    options?: { type?: string; search?: string; page?: number; limit?: number }
  ): Promise<{
    status: string;
    media: GroupMessageItem[];
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
      media: GroupMessageItem[];
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
    }>(`/groups/${encodeURIComponent(groupId)}/media`, { params });
    return response.data;
  },

  async toggleReaction(
    groupId: string,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string; reactions: MessageReactionItem[] }> {
    const response = await api.post<{
      status: string;
      messageId: string;
      reactions: MessageReactionItem[];
    }>(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/reaction`,
      { emoji }
    );
    return response.data;
  },
};

export default groupService;

