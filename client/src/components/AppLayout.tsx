import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import authService, { type User } from '../services/authService';

interface AppLayoutProps {
  children?: React.ReactNode;
  initialUser?: User | null;
}

export default function AppLayout({ children, initialUser }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialUser === undefined);

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
    <div className="min-h-screen bg-[#f8fafc] relative flex flex-col">
      <div className="flex-1 flex relative">
        <Sidebar
          avatarUrl={user?.avatarUrl}
          userInitials={userInitials}
          username={user?.username}
          onLogout={handleLogout}
        />

        <main className="flex-1 ml-20 sm:ml-24 md:ml-28 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-screen flex flex-col">
          <div className="w-full flex-1 flex flex-col">
            {children || <Outlet context={{ user }} />}
          </div>
        </main>
      </div>
    </div>
  );
}
