import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import authService, { type User } from '../services/authService';

export default function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    authService
      .getMe()
      .then((userData) => {
        if (isMounted) {
          setUser(userData);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login', { replace: true });
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

  return (
    <div className="min-h-screen bg-[#f8fafc] relative flex">
      <Sidebar
        avatarUrl={user?.avatarUrl}
        userInitials={userInitials}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-24 sm:ml-28 p-6 sm:p-10 min-h-screen">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
