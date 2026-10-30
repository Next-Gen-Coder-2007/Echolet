import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { HiOutlinePlus, HiArrowLeft, HiXMark } from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';

interface PostReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  userCurrentReaction?: string | null;
  align?: 'left' | 'right';
  className?: string;
}

// 6 iconic instant quick reactions (Facebook / LinkedIn / Slack style)
export const QUICK_POST_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function PostReactionPicker({
  onSelectEmoji,
  onClose,
  userCurrentReaction,
  align = 'left',
  className = '',
}: PostReactionPickerProps) {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [placement, setPlacement] = useState<'up' | 'down'>('up');
  const [dynamicHeight, setDynamicHeight] = useState<number>(360);
  const [isPositioned, setIsPositioned] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedAtRef = useRef<number>(Date.now());

  // Dynamically calculate ideal placement and height relative to viewport
  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const parentRect =
      containerRef.current.parentElement?.getBoundingClientRect() ||
      containerRef.current.getBoundingClientRect();

    const topMargin = 70;
    const bottomMargin = 20;

    const spaceAbove = Math.max(0, parentRect.top - topMargin);
    const spaceBelow = Math.max(0, window.innerHeight - parentRect.bottom - bottomMargin);

    const placeDown = spaceAbove < 260 && spaceBelow > spaceAbove;
    const direction = placeDown ? 'down' : 'up';
    const availableSpace = direction === 'down' ? spaceBelow : spaceAbove;

    const calculatedPickerHeight = Math.max(
      240,
      Math.min(380, Math.floor(availableSpace - 55))
    );

    setPlacement(direction);
    setDynamicHeight(calculatedPickerHeight);
    setIsPositioned(true);
  }, []);

  useLayoutEffect(() => {
    updatePlacement();
  }, [updatePlacement, showFullPicker]);

  useEffect(() => {
    window.addEventListener('resize', updatePlacement);
    return () => window.removeEventListener('resize', updatePlacement);
  }, [updatePlacement]);

  // Outside click handler with timestamp grace period
  useEffect(() => {
    mountedAtRef.current = Date.now();

    const handleOutsideClick = (e: MouseEvent) => {
      if (Date.now() - mountedAtRef.current < 150) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-post-reaction-trigger]')) {
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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      className={`absolute z-[70] select-none transition-all duration-150 ${
        isPositioned ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      } ${
        placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
      } ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
    >
      {!showFullPicker ? (
        /* 1. Quick Reaction Capsule Bar */
        <div
          className={`flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full shadow-xl shadow-slate-900/15 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'origin-bottom-right' : 'origin-bottom-left'
          }`}
        >
          {QUICK_POST_REACTIONS.map((emoji) => {
            const isSelected = userCurrentReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(emoji);
                  onClose?.();
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl transition-all duration-150 ease-out hover:scale-135 hover:-translate-y-1.5 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-100 ring-2 ring-purple-500 scale-110 shadow-xs'
                    : 'hover:bg-slate-100'
                }`}
                aria-label={`React with ${emoji}`}
                title={isSelected ? `Remove ${emoji} reaction` : `React with ${emoji}`}
              >
                <span className="leading-none drop-shadow-2xs">{emoji}</span>
              </button>
            );
          })}

          <div className="w-[1px] h-6 bg-slate-200 mx-1" />

          {/* Plus Button to toggle full react emoji picker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPicker(true);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer border border-transparent hover:border-purple-200"
            aria-label="More emoji reactions"
            title="More reactions with Emoji Picker"
          >
            <HiOutlinePlus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        /* 2. Full Emoji Picker React Library Popover */
        <div
          data-lenis-prevent
          className="w-[325px] sm:w-[350px] max-w-[92vw] bg-white rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{ height: `${dynamicHeight + 48}px` }}
        >
          {/* Header with Back button and Close button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullPicker(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 px-3 py-1 rounded-full transition-colors cursor-pointer border border-slate-200/60"
            >
              <HiArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Quick reactions</span>
            </button>

            <span className="text-xs font-bold text-slate-800">All Emojis</span>

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
              searchPlaceHolder="Search emoji reaction..."
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
