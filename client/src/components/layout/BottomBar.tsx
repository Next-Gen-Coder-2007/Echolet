import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiHome,
  HiOutlineMagnifyingGlass,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiChatBubbleOvalLeftEllipsis,
  HiOutlineFilm,
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

  // On any active message chat on mobile (direct, group, or global), hide bottom bar for full keyboard & chat space
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
  if (isInActiveChat) {
    return null;
  }

  const isHome = pathname === '/';
  const isSearch = pathname.startsWith('/search');
  const isReels = pathname.startsWith('/reels');
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
      iconFilled: HiOutlineMagnifyingGlass,
    },
    {
      id: 'reels',
      label: 'Reels',
      to: '/reels',
      isActive: isReels,
      iconOutline: HiOutlineFilm,
      iconFilled: HiFilm,
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
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const { id, label, to, isActive } = item;

          if (item.isAvatar) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(to)}
                aria-label={label}
                className="relative flex flex-col items-center justify-center w-14 h-14 cursor-pointer group active:scale-90 transition-transform duration-200"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[1.5px] transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shadow-sm shadow-purple-500/30 scale-105'
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
                  className={`text-[10px] font-bold tracking-tight mt-0.5 transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent'
                      : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>

                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#7928ca]" />
                )}
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
              className="relative flex flex-col items-center justify-center w-14 h-14 cursor-pointer group active:scale-90 transition-transform duration-200"
            >
              <div className="relative">
                {isActive ? (
                  <div className="text-purple-600 transition-all duration-200 scale-110">
                    <IconFilled className="w-6 h-6 stroke-[2.2]" />
                  </div>
                ) : (
                  <div className="text-slate-500 group-hover:text-slate-800 transition-colors">
                    <IconOutline className="w-6 h-6 stroke-[1.8]" />
                  </div>
                )}

                {/* Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none animate-pulse">
                    {(item.badge || 0) > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-bold tracking-tight mt-0.5 transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent'
                    : 'text-slate-400'
                }`}
              >
                {label}
              </span>

              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#7928ca]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
