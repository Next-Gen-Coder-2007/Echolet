import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useMessage } from '../../context/MessageContext';
import userService from '../../services/userService';
import type { User } from '../../services/authService';

interface PrivacySettingsContext {
  user?: User | null;
  onUserUpdated?: (user: User) => void;
}

export default function PrivacySettings() {
  const { showSuccess, showError } = useMessage();
  const { user, onUserUpdated } = useOutletContext<PrivacySettingsContext>();
  const [privateAccount, setPrivateAccount] = useState<boolean>(Boolean(user?.isPrivate));
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  useEffect(() => {
    if (user) {
      setPrivateAccount(Boolean(user.isPrivate));
    }
  }, [user?.isPrivate]);

  const handleTogglePrivate = async (checked: boolean) => {
    setIsUpdatingPrivacy(true);
    setPrivateAccount(checked);

    try {
      const res = await userService.updateProfile({ isPrivate: checked });
      if (res.user && onUserUpdated) {
        onUserUpdated(res.user);
      }
      showSuccess(
        checked
          ? 'Your account is now private. Only approved followers can see your echoes and media.'
          : 'Your account is now public. Anyone can follow you and view your echoes.',
        checked ? 'Private Account Activated' : 'Public Account Activated'
      );
    } catch (err: any) {
      setPrivateAccount(!checked);
      showError(err.response?.data?.message || 'Failed to update privacy settings', 'Update Failed');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 animate-fade-in">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HiOutlineShieldCheck className="w-5 h-5 text-purple-600" />
          <span>Privacy & Security</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Control your account discoverability, follower requests, and audience access
        </p>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
        {/* Private Account Option */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                Private Account
              </span>
              {privateAccount ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  <HiOutlineEyeSlash className="w-3 h-3" />
                  Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  <HiOutlineEye className="w-3 h-3" />
                  Public
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed max-w-md">
              When your account is private, non-followers cannot see your posts, media, or reels. New visitors must send a follow request which you can accept or decline.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={privateAccount}
              disabled={isUpdatingPrivacy}
              onChange={(e) => handleTogglePrivate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
          </label>
        </div>

        <div className="h-px bg-slate-200/70" />

        {/* Direct Messages */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Allow Direct Messages from Everyone
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 block leading-relaxed max-w-md">
              Allow members you don&apos;t follow to send you chat requests and messages
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={allowDirectMessages}
              onChange={(e) => {
                setAllowDirectMessages(e.target.checked);
                showSuccess(
                  e.target.checked ? 'Direct messages enabled for everyone' : 'Direct messages restricted',
                  'Chat Privacy'
                );
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-3">
        <HiOutlineLockClosed className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            Private Account & Follow Request Guarantee
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
            Switching your account to private instantly hides your posts, stories, and reels from users who do not follow you. When you switch back to public, any pending follow requests are automatically approved.
          </p>
        </div>
      </div>
    </div>
  );
}
