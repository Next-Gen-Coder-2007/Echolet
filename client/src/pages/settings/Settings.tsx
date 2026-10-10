import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineCog6Tooth,
  HiOutlineArrowLeft,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import authService, { type User } from '../../services/authService';

interface SettingsOutletContext {
  user?: User | null;
  onUserUpdated?: (user: User) => void;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, onUserUpdated } = useOutletContext<SettingsOutletContext>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const navLinks = [
    { to: '/settings/profile', label: 'Edit Profile' },
    { to: '/settings/account', label: 'Account' },
    { to: '/settings/notifications', label: 'Notifications' },
    { to: '/settings/privacy', label: 'Privacy & Security' },
  ];

  return (
    <div className="w-full flex-1 select-none animate-fade-in">
      {/* Sticky Top Header Card */}
      <div className="sticky top-4 sm:top-6 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 mb-6 flex items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer shrink-0"
            title="Go to Home"
          >
            <HiOutlineArrowLeft className="w-4 h-4 stroke-[2]" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <HiOutlineCog6Tooth className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none">
                Settings
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Account & Preferences</p>
            </div>
          </div>
        </div>

        <Link
          to={user?.username ? `/profile/${user.username}` : '/profile'}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors"
        >
          View Public Profile
        </Link>
      </div>

      {/* Main Settings Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Minimalist Settings Navigation Menu (Sticky) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-30 self-start">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-2.5 sm:p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3.5 pt-2 pb-2">
              Settings
            </p>

            <nav className="space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `block px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* User Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-800">{userInitials}</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || 'Echolet Member'}
                </p>
                <p className="text-[11px] text-purple-600 font-semibold truncate">
                  @{user?.username}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              className="p-2.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Settings Content (Rendered via nested Outlet) */}
        <div className="lg:col-span-8 min-w-0">
          <Outlet context={{ user, onUserUpdated }} />
        </div>
      </div>
    </div>
  );
}
