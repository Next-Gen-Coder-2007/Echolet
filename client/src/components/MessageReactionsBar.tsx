import { useMemo } from 'react';
import type { MessageReactionItem } from '../services/messageService';

interface MessageReactionsBarProps {
  reactions?: MessageReactionItem[];
  currentUserId?: string;
  onViewDetails: () => void;
  align?: 'left' | 'right';
  className?: string;
}

export default function MessageReactionsBar({
  reactions = [],
  currentUserId,
  onViewDetails,
  align = 'left',
  className = '',
}: MessageReactionsBarProps) {
  // Extract distinct emojis in order of appearance & total count
  const { distinctEmojis, totalCount, hasUserReacted, tooltipText } = useMemo(() => {
    if (!reactions || reactions.length === 0) {
      return { distinctEmojis: [], totalCount: 0, hasUserReacted: false, tooltipText: '' };
    }

    const emojis: string[] = [];
    const names: string[] = [];
    let userReacted = false;

    reactions.forEach((r) => {
      if (!emojis.includes(r.emoji)) {
        emojis.push(r.emoji);
      }
      const isMe = r.userId === currentUserId;
      if (isMe) userReacted = true;
      names.push(isMe ? 'You' : r.fullName || r.username || 'User');
    });

    const summary =
      names.length <= 2
        ? names.join(' and ')
        : `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;

    return {
      distinctEmojis: emojis,
      totalCount: reactions.length,
      hasUserReacted: userReacted,
      tooltipText: `${summary} · Tap to see reactions`,
    };
  }, [reactions, currentUserId]);

  if (totalCount === 0) return null;

  return (
    <div
      className={`relative z-10 -mt-2.5 flex items-center select-none ${
        align === 'right' ? 'justify-end pr-1.5' : 'justify-start pl-1.5'
      } ${className}`}
    >
      {/* WhatsApp-Style unified reaction pill (pure white) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        title={tooltipText}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-sm text-xs cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 border ${
          hasUserReacted
            ? 'bg-white border-purple-300 ring-1 ring-purple-400/20'
            : 'bg-white border-slate-200/90 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-1">
          {distinctEmojis.slice(0, 3).map((emoji) => (
            <span key={emoji} className="text-sm leading-none drop-shadow-2xs">
              {emoji}
            </span>
          ))}
        </div>

        {totalCount > 1 && (
          <span className="text-[11px] font-bold text-slate-600 leading-none">
            {totalCount}
          </span>
        )}
      </button>
    </div>
  );
}
