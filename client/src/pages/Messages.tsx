import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePencilSquare,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowUturnRight,
  HiOutlineTrash,
  HiOutlineFaceSmile,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineUserGroup,
  HiOutlineInformationCircle,
  HiOutlinePlus,
} from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import messageService, {
  type MessageItem,
  type ConversationItem,
} from '../services/messageService';
import groupService, {
  type GroupItem,
  type GroupMessageItem,
} from '../services/groupService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';
import getSocket, { joinUserRoom } from '../services/socket';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupInfoModal from '../components/GroupInfoModal';

// WhatsApp-like dual tick SVG indicator
const MessageTicks: React.FC<{
  status?: 'sent' | 'delivered' | 'read';
  isRead?: boolean;
}> = ({ status, isRead }) => {
  const isViewed = status === 'read' || isRead;
  const isDelivered = status === 'delivered' || isViewed;

  if (isViewed) {
    return (
      <svg
        className="w-3.5 h-3.5 text-sky-400 shrink-0 inline-block transition-colors"
        viewBox="0 0 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Read"
      >
        <title>Read</title>
        <path d="M1 8.5l3.5 3.5L11 4" />
        <path d="M5 8.5l3.5 3.5L15 4" />
      </svg>
    );
  }

  if (isDelivered) {
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-400 shrink-0 inline-block transition-colors"
        viewBox="0 0 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Delivered"
      >
        <title>Delivered</title>
        <path d="M1 8.5l3.5 3.5L11 4" />
        <path d="M5 8.5l3.5 3.5L15 4" />
      </svg>
    );
  }

  return (
    <svg
      className="w-3 h-3 text-slate-400 shrink-0 inline-block transition-colors"
      viewBox="0 0 16 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Sent"
    >
      <title>Sent</title>
      <path d="M2.5 8.5l4 4L14 4" />
    </svg>
  );
};

