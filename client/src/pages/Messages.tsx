import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { HiOutlinePaperAirplane, HiOutlineMagnifyingGlass, HiOutlineArrowLeft } from 'react-icons/hi2';
import messageService, { type MessageItem, type ConversationItem } from '../services/messageService';
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
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

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
    if (!urlUserId) return;
    const existing = conversations.find((c) => c.user.id === urlUserId);
    if (existing) {
      setActiveUser(existing.user);
    } else {
      userService.getUserById(urlUserId).then((u) => u && setActiveUser(u)).catch(() => {});
    }
  }, [urlUserId, conversations]);

  useEffect(() => {
    if (!activeUser) return;
    fetchMessages(activeUser.id);
    const timer = setInterval(() => {
      fetchMessages(activeUser.id);
      fetchConversations();
    }, 3000);
    return () => clearInterval(timer);
  }, [activeUser, fetchMessages, fetchConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectUser = (u: UserProfileResponse) => {
    setActiveUser(u);
    setSearchParams({ userId: u.id });
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

  return (
    <div className="w-full max-w-6xl mx-auto py-2 h-[calc(100vh-2.5rem)] flex gap-4">
      <div
        className={`flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden ${
          !activeUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeUser ? (
          <>
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveUser(null)}
                  className="md:hidden p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <HiOutlineArrowLeft className="w-5 h-5" />
                </button>
                <div
                  onClick={() => navigate(`/profile/${activeUser.username}`)}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {activeUser.fullName?.[0] || 'U'}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      {activeUser.fullName}
                    </h2>
                    <p className="text-[11px] text-slate-400">@{activeUser.username}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/profile/${activeUser.username}`)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
              >
                Profile
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-slate-50/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <span>Send a message to start conversation</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-slate-900 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={onSend} className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                >
                  <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
            <span className="text-sm font-semibold text-slate-700 mb-1">Messages</span>
            <span>Select a conversation from the users list on the right</span>
          </div>
        )}
      </div>

      <div
        className={`w-full md:w-72 lg:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden shrink-0 ${
          activeUser ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3.5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Messages</h1>
            <button
              onClick={() => navigate('/search')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              + Search
            </button>
          </div>

          <div className="relative flex items-center">
            <HiOutlineMagnifyingGlass className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter users..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No users found. Start a new chat from Search.
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = activeUser?.id === c.user.id;
              return (
                <button
                  key={c.user.id}
                  onClick={() => selectUser(c.user)}
                  className={`w-full p-3 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {c.user.fullName?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.user.fullName}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {c.lastMessage?.content || `@${c.user.username}`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
