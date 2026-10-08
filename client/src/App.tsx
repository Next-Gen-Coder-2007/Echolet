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
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  useLenis();

  return (
    <MessageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MessageProvider>
  );
}