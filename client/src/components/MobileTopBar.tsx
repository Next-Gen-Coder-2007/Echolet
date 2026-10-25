import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineBell,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineHeart,
  HiOutlineBookmark,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
} from 'react-icons/hi2';
import Logo from './Logo';
import Avatar from './Avatar';
import type { User } from '../services/authService';

interface MobileTopBarProps {
  user?: User | null;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
}

export default function MobileTopBar({
  user,
  unreadNotificationsCount = 0,
  onLogout,
}: MobileTopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // When inside any active chat conversation (direct, group, or global), hide the generic top bar
  // so the chat's own header (recipient info, call buttons, back button) takes full prominence.
  const isInActiveChat =
    (location.pathname.startsWith('/messages/') && location.pathname !== '/messages') ||
    (location.pathname === '/messages' &&
      Boolean(
        location.search.includes('group=') ||
        location.search.includes('groupId=') ||
        location.search.includes('user=') ||
        location.search.includes('username=') ||
        location.search.includes('userId=') ||
        location.search.includes('room=') ||
        location.search.includes('type=global')
      ));

  if (isInActiveChat) {
    return null;
  }

  const handleNav = (to: string) => {
    setIsDrawerOpen(false);
    navigate(to);
  };

  const menuItems = [
    {
      label: 'My Profile',
      to: user?.username ? `/profile/${user.username}` : '/profile',
      icon: HiOutlineUser,
      color: 'text-purple-600',
    },
    {
      label: 'Favorites',
      to: '/favorites',
      icon: HiOutlineHeart,
      color: 'text-rose-500',
    },
    {
      label: 'Saved Echoes',
      to: '/saved',
      icon: HiOutlineBookmark,
      color: 'text-amber-500',
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: HiOutlineCog6Tooth,
      color: 'text-slate-600',
    },
  ];

  return (
    <>
      <header
        aria-label="Mobile Header"
        className="sticky top-0 z-40 md:hidden bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between shadow-2xs select-none"
      >
        {/* Left: Brand Logo */}
        <div className="flex items-center">
          <Logo size="sm" />
        </div>

        {/* Right: Quick actions (Notifications & More Menu) */}
        <div className="flex items-center gap-1.5">
          {/* Notifications button */}
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors active:scale-95 cursor-pointer"
          >
            <HiOutlineBell className="w-5 h-5 stroke-[2]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 bg-purple-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* More Menu drawer trigger */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Menu"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors active:scale-95 cursor-pointer"
          >
            <HiOutlineBars3 className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Slide-over Mobile Drawer / Navigation Sheet */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 w-[82vw] max-w-xs bg-white shadow-2xl flex flex-col justify-between p-5 border-l border-slate-200 animate-in slide-in-from-right duration-250 select-none">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close Menu"
                >
                  <HiOutlineXMark className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* User quick identity badge */}
              {user && (
                <div
                  onClick={() => handleNav(user.username ? `/profile/${user.username}` : '/profile')}
                  className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-slate-50 to-pink-50 border border-purple-100 flex items-center gap-3 cursor-pointer hover:border-purple-200 transition-all active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      <Avatar
                        src={user.avatarUrl}
                        name={user.fullName || user.username}
                        size="w-full h-full"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.fullName || user.username}
                    </p>
                    <p className="text-[11px] text-purple-600 font-semibold truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation links */}
              <div className="mt-5 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNav(item.to)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${item.color} stroke-[2]`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout button & Echolet info */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onLogout?.();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4 stroke-[2]" />
                <span>Log Out</span>
              </button>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                Echolet · Social Experience
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
