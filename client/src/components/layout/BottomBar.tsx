import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiHome,
  HiOutlineMagnifyingGlass,
  HiMagnifyingGlass,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiChatBubbleOvalLeftEllipsis,
  HiFilm,
} from 'react-icons/hi2';
import Avatar from '../common/Avatar';

interface BottomBarProps {
  avatarUrl?: string;
  username?: string;
  userInitials?: string;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

export default function BottomBar({
  avatarUrl,
  username,
  userInitials = 'U',
  unreadMessagesCount = 0,
}: BottomBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // On any active message chat or in the reels section, hide bottom bar
  const isReels = pathname.startsWith('/reels');
  const isInActiveChat =
    (pathname.startsWith('/messages/') && pathname !== '/messages') ||
    (pathname === '/messages' &&
      Boolean(
        location.search.includes('group=') ||
        location.search.includes('groupId=') ||
        location.search.includes('user=') ||
        location.search.includes('username=') ||
        location.search.includes('userId=') ||
        location.search.includes('room=') ||
        location.search.includes('type=global')
      ));

  if (isInActiveChat || isReels) {
    return null;
  }

  const isHome = pathname === '/';
  const isSearch = pathname.startsWith('/search');
  const isMessages = pathname === '/messages';
  const isProfile =
    pathname.startsWith('/profile') ||
    (username && pathname.startsWith(`/profile/${username}`));

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      to: '/',
      isActive: isHome,
      iconOutline: HiOutlineHome,
      iconFilled: HiHome,
    },
    {
      id: 'search',
      label: 'Search',
      to: '/search',
      isActive: isSearch,
      iconOutline: HiOutlineMagnifyingGlass,
      iconFilled: HiMagnifyingGlass,
    },
    {
      id: 'reels',
      label: 'Reels',
      to: '/reels',
      isActive: isReels,
    },
    {
      id: 'messages',
      label: 'Messages',
      to: '/messages',
      isActive: isMessages,
      iconOutline: HiOutlineChatBubbleOvalLeftEllipsis,
      iconFilled: HiChatBubbleOvalLeftEllipsis,
      badge: unreadMessagesCount,
    },
    {
      id: 'profile',
      label: 'Profile',
      to: username ? `/profile/${username}` : '/profile',
      isActive: isProfile,
      isAvatar: true,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-2px_16px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {navItems.map((item) => {
          const { id, label, to, isActive } = item;

          // REELS: Feature tab with official brand gradient container and larger icon
          if (id === 'reels') {
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(to)}
                aria-label={label}
                className="flex flex-col items-center justify-center py-1 cursor-pointer group active:scale-95 transition-transform"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] flex items-center justify-center shadow-md shadow-purple-500/20 text-white transition-all duration-200 ${
                    isActive
                      ? 'scale-105 ring-2 ring-purple-400'
                      : 'group-hover:scale-105'
                  }`}
                >
                  <HiFilm className="w-5.5 h-5.5 text-white drop-shadow-xs" />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 font-bold transition-colors ${
                    isActive ? 'text-[#7928ca]' : 'text-slate-700'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          }

          if (item.isAvatar) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(to)}
                aria-label={label}
                className="flex flex-col items-center justify-center py-1 cursor-pointer group active:scale-95 transition-transform"
              >
                <div
                  className={`w-7 h-7 rounded-full p-[1.5px] transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] ring-1 ring-purple-300'
                      : 'border border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <Avatar
                      src={avatarUrl}
                      name={username || userInitials}
                      size="w-full h-full"
                      textClassName="text-[10px] font-bold"
                    />
                  </div>
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-1 transition-colors ${
                    isActive ? 'font-bold text-[#7928ca]' : 'font-medium text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          }

          const IconOutline = item.iconOutline!;
          const IconFilled = item.iconFilled!;

          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(to)}
              aria-label={label}
              className="flex flex-col items-center justify-center py-1 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="relative flex items-center justify-center">
                {isActive ? (
                  <IconFilled className="w-6 h-6 text-[#7928ca] transition-all duration-200 scale-105" />
                ) : (
                  <IconOutline className="w-6 h-6 text-slate-500 group-hover:text-slate-800 transition-colors" />
                )}

                {/* Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none">
                    {(item.badge || 0) > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive ? 'font-bold text-[#7928ca]' : 'font-medium text-slate-500'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
