import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2';
import messageService, { type MessageItem, type ConversationItem } from '../services/messageService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';
import getSocket, { joinUserRoom } from '../services/socket';

export default function Messages() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const targetUserParam =
    paramUsername || searchParams.get('user') || searchParams.get('username') || searchParams.get('userId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfileResponse | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      joinUserRoom(currentUser.id);
    }
  }, [currentUser?.id]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const data = await messageService.getMessages(userId);
      setMessages(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
          }
        })
        .catch(() => {});
    }
  }, [targetUserParam, conversations]);

  useEffect(() => {
    if (!activeUser) return;
    fetchMessages(activeUser.id);
  }, [activeUser, fetchMessages]);

  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: MessageItem) => {
      if (
        activeUser &&
        (msg.senderId === activeUser.id || msg.receiverId === activeUser.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchConversations();
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [activeUser, fetchConversations]);

  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const selectUser = (u: UserProfileResponse) => {
    setActiveUser(u);
    navigate(`/messages/${u.username}`);
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeUser || sending) return;
    setText('');
    setSending(true);
    try {
      const sent = await messageService.sendMessage(activeUser.id, content);
      setMessages((prev) => [...prev, sent]);
      fetchConversations();
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username?.toLowerCase().includes(search.toLowerCase())
  );

  const renderMessageContent = (content: string, isMe: boolean) => {
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

  return (
    <div className="w-full h-[calc(100vh-2.5rem)] sm:h-[calc(100vh-3.5rem)] min-h-[580px] flex gap-4 select-none">
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
              return (
                <button
                  key={c.user.id}
                  onClick={() => selectUser(c.user)}
                  className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {c.user.avatarUrl ? (
                    <img
                      src={c.user.avatarUrl}
                      alt={c.user.fullName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {c.user.fullName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {c.user.fullName}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 truncate mt-0.5">
                      {c.lastMessage?.content || `@${c.user.username}`}
                    </p>
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
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
                  {activeUser.avatarUrl ? (
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.fullName}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {activeUser.fullName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                      {activeUser.fullName}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">@{activeUser.username}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/profile/${activeUser.username}`)}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
              >
                Profile
              </button>
            </div>

            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-2 bg-slate-50/20 overscroll-contain"
            >
              {messages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <span>Send a message to start the conversation</span>
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isMe = m.senderId === currentUser?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl text-sm sm:text-base leading-relaxed flex flex-wrap items-end justify-between gap-x-3 gap-y-1 shadow-2xs ${
                            isMe
                              ? 'bg-slate-900 text-white rounded-br-xs'
                              : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                          }`}
                        >
                          <span className="whitespace-pre-wrap break-words">{renderMessageContent(m.content, isMe)}</span>
                          <span
                            className={`text-[10px] ml-auto shrink-0 select-none pb-0.5 leading-none ${
                              isMe ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            <form onSubmit={onSend} className="p-4 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent py-1 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                >
                  <HiOutlinePaperAirplane className="w-4 h-4" />
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
    </div>
  );
}
