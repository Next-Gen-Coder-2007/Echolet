import { Navigate, useOutletContext } from 'react-router-dom';
import type { User } from '../services/authService';

export default function Profile() {
  const outletContext = useOutletContext<{ user?: User | null }>();
  const user = outletContext?.user;

  if (user?.username) {
    return <Navigate to={`/profile/${user.username}`} replace />;
  }

  return (
    <div className="w-full flex-1 py-16 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-slate-400">Loading profile...</p>
    </div>
  );
}
