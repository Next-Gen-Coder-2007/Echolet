import { useState } from 'react';
import { HiOutlineShieldCheck, HiOutlineLockClosed } from 'react-icons/hi2';
import { useMessage } from '../../context/MessageContext';

export default function PrivacySettings() {
  const { showSuccess } = useMessage();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);

  const handleToggle = (label: string, val: boolean) => {
    showSuccess(`${label} ${val ? 'activated' : 'deactivated'}`, 'Privacy Updated');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 animate-fade-in">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HiOutlineShieldCheck className="w-5 h-5 text-purple-600" />
          <span>Privacy & Security</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Control your account discoverability and audience access
        </p>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Private Account
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Only approved followers can view your posts and media feed
            </span>
          </div>
          <input
            type="checkbox"
            checked={privateAccount}
            onChange={(e) => {
              setPrivateAccount(e.target.checked);
              handleToggle('Private account', e.target.checked);
            }}
            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
          />
        </label>

        <div className="h-px bg-slate-200/70" />

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Allow Direct Messages from Everyone
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Allow members you don&apos;t follow to send you chat requests
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowDirectMessages}
            onChange={(e) => {
              setAllowDirectMessages(e.target.checked);
              handleToggle('Direct messaging from everyone', e.target.checked);
            }}
            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
          />
        </label>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
        <HiOutlineLockClosed className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800">
            End-to-End Cookie Security
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
            Your credentials and session tokens are strictly secured via HTTP-only flags. Sensitive fields such as passwords or Google account secrets are never exposed to client-side scripts.
          </p>
        </div>
      </div>
    </div>
  );
}