// Reusable user avatar with graceful fallback & online status badge
const UserAvatar: React.FC<{
  user?: { fullName?: string; username?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  showBadge?: boolean;
}> = ({ user, size = 'md', isOnline = false, showBadge = false }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const badgeSize = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
  }[size];

  return (
    <div className={`relative shrink-0 ${sizeClasses}`}>
      {user?.avatarUrl && !imgError ? (
        <img
          src={user.avatarUrl}
          alt={user.fullName || user.username || 'User'}
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-full object-cover shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-linear-to-tr from-slate-900 to-slate-700 text-white font-bold flex items-center justify-center uppercase shadow-2xs select-none`}
        >
          {user?.fullName?.[0] || user?.username?.[0] || 'U'}
        </div>
      )}
      {showBadge && (
        <span
          className={`absolute bottom-0 right-0 ${badgeSize} rounded-full ring-white transition-all ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

// Group avatar with multi-user badge
const GroupAvatar: React.FC<{
  group?: { name?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
}> = ({ group, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  return (
    <div className={`relative shrink-0 ${sizeClasses}`}>
      {group?.avatarUrl ? (
        <img
          src={group.avatarUrl}
          alt={group.name || 'Group'}
          className={`${sizeClasses} rounded-2xl object-cover shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-tr from-indigo-700 via-purple-700 to-indigo-900 text-white font-bold flex items-center justify-center uppercase shadow-2xs select-none`}
        >
          <HiOutlineUserGroup className="w-5 h-5 text-indigo-100" />
        </div>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white shadow-2xs"
        title="Group Chat"
      >
        <HiOutlineUserGroup className="w-2 h-2" />
      </span>
    </div>
  );
};

// Deterministic colorful sender name for group chats
const SENDER_COLORS = [
  'text-indigo-600',
  'text-rose-600',
  'text-emerald-600',
  'text-amber-600',
  'text-sky-600',
  'text-violet-600',
  'text-teal-600',
  'text-fuchsia-600',
];

const getSenderColor = (id?: string) => {
  if (!id) return 'text-indigo-600';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

export default function Messages() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{
    user?: User | null;
    refreshUnreadCount?: () => void;
  }>();
  const currentUser = outletContext?.user;
  const refreshUnreadCount = outletContext?.refreshUnreadCount;

  const targetUserParam =
    paramUsername || searchParams.get('user') || searchParams.get('username') || searchParams.get('userId');
  const targetGroupParam = searchParams.get('group') || searchParams.get('groupId');

  // Filter tabs: 'all' | 'direct' | 'groups'
  const [chatTab, setChatTab] = useState<'all' | 'direct' | 'groups'>('all');

  // Direct conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfileResponse | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Group conversations state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupItem | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessageItem[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [groupTypingUsers, setGroupTypingUsers] = useState<
    Record<string, { username: string; fullName: string }>
  >({});

  // Input & sending state
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  // Presence & Typing state (Direct)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Message Actions state (edit, reply, forward, delete)
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [editingGroupMsg, setEditingGroupMsg] = useState<GroupMessageItem | null>(null);
  const [replyingToGroupMsg, setReplyingToGroupMsg] = useState<GroupMessageItem | null>(null);

  const [forwardingMessage, setForwardingMessage] = useState<MessageItem | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetIds, setForwardingTargetIds] = useState<string[]>([]);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  // Delete message confirmation state
  const [deletingMessage, setDeletingMessage] = useState<MessageItem | null>(null);
  const [deletingGroupMsg, setDeletingGroupMsg] = useState<GroupMessageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isSendingRef = useRef(false);

  // Deduplicated message streams for rendering
  const deduplicatedGroupMessages = useMemo(() => {
    const seen = new Set<string>();
    return groupMessages.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [groupMessages]);

  const deduplicatedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  // Emoji Picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join user room on mount or user change
  useEffect(() => {
    if (currentUser?.id) {
      joinUserRoom(currentUser.id);
    }
  }, [currentUser?.id]);

  // Stable refs to prevent cascading re-renders and loops
  const conversationsRef = useRef<ConversationItem[]>([]);
  conversationsRef.current = conversations;

  const groupsRef = useRef<GroupItem[]>([]);
  groupsRef.current = groups;

  const activeUserRef = useRef<UserProfileResponse | null>(null);
  activeUserRef.current = activeUser;

  const activeGroupRef = useRef<GroupItem | null>(null);
  activeGroupRef.current = activeGroup;

  const currentUserRef = useRef<User | null | undefined>(currentUser);
  currentUserRef.current = currentUser;

  // Fetch Direct Conversations
  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      conversationsRef.current = data;
      data.forEach((c) => {
        if (c.user.lastSeen) {
          setLastSeenMap((prev) => ({ ...prev, [c.user.id]: c.user.lastSeen! }));
        }
        if (c.user.isOnline) {
          setOnlineUserIds((prev) => new Set([...prev, c.user.id]));
        }
      });
      refreshUnreadCount?.();
      return data;
    } catch {
      return [];
    }
  }, [refreshUnreadCount]);

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    try {
      const list = await groupService.getGroups();
      setGroups(list);
      groupsRef.current = list;
      return list;
    } catch {
      return [];
    }
  }, []);

  const fetchMessages = useCallback(
    async (userId: string) => {
      try {
        const data = await messageService.getMessages(userId);
        setMessages(data);
        refreshUnreadCount?.();
      } catch {}
    },
    [refreshUnreadCount]
  );

  const fetchGroupMessagesList = useCallback(async (groupId: string) => {
    try {
      const data = await groupService.getGroupMessages(groupId);
      setGroupMessages(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchGroups();
  }, [fetchConversations, fetchGroups]);

  // Unified URL Synchronization Effect (deterministic, no cascading loops)
  useEffect(() => {
    if (targetGroupParam) {
      // 1. Group Chat selected
      setActiveUser(null);
      setMessages([]);

      const existingGroup = groupsRef.current.find((g) => g.id === targetGroupParam);
      if (existingGroup) {
        setActiveGroup(existingGroup);
      } else {
        groupService
          .getGroupDetails(targetGroupParam)
          .then((details) => {
            if (details) {
              const mappedGroup: GroupItem = {
                id: details.id,
                name: details.name,
                description: details.description,
                avatarUrl: details.avatarUrl,
                creatorId: details.creatorId,
                createdAt: details.createdAt,
                updatedAt: details.updatedAt,
                memberCount: details.members.length,
                currentUserRole: details.currentUserRole,
                unreadCount: 0,
              };
              setActiveGroup(mappedGroup);
            }
          })
          .catch(() => {});
      }

      getSocket().emit('join_group', targetGroupParam);
      fetchGroupMessagesList(targetGroupParam);
      groupService.markGroupAsRead(targetGroupParam).catch(() => {});
      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroupParam ? { ...g, unreadCount: 0 } : g))
      );
    } else if (targetUserParam) {
      // 2. Direct Chat selected
      setActiveGroup(null);
      setGroupMessages([]);

      const clean = targetUserParam.toLowerCase();
      const existingConv = conversationsRef.current.find(
        (c) =>
          c.user.username.toLowerCase() === clean ||
          c.user.id.toLowerCase() === clean
      );

      if (existingConv) {
        setActiveUser(existingConv.user);
        fetchMessages(existingConv.user.id);
        if (currentUser?.id) {
          getSocket().emit('mark_as_read', {
            readerId: currentUser.id,
            partnerId: existingConv.user.id,
          });
        }
        messageService
          .markMessagesAsRead(existingConv.user.id)
          .then(() => refreshUnreadCount?.())
          .catch(() => {});
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === existingConv.user.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } else {
        userService
          .getUserByUsername(targetUserParam)
          .then((u) => {
            if (u) {
              setActiveUser(u);
              fetchMessages(u.id);
              if (currentUser?.id) {
                getSocket().emit('mark_as_read', {
                  readerId: currentUser.id,
                  partnerId: u.id,
                });
              }
              messageService
                .markMessagesAsRead(u.id)
                .then(() => refreshUnreadCount?.())
                .catch(() => {});
              if (u.lastSeen) {
                setLastSeenMap((prev) => ({ ...prev, [u.id]: u.lastSeen! }));
              }
            }
          })
          .catch(() => {});
      }
    } else {
      // 3. No active chat
      setActiveUser(null);
      setActiveGroup(null);
      setMessages([]);
      setGroupMessages([]);
    }
  }, [
    targetUserParam,
    targetGroupParam,
    fetchMessages,
    fetchGroupMessagesList,
    currentUser?.id,
    refreshUnreadCount,
  ]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    // Direct Messages socket handlers
    const handleNewMessage = (msg: MessageItem) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (
        curUser &&
        (msg.senderId === curUser.id || msg.receiverId === curUser.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.senderId === curUser.id && curId) {
          socket.emit('mark_as_read', { readerId: curId, partnerId: curUser.id });
          messageService
            .markMessagesAsRead(curUser.id)
            .then(() => refreshUnreadCount?.())
            .catch(() => {});

          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === curUser.id
                ? { ...c, unreadCount: 0, lastMessage: msg }
                : c
            )
          );
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === curUser.id ? { ...c, lastMessage: msg } : c
            )
          );
        }
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === msg.senderId
              ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg }
              : c
          )
        );
      }
    };

    const handleMessagesRead = ({
      readerId,
      partnerId,
    }: {
      readerId: string;
      partnerId: string;
      messageIds?: string[];
    }) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (curUser && readerId === curUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === curId ? { ...m, isRead: true, status: 'read' } : m
          )
        );
      }

      if (readerId === curId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === partnerId ? { ...c, unreadCount: 0 } : c
          )
        );
      }

      refreshUnreadCount?.();
    };

    const handleMessagesDelivered = ({
      receiverId,
      messageIds,
    }: {
      receiverId: string;
      messageIds: string[];
    }) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (curUser && receiverId === curUser.id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === curId && messageIds.includes(m.id) && m.status === 'sent') {
              return { ...m, status: 'delivered' };
            }
            return m;
          })
        );
      }
    };

    const handleMessageEdited = (edited: MessageItem) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
      );
    };

    const handleMessageDeletedForEveryone = ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeletedForEveryone: true, content }
            : m
        )
      );
    };

    const handleOnlineUsers = (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
    };

    const handleUserStatus = ({
      userId,
      isOnline,
      lastSeen,
    }: {
      userId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });

      if (lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
      }
    };

    const handleTyping = ({ senderId }: { senderId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    };

    const handleStopTyping = ({ senderId }: { senderId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
    };

    // Group Messages socket handlers
    const handleNewGroupMessage = (msg: GroupMessageItem) => {
      const curGroup = activeGroupRef.current;
      const curId = currentUserRef.current?.id;

      if (curGroup && curGroup.id === msg.groupId) {
        setGroupMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        groupService.markGroupAsRead(msg.groupId).catch(() => {});

        setGroups((prev) =>
          prev.map((g) =>
            g.id === msg.groupId
              ? { ...g, lastMessage: msg, unreadCount: 0 }
              : g
          )
        );
      } else {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === msg.groupId
              ? {
                  ...g,
                  lastMessage: msg,
                  unreadCount:
                    msg.senderId === curId ? g.unreadCount : g.unreadCount + 1,
                }
              : g
          )
        );
      }
    };

    const handleGroupMessageEdited = (edited: GroupMessageItem) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === edited.groupId) {
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
        );
      }
    };

    const handleGroupMessageDeleted = ({
      groupId,
      messageId,
      isDeletedForEveryone,
    }: {
      groupId: string;
      messageId: string;
      isDeletedForEveryone: boolean;
    }) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === groupId) {
        setGroupMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? isDeletedForEveryone
                ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
                : m
              : m
          )
        );
      }
    };

    const handleGroupTyping = ({
      groupId,
      userId,
      userName,
    }: {
      groupId: string;
      userId: string;
      userName: string;
    }) => {
      const curGroup = activeGroupRef.current;
      const curId = currentUserRef.current?.id;
      if (curGroup && curGroup.id === groupId && userId !== curId) {
        setGroupTypingUsers((prev) => ({
          ...prev,
          [userId]: { username: userName, fullName: userName },
        }));
      }
    };

    const handleGroupStopTyping = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === groupId) {
        setGroupTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    const handleGroupCreated = (group: GroupItem) => {
      socket.emit('join_group', group.id);
      fetchGroups();
    };

    const handleGroupUpdated = (updatedGroup: GroupItem) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g))
      );
      if (activeGroupRef.current?.id === updatedGroup.id) {
        setActiveGroup((prev) => (prev ? { ...prev, ...updatedGroup } : null));
      }
    };

    const handleGroupMemberUpdate = ({
      groupId,
      event,
      userId,
    }: {
      groupId: string;
      event: string;
      userId?: string;
    }) => {
      const curId = currentUserRef.current?.id;
      if (event === 'left' || event === 'removed') {
        if (userId === curId) {
          if (activeGroupRef.current?.id === groupId) {
            setActiveGroup(null);
            navigate('/messages');
          }
        }
      }
      fetchGroups();
    };

    // Subscriptions
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status', handleUserStatus);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_message_edited', handleGroupMessageEdited);
    socket.on('group_message_deleted', handleGroupMessageDeleted);
    socket.on('group_typing', handleGroupTyping);
    socket.on('group_stop_typing', handleGroupStopTyping);
    socket.on('group_created', handleGroupCreated);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('group_member_update', handleGroupMemberUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted_for_everyone', handleMessageDeletedForEveryone);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_status', handleUserStatus);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);

      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_message_edited', handleGroupMessageEdited);
      socket.off('group_message_deleted', handleGroupMessageDeleted);
      socket.off('group_typing', handleGroupTyping);
      socket.off('group_stop_typing', handleGroupStopTyping);
      socket.off('group_created', handleGroupCreated);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('group_member_update', handleGroupMemberUpdate);
    };
  }, [
    currentUser?.id,
    fetchConversations,
    fetchGroups,
    refreshUnreadCount,
    navigate,
  ]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (deduplicatedMessages.length > 0 || deduplicatedGroupMessages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deduplicatedMessages, deduplicatedGroupMessages]);

  // Select Direct Contact
  const selectUser = (u: UserProfileResponse) => {
    setShowEmojiPicker(false);
    setActiveGroup(null);
    setActiveUser(u);
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setReplyingToGroupMsg(null);
    setEditingGroupMsg(null);

    setConversations((prev) =>
      prev.map((c) => (c.user.id === u.id ? { ...c, unreadCount: 0 } : c))
    );
    navigate(`/messages/${encodeURIComponent(u.username)}`);
  };

  // Select Group Chat
  const selectGroup = (g: GroupItem) => {
    setShowEmojiPicker(false);
    setActiveUser(null);
    setActiveGroup(g);
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setReplyingToGroupMsg(null);
    setEditingGroupMsg(null);

    setGroups((prev) =>
      prev.map((item) => (item.id === g.id ? { ...item, unreadCount: 0 } : item))
    );
    navigate(`/messages?group=${encodeURIComponent(g.id)}`);
  };

  // Close emoji picker on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? text.length;
      const end = input.selectionEnd ?? text.length;
      const newText = text.substring(0, start) + emojiData.emoji + text.substring(end);
      setText(newText);
      setTimeout(() => {
        input.focus();
        const cursorPosition = start + emojiData.emoji.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
      }, 10);
    } else {
      setText((prev) => prev + emojiData.emoji);
    }
  };

  // Typing event handler
  const handleInputChange = (val: string) => {
    setText(val);
    const socket = getSocket();

    if (activeUser && currentUser) {
      socket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
      }, 2200);
    } else if (activeGroup && currentUser) {
      socket.emit('group_typing', {
        groupId: activeGroup.id,
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.username,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('group_stop_typing', {
          groupId: activeGroup.id,
          userId: currentUser.id,
        });
      }, 2200);
    }
  };

  const cancelTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const socket = getSocket();
    if (activeUser && currentUser) {
      socket.emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
    } else if (activeGroup && currentUser) {
      socket.emit('group_stop_typing', {
        groupId: activeGroup.id,
        userId: currentUser.id,
      });
    }
  };

  // Send message handler (Direct or Group)
  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending || isSendingRef.current) return;

    isSendingRef.current = true;
    cancelTyping();
    setShowEmojiPicker(false);
    setSending(true);

    try {
      if (activeGroup) {
        // Group Send / Edit / Reply
        if (editingGroupMsg) {
          const updated = await groupService.editGroupMessage(
            activeGroup.id,
            editingGroupMsg.id,
            content
          );
          setGroupMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          setEditingGroupMsg(null);
          setText('');
        } else {
          const replyInfo = replyingToGroupMsg
            ? {
                id: replyingToGroupMsg.id,
                senderId: replyingToGroupMsg.senderId || '',
                senderName:
                  replyingToGroupMsg.senderId === currentUser?.id
                    ? 'You'
                    : replyingToGroupMsg.sender?.fullName ||
                      replyingToGroupMsg.sender?.username ||
                      'Someone',
                content: replyingToGroupMsg.content,
              }
            : null;

          setText('');
          const sent = await groupService.sendGroupMessage(activeGroup.id, content, {
            replyTo: replyInfo,
          });
          setGroupMessages((prev) => {
            if (prev.some((m) => m.id === sent.id)) return prev;
            return [...prev, sent];
          });
          setReplyingToGroupMsg(null);
          fetchGroups();
        }
      } else if (activeUser) {
        // Direct Send / Edit / Reply
        if (editingMessage) {
          const updated = await messageService.editMessage(editingMessage.id, content);
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          setEditingMessage(null);
          setText('');
        } else {
          const replyInfo = replyingTo
            ? {
                id: replyingTo.id,
                senderId: replyingTo.senderId,
                senderName:
                  replyingTo.senderId === currentUser?.id
                    ? 'You'
                    : activeUser.fullName || activeUser.username,
                content: replyingTo.content,
              }
            : null;

          setText('');
          const sent = await messageService.sendMessage(activeUser.id, content, {
            replyTo: replyInfo,
          });

          setMessages((prev) => {
            if (prev.some((m) => m.id === sent.id)) return prev;
            return [...prev, sent];
          });
          setReplyingTo(null);
          fetchConversations();
        }
      }
    } catch {
      setText(content);
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  const handleStartEdit = (m: MessageItem) => {
    setEditingMessage(m);
    setReplyingTo(null);
    setText(m.content);
  };

  const handleStartGroupEdit = (m: GroupMessageItem) => {
    setEditingGroupMsg(m);
    setReplyingToGroupMsg(null);
    setText(m.content);
  };

  const handleExecuteForward = async () => {
    if (!forwardingMessage || forwardingTargetIds.length === 0) return;
    try {
      for (const targetId of forwardingTargetIds) {
        await messageService.sendMessage(targetId, forwardingMessage.content, {
          isForwarded: true,
        });
      }
      setForwardSuccess(true);
      fetchConversations();
      setTimeout(() => {
        setForwardSuccess(false);
        setForwardingMessage(null);
        setForwardingTargetIds([]);
      }, 900);
    } catch (err) {
      console.error('Forward failed:', err);
    }
  };

  const handleDeleteMessage = async (mode: 'for_me' | 'for_everyone') => {
    if (deletingMessage) {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        if (mode === 'for_everyone') {
          await messageService.deleteMessage(deletingMessage.id, 'for_everyone');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === deletingMessage.id
                ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
                : m
            )
          );
        } else {
          await messageService.deleteMessage(deletingMessage.id, 'for_me');
          setMessages((prev) => prev.filter((m) => m.id !== deletingMessage.id));
        }
        setDeletingMessage(null);
        fetchConversations();
      } catch (err) {
        console.error('Delete message failed:', err);
      } finally {
        setIsDeleting(false);
      }
    } else if (deletingGroupMsg && activeGroup) {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        await groupService.deleteGroupMessage(activeGroup.id, deletingGroupMsg.id, mode);
        if (mode === 'for_everyone') {
          setGroupMessages((prev) =>
            prev.map((m) =>
              m.id === deletingGroupMsg.id
                ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
                : m
            )
          );
        } else {
          setGroupMessages((prev) => prev.filter((m) => m.id !== deletingGroupMsg.id));
        }
        setDeletingGroupMsg(null);
        fetchGroups();
      } catch (err) {
        console.error('Delete group message failed:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2');
      }, 1800);
    }
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Offline';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  const isPartnerOnline = activeUser ? onlineUserIds.has(activeUser.id) : false;
  const partnerLastSeen = activeUser ? lastSeenMap[activeUser.id] || activeUser.lastSeen : undefined;
  const isPartnerTyping = activeUser ? Boolean(typingUsers[activeUser.id]) : false;

  // Filtered direct conversations
  const filteredDirect = conversations.filter(
    (c) =>
      c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Filtered groups
  const filteredGroups = groups.filter(
    (g) =>
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Combined and sorted list for "All" tab
  type UnifiedItem =
    | { type: 'direct'; data: ConversationItem; timestamp: number }
    | { type: 'group'; data: GroupItem; timestamp: number };

  const unifiedList: UnifiedItem[] = [
    ...filteredDirect.map((c) => ({
      type: 'direct' as const,
      data: c,
      timestamp: new Date(c.lastMessage?.createdAt || c.user.createdAt || 0).getTime(),
    })),
    ...filteredGroups.map((g) => ({
      type: 'group' as const,
      data: g,
      timestamp: new Date(g.lastMessage?.createdAt || g.updatedAt || g.createdAt).getTime(),
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const groupTypingNames = Object.values(groupTypingUsers).map((u) => u.fullName || u.username);

  const renderMessageContent = (content: string, isDeleted: boolean, isMe: boolean) => {
    if (isDeleted) {
      return (
        <span className="italic opacity-60 flex items-center gap-1.5 text-xs sm:text-sm select-none">
          <svg
            className="w-3.5 h-3.5 text-slate-400 shrink-0 inline-block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          This message was deleted
        </span>
      );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${
              isMe ? 'text-sky-300 hover:text-sky-200' : 'text-sky-600 hover:text-sky-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const hasActiveChat = Boolean(activeUser || activeGroup);

  return (
    <div className="w-full h-[calc(100vh-2.5rem)] sm:h-[calc(100vh-3.5rem)] min-h-[580px] flex gap-4 select-none relative">
      {/* Left Pane: Conversations & Groups List */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 h-full ${
          hasActiveChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Messages</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
                title="Create a new Group Chat"
              >
                <HiOutlinePlus className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
              <button
                onClick={() => navigate('/search')}
                className="text-xs sm:text-sm font-semibold text-purple-600 hover:text-purple-700 cursor-pointer px-1 py-1"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center mb-3">
            <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chats or groups..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
            />
          </div>

          {/* Category Tabs: All / Direct / Groups */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
            <button
              type="button"
              onClick={() => setChatTab('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                chatTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setChatTab('direct')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                chatTab === 'direct'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Direct
            </button>
            <button
              type="button"
              onClick={() => setChatTab('groups')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                chatTab === 'groups'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Groups
              {groups.reduce((acc, g) => acc + g.unreadCount, 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1 right-2" />
              )}
            </button>
          </div>
        </div>

        {/* Chat List Items */}
        <div
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 overscroll-contain"
        >
          {chatTab === 'groups' ? (
            // Only Groups
            filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <HiOutlineUserGroup className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No groups found.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isSelected = activeGroup?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGroup(g)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <GroupAvatar group={g} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {g.name}
                        </span>
                        {g.lastMessage && (
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                            {new Date(g.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {g.lastMessage ? (
                            <>
                              <span className="font-semibold text-slate-700">
                                {g.lastMessage.sender?.fullName?.split(' ')[0] ||
                                  g.lastMessage.sender?.username ||
                                  'User'}
                                :{' '}
                              </span>
                              <span>{g.lastMessage.content}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No messages yet</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                            {g.memberCount} members
                          </span>
                          {g.unreadCount > 0 && (
                            <span className="bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                              {g.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : chatTab === 'direct' ? (
            // Only Direct
            filteredDirect.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No direct messages found.
              </div>
            ) : (
              filteredDirect.map((c) => {
                const isSelected = activeUser?.id === c.user.id;
                const isUserOnline = onlineUserIds.has(c.user.id);
                const isTyping = Boolean(typingUsers[c.user.id]);

                return (
                  <button
                    key={c.user.id}
                    onClick={() => selectUser(c.user)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <UserAvatar
                      user={c.user}
                      size="md"
                      isOnline={isUserOnline}
                      showBadge={true}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {c.user.fullName}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {isTyping ? (
                            <span className="text-emerald-600 font-semibold animate-pulse">
                              typing...
                            </span>
                          ) : (
                            c.lastMessage?.content || `@${c.user.username}`
                          )}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-xs">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            // All Chats (Merged Direct & Groups)
            unifiedList.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No conversations yet. Start chatting or create a group!
              </div>
            ) : (
              unifiedList.map((item) => {
                if (item.type === 'group') {
                  const g = item.data;
                  const isSelected = activeGroup?.id === g.id;

                  return (
                    <button
                      key={`group-${g.id}`}
                      onClick={() => selectGroup(g)}
                      className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <GroupAvatar group={g} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{g.name}</span>
                          </span>
                          {g.lastMessage && (
                            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                              {new Date(g.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-500 truncate pr-2">
                            {g.lastMessage ? (
                              <>
                                <span className="font-semibold text-slate-700">
                                  {g.lastMessage.sender?.fullName?.split(' ')[0] ||
                                    g.lastMessage.sender?.username ||
                                    'User'}
                                  :{' '}
                                </span>
                                <span>{g.lastMessage.content}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">No messages yet</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                              {g.memberCount}m
                            </span>
                            {g.unreadCount > 0 && (
                              <span className="bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                                {g.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }

                // Direct message card
                const c = item.data;
                const isSelected = activeUser?.id === c.user.id;
                const isUserOnline = onlineUserIds.has(c.user.id);
                const isTyping = Boolean(typingUsers[c.user.id]);

                return (
                  <button
                    key={`user-${c.user.id}`}
                    onClick={() => selectUser(c.user)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <UserAvatar
                      user={c.user}
                      size="md"
                      isOnline={isUserOnline}
                      showBadge={true}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {c.user.fullName}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {isTyping ? (
                            <span className="text-emerald-600 font-semibold animate-pulse">
                              typing...
                            </span>
                          ) : (
                            c.lastMessage?.content || `@${c.user.username}`
                          )}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-xs">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Window (Direct OR Group) */}
      <div
        className={`flex-1 min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full ${
          !hasActiveChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeGroup ? (
          // ======================== GROUP CHAT ACTIVE ========================
          <>
            {/* Group Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveGroup(null);
                    navigate('/messages');
                  }}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                >
                  <HiOutlineArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => setIsGroupInfoOpen(true)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 hover:opacity-90 transition-opacity"
                >
                  <GroupAvatar group={activeGroup} size="md" />

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-tight truncate flex items-center gap-1.5">
                      <span>{activeGroup.name}</span>
                      {activeGroup.currentUserRole === 'admin' && (
                        <span className="px-1.5 py-0.2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-md">
                          Admin
                        </span>
                      )}
                    </h2>
                    <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate text-slate-500">
                      {groupTypingNames.length > 0 ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {groupTypingNames.join(', ')} typing...
                        </span>
                      ) : (
                        <span>{activeGroup.memberCount || 0} members • Tap for info</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGroupInfoOpen(true)}
                className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
              >
                <HiOutlineInformationCircle className="w-4 h-4 text-indigo-600" />
                <span>Group Info</span>
              </button>
            </div>

            {/* Group Message Stream */}
            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
            >
              {deduplicatedGroupMessages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <HiOutlineUserGroup className="w-10 h-10 text-slate-300 mb-2" />
                  <span>Welcome to {activeGroup.name}! Send the first message to kick off the group chat.</span>
                </div>
              ) : (
                <>
                  {deduplicatedGroupMessages.map((m) => {
                    const isSystem = m.messageType === 'system';
                    const isMe = m.senderId === currentUser?.id;
                    const elapsedMs = Date.now() - new Date(m.createdAt).getTime();
                    const isEditable = isMe && !m.isDeletedForEveryone && elapsedMs <= 10 * 60 * 1000;
                    const canDelete = isMe || activeGroup.currentUserRole === 'admin';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-medium text-slate-500 text-center shadow-2xs">
                            {m.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`group flex items-end gap-2 transition-all duration-300 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {/* Sender Avatar for other members */}
                        {!isMe && (
                          <div className="shrink-0 mb-1">
                            <UserAvatar user={m.sender || undefined} size="sm" />
                          </div>
                        )}

                        {/* Hover action toolbar for Sender */}
                        {isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToGroupMsg(m);
                                setEditingGroupMsg(null);
                              }}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleStartGroupEdit(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Edit message (10m limit)"
                              >
                                <HiOutlinePencilSquare className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeletingGroupMsg(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Bubble */}
                        <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed flex flex-col gap-1 shadow-2xs relative ${
                              isMe
                                ? m.isDeletedForEveryone
                                  ? 'bg-slate-800/80 text-slate-300 rounded-br-xs border border-slate-700/60'
                                  : 'bg-slate-900 text-white rounded-br-xs'
                                : m.isDeletedForEveryone
                                ? 'bg-slate-100 text-slate-500 rounded-bl-xs border border-slate-200/90'
                                : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                            }`}
                          >
                            {/* Colorful sender header in group chat */}
                            {!isMe && !m.isDeletedForEveryone && (
                              <div
                                className={`text-[11px] font-bold ${getSenderColor(
                                  m.senderId
                                )} leading-tight select-none pb-0.5`}
                              >
                                {m.sender?.fullName || m.sender?.username || 'Group Member'}
                              </div>
                            )}

                            {/* Reply Quoted Card */}
                            {m.replyTo && !m.isDeletedForEveryone && (
                              <div
                                onClick={() => scrollToMessage(m.replyTo!.id)}
                                className={`p-2 rounded-xl text-xs cursor-pointer border-l-3 transition-colors ${
                                  isMe
                                    ? 'bg-slate-800/90 border-purple-400 text-slate-200 hover:bg-slate-800'
                                    : 'bg-slate-100/90 border-purple-500 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="font-bold text-[11px] text-purple-400 truncate">
                                  {m.replyTo.senderName || 'Original message'}
                                </div>
                                <div className="truncate text-[11px] opacity-80 mt-0.5">
                                  {m.replyTo.content}
                                </div>
                              </div>
                            )}

                            {/* Message text content */}
                            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                              <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                                {renderMessageContent(
                                  m.content,
                                  Boolean(m.isDeletedForEveryone),
                                  isMe
                                )}
                              </span>

                              <div className="flex items-center gap-1 ml-auto shrink-0 select-none pb-0.5 leading-none">
                                {m.isEdited && !m.isDeletedForEveryone && (
                                  <span className="text-[10px] italic text-slate-400">edited</span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hover action toolbar for incoming group messages */}
                        {!isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToGroupMsg(m);
                                setEditingGroupMsg(null);
                              }}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingGroupMsg(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Replying banner */}
            {replyingToGroupMsg && (
              <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-indigo-600 truncate">
                      Replying to{' '}
                      {replyingToGroupMsg.senderId === currentUser?.id
                        ? 'yourself'
                        : replyingToGroupMsg.sender?.fullName ||
                          replyingToGroupMsg.sender?.username}
                    </p>
                    <p className="text-xs text-slate-600 truncate">{replyingToGroupMsg.content}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToGroupMsg(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editing banner */}
            {editingGroupMsg && (
              <div className="px-5 py-2.5 bg-purple-50 border-t border-purple-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-700">Editing Message</p>
                    <p className="text-xs text-slate-600 truncate">{editingGroupMsg.content}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroupMsg(null);
                    setText('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input for Group */}
            <form
              onSubmit={onSend}
              className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 relative"
            >
              <div className="relative">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2.5 rounded-full transition-colors ${
                    showEmojiPicker
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiOutlineFaceSmile className="w-5 h-5" />
                </button>

                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      lazyLoadEmojis={true}
                      width={320}
                      height={400}
                    />
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message #${activeGroup.name}...`}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
              </button>
            </form>
          </>
        ) : activeUser ? (
          // ======================== DIRECT CHAT ACTIVE ========================
          <>
            {/* Active Direct Chat Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveUser(null);
                    navigate('/messages');
                  }}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                >
                  <HiOutlineArrowLeft className="w-5 h-5" />
                </button>
                <div
                  onClick={() => navigate(`/profile/${activeUser.username}`)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <UserAvatar
                    user={activeUser}
                    size="md"
                    isOnline={isPartnerOnline}
                    showBadge={true}
                  />

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                      {activeUser.fullName}
                    </h2>
                    <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate">
                      {isPartnerTyping ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          typing...
                        </span>
                      ) : isPartnerOnline ? (
                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {formatLastSeen(partnerLastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/profile/${activeUser.username}`)}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
              >
                Profile
              </button>
            </div>

            {/* Direct Messages Feed */}
            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
            >
              {deduplicatedMessages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <span>Send a message to start the conversation</span>
                </div>
              ) : (
                <>
                  {deduplicatedMessages.map((m) => {
                    const isMe = m.senderId === currentUser?.id;
                    const elapsedMs = Date.now() - new Date(m.createdAt).getTime();
                    const isEditable = isMe && !m.isDeletedForEveryone && elapsedMs <= 10 * 60 * 1000;

                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`group flex items-end gap-2 transition-all duration-300 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMe && (
                          <div className="shrink-0 mb-1">
                            <UserAvatar user={activeUser} size="sm" />
                          </div>
                        )}

                        {isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(m);
                                setEditingMessage(null);
                              }}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setForwardingMessage(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Forward"
                            >
                              <HiOutlineArrowUturnRight className="w-4 h-4" />
                            </button>

                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Edit message (10m limit)"
                              >
                                <HiOutlinePencilSquare className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeletingMessage(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Bubble */}
                        <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-sm sm:text-base leading-relaxed flex flex-col gap-1 shadow-2xs relative ${
                              isMe
                                ? m.isDeletedForEveryone
                                  ? 'bg-slate-800/80 text-slate-300 rounded-br-xs border border-slate-700/60'
                                  : 'bg-slate-900 text-white rounded-br-xs'
                                : m.isDeletedForEveryone
                                ? 'bg-slate-100 text-slate-500 rounded-bl-xs border border-slate-200/90'
                                : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                            }`}
                          >
                            {m.isForwarded && !m.isDeletedForEveryone && (
                              <div className="flex items-center gap-1 text-[11px] italic font-medium pb-0.5 text-slate-400">
                                <HiOutlineArrowUturnRight className="w-3 h-3 rotate-[-15deg]" />
                                <span>Forwarded</span>
                              </div>
                            )}

                            {m.replyTo && !m.isDeletedForEveryone && (
                              <div
                                onClick={() => scrollToMessage(m.replyTo!.id)}
                                className={`p-2 rounded-xl text-xs cursor-pointer border-l-3 transition-colors ${
                                  isMe
                                    ? 'bg-slate-800/90 border-purple-400 text-slate-200 hover:bg-slate-800'
                                    : 'bg-slate-100/90 border-purple-500 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="font-bold text-[11px] text-purple-400 truncate">
                                  {m.replyTo.senderName || 'Original message'}
                                </div>
                                <div className="truncate text-[11px] opacity-80 mt-0.5">
                                  {m.replyTo.content}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                              <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                                {renderMessageContent(
                                  m.content,
                                  Boolean(m.isDeletedForEveryone),
                                  isMe
                                )}
                              </span>

                              <div className="flex items-center gap-1 ml-auto shrink-0 select-none pb-0.5 leading-none">
                                {m.isEdited && !m.isDeletedForEveryone && (
                                  <span className="text-[10px] italic text-slate-400">edited</span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isMe && !m.isDeletedForEveryone && (
                                  <MessageTicks status={m.status} isRead={m.isRead} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(m);
                                setEditingMessage(null);
                              }}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setForwardingMessage(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Forward"
                            >
                              <HiOutlineArrowUturnRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Replying banner */}
            {replyingTo && (
              <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-600 truncate">
                      Replying to{' '}
                      {replyingTo.senderId === currentUser?.id
                        ? 'yourself'
                        : activeUser.fullName || activeUser.username}
                    </p>
                    <p className="text-xs text-slate-600 truncate">{replyingTo.content}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editing banner */}
            {editingMessage && (
              <div className="px-5 py-2.5 bg-purple-50 border-t border-purple-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-700">Editing Message</p>
                    <p className="text-xs text-slate-600 truncate">{editingMessage.content}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setText('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Direct Input Form */}
            <form
              onSubmit={onSend}
              className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 relative"
            >
              <div className="relative">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2.5 rounded-full transition-colors ${
                    showEmojiPicker
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiOutlineFaceSmile className="w-5 h-5" />
                </button>

                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      lazyLoadEmojis={true}
                      width={320}
                      height={400}
                    />
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
              </button>
            </form>
          </>
        ) : (
          // ======================== EMPTY STATE ========================
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5 text-slate-400 border border-slate-200 shadow-2xs">
              <HiOutlineChatBubbleLeftRight className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Your Messages</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
              Select a conversation from the left, start a new direct message, or create a group to chat with multiple members.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xs hover:bg-slate-800 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
              >
                <HiOutlineUserGroup className="w-4 h-4 text-indigo-400" />
                <span>Create Group</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-white active:scale-98 transition-all cursor-pointer"
              >
                Find People
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newGroup) => {
          fetchGroups();
          selectGroup(newGroup);
        }}
        currentUserId={currentUser?.id}
      />

      {/* Group Info Modal */}
      {activeGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          groupId={activeGroup.id}
          currentUserId={currentUser?.id}
          onGroupUpdated={(updated) => {
            setActiveGroup((prev) => (prev ? { ...prev, ...updated } : null));
            fetchGroups();
          }}
          onLeaveGroup={() => {
            setActiveGroup(null);
            fetchGroups();
            navigate('/messages');
          }}
        />
      )}

      {/* Delete Confirmation Modal (Direct or Group) */}
      {(deletingMessage || deletingGroupMsg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Message</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Are you sure you want to delete this message?
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {/* Delete for everyone option: available if direct sender within 24h OR if group admin/sender */}
              {(deletingMessage?.senderId === currentUser?.id ||
                deletingGroupMsg?.senderId === currentUser?.id ||
                activeGroup?.currentUserRole === 'admin') && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteMessage('for_everyone')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Delete for everyone
                </button>
              )}

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteMessage('for_me')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete for me
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeletingMessage(null);
                  setDeletingGroupMsg(null);
                }}
                className="w-full py-2 px-4 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Forward Message</h3>
              <button
                type="button"
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardingTargetIds([]);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative flex items-center">
                <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Search contacts to forward to..."
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 max-h-60">
              {conversations
                .filter(
                  (c) =>
                    c.user.fullName?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                    c.user.username?.toLowerCase().includes(forwardSearch.toLowerCase())
                )
                .map((c) => {
                  const isSelected = forwardingTargetIds.includes(c.user.id);
                  return (
                    <button
                      key={c.user.id}
                      type="button"
                      onClick={() => {
                        setForwardingTargetIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== c.user.id)
                            : [...prev, c.user.id]
                        );
                      }}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar user={c.user} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {c.user.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">@{c.user.username}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <HiOutlineCheck className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardingTargetIds([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={forwardingTargetIds.length === 0 || forwardSuccess}
                onClick={handleExecuteForward}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {forwardSuccess ? (
                  <>
                    <HiOutlineCheck className="w-4 h-4 stroke-[3]" /> Forwarded!
                  </>
                ) : (
                  <>
                    <HiOutlineArrowUturnRight className="w-4 h-4" /> Forward (
                    {forwardingTargetIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
