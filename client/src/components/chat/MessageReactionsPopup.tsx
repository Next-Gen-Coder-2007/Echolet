import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { HiXMark, HiOutlineFaceSmile, HiPlus, HiOutlineTrash } from 'react-icons/hi2';
import type { MessageReactionItem } from '../../services/messageService';
import MessageReactionPicker from './MessageReactionPicker';
import Avatar from '../common/Avatar';

interface MessageReactionsPopupProps {
  reactions: MessageReactionItem[];
  currentUserId?: string;
  onClose: () => void;
  onToggleReaction?: (emoji: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export default function MessageReactionsPopup({
  reactions,
  currentUserId,
  onClose,
  onToggleReaction,
  align = 'left',
  className = '',
}: MessageReactionsPopupProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [isPositioned, setIsPositioned] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Synchronous pre-paint placement measurement to prevent ANY visual flicker
  const updatePlacement = useCallback(() => {
    if (!popupRef.current) return;
    const parentRect = popupRef.current.parentElement?.getBoundingClientRect() || popupRef.current.getBoundingClientRect();
    const neededHeight = 290;
    const spaceAbove = parentRect.top;
    const spaceBelow = window.innerHeight - parentRect.bottom;

    if (spaceAbove < neededHeight && spaceBelow > spaceAbove) {
      setPlacement('bottom');
    } else {
      setPlacement('top');
    }
    setIsPositioned(true);
  }, []);

  useLayoutEffect(() => {
    updatePlacement();
  }, [updatePlacement]);

  useEffect(() => {
    window.addEventListener('resize', updatePlacement);
    return () => window.removeEventListener('resize', updatePlacement);
  }, [updatePlacement]);

  // Grace-period protected outside click handler
  useEffect(() => {
    let active = false;
    const timer = setTimeout(() => {
      active = true;
    }, 120);

    const handleOutsideClick = (e: MouseEvent) => {
      if (!active) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  // Grace-period protected scroll listener
  useEffect(() => {
    let listening = false;
    const timer = setTimeout(() => {
      listening = true;
    }, 200);

    const handleScroll = (e: Event) => {
      if (!listening) return;
      // Allow internal scrolling inside the popup user list
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [onClose]);

  // Group counts per emoji for tabs
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

  // Filtered reactions list
  const filteredReactions = useMemo(() => {
    if (!selectedEmoji) return reactions;
    return reactions.filter((r) => r.emoji === selectedEmoji);
  }, [reactions, selectedEmoji]);

  // Auto-close popup if all reactions are removed
  useEffect(() => {
    if (reactions.length === 0) {
      onClose();
    }
  }, [reactions.length, onClose]);

  const totalCount = reactions.length;

  return (
    <div
      ref={popupRef}
      data-lenis-prevent
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 select-none transition-opacity duration-100 ${
        isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      } ${
        align === 'right' ? 'right-0' : 'left-0'
      } w-[310px] sm:w-[340px] max-w-[90vw] bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/15 p-3.5 ${className}`}
    >
      {/* Header: e.g. "2 reactions" */}
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-sm font-bold text-slate-800">
          {totalCount} {totalCount === 1 ? 'reaction' : 'reactions'}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close reactions"
        >
          <HiXMark className="w-4 h-4" />
        </button>
      </div>

      {/* Row of Tabs - Left: smiley react button; Right: scrollable emoji filter pills */}
      <div className="flex items-center gap-1.5 pb-2 relative z-20 border-b border-slate-100">
        {/* React Button (Leftmost button in WhatsApp) */}
        <div className="relative shrink-0">
          <button
            type="button"
            data-reaction-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker((prev) => !prev);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
              showPicker
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
            }`}
            title="React to message"
          >
            <div className="relative flex items-center justify-center">
              <HiOutlineFaceSmile className="w-3.5 h-3.5 stroke-[2.2]" />
              <HiPlus className="w-2 h-2 absolute -top-1 -right-1 stroke-[3]" />
            </div>
          </button>

          {/* Quick Picker dropdown from inside popup */}
          {showPicker && (
            <MessageReactionPicker
              userCurrentReaction={reactions.find((r) => r.userId === currentUserId)?.emoji}
              onSelectEmoji={(emoji) => {
                onToggleReaction?.(emoji);
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
              align="left"
            />
          )}
        </div>

        {/* Individual Emoji Filter Tabs (only this part scrolls horizontally) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
        {emojiTabs.map((tab) => {
          const isSelected = selectedEmoji === tab.emoji;
          return (
            <button
              key={tab.emoji}
              type="button"
              onClick={() =>
                setSelectedEmoji((prev) => (prev === tab.emoji ? null : tab.emoji))
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 border ${
                isSelected
                  ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-150'
              }`}
            >
              <span className="text-sm leading-none">{tab.emoji}</span>
              <span className="text-xs opacity-90 leading-none">{tab.count}</span>
            </button>
          );
        })}
        </div>
      </div>

      {/* User list matching WhatsApp Screenshot 2 */}
      <div className="overflow-y-auto max-h-[260px] divide-y divide-slate-100 py-1">
        {filteredReactions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No reactions</div>
        ) : (
          filteredReactions.map((r, idx) => {
            const isMe = r.userId === currentUserId;
            return (
              <div
                key={`${r.userId}-${r.emoji}-${idx}`}
                onClick={() => {
                  if (isMe && onToggleReaction) {
                    onToggleReaction(r.emoji);
                    onClose();
                  }
                }}
                className={`flex items-center justify-between py-2.5 px-1 rounded-xl transition-colors ${
                  isMe
                    ? 'cursor-pointer hover:bg-purple-50/60'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={r.avatarUrl}
                    name={r.fullName || r.username}
                    size="sm"
                    className="w-9 h-9 border border-slate-200/80 shrink-0"
                  />

                  {/* Name and handle */}
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {r.fullName || r.username}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-purple-100 text-purple-700">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate">
                      @{r.username}
                    </span>
                  </div>
                </div>

                {/* Reaction Emoji on the far right */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xl leading-none">{r.emoji}</span>
                  {isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleReaction?.(r.emoji);
                        onClose();
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove reaction"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
