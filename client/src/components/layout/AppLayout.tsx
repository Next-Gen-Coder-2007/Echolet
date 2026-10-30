import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomBar from './BottomBar';
import authService, { type User } from '../../services/authService';
import messageService from '../../services/messageService';
import notificationService from '../../services/notificationService';
import getSocket, { joinUserRoom } from '../../services/socket';
import { CallProvider } from '../../context/CallContext';
import VoiceCallModal from '../chat/VoiceCallModal';

interface AppLayoutProps {
  children?: React.ReactNode;
  initialUser?: User | null;
}

export default function AppLayout({ children, initialUser }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialUser === undefined);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const isReels = location.pathname.startsWith('/reels');

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadMessagesCount(count);
    } catch {
      // silently fail if network or unauthorized
    }
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadNotificationsCount(count);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (initialUser !== undefined) return;

    let isMounted = true;
    authService
      .getMe()
      .then((userData) => {
        if (isMounted) {
          setUser(userData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  // Load unread counts and listen for socket message and notification events
  useEffect(() => {
    if (!user?.id) return;

    joinUserRoom(user.id);
    fetchUnreadCount();
    fetchNotificationCount();

    const socket = getSocket();

    const handleUnreadCount = ({ count }: { count: number }) => {
      setUnreadMessagesCount(count);
    };

    const handleNotificationCount = ({ count }: { count: number }) => {
      setUnreadNotificationsCount(count);
    };

    const handleNewMessage = (msg: { receiverId: string }) => {
      if (msg.receiverId === user.id) {
        fetchUnreadCount();
      }
    };

    const handleNewNotification = () => {
      fetchNotificationCount();
    };

    const handleMessagesRead = ({ readerId }: { readerId?: string } = {}) => {
      if (!readerId || readerId === user.id) {
        fetchUnreadCount();
      }
    };

    socket.on('unread_count', handleUnreadCount);
    socket.on('notification_count', handleNotificationCount);
    socket.on('new_message', handleNewMessage);
    socket.on('new_notification', handleNewNotification);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('unread_count', handleUnreadCount);
      socket.off('notification_count', handleNotificationCount);
      socket.off('new_message', handleNewMessage);
      socket.off('new_notification', handleNewNotification);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [user?.id, fetchUnreadCount, fetchNotificationCount]);

  // Whenever the user navigates, refresh unread counts
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      fetchNotificationCount();
    }
  }, [location.pathname, user?.id, fetchUnreadCount]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Strictly require authentication for AppLayout
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <CallProvider currentUser={user}>
      <div className="min-h-screen bg-[#f8fafc] relative flex flex-col">
        <div className="flex-1 flex relative">
          {/* Desktop Left Sidebar (hidden on mobile) */}
          <Sidebar
            avatarUrl={user?.avatarUrl}
            userInitials={userInitials}
            username={user?.username}
            unreadMessagesCount={unreadMessagesCount}
            unreadNotificationsCount={unreadNotificationsCount}
            onLogout={handleLogout}
          />

          <main
            className={`flex-1 ml-0 md:ml-24 lg:ml-28 ${
              isReels
                ? 'p-0 pb-0'
                : 'px-2.5 sm:px-4 md:px-6 lg:px-8 py-3 md:py-6 pb-24 md:pb-6'
            } min-h-screen flex flex-col min-w-0`}
          >
            <div className="w-full flex-1 flex flex-col min-w-0">
              {children || (
                <Outlet
                  context={{
                    user,
                    onUserUpdated: (updatedUser: User) => setUser(updatedUser),
                    refreshUnreadCount: fetchUnreadCount,
                    refreshNotificationCount: fetchNotificationCount,
                  }}
                />
              )}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (hidden on desktop and hidden on reels) */}
        {!isReels && (
          <BottomBar
            avatarUrl={user?.avatarUrl}
            username={user?.username}
            userInitials={userInitials}
            unreadMessagesCount={unreadMessagesCount}
            unreadNotificationsCount={unreadNotificationsCount}
          />
        )}

        {/* Global WebRTC Voice Call Modal / Floating Minimized Widget */}
        <VoiceCallModal />
      </div>
    </CallProvider>
  );
}
