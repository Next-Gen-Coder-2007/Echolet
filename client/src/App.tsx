import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  useLenis();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}