import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import { MessageProvider } from './context/MessageContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  useLenis();

  return (
    <MessageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MessageProvider>
  );
}