import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowLeft,
  HiOutlineUser,
} from 'react-icons/hi2';
import messageService, {
  type MessageItem,
  type ConversationItem,
} from '../services/messageService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const urlUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfileResponse | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeUserIdRef.current = activeUser?.id || null;
  }, [activeUser]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const convos = await messageService.getConversations();
      setConversations(convos);
      return convos;
    } catch {
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    let isMounted = true;

    if (!urlUserId) return;

    if (activeUser?.id === urlUserId) return;

    const existing = conversations.find((c) => c.user.id === urlUserId);
    if (existing) {
      setActiveUser(existing.user);
      return;
    }

    userService
      .getUserById(urlUserId)
      .then((user) => {
        if (isMounted && user) {
          setActiveUser(user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [urlUserId, conversations, activeUser?.id]);

  const loadMessages = useCallback(
    async (targetUserId: string, isSilent = false) => {
      if (!isSilent) {
        setLoadingMessages(true);
      }
      try {
        const list = await messageService.getMessages(targetUserId);
        setMessages(list);
        if (!isSilent) {
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch {
      } finally {
        if (!isSilent) {
          setLoadingMessages(false);
        }
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!activeUser) {
      setMessages([]);
      return;
    }

    loadMessages(activeUser.id, false);

    const interval = setInterval(() => {
      if (activeUserIdRef.current === activeUser.id) {
        loadMessages(activeUser.id, true);
        loadConversations();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeUser, loadMessages, loadConversations]);

  const handleSelectConversation = (partner: UserProfileResponse) => {
    setActiveUser(partner);
    setSearchParams({ userId: partner.id });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !activeUser || sending) return;

    setInputText('');
    setSending(true);

    try {
      const newMsg = await messageService.sendMessage(activeUser.id, content);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => scrollToBottom(true), 50);
      loadConversations();
    } catch {
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.user.fullName?.toLowerCase().includes(q) ||
      c.user.username?.toLowerCase().includes(q) ||
      c.lastMessage?.content?.toLowerCase().includes(q)
    );
  });

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatConversationTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24 && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col md:flex-row">
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50 ${
            activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Messages
              </h1>
              <button
                onClick={() => navigate('/search')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
              >
                + New Chat
              </button>
            </div>

            <div className="relative flex items-center">
              <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60">
            {loadingConversations ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
                <span className="text-xs text-slate-400">Loading chats...</span>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((convo) => {
                const isSelected = activeUser?.id === convo.user.id;
                const partnerInitials = convo.user.fullName
                  ? convo.user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'U';

                return (
                  <button
                    key={convo.user.id}
                    onClick={() => handleSelectConversation(convo.user)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/70 border-r-3 border-purple-600'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                          {convo.user.avatarUrl ? (
                            <img
                              src={convo.user.avatarUrl}
                              alt={convo.user.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                              {partnerInitials}
                            </span>
                          )}
                        </div>
                      </div>
                      {convo.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full flex items-center justify-center shadow-xs">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-purple-950' : 'text-slate-900'
                          }`}
                        >
                          {convo.user.fullName}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-1">
                          {formatConversationTime(convo.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {convo.lastMessage?.senderId === currentUser?.id ? (
                          <span className="text-slate-400 mr-1">You:</span>
                        ) : null}
                        {convo.lastMessage?.content || 'Started a conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <HiOutlineChatBubbleLeftRight className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h2 className="text-sm font-bold text-slate-800 mb-1">
                  No conversations yet
                </h2>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  Discover people and send direct messages without needing to follow each other.
                </p>
                <button
                  onClick={() => navigate('/search')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00b4d8] to-[#ff0080] text-white shadow-xs hover:opacity-95 cursor-pointer"
                >
                  Find People
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col bg-white ${
            !activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeUser ? (
            <>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveUser(null);
                      setSearchParams({});
                    }}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                  >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                  </button>

                  <div
                    onClick={() => navigate(`/profile/${activeUser.username}`)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {activeUser.avatarUrl ? (
                          <img
                            src={activeUser.avatarUrl}
                            alt={activeUser.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                            {activeUser.fullName
                              ? activeUser.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : 'U'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                        {activeUser.fullName}
                      </h2>
                      <p className="text-[11px] font-medium text-slate-400">
                        @{activeUser.username}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/profile/${activeUser.username}`)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer transition-all"
                >
                  View Profile
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gradient-to-b from-slate-50/30 to-white">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
                    <span className="text-xs text-slate-400">Loading conversation...</span>
                  </div>
                ) : messages.length > 0 ? (
                  <>
                    {messages.map((msg) => {
                      const isMe = msg.senderId === currentUser?.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                              isMe
                                ? 'bg-gradient-to-r from-[#7928ca] to-[#ff0080] text-white rounded-br-xs'
                                : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <HiOutlineChatBubbleLeftRight className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      Say hello to {activeUser.fullName}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Send a direct message below to start this conversation.
                    </p>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 border-t border-slate-100 bg-white"
              >
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-purple-400 focus-within:ring-3 focus-within:ring-purple-100/60 transition-all">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeUser.fullName}...`}
                    className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#00b4d8] to-[#ff0080] text-white shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                    aria-label="Send message"
                  >
                    <HiOutlinePaperAirplane className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-purple-600 flex items-center justify-center shadow-xs mb-3">
                <HiOutlineChatBubbleLeftRight className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 mb-1">
                Your Direct Messages
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mb-5">
                Select an existing conversation from the list or start a new conversation with anyone on Echolet without having to follow them.
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs transition-all flex items-center gap-2"
              >
                <HiOutlineUser className="w-4 h-4" />
                <span>Find People to Message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
