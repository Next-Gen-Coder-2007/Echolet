import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Modal from './Modal';
import { HiXMark, HiOutlineTrash, HiOutlineFaceSmile } from 'react-icons/hi2';
import type { PostReactionItem } from '../services/postService';

interface PostReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: PostReactionItem[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  onOpenPicker?: () => void;
}

export default function PostReactionsModal({
  isOpen,
  onClose,
  reactions,
  currentUserId,
  onToggleReaction,
  onOpenPicker,
}: PostReactionsModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  // Group reaction counts per emoji
  const emojiTabs = useMemo(() => {
    const map = new Map<string, number>();
    reactions.forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });

    return Array.from(map.entries()).map(([emoji, count]) => ({
      emoji,
      count,
    }));
  }, [reactions]);

  // Filter reactions based on selected tab
  const filteredReactions = useMemo(() => {
    if (!selectedEmoji) return reactions;
    return reactions.filter((r) => r.emoji === selectedEmoji);
  }, [reactions, selectedEmoji]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdropVariant="dark"
      showCloseButton={false}
      card={false}
      contentClassName="p-0 overflow-hidden"
    >
      <div className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">Reactions</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {reactions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenPicker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPicker();
                }}
                className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                title="Add your reaction"
              >
                <HiOutlineFaceSmile className="w-4 h-4 stroke-[2]" />
                <span>React</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Emoji Tabs */}
        {emojiTabs.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50/50">
            <button
              type="button"
              onClick={() => setSelectedEmoji(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedEmoji === null
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              All {reactions.length}
            </button>

            {emojiTabs.map((tab) => {
              const isSelected = selectedEmoji === tab.emoji;
              return (
                <button
                  key={tab.emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(tab.emoji)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-400/20 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm leading-none drop-shadow-2xs">{tab.emoji}</span>
                  <span>{tab.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* User list */}
        <div
          data-lenis-prevent
          className="overflow-y-auto p-3 space-y-1 divide-y divide-slate-100 flex-1 min-h-[160px]"
        >
          {filteredReactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">
              No reactions yet. Be the first to react!
            </div>
          ) : (
            filteredReactions.map((r, idx) => {
              const isMe = r.userId === currentUserId;

              return (
                <div
                  key={`${r.userId}-${r.emoji}-${idx}`}
                  className="flex items-center justify-between py-2 px-2.5 rounded-2xl hover:bg-slate-50/80 transition-colors"
                >
                  <Link
                    to={`/profile/${r.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <Avatar
                      src={r.avatarUrl}
                      name={r.fullName || r.username}
                      size="md"
                      className="ring-1 ring-slate-200 group-hover:ring-purple-400 transition-all shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-purple-600 transition-colors leading-tight truncate">
                          {r.fullName || r.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block truncate">
                        @{r.username}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 pl-3 shrink-0">
                    <span className="text-2xl leading-none drop-shadow-2xs">{r.emoji}</span>
                    {isMe && onToggleReaction && (
                      <button
                        type="button"
                        onClick={() => onToggleReaction(r.emoji)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove your reaction"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
