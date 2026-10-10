import { useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineUser,
  HiCheckCircle,
  HiOutlinePencilSquare,
  HiOutlineCalendar,
  HiOutlineEnvelope,
} from 'react-icons/hi2';
import type { User } from '../../services/authService';

interface SettingsOutletContext {
  user?: User | null;
  onUserUpdated?: (user: User) => void;
}

export default function AccountSettings() {
  const { user } = useOutletContext<SettingsOutletContext>();

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HiOutlineUser className="w-5 h-5 text-purple-600" />
            <span>Account Details</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Your personal Echolet account information and active status
          </p>
        </div>

        <Link
          to="/settings/profile"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
        >
          <HiOutlinePencilSquare className="w-4 h-4" />
          <span>Edit Profile</span>
        </Link>
      </div>

      {/* Account Info Details */}
      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">Display Name</span>
          <span className="font-semibold text-slate-900">{user?.fullName || 'Not provided'}</span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">Username</span>
          <span className="font-semibold text-purple-600">@{user?.username}</span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">Email Address</span>
          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
            <HiOutlineEnvelope className="w-4 h-4 text-slate-400" />
            {user?.email || 'Hidden'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">Member Since</span>
          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
            <HiOutlineCalendar className="w-4 h-4 text-slate-400" />
            {joinedDate}
          </span>
        </div>
        <div className="flex justify-between items-start text-xs sm:text-sm pt-1">
          <span className="text-slate-500 font-medium shrink-0">Bio</span>
          <span className="font-normal text-slate-700 italic max-w-sm text-right">
            {user?.bio || 'No bio set'}
          </span>
        </div>
      </div>

      {/* Session Security */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Session & Authentication
        </h3>
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">Active Session</p>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Authenticated via secure HTTP-only cookies
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <HiCheckCircle className="w-3.5 h-3.5" />
            Secure & Verified
          </span>
        </div>
      </div>
    </div>
  );
}
