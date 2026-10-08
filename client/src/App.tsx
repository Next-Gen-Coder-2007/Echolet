import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import { MessageProvider } from './context/MessageContext';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Search from './pages/Search';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Favorites from './pages/Favorites';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import PostDetail from './pages/PostDetail';
import PublicPostView from './pages/PublicPostView';
import Login from './pages/Login';
import Register from './pages/Register';
import authService, { type User } from './services/authService';

/**
 * Smart router for /post/:id
 * While not logged in, guests can ONLY see this specific post via PublicPostView (NOT applying AppLayout).
 * While logged in, members view the post with full layout and engagement capabilities.
 */
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

  // Guest -> Standalone PublicPostView without AppLayout
  if (!user) {
    return <PublicPostView />;
  }

  // Authenticated User -> PostDetail wrapped in AppLayout
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
          {/* Post Route: Guests get PublicPostView (no AppLayout); Members get PostDetail in AppLayout */}
          <Route path="/post/:id" element={<PostRouteHandler />} />
          <Route path="/public/post/:id" element={<PublicPostView />} />

          {/* Main App Routes (Strictly requires login, wraps in AppLayout) */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:username" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<UserProfile />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MessageProvider>
  );
}