import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineUserPlus,
  HiOutlineCheck,
  HiOutlineBell,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import notificationService, { type NotificationItem } from '../services/notificationService';
import userService from '../services/userService';
import getSocket from '../services/socket';
import { useMessage } from '../context/MessageContext';

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < 60) return 'just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  return `${Math.floor(diffInDays / 30)}mo`;
};

export default function Notifications() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'requests'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();

    const handleNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
    };

    const handleFollowRequestUpdated = (data: { requesterId: string; targetId: string; status: string }) => {
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.actor?.id === data.requesterId && n.type === 'follow_request') {
            return {
              ...n,
              isRequestPending: data.status === 'pending',
              requestStatus: data.status as any,
              isRead: data.status !== 'pending' ? true : n.isRead,
            };
          }
          return n;
        })
      );
    };

    const handleFollowUpdated = (data: { followerId: string; followingId: string; isFollowing: boolean }) => {
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.actor?.id === data.followingId) {
            return {
              ...n,
              isActorFollowed: data.isFollowing,
            };
          }
          return n;
        })
      );
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('follow_request_updated', handleFollowRequestUpdated);
    socket.on('follow_updated', handleFollowUpdated);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('follow_request_updated', handleFollowRequestUpdated);
      socket.off('follow_updated', handleFollowUpdated);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showSuccess('All notifications marked as read', 'Completed');
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      notificationService.markAsRead(item.id).catch(console.error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    if (item.type === 'like' || item.type === 'comment') {
      if (item.entityType === 'reel' && item.entityId) {
        navigate(`/reels/${item.entityId}`);
      } else if (item.entityId) {
        navigate(`/post/${item.entityId}`);
      }
    } else if (item.actor?.username) {
      navigate(`/profile/${item.actor.username}`);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleFollowBack = async (e: React.MouseEvent, actorId: string, actorUsername: string) => {
    e.stopPropagation();
    setActionInProgressId(actorId);
    try {
      const res = await userService.followUser(actorId);
      setNotifications((prev) =>
        prev.map((n) => (n.actor?.id === actorId ? { ...n, isActorFollowed: res.isFollowing } : n))
      );
      showSuccess(
        res.isRequested ? `Follow request sent to @${actorUsername}` : `Now following @${actorUsername}`,
        'Follow Updated'
      );
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to follow user', 'Action Failed');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleAcceptRequest = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    const requestId = item.followRequestId;
    if (!requestId) return;

    setActionInProgressId(item.id);
    try {
      const res = await userService.acceptFollowRequest(requestId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? {
                ...n,
                isRequestPending: false,
                isActorFollowed: res.isFollowingRequester,
                requestStatus: 'accepted',
                isRead: true,
              }
            : n
        )
      );
      showSuccess(`Approved follow request from @${item.actor.username}`, 'Request Accepted');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to accept follow request', 'Error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeclineRequest = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    const requestId = item.followRequestId;
    if (!requestId) return;

    setActionInProgressId(item.id);
    try {
      await userService.declineFollowRequest(requestId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? {
                ...n,
                isRequestPending: false,
                requestStatus: 'declined',
                isRead: true,
              }
            : n
        )
      );
      showSuccess(`Declined follow request from @${item.actor.username}`, 'Request Declined');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to decline follow request', 'Error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pendingRequestsCount = notifications.filter(
    (n) => n.type === 'follow_request' && n.isRequestPending
  ).length;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'requests') return n.type === 'follow_request';
    return true;
  });

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <HiOutlineHeart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <HiOutlineChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5 text-purple-600 fill-purple-50" />;
      case 'follow':
        return <HiOutlineUserPlus className="w-3.5 h-3.5 text-sky-500" />;
      case 'follow_request':
        return <HiOutlineClock className="w-3.5 h-3.5 text-amber-500 stroke-[2.2]" />;
      case 'follow_accept':
        return <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />;
    }
  };

  return (
    <div className="w-full flex-1 select-none animate-fade-in">
      {/* Header Container */}
      <div className="sticky top-4 sm:top-6 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden mb-6 transition-all">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HiOutlineBell className="w-5 h-5 text-slate-700" />
              <span>Notifications</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Stay updated with your community and requests</p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <HiOutlineCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span>Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification list */}
        <div
          data-lenis-prevent
          className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto"
        >
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-7 h-7 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <HiOutlineBell className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.2]" />
              <p className="text-sm font-bold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'unread'
                  ? 'You have no unread notifications.'
                  : activeTab === 'requests'
                  ? 'No pending follow requests at the moment.'
                  : 'No notifications to display right now.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const actorInitials = item.actor?.fullName
                ? item.actor.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U';

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                    !item.isRead ? 'bg-purple-50/30 hover:bg-purple-50/50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Avatar with type badge */}
                  <div className="relative shrink-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.actor?.username) navigate(`/profile/${item.actor.username}`);
                      }}
                      className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shadow-xs cursor-pointer hover:scale-105 transition-transform"
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {item.actor?.avatarUrl ? (
                          <img
                            src={item.actor.avatarUrl}
                            alt={item.actor.fullName || item.actor.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-800">{actorInitials}</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center">
                      {renderIcon(item.type)}
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-xs sm:text-sm text-slate-700 leading-snug">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.actor?.username) navigate(`/profile/${item.actor.username}`);
                        }}
                        className="font-bold text-slate-900 mr-1.5 hover:underline cursor-pointer"
                      >
                        {item.actor?.fullName || item.actor?.username}
                      </span>
                      <span>
                        {item.type === 'like' && 'liked your echo'}
                        {item.type === 'comment' && 'commented on your echo'}
                        {item.type === 'follow' && 'started following you'}
                        {item.type === 'follow_request' && 'requested to follow you'}
                        {item.type === 'follow_accept' && 'accepted your follow request'}
                      </span>
                    </div>

                    {item.message && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-100/80 inline-block max-w-full">
                        &ldquo;{item.message}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatTimeAgo(item.createdAt)}
                      </span>

                      {/* Follow Request Action Buttons (Accept / Decline) or Status Badge */}
                      {item.type === 'follow_request' && (
                        item.isRequestPending ? (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={(e) => handleAcceptRequest(e, item)}
                              disabled={actionInProgressId === item.id}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeclineRequest(e, item)}
                              disabled={actionInProgressId === item.id}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {item.requestStatus === 'accepted' && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Accepted
                              </span>
                            )}
                            {item.requestStatus === 'declined' && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                                Declined
                              </span>
                            )}
                            {item.requestStatus === 'cancelled' && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500">
                                Cancelled
                              </span>
                            )}
                          </div>
                        )
                      )}

                      {/* Follow Back Button Option */}
                      {(item.type === 'follow' || item.type === 'follow_accept' || (item.type === 'follow_request' && item.requestStatus === 'accepted')) && (
                        <div>
                          {!item.isActorFollowed ? (
                            <button
                              type="button"
                              onClick={(e) => handleFollowBack(e, item.actor.id, item.actor.username)}
                              disabled={actionInProgressId === item.actor?.id}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 active:scale-95"
                            >
                              <HiOutlineUserPlus className="w-3.5 h-3.5" />
                              <span>Follow Back</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-600">
                              <HiOutlineCheck className="w-3 h-3 stroke-[2.5]" />
                              <span>Following</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Unread Indicator */}
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {!item.isRead && (
                      <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(e, item.id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
