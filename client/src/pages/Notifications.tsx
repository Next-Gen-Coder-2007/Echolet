import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineUserPlus,
  HiOutlineCheck,
  HiOutlineBell,
} from 'react-icons/hi2';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow';
  actorName: string;
  actorUsername: string;
  actorInitial: string;
  targetText?: string;
  timeAgo: string;
  read: boolean;
  link: string;
}

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'like',
    actorName: 'Alex Rivera',
    actorUsername: 'alexrivera',
    actorInitial: 'A',
    targetText: 'Building responsive layouts with Tailwind CSS and Vite...',
    timeAgo: '10m',
    read: false,
    link: '/#feed',
  },
  {
    id: '2',
    type: 'comment',
    actorName: 'Sarah Chen',
    actorUsername: 'sarahc',
    actorInitial: 'S',
    targetText: 'Love this new design aesthetic! Super clean and fast.',
    timeAgo: '1h',
    read: false,
    link: '/#feed',
  },
  {
    id: '3',
    type: 'follow',
    actorName: 'Jordan Taylor',
    actorUsername: 'jordant',
    actorInitial: 'J',
    timeAgo: '3h',
    read: true,
    link: '/profile/jordant',
  },
  {
    id: '4',
    type: 'like',
    actorName: 'Elena Rostova',
    actorUsername: 'elenar',
    actorInitial: 'E',
    targetText: 'What features are you most excited for in Echolet 2.0?',
    timeAgo: '1d',
    read: true,
    link: '/#feed',
  },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(SAMPLE_NOTIFICATIONS);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (id: string, link: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    navigate(link);
  };

  const filtered = notifications.filter((n) => (activeTab === 'unread' ? !n.read : true));

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <HiOutlineHeart className="w-4 h-4 text-rose-500" />;
      case 'comment':
        return <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4 text-purple-600" />;
      case 'follow':
        return <HiOutlineUserPlus className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="w-full flex-1 select-none">
      {/* Header Container */}
      <div className="sticky top-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden mb-5 transition-all">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HiOutlineBell className="w-5 h-5 text-slate-700" />
              <span>Notifications</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Stay updated with your community</p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <HiOutlineCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'unread'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        {/* Notification list */}
        <div
          data-lenis-prevent
          className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <HiOutlineBell className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400 mt-0.5">You have no unread notifications.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => markOneRead(item.id, item.link)}
                className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  !item.read ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Avatar with type badge */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                    {item.actorInitial}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-2xs border border-slate-100 flex items-center justify-center">
                    {renderIcon(item.type)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-slate-700 leading-snug">
                    <span className="font-bold text-slate-900 mr-1.5">{item.actorName}</span>
                    <span>
                      {item.type === 'like' && 'liked your echo'}
                      {item.type === 'comment' && 'commented on your echo'}
                      {item.type === 'follow' && 'started following you'}
                    </span>
                  </div>

                  {item.targetText && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                      "{item.targetText}"
                    </p>
                  )}

                  <span className="text-[10px] text-slate-400 font-medium block mt-1">
                    {item.timeAgo} ago
                  </span>
                </div>

                {!item.read && (
                  <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
