import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import authService, { type User } from '../services/authService';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
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
          navigate('/login', { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute -left-20 sm:-left-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#00A3FF]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#8B5CF6]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-600 text-sm font-semibold tracking-wide">
            Verifying your Echolet session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col relative overflow-hidden selection:bg-purple-600 selection:text-white">
      <div className="absolute -left-20 sm:-left-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#00A3FF] pointer-events-none z-0" />
      <div className="absolute left-1/3 sm:left-[35%] top-10 sm:top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#8B5CF6] pointer-events-none z-0" />
      <div className="absolute -right-20 sm:-right-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#EC4899] pointer-events-none z-0" />

      <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-3 flex items-center justify-between relative z-10">
        <Logo />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Signed in as <strong className="text-slate-800">@{user.username}</strong></span>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-rose-600 hover:border-rose-200 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md disabled:opacity-50"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-8 relative z-10">
        <div className="w-full max-w-2xl bg-white rounded-[28px] p-8 sm:p-10 border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.18)] hover:shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left mb-8 pb-8 border-b border-slate-100">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#00b4d8] via-[#6366f1] to-[#ec4899] p-1 shadow-lg shadow-purple-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent select-none">
                  {initials || 'U'}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2 border border-purple-100/60">
                <span>Echolet Account Active</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Welcome,{' '}
                <span className="bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">
                  {user.fullName}
                </span>
                !
              </h1>

              <p className="mt-1.5 text-sm sm:text-base text-slate-500">
                You have successfully signed in to Echolet.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {user.fullName}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Username
              </span>
              <span className="text-sm font-semibold text-purple-600">
                @{user.username}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate block">
                {user.email}
              </span>
            </div>

            {user.gender && (
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Gender
                </span>
                <span className="text-sm font-semibold text-slate-800 capitalize">
                  {user.gender}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              Session is securely preserved via HTTP-Only cookies.
            </p>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
