import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import authService, { type User } from '../services/authService';

export default function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
          setUser(null);
          setLoading(false);
          navigate('/login', { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userInitials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-[#f8fafc] relative flex">
      <Sidebar
        avatarUrl={user.avatarUrl}
        userInitials={userInitials}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-24 sm:ml-28 px-6 sm:px-10 py-3 sm:py-4 min-h-screen flex flex-col justify-center">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
