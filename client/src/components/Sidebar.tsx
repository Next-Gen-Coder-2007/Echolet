import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineBell,
  HiOutlineHeart,
  HiOutlineBookmark,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
  HiOutlineFilm,
} from 'react-icons/hi2';

export type SidebarTab =
  | 'home'
  | 'search'
  | 'reels'
  | 'messages'
  | 'notifications'
  | 'heart'
  | 'saved'
  | 'settings';

interface SidebarProps {
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  avatarUrl?: string;
  userInitials?: string;
  username?: string;
  onLogout?: () => void;
  onSettingsClick?: () => void;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  avatarUrl,
  userInitials = 'U',
  username,
  onLogout,
  onSettingsClick,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    opacity: number;
  }>({
    top: 0,
    opacity: 0,
  });

  const getTabFromPath = (path: string): SidebarTab => {
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/reels')) return 'reels';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.startsWith('/favorites')) return 'heart';
    if (path.startsWith('/saved')) return 'saved';
    if (path.startsWith('/settings')) return 'settings';
    return 'home';
  };

  const selectedTab = activeTab || getTabFromPath(location.pathname);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = buttonRefs.current[selectedTab];
      if (activeEl) {
        setIndicatorStyle({
          top: activeEl.offsetTop,
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    const raf = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [selectedTab]);

  const handleSelect = (tab: SidebarTab) => {
    if (tab === 'settings') {
      if (onSettingsClick) {
        onSettingsClick();
      } else {
        navigate('/settings');
      }
      return;
    }

    onTabChange?.(tab);

    const pathMap: Record<string, string> = {
      home: '/',
      search: '/search',
      reels: '/reels',
      messages: '/messages',
      notifications: '/notifications',
      heart: '/favorites',
      saved: '/saved',
      settings: '/settings',
    };

    if (pathMap[tab] && location.pathname !== pathMap[tab]) {
      navigate(pathMap[tab]);
    }
  };

  const navItems: { id: SidebarTab; label: string; icon: any }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: HiOutlineHome,
    },
    {
      id: 'search',
      label: 'Search',
      icon: HiOutlineMagnifyingGlass,
    },
    {
      id: 'reels',
      label: 'Reels',
      icon: HiOutlineFilm,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: HiOutlineChatBubbleOvalLeftEllipsis,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: HiOutlineBell,
    },
    {
      id: 'heart',
      label: 'Favorites',
      icon: HiOutlineHeart,
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: HiOutlineBookmark,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: HiOutlineCog6Tooth,
    },
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="fixed left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-16 sm:w-18 h-[640px] max-h-[94vh] bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col items-center justify-between py-6 px-2 select-none"
    >
      {/* Top Nav Items with Dynamic Sliding Indicator */}
      <div className="relative flex flex-col items-center gap-2 sm:gap-2.5 w-full">
        {/* Animated Sliding Pill Indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shadow-md shadow-purple-500/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] pointer-events-none z-0"
          style={{
            top: `${indicatorStyle.top}px`,
            opacity: indicatorStyle.opacity,
          }}
        />

        {navItems.map((item) => {
          const isActive = selectedTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              ref={(el) => {
                buttonRefs.current[item.id] = el;
              }}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-slate-500 hover:text-[#7928ca] hover:bg-purple-50/80 hover:scale-110'
              }`}
            >
              <Icon
                className={`w-5 h-5 sm:w-[22px] sm:h-[22px] ${
                  isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'
                }`}
              />
              {item.id === 'messages' && unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none select-none z-20">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
              {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none select-none z-20">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile & Logout */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
        <button
          type="button"
          onClick={() => navigate(username ? `/profile/${username}` : '/profile')}
          title="Account"
          aria-label="Account"
          className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 shadow-2xs p-[1.5px] border border-slate-200 bg-white"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                {userInitials}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Log Out"
          title="Log Out"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer transition-all duration-200"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5 sm:w-[22px] sm:h-[22px] stroke-[1.6]" />
        </button>
      </div>
    </aside>
  );
}
