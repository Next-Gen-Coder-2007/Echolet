import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { HiOutlinePlus, HiArrowLeft, HiXMark } from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';

interface MessageReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  userCurrentReaction?: string | null;
  align?: 'left' | 'right';
  className?: string;
}

// 6 iconic instant quick reactions (WhatsApp / Telegram style)
export const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function MessageReactionPicker({
  onSelectEmoji,
  onClose,
  userCurrentReaction,
  align = 'right',
  className = '',
}: MessageReactionPickerProps) {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [placement, setPlacement] = useState<'up' | 'down'>('up');
  const [dynamicHeight, setDynamicHeight] = useState<number>(340);
  const [horizontalShift, setHorizontalShift] = useState<number>(0);
  const [isPositioned, setIsPositioned] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedAtRef = useRef<number>(Date.now());

  // Automatically calculate ideal height and direction (up/down) to fit screen perfectly
  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const parentRect =
      containerRef.current.parentElement?.getBoundingClientRect() ||
      containerRef.current.getBoundingClientRect();

    // Safety margins: top header is ~75px, bottom input bar is ~105px
    const topMargin = 75;
    const bottomMargin = 105;

    const spaceAbove = Math.max(0, parentRect.top - topMargin);
    const spaceBelow = Math.max(0, window.innerHeight - parentRect.bottom - bottomMargin);

    // Reactions strictly prefer opening ABOVE (standard chat UI).
    // Quick reaction capsule is only ~44px tall (needs ~55px of space).
    // Full picker needs ~320px of space.
    const requiredSpace = showFullPicker ? 320 : 55;
    const placeDown = spaceAbove < requiredSpace && spaceBelow > spaceAbove;
    const direction = placeDown ? 'down' : 'up';
    const availableSpace = direction === 'down' ? spaceBelow : spaceAbove;

    // Header inside full picker is ~46px. Clamp height between 220px and 380px.
    const calculatedPickerHeight = Math.max(
      220,
      Math.min(380, Math.floor(availableSpace - 50))
    );

    // Check horizontal viewport edges
    const containerRect = containerRef.current.getBoundingClientRect();
    let shift = 0;
    if (containerRect.left < 12) {
      shift = 12 - containerRect.left;
    } else if (containerRect.right > window.innerWidth - 12) {
      shift = window.innerWidth - 12 - containerRect.right;
    }

    setPlacement(direction);
    setDynamicHeight(calculatedPickerHeight);
    setHorizontalShift(shift);
    setIsPositioned(true);
  }, [showFullPicker]);

  useLayoutEffect(() => {
    updatePlacement();
  }, [updatePlacement]);

  // Recalculate on window resize
  useEffect(() => {
    window.addEventListener('resize', updatePlacement);
    return () => window.removeEventListener('resize', updatePlacement);
  }, [updatePlacement]);

  // Outside click handler with timestamp grace period
  useEffect(() => {
    mountedAtRef.current = Date.now();

    const handleOutsideClick = (e: MouseEvent) => {
      // Grace period: ignore events in the first 150ms after mount or mode toggle
      if (Date.now() - mountedAtRef.current < 150) return;

      const target = e.target as HTMLElement | null;
      // If clicking on the trigger button itself, let the button's own onClick handle it
      if (target?.closest('[data-reaction-trigger]')) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose, showFullPicker]);

  // Scroll listener with grace period and internal scroll exemption
  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Grace period: ignore events in first 300ms after mount or mode toggle
      if (Date.now() - mountedAtRef.current < 300) return;

      const target = e.target as Node | null;
      // Allow internal scrolling inside EmojiPicker or quick bar
      if (containerRef.current && target && containerRef.current.contains(target)) {
        return;
      }

      onClose?.();
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [onClose, showFullPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelectEmoji(emojiData.emoji);
    setShowFullPicker(false);
    onClose?.();
  };

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-[60] select-none transition-opacity duration-100 ${
        isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        placement === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      } ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
      style={{
        transform: horizontalShift ? `translateX(${horizontalShift}px)` : undefined,
      }}
    >
      {!showFullPicker ? (
        /* 1. Quick Reaction Capsule Bar (Pure White) */
        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200/90 rounded-full shadow-xl shadow-slate-900/10 ${
            align === 'right' ? 'origin-bottom-right' : 'origin-bottom-left'
          }`}
        >
          {QUICK_REACTIONS.map((emoji) => {
            const isSelected = userCurrentReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(emoji);
                  onClose?.();
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all duration-200 ease-out hover:scale-135 hover:-translate-y-1 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-100 ring-2 ring-purple-500 scale-110 shadow-xs'
                    : 'hover:bg-slate-100'
                }`}
                aria-label={`React with ${emoji}`}
              >
                <span>{emoji}</span>
              </button>
            );
          })}

          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

          {/* Plus Button to toggle full react emoji picker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPicker(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer"
            aria-label="More reactions"
            title="All reactions"
          >
            <HiOutlinePlus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        /* 2. Full Emoji Picker React Library Popover (Pure White, Auto-Height Adjusted) */
        <div
          data-lenis-prevent
          className="w-[320px] max-w-[92vw] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{ height: `${dynamicHeight + 46}px` }}
        >
          {/* Header with Back button and Close button */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullPicker(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-slate-200/60"
            >
              <HiArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Quick reactions</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close picker"
            >
              <HiXMark className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji Picker with dynamic height to never overflow screen */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={Theme.LIGHT}
              lazyLoadEmojis={true}
              autoFocusSearch={false}
              width="100%"
              height={dynamicHeight}
              searchPlaceHolder="Search reaction..."
              previewConfig={{ showPreview: false }}
              style={{
                border: 'none',
                boxShadow: 'none',
                width: '100%',
                height: `${dynamicHeight}px`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
