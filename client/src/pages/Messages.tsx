import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import messageService, {
  type MessageItem,
  type ConversationItem,
} from '../services/messageService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';
import getSocket, { joinUserRoom } from '../services/socket';

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

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfileResponse | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  // Presence & Typing state
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Message Actions state (edit, reply, forward, delete)
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageItem | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetIds, setForwardingTargetIds] = useState<string[]>([]);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  // Delete message confirmation state
  const [deletingMessage, setDeletingMessage] = useState<MessageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      // Preload presence from conversation responses
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

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const data = await messageService.getMessages(userId);
      setMessages(data);
      refreshUnreadCount?.();
    } catch {}
  }, [refreshUnreadCount]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle active user change
  useEffect(() => {
    if (!targetUserParam) {
      setActiveUser(null);
      setMessages([]);
      return;
    }

    const clean = targetUserParam.toLowerCase();
    const existing = conversations.find(
      (c) =>
        c.user.username.toLowerCase() === clean ||
        c.user.id.toLowerCase() === clean
    );

    if (existing) {
      setActiveUser(existing.user);
    } else {
      userService
        .getUserByUsername(targetUserParam)
        .then((u) => {
          if (u) {
            setActiveUser(u);
            if (u.lastSeen) {
              setLastSeenMap((prev) => ({ ...prev, [u.id]: u.lastSeen! }));
            }
          }
        })
        .catch(() => {});
    }
  }, [targetUserParam, conversations]);

  // Fetch messages and mark as read when activeUser is selected
  useEffect(() => {
    if (!activeUser || !currentUser?.id) return;

    // Instantly remove red circle badge from this conversation card
    setConversations((prev) =>
      prev.map((c) => (c.user.id === activeUser.id ? { ...c, unreadCount: 0 } : c))
    );

    // Real-time socket notification to mark read
    const socket = getSocket();
    socket.emit('mark_as_read', { readerId: currentUser.id, partnerId: activeUser.id });

    // Fetch messages & persist read state
    fetchMessages(activeUser.id);
    messageService
      .markMessagesAsRead(activeUser.id)
      .then(() => refreshUnreadCount?.())
      .catch(() => {});
  }, [activeUser, currentUser?.id, fetchMessages, refreshUnreadCount]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: MessageItem) => {
      if (
        activeUser &&
        (msg.senderId === activeUser.id || msg.receiverId === activeUser.id)
      ) {
        // Real-time message bubble sync: append immediately to messages without reloading
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If active user sent it to us, we are looking at the chat right now: mark read instantly
        if (msg.senderId === activeUser.id && currentUser?.id) {
          socket.emit('mark_as_read', { readerId: currentUser.id, partnerId: activeUser.id });
          messageService
            .markMessagesAsRead(activeUser.id)
            .then(() => refreshUnreadCount?.())
            .catch(() => {});

          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === activeUser.id
                ? { ...c, unreadCount: 0, lastMessage: msg }
                : c
            )
          );
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === activeUser.id
                ? { ...c, lastMessage: msg }
                : c
            )
          );
        }
      } else {
        // Message from another conversation: update lastMessage and increment red circle unread badge in real time!
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === msg.senderId
              ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg }
              : c
          )
        );
      }
      fetchConversations();
    };

    const handleMessagesRead = ({
      readerId,
      partnerId,
    }: {
      readerId: string;
      partnerId: string;
      messageIds?: string[];
    }) => {
      // 1. If active partner viewed our messages: turn ticks to double blue in real time!
      if (activeUser && readerId === activeUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUser?.id ? { ...m, isRead: true, status: 'read' } : m
          )
        );
      }

      // 2. If we read messages: clear the red badge on that conversation card in real time!
      if (readerId === currentUser?.id) {
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
      if (activeUser && receiverId === activeUser.id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === currentUser?.id && messageIds.includes(m.id) && m.status === 'sent') {
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
      fetchConversations();
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
      fetchConversations();
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

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status', handleUserStatus);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

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
    };
  }, [activeUser, currentUser?.id, fetchConversations, refreshUnreadCount]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const selectUser = (u: UserProfileResponse) => {
    setShowEmojiPicker(false);
    setActiveUser(u);
    // Instantly remove red circle badge from this conversation card in real time
    setConversations((prev) =>
      prev.map((c) => (c.user.id === u.id ? { ...c, unreadCount: 0 } : c))
    );
    if (currentUser?.id) {
      getSocket().emit('mark_as_read', { readerId: currentUser.id, partnerId: u.id });
    }
    navigate(`/messages/${u.username}`);
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
    if (!activeUser || !currentUser) return;

    const socket = getSocket();
    socket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
    }, 2200);
  };

  const cancelTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (activeUser && currentUser) {
      getSocket().emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
    }
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeUser || sending) return;

    cancelTyping();
    setShowEmojiPicker(false);
    setSending(true);

    try {
      if (editingMessage) {
        // Edit existing message
        const updated = await messageService.editMessage(editingMessage.id, content);
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        );
        setEditingMessage(null);
        setText('');
      } else {
        // Send new message or reply
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

        setMessages((prev) => [...prev, sent]);
        setReplyingTo(null);
        fetchConversations();
      }
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (m: MessageItem) => {
    setEditingMessage(m);
    setReplyingTo(null);
    setText(m.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const handleStartReply = (m: MessageItem) => {
    setReplyingTo(m);
    setEditingMessage(null);
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

  // Check if message is eligible for "Delete for everyone" (sender + within 24 hours)
  const canDeleteForEveryone = (m: MessageItem) => {
    if (m.senderId !== currentUser?.id) return false;
    if (m.isDeletedForEveryone) return false;
    const elapsedMs = Date.now() - new Date(m.createdAt).getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return elapsedMs <= TWENTY_FOUR_HOURS_MS;
  };

  const handleDeleteMessage = async (mode: 'for_me' | 'for_everyone') => {
    if (!deletingMessage || isDeleting) return;
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

  // Format last seen
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

  const filtered = conversations.filter(
    (c) =>
      c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username?.toLowerCase().includes(search.toLowerCase())
  );

  const renderMessageContent = (m: MessageItem, isMe: boolean) => {
    if (m.isDeletedForEveryone) {
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
    const parts = m.content.split(urlRegex);
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

  return (
    <div className="w-full h-[calc(100vh-2.5rem)] sm:h-[calc(100vh-3.5rem)] min-h-[580px] flex gap-4 select-none relative">
      {/* Left Pane: Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 h-full ${
          activeUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Messages</h1>
            <button
              onClick={() => navigate('/search')}
              className="text-xs sm:text-sm font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              + Search
            </button>
          </div>

          <div className="relative flex items-center">
            <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter conversations..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
            />
          </div>
        </div>

        <div
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 overscroll-contain"
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No conversations found. Start a new chat from Search.
            </div>
          ) : (
            filtered.map((c) => {
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
                      <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
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
                      <p className="text-xs sm:text-sm text-slate-500 truncate pr-2">
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
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat / Empty State */}
      <div
        className={`flex-1 min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full ${
          !activeUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeUser ? (
          <>
            {/* Active Chat Header */}
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

            {/* Chat Messages Feed */}
            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
            >
              {messages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <span>Send a message to start the conversation</span>
                </div>
              ) : (
                <>
                  {messages.map((m) => {
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
                        {/* Received message avatar */}
                        {!isMe && (
                          <div className="shrink-0 mb-1">
                            <UserAvatar user={activeUser} size="sm" />
                          </div>
                        )}

                        {/* Hover action toolbar for sender messages */}
                        {isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            {/* Reply button */}
                            <button
                              type="button"
                              onClick={() => handleStartReply(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            {/* Forward button */}
                            <button
                              type="button"
                              onClick={() => setForwardingMessage(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Forward"
                            >
                              <HiOutlineArrowUturnRight className="w-4 h-4" />
                            </button>

                            {/* Edit button (within 10 mins) */}
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

                            {/* Delete button */}
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

                        {/* Message Bubble Container */}
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
                            {/* Forwarded Header Indicator */}
                            {m.isForwarded && !m.isDeletedForEveryone && (
                              <div
                                className={`flex items-center gap-1 text-[11px] italic font-medium pb-0.5 ${
                                  isMe ? 'text-slate-400' : 'text-slate-400'
                                }`}
                              >
                                <HiOutlineArrowUturnRight className="w-3 h-3 rotate-[-15deg]" />
                                <span>Forwarded</span>
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

                            {/* Message Content & Timestamp / Ticks */}
                            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                              <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                                {renderMessageContent(m, isMe)}
                              </span>

                              <div className="flex items-center gap-1 ml-auto shrink-0 select-none pb-0.5 leading-none">
                                {m.isEdited && !m.isDeletedForEveryone && (
                                  <span
                                    className={`text-[10px] italic ${
                                      isMe ? 'text-slate-400' : 'text-slate-400'
                                    }`}
                                  >
                                    edited
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] ${
                                    isMe ? 'text-slate-400' : 'text-slate-400'
                                  }`}
                                >
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

                        {/* Hover action toolbar for partner messages */}
                        {!isMe && !m.isDeletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                            {/* Reply button */}
                            <button
                              type="button"
                              onClick={() => handleStartReply(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <HiOutlineArrowUturnLeft className="w-4 h-4" />
                            </button>

                            {/* Forward button */}
                            <button
                              type="button"
                              onClick={() => setForwardingMessage(m)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Forward"
                            >
                              <HiOutlineArrowUturnRight className="w-4 h-4" />
                            </button>

                            {/* Delete button (Delete for me) */}
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
                      </div>
                    );
                  })}

                  {/* Partner Typing Indicator Bubble */}
                  {isPartnerTyping && (
                    <div className="flex items-center gap-2 pt-1 animate-fade-in">
                      <UserAvatar user={activeUser} size="sm" />
                      <div className="px-3.5 py-2 rounded-2xl rounded-bl-xs bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Editing / Reply Preview Bar */}
            {editingMessage && (
              <div className="mx-4 mt-2 p-2.5 px-3 bg-purple-50/80 border-l-4 border-purple-600 rounded-r-xl flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-purple-700 flex items-center gap-1">
                    <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                    <span>Editing message</span>
                  </div>
                  <p className="text-xs text-purple-900/80 truncate mt-0.5">
                    {editingMessage.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 text-purple-600 hover:text-purple-900 rounded-lg hover:bg-purple-100/60 transition-colors cursor-pointer"
                  title="Cancel editing"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {replyingTo && !editingMessage && (
              <div className="mx-4 mt-2 p-2.5 px-3 bg-slate-50 border-l-4 border-purple-500 rounded-r-xl flex items-center justify-between shadow-2xs">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-purple-600 flex items-center gap-1">
                    <HiOutlineArrowUturnLeft className="w-3.5 h-3.5" />
                    <span>
                      Replying to{' '}
                      {replyingTo.senderId === currentUser?.id
                        ? 'yourself'
                        : activeUser.fullName || activeUser.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{replyingTo.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Cancel reply"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Form with Emoji Picker */}
            <form onSubmit={onSend} className="p-4 border-t border-slate-100 bg-white shrink-0 relative">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-20 left-4 z-40 shadow-2xl rounded-3xl overflow-hidden border border-slate-200 bg-white"
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    theme={Theme.LIGHT}
                    lazyLoadEmojis={true}
                    searchPlaceHolder="Search emojis..."
                    width={340}
                    height={400}
                    previewConfig={{
                      showPreview: false,
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-slate-400 focus-within:bg-white transition-all">
                {/* Emoji Trigger Button */}
                <button
                  type="button"
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                    showEmojiPicker
                      ? 'text-purple-600 bg-purple-100/70'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  title="Choose emoji"
                >
                  <HiOutlineFaceSmile className="w-5 h-5 stroke-[1.8]" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={
                    editingMessage ? 'Edit your message...' : 'Write a message...'
                  }
                  className="flex-1 bg-transparent py-1 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                >
                  {editingMessage ? (
                    <HiOutlineCheck className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <HiOutlinePaperAirplane className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4 shadow-2xs">
              <HiOutlineChatBubbleLeftRight className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">Your Messages</h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Select a conversation from the left to start chatting, or find someone new to message.
            </p>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Find People
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp-Style Delete Message Confirmation Dialog */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 flex flex-col items-center text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <HiOutlineTrash className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Delete message?</h3>
            <p className="text-xs text-slate-500 mb-4 px-2 line-clamp-2 italic">
              "{deletingMessage.content}"
            </p>

            <div className="w-full flex flex-col gap-2">
              {canDeleteForEveryone(deletingMessage) && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteMessage('for_everyone')}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Delete for everyone
                </button>
              )}

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteMessage('for_me')}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  canDeleteForEveryone(deletingMessage)
                    ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                } disabled:opacity-50`}
              >
                Delete for me
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMessage(null)}
                className="w-full py-2 px-4 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <HiOutlineArrowUturnRight className="w-4 h-4 text-purple-600" />
                Forward Message
              </h3>
              <button
                type="button"
                onClick={() => {
                  setForwardingMessage(null);
                  setForwardingTargetIds([]);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 italic line-clamp-2">
              "{forwardingMessage.content}"
            </div>

            {/* Filter Search */}
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

            {/* Contacts list */}
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

            {/* Footer */}
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
