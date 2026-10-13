import React, { useState, useEffect } from 'react';
import { HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi2';

export interface PollOption {
  id: string;
  text: string;
  voterIds?: string[];
}

interface ChatPollWidgetProps {
  poll?: { question: string; options: PollOption[]; expiresAt?: string | null };
  question?: string;
  options?: PollOption[];
  expiresAt?: string | null;
  currentUserId?: string;
  onVote: (optionId: string) => void | Promise<void>;
  isMe?: boolean;
}

export const ChatPollWidget: React.FC<ChatPollWidgetProps> = ({
  poll,
  question: propQuestion,
  options: propOptions,
  expiresAt: propExpiresAt,
  currentUserId,
  onVote,
  isMe = false,
}) => {
  const [votingId, setVotingId] = useState<string | null>(null);

  const question = poll?.question || propQuestion || '';
  const pollExpiresAt = poll?.expiresAt || propExpiresAt;

  // Normalize options to ensure every item has { id, text, voterIds }
  const rawOptions = (poll?.options || propOptions || []) as any[];
  const normalizedOptions: PollOption[] = rawOptions.map((opt, idx) => {
    if (typeof opt === 'string') {
      return { id: String(idx), text: opt, voterIds: [] };
    }
    return {
      id: opt.id !== undefined ? String(opt.id) : String(idx),
      text: opt.text || '',
      voterIds: Array.isArray(opt.voterIds) ? opt.voterIds : [],
    };
  });

  // Local optimistic options state for instant UI response when voting/switching
  const [localOptions, setLocalOptions] = useState<PollOption[]>(normalizedOptions);

  useEffect(() => {
    setLocalOptions(normalizedOptions);
  }, [JSON.stringify(normalizedOptions)]);

  // Poll Expiration Live Countdown
  const [isExpired, setIsExpired] = useState<boolean>(() => {
    if (!pollExpiresAt) return false;
    return new Date(pollExpiresAt).getTime() <= Date.now();
  });
  const [timeRemainingText, setTimeRemainingText] = useState<string>('');

  useEffect(() => {
    if (!pollExpiresAt) {
      setIsExpired(false);
      setTimeRemainingText('');
      return;
    }

    const updateTimer = () => {
      const expiresAtMs = new Date(pollExpiresAt).getTime();
      const diff = expiresAtMs - Date.now();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemainingText('Ended');
        return;
      }

      setIsExpired(false);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) {
        const remH = Math.floor((diff % 86400000) / 3600000);
        setTimeRemainingText(`${days}d ${remH}h left`);
      } else if (hours > 0) {
        const remM = Math.floor((diff % 3600000) / 60000);
        setTimeRemainingText(`${hours}h ${remM}m left`);
      } else if (minutes > 0) {
        const remS = Math.floor((diff % 60000) / 1000);
        setTimeRemainingText(`${minutes}m ${remS}s left`);
      } else {
        const seconds = Math.max(0, Math.floor(diff / 1000));
        setTimeRemainingText(`${seconds}s left`);
      }
    };

    updateTimer();
    const expiresDiff = new Date(pollExpiresAt).getTime() - Date.now();
    const intervalTime = expiresDiff < 3600000 ? 1000 : 10000;
    const interval = setInterval(updateTimer, intervalTime);
    return () => clearInterval(interval);
  }, [pollExpiresAt]);

  const totalVotes = localOptions.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);
  const userHasVoted = Boolean(
    currentUserId && localOptions.some((opt) => opt.voterIds?.includes(currentUserId))
  );

  const handleOptionClick = async (optionId: string) => {
    if (votingId || isExpired) return;

    // Optimistically update local options immediately
    if (currentUserId) {
      setLocalOptions((prev) =>
        prev.map((opt) => {
          const voters = Array.isArray(opt.voterIds) ? [...opt.voterIds] : [];
          if (opt.id === optionId) {
            if (voters.includes(currentUserId)) {
              return { ...opt, voterIds: voters.filter((id) => id !== currentUserId) };
            } else {
              return { ...opt, voterIds: [...voters, currentUserId] };
            }
          } else {
            return { ...opt, voterIds: voters.filter((id) => id !== currentUserId) };
          }
        })
      );
    }

    try {
      setVotingId(optionId);
      await onVote(optionId);
    } catch {
      // Revert if error
      setLocalOptions(normalizedOptions);
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-[220px] max-w-sm py-1 select-none">
      {/* Question & Timer Badge */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-bold tracking-tight leading-snug ${isMe ? 'text-white' : 'text-slate-900'}`}>
          📊 {question}
        </span>
        {isExpired ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
            isMe ? 'bg-white/20 text-slate-200' : 'bg-slate-200 text-slate-600'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Ended
          </span>
        ) : pollExpiresAt ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
            isMe ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30' : 'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs'
          }`}>
            <HiOutlineClock className="w-3 h-3 text-amber-500 animate-pulse" />
            {timeRemainingText || 'Active'}
          </span>
        ) : null}
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2">
        {localOptions.map((opt) => {
          const votesCount = opt.voterIds?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = Boolean(currentUserId && opt.voterIds?.includes(currentUserId));
          const canClick = !isExpired && !votingId;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOptionClick(opt.id);
              }}
              disabled={!canClick}
              className={`relative overflow-hidden text-left p-2.5 rounded-xl border transition-all ${
                canClick ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
              } group ${
                hasVoted
                  ? isMe
                    ? 'border-indigo-400 bg-white/10 ring-1 ring-indigo-400/50'
                    : 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/30'
                  : isMe
                  ? isExpired
                    ? 'border-slate-800 bg-white/5 opacity-80'
                    : 'border-slate-700 hover:border-slate-600 bg-white/5 hover:bg-white/10'
                  : isExpired
                  ? 'border-slate-200 bg-slate-50/60 opacity-85'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/80'
              }`}
            >
              {/* Animated Progress Bar fill */}
              <div
                style={{ width: `${pct}%` }}
                className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-xl ${
                  hasVoted
                    ? isMe
                      ? 'bg-indigo-500/30'
                      : 'bg-indigo-200/60'
                    : isMe
                    ? 'bg-slate-700/40'
                    : 'bg-slate-200/50'
                }`}
              />

              {/* Option Text and Percentage */}
              <div className="relative z-10 flex items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      hasVoted
                        ? isMe
                          ? 'border-indigo-400 bg-indigo-500 text-white'
                          : 'border-indigo-600 bg-indigo-600 text-white'
                        : isMe
                        ? 'border-slate-600 group-hover:border-slate-400'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}
                  >
                    {hasVoted && <HiOutlineCheckCircle className="w-3.5 h-3.5 fill-current" />}
                  </div>
                  <span className={`truncate font-medium ${isMe ? 'text-white' : 'text-slate-800'}`}>
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold">
                  <span className={isMe ? 'text-slate-300' : 'text-slate-500'}>
                    {pct}%
                  </span>
                  <span className={`text-[10px] ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                    ({votesCount})
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={`flex items-center justify-between text-[11px] font-medium pt-0.5 ${
        isMe ? 'text-slate-300' : 'text-slate-400'
      }`}>
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        <span className="italic">
          {isExpired
            ? 'Poll ended · Final results'
            : userHasVoted
            ? '✓ Voted (click to change)'
            : 'Click to vote'}
        </span>
      </div>
    </div>
  );
};

export default ChatPollWidget;
