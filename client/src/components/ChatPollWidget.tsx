import React, { useState } from 'react';
import { HiOutlineCheckCircle } from 'react-icons/hi2';

export interface PollOption {
  id: string;
  text: string;
  voterIds?: string[];
}

interface ChatPollWidgetProps {
  poll?: { question: string; options: PollOption[] };
  question?: string;
  options?: PollOption[];
  currentUserId?: string;
  onVote: (optionId: string) => void | Promise<void>;
  isMe?: boolean;
}

export const ChatPollWidget: React.FC<ChatPollWidgetProps> = ({
  poll,
  question: propQuestion,
  options: propOptions,
  currentUserId,
  onVote,
  isMe = false,
}) => {
  const [votingId, setVotingId] = useState<string | null>(null);

  const question = poll?.question || propQuestion || '';
  const options = poll?.options || propOptions || [];

  const totalVotes = options.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);

  const handleOptionClick = async (optionId: string) => {
    if (votingId) return;
    try {
      setVotingId(optionId);
      await onVote(optionId);
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-[220px] max-w-sm py-1 select-none">
      {/* Question */}
      <div className="flex items-start gap-2">
        <span className="text-sm font-bold tracking-tight leading-snug">
          📊 {question}
        </span>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const votesCount = opt.voterIds?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = Boolean(currentUserId && opt.voterIds?.includes(currentUserId));

          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOptionClick(opt.id);
              }}
              disabled={Boolean(votingId)}
              className={`relative overflow-hidden text-left p-2.5 rounded-xl border transition-all cursor-pointer group active:scale-[0.99] ${
                hasVoted
                  ? isMe
                    ? 'border-indigo-400 bg-white/10 ring-1 ring-indigo-400/50'
                    : 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/30'
                  : isMe
                  ? 'border-slate-700 hover:border-slate-600 bg-white/5 hover:bg-white/10'
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
        <span className="italic">Click to vote</span>
      </div>
    </div>
  );
};

export default ChatPollWidget;
