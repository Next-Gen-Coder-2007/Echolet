import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { type SidebarTab } from '../components/Sidebar';
import authService, { type User } from '../services/authService';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('home');

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
    <div className="min-h-screen bg-[#f8fafc] relative">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        avatarUrl={user?.avatarUrl}
        userInitials={userInitials}
        onLogout={handleLogout}
      />
    </div>
  );
}
