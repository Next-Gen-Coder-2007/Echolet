import { useState } from 'react';
import { HiOutlineBell } from 'react-icons/hi2';
import { useMessage } from '../../context/MessageContext';

export default function NotificationSettings() {
  const { showSuccess } = useMessage();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);

  const handleToggle = (label: string, val: boolean) => {
    showSuccess(`${label} ${val ? 'enabled' : 'disabled'}`, 'Preferences Updated');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 animate-fade-in">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HiOutlineBell className="w-5 h-5 text-purple-600" />
          <span>Notification Preferences</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose which notifications you wish to receive on Echolet
        </p>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Push Notifications
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Receive live alerts for echoes, likes, comments, and follower updates
            </span>
          </div>
          <input
            type="checkbox"
            checked={pushNotifications}
            onChange={(e) => {
              setPushNotifications(e.target.checked);
              handleToggle('Push notifications', e.target.checked);
            }}
            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
          />
        </label>

        <div className="h-px bg-slate-200/70" />

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Direct Mention & Tag Alerts
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Get notified immediately when other users mention your @handle
            </span>
          </div>
          <input
            type="checkbox"
            checked={mentionAlerts}
            onChange={(e) => {
              setMentionAlerts(e.target.checked);
              handleToggle('Mention alerts', e.target.checked);
            }}
            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
          />
        </label>

        <div className="h-px bg-slate-200/70" />

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
              Email Highlights & Digest
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Receive periodic highlights, trending echoes, and activity summaries
            </span>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => {
              setEmailNotifications(e.target.checked);
              handleToggle('Email summaries', e.target.checked);
            }}
            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
