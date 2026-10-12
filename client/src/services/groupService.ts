import api from './api';

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

export interface GroupMessageItem {
  id: string;
  groupId: string;
  senderId?: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  replyTo?: { id: string; senderId: string; senderName: string; content: string } | null;
  isEdited?: boolean;
  editedAt?: string;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
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
      messageType?: 'text' | 'image';
    }
  ): Promise<GroupMessageItem> {
    const response = await api.post<{ status: string; message: GroupMessageItem }>(
      `/groups/${encodeURIComponent(groupId)}/messages`,
      {
        content,
        replyTo: options?.replyTo,
        messageType: options?.messageType || 'text',
      }
    );
    return response.data.message;
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
};

export default groupService;
