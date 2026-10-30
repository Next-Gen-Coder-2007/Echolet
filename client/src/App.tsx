import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import { MessageProvider } from './context/MessageContext';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Search from './pages/Search';
import Reels from './pages/Reels';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Favorites from './pages/Favorites';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import {
  Settings,
  EditProfile,
  AccountSettings,
  NotificationSettings,
  PrivacySettings,
} from './pages/settings';
import PostDetail from './pages/PostDetail';
import PublicPostView from './pages/PublicPostView';
import Login from './pages/Login';
import Register from './pages/Register';
import authService, { type User } from './services/authService';

function PostRouteHandler() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    authService
      .getMe()
      .then((u) => {
        if (isMounted) setUser(u);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <PublicPostView />;
  }

  return (
    <AppLayout initialUser={user}>
      <PostDetail user={user} />
    </AppLayout>
  );
}

export default function App() {
  useLenis();

  return (
    <MessageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/post/:id" element={<PostRouteHandler />} />
          <Route path="/public/post/:id" element={<PublicPostView />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/reels/:reelId" element={<Reels />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:username" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<UserProfile />} />
            <Route path="/settings" element={<Settings />}>
              <Route index element={<Navigate to="/settings/profile" replace />} />
              <Route path="profile" element={<EditProfile />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="privacy" element={<PrivacySettings />} />
            </Route>
            <Route path="/profile/edit" element={<Navigate to="/settings/profile" replace />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MessageProvider>
  );
}