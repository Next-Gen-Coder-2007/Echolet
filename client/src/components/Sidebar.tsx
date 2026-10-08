import { useState } from 'react';
import {
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineBell,
  HiOutlineHeart,
  HiOutlineBookmark,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

export type SidebarTab =
  | 'home'
  | 'search'
  | 'messages'
  | 'notifications'
  | 'heart'
  | 'saved';

interface SidebarProps {
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  avatarUrl?: string;
  userInitials?: string;
  onLogout?: () => void;
}

export default function Sidebar({
  activeTab = 'home',
  onTabChange,
  avatarUrl,
  userInitials = 'U',
  onLogout,
}: SidebarProps) {
  const [currentTab, setCurrentTab] = useState<SidebarTab>(activeTab);

  const selectedTab = onTabChange ? activeTab : currentTab;

  const handleSelect = (tab: SidebarTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const navItems = [
    {
      id: 'home' as SidebarTab,
      label: 'Home',
      icon: HiOutlineHome,
    },
    {
      id: 'search' as SidebarTab,
      label: 'Search',
      icon: HiOutlineMagnifyingGlass,
    },
    {
      id: 'messages' as SidebarTab,
      label: 'Messages',
      icon: HiOutlineChatBubbleOvalLeftEllipsis,
    },
    {
      id: 'notifications' as SidebarTab,
      label: 'Notifications',
      icon: HiOutlineBell,
    },
    {
      id: 'heart' as SidebarTab,
      label: 'Favorites',
      icon: HiOutlineHeart,
    },
    {
      id: 'saved' as SidebarTab,
      label: 'Saved',
      icon: HiOutlineBookmark,
    },
  ];

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.id === selectedTab)
  );

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="fixed left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-16 sm:w-18 h-[640px] max-h-[94vh] bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col items-center justify-between py-6 px-2 select-none"
    >
      <div className="relative flex flex-col items-center gap-3 w-full">
        <div
          className="absolute left-1/2 -translate-x-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shadow-md shadow-purple-500/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] pointer-events-none z-0"
          style={{
            top: `${activeIndex * (48 + 12)}px`,
          }}
        />

        {navItems.map((item) => {
          const isActive = selectedTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-slate-500 hover:text-[#7928ca] hover:bg-purple-50/80 hover:scale-110'
              }`}
            >
              <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px] stroke-[1.5]" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        <div
          title="Account"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105"
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
        </div>

        <button
          onClick={onLogout}
          aria-label="Log Out"
          title="Log Out"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 hover:scale-105 active:scale-95 cursor-pointer transition-all duration-200"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5 sm:w-[22px] sm:h-[22px] stroke-[1.5]" />
        </button>
      </div>
    </aside>
  );
}
