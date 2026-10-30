import React from 'react';
import {
  HiPhone,
  HiPhoneXMark,
  HiPhoneArrowUpRight,
  HiPhoneArrowDownLeft,
} from 'react-icons/hi2';
import type { CallLogData } from '../../services/messageService';

interface CallMessageCardProps {
  callLog?: CallLogData | null;
  content?: string;
  isMe: boolean;
  onCallBack?: () => void;
}

export const CallMessageCard: React.FC<CallMessageCardProps> = ({
  callLog,
  content = '',
  isMe,
  onCallBack,
}) => {
  // Derive status from callLog or content text fallback
  let status: 'completed' | 'missed' | 'declined' | 'busy' | 'cancelled' =
    callLog?.status || 'completed';
  let duration = callLog?.duration ?? 0;

  if (!callLog) {
    const lower = content.toLowerCase();
    if (lower.includes('missed')) status = 'missed';
    else if (lower.includes('declined')) status = 'declined';
    else if (lower.includes('busy')) status = 'busy';
    else if (lower.includes('cancelled') || lower.includes('canceled')) status = 'cancelled';
    else {
      // Try to parse duration string like "Voice call • 4m 32s" or "45s"
      const matchMinSec = content.match(/(\d+)m\s*(\d+)s/i);
      const matchSecOnly = content.match(/(\d+)s/i);
      if (matchMinSec) {
        duration = parseInt(matchMinSec[1], 10) * 60 + parseInt(matchMinSec[2], 10);
      } else if (matchSecOnly) {
        duration = parseInt(matchSecOnly[1], 10);
      }
    }
  }

  // Format duration into readable text
  const formatDuration = (totalSec: number) => {
    if (totalSec <= 0) return null;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min`;
    return `${secs} sec`;
  };

  const formattedDuration = formatDuration(duration);

  // Status-specific title & styling
  const isMissed = status === 'missed' || status === 'cancelled';
  const isDeclined = status === 'declined';
  const isBusy = status === 'busy';
  const isCompleted = status === 'completed';

  let title = 'Voice Call';
  let subtitle = formattedDuration ? `${formattedDuration}` : 'Voice call';
  let iconColorClass = 'bg-emerald-500 text-white';
  let IconComponent = isMe ? HiPhoneArrowUpRight : HiPhoneArrowDownLeft;

  if (isMissed) {
    if (isMe) {
      title = 'Cancelled Call';
      subtitle = 'Outgoing • No answer';
      iconColorClass = 'bg-slate-400 text-white';
      IconComponent = HiPhoneXMark;
    } else {
      title = 'Missed Voice Call';
      subtitle = 'Tap to call back';
      iconColorClass = 'bg-rose-500 text-white shadow-rose-500/20';
      IconComponent = HiPhoneXMark;
    }
  } else if (isDeclined) {
    if (isMe) {
      title = 'Call Declined';
      subtitle = 'Recipient was unavailable';
    } else {
      title = 'Declined Call';
      subtitle = 'You declined the call';
    }
    iconColorClass = 'bg-amber-500 text-white';
    IconComponent = HiPhoneXMark;
  } else if (isBusy) {
    title = 'Line Busy';
    subtitle = 'User was on another call';
    iconColorClass = 'bg-amber-500 text-white';
    IconComponent = HiPhoneXMark;
  } else if (isCompleted) {
    title = isMe ? 'Outgoing Voice Call' : 'Incoming Voice Call';
    subtitle = formattedDuration ? `Duration: ${formattedDuration}` : 'Call ended';
    iconColorClass = isMe
      ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white'
      : 'bg-emerald-500 text-white';
    IconComponent = isMe ? HiPhoneArrowUpRight : HiPhoneArrowDownLeft;
  }

  return (
    <div
      className={`min-w-[220px] max-w-[280px] p-2.5 sm:p-3 rounded-2xl transition-all ${
        isMe
          ? 'bg-white/10 text-white border border-white/15 backdrop-blur-xs'
          : 'bg-white/80 text-slate-900 border border-slate-200/90 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status Call Icon Badge */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconColorClass}`}
        >
          <IconComponent className="w-5 h-5 stroke-[1.8]" />
        </div>

        {/* Call Info (Title + Duration/Status) */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-bold truncate ${
              !isMe && isMissed
                ? 'text-rose-500'
                : isMe
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            {title}
          </p>
          <p
            className={`text-[11px] truncate mt-0.5 font-medium ${
              !isMe && isMissed
                ? 'text-rose-400'
                : isMe
                ? 'text-purple-200/90'
                : 'text-slate-500'
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Action Footer: Call Back CTA */}
      {onCallBack && (
        <div className="mt-2.5 pt-2 border-t border-white/10 dark:border-slate-100/10 flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-medium ${
              isMe ? 'text-white/70' : 'text-slate-400'
            }`}
          >
            Audio call
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCallBack();
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isMe
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <HiPhone className="w-3 h-3" />
            <span>{isMe ? 'Call again' : 'Call back'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CallMessageCard;
