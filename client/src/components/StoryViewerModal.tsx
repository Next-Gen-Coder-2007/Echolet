import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiXMark,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlinePaperAirplane,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
} from 'react-icons/hi2';
import Modal from './Modal';
import type { User } from '../services/authService';
import storyService, { type UserStoryGroup, markOwnStoryAsViewed } from '../services/storyService';
import messageService from '../services/messageService';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStoryGroups: UserStoryGroup[];
  initialUserIndex?: number;
  initialStoryIndex?: number;
  currentUser?: User | null;
  onStoryDeleted?: (storyId: string) => void;
  onStoryViewed?: (storyId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

// Locked width style so every story (photos of any aspect ratio or text) maintains exact identical width
const STORY_VIEWER_WIDTH_STYLE: React.CSSProperties = {
  width: 'min(420px, calc(100vw - 28px))',
  minWidth: 'min(420px, calc(100vw - 28px))',
  maxWidth: 'min(420px, calc(100vw - 28px))',
};

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function StoryViewerModal({
  isOpen,
  onClose,
  userStoryGroups,
  initialUserIndex = 0,
  initialStoryIndex = 0,
  currentUser,
  onStoryDeleted,
  onStoryViewed,
  showToast,
}: StoryViewerModalProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const progressRef = useRef<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHoldingRef = useRef<boolean>(false);
  const prevIsOpenRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync exact target indices when opening
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const targetUserIndex = Math.max(0, Math.min(initialUserIndex, userStoryGroups.length - 1));
      setCurrentUserIndex(targetUserIndex);
      const targetGroup = userStoryGroups[targetUserIndex];
      const maxStoryIdx = targetGroup ? Math.max(0, targetGroup.stories.length - 1) : 0;
      setCurrentStoryIndex(Math.max(0, Math.min(initialStoryIndex, maxStoryIdx)));
      setIsPaused(false);
      setIsHolding(false);
      isHoldingRef.current = false;
      setShowViewersDrawer(false);
      setReplyText('');
      progressRef.current = 0;
      setProgress(0);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialUserIndex, initialStoryIndex]);

  const safeUserIndex = Math.max(0, Math.min(currentUserIndex, Math.max(0, userStoryGroups.length - 1)));
  const currentGroup = userStoryGroups[safeUserIndex];
  const stories = currentGroup?.stories || [];
  const safeStoryIndex = Math.max(0, Math.min(currentStoryIndex, Math.max(0, stories.length - 1)));
  const currentStory = stories[safeStoryIndex];
  const isOwnStory = Boolean(currentUser && currentStory && currentStory.userId === currentUser.id);

  // Reset progress synchronously on story or user change
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
  }, [safeStoryIndex, safeUserIndex]);

  // Mark story as viewed
  useEffect(() => {
    if (!isOpen || !currentStory || !currentUser) return;
    if (currentStory.userId === currentUser.id) {
      markOwnStoryAsViewed(currentStory.id, currentUser.id);
      onStoryViewed?.(currentStory.id);
      return;
    }

    if (!currentStory.isViewed) {
      storyService
        .viewStory(currentStory.id)
        .then(() => {
          onStoryViewed?.(currentStory.id);
        })
        .catch((err) => {
          console.error('Failed to mark story as viewed:', err);
        });
    }
  }, [isOpen, currentStory?.id, currentUser?.id, onStoryViewed]);

  const shouldPause = isPaused || isHolding || showViewersDrawer || isSendingReply;

  // Synchronize HTML5 video play/pause with story pause state
  useEffect(() => {
    if (videoRef.current) {
      if (shouldPause) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [shouldPause, safeStoryIndex, safeUserIndex]);

  // Advance to next story
  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    progressRef.current = 0;
    setProgress(0);

    if (safeStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (safeUserIndex < userStoryGroups.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentGroup, safeStoryIndex, stories.length, safeUserIndex, userStoryGroups.length, onClose]);

  // Go to previous story
  const handlePrev = useCallback(() => {
    progressRef.current = 0;
    setProgress(0);

    if (safeStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (safeUserIndex > 0) {
      const prevGroup = userStoryGroups[safeUserIndex - 1];
      setCurrentUserIndex((prev) => prev - 1);
      setCurrentStoryIndex(Math.max(0, (prevGroup?.stories.length || 1) - 1));
    }
  }, [safeStoryIndex, safeUserIndex, userStoryGroups]);

  const handleNextRef = useRef(handleNext);
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrevRef = useRef(handlePrev);
  useEffect(() => {
    handlePrevRef.current = handlePrev;
  }, [handlePrev]);

  // Auto-progress for image and text stories (5 seconds duration)
  useEffect(() => {
    if (!isOpen || !currentStory || currentStory.mediaType === 'video') return;
    if (shouldPause) return;

    const intervalMs = 25;
    const step = (intervalMs / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      progressRef.current += step;
      if (progressRef.current >= 100) {
        clearInterval(timer);
        progressRef.current = 0;
        setProgress(0);
        handleNextRef.current();
      } else {
        setProgress(Math.min(100, progressRef.current));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, shouldPause, currentStory?.id, currentStory?.mediaType]);

  // Track video progress in sync with playback
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration > 0 && !isNaN(duration)) {
        const pct = Math.min(100, (current / duration) * 100);
        progressRef.current = pct;
        setProgress(pct);
      }
    }
  };

  // Pointer down: record time and pos, schedule hold timer (250ms)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownTimeRef.current = Date.now();
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    isHoldingRef.current = false;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      isHoldingRef.current = true;
      setIsHolding(true);
    }, 250);
  };

  // Pointer up: distinguish quick tap (< 250ms) from long press hold (>= 250ms)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);

    // If moved significantly, it was a drag or swipe, ignore
    if (dx > 20 || dy > 20) {
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        setIsHolding(false);
      }
      return;
    }

    if (isHoldingRef.current) {
      // Long press hold finished: release hold, leave isPaused unchanged
      isHoldingRef.current = false;
      setIsHolding(false);
      return;
    }

    // Quick tap (< 250ms)
    const currentTarget = e.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;

    if (ratio < 0.22) {
      // Left 22%: Previous Story
      handlePrevRef.current();
    } else if (ratio > 0.78) {
      // Right 22%: Next Story
      handleNextRef.current();
    } else {
      // Center 56%: Toggle Pause / Play permanently until clicked again
      setIsPaused((prev) => !prev);
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsHolding(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === 'Escape') {
        if (showViewersDrawer) setShowViewersDrawer(false);
        else onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, showViewersDrawer, onClose]);

  // Delete own story
  const handleDeleteStory = async () => {
    if (!currentStory) return;
    if (!window.confirm('Delete this story? This action cannot be undone.')) return;

    try {
      await storyService.deleteStory(currentStory.id);
      showToast?.('Story deleted', 'success');
      onStoryDeleted?.(currentStory.id);

      if (stories.length > 1) {
        if (safeStoryIndex >= stories.length - 1) {
          setCurrentStoryIndex(stories.length - 2);
        }
      } else if (userStoryGroups.length > 1) {
        handleNext();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to delete story:', err);
      showToast?.('Could not delete story', 'error');
    }
  };

  // Quick emoji reaction
  const handleEmojiReaction = async (emoji: string) => {
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1400);

    if (currentGroup?.user?.id && currentUser && currentStory) {
      try {
        await messageService.sendMessage(
          currentGroup.user.id,
          emoji,
          {
            messageType: 'story_reply',
            story: {
              id: currentStory.id,
              mediaType: currentStory.mediaType,
              mediaUrl: currentStory.mediaUrl,
              content: currentStory.content,
              backgroundColor: currentStory.backgroundColor,
              fontStyle: currentStory.fontStyle,
              expiresAt: currentStory.expiresAt,
              authorName: currentGroup.user.fullName,
              authorUsername: currentGroup.user.username,
              authorAvatar: currentGroup.user.avatarUrl,
            },
          }
        );
        showToast?.(`Sent ${emoji} reaction to @${currentGroup.user.username}`, 'info');
      } catch (err) {
        console.error('Failed to send reaction message:', err);
      }
    }
  };

  // Send direct reply message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentGroup?.user?.id || !currentStory || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await messageService.sendMessage(
        currentGroup.user.id,
        replyText.trim(),
        {
          messageType: 'story_reply',
          story: {
            id: currentStory.id,
            mediaType: currentStory.mediaType,
            mediaUrl: currentStory.mediaUrl,
            content: currentStory.content,
            backgroundColor: currentStory.backgroundColor,
            fontStyle: currentStory.fontStyle,
            expiresAt: currentStory.expiresAt,
            authorName: currentGroup.user.fullName,
            authorUsername: currentGroup.user.username,
            authorAvatar: currentGroup.user.avatarUrl,
          },
        }
      );
      showToast?.(`Sent message to @${currentGroup.user.username}`, 'success');
      setReplyText('');
      setIsPaused(false);
    } catch (err: any) {
      console.error('Failed to send story reply:', err);
      showToast?.('Could not send message. Try again.', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!isOpen || !currentStory || !currentGroup) return null;

  const fontClass =
    currentStory.fontStyle === 'serif'
      ? 'font-serif italic font-semibold'
      : currentStory.fontStyle === 'neon'
      ? 'font-mono font-black uppercase tracking-wider'
      : currentStory.fontStyle === 'casual'
      ? 'font-sans font-medium'
      : 'font-sans font-bold';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdropVariant="black"
      backdropClassName="bg-black/85 backdrop-blur-xl"
      size="auto"
      className="p-0 overflow-visible flex items-center justify-center select-none"
      contentClassName="bg-transparent border-0 shadow-none p-0 flex items-center justify-center"
      style={STORY_VIEWER_WIDTH_STYLE}
      showCloseButton={false}
      preventScroll={true}
    >
      <div
        className="relative flex items-center justify-center shrink-0"
        style={STORY_VIEWER_WIDTH_STYLE}
      >
        {/* Desktop floating Left Navigation Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          className="hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer z-40"
          title="Previous story (Left arrow)"
          aria-label="Previous story"
        >
          <HiOutlineChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Desktop floating Right Navigation Arrow */}
        <button
          type="button"
          onClick={handleNext}
          className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer z-40"
          title="Next story (Right arrow)"
          aria-label="Next story"
        >
          <HiOutlineChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Main 9:16 Story Viewport Card: Strictly locked fixed width for rock-solid consistency across all stories */}
        <div
          className="relative h-[88vh] max-h-[820px] sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col justify-between shrink-0"
          style={STORY_VIEWER_WIDTH_STYLE}
        >
          {/* Floating animated reaction celebration */}
          {floatingReaction && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center animate-bounce">
              <span className="text-7xl drop-shadow-2xl animate-pulse">
                {floatingReaction}
              </span>
            </div>
          )}

          {/* Top Progress Bars */}
          <div className="relative z-30 pt-3 px-3.5 pb-1 flex items-center gap-1.5 bg-white/95 backdrop-blur-md border-b border-slate-100">
            {stories.map((st, idx) => {
              const isPast = idx < safeStoryIndex;
              const isCurrent = idx === safeStoryIndex;
              const barWidth = isPast ? 100 : isCurrent ? progress : 0;

              return (
                <div
                  key={st.id || idx}
                  className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      transition: isCurrent && !shouldPause ? 'width 25ms linear' : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Top Author Bar */}
          <div className="relative z-30 px-3.5 py-2.5 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-100 text-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full ring-2 ring-purple-600 overflow-hidden bg-purple-50 p-0.5 shadow-2xs">
                {currentGroup.user.avatarUrl ? (
                  <img
                    src={currentGroup.user.avatarUrl}
                    alt={currentGroup.user.fullName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold rounded-full">
                    {currentGroup.user.fullName?.[0] || 'U'}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    {currentGroup.user.fullName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    @{currentGroup.user.username}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {formatTimeAgo(currentStory.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute video sound' : 'Mute video sound'}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? (
                    <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <HiOutlineSpeakerWave className="w-3.5 h-3.5 text-purple-600" />
                  )}
                </button>
              )}

              {shouldPause && (
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Paused
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title={isPaused ? 'Resume' : 'Pause'}
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
              >
                {isPaused ? (
                  <HiOutlinePlay className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <HiOutlinePause className="w-3.5 h-3.5" />
                )}
              </button>

              {isOwnStory && (
                <button
                  type="button"
                  onClick={handleDeleteStory}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete story"
                >
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close story viewer"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Story Canvas / Content Area: Pure black sleek backdrop for centering */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden touch-none bg-black cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
          >
            {/* Centered Paused Indicator Overlay */}
            {isPaused && (
              <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none bg-black/35 backdrop-blur-[1px] transition-opacity">
                <div className="w-16 h-16 rounded-full bg-black/70 text-white flex items-center justify-center shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-75 duration-150 border border-white/20">
                  <HiOutlinePlay className="w-8 h-8 ml-1" />
                </div>
              </div>
            )}

            {/* Media / Content: Video, Image, or Text */}
            {currentStory.mediaType === 'video' && currentStory.mediaUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden pointer-events-none">
                <video
                  key={`video-${currentStory.id}`}
                  ref={videoRef}
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className={`w-full h-full select-none max-w-full max-h-full transition-all duration-200 ${
                    currentStory.fontStyle === 'cover' ? 'object-cover' : 'object-contain'
                  }`}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={() => {
                    if (!shouldPause) handleNextRef.current();
                  }}
                />

                {currentStory.content && (
                  <div className="absolute bottom-4 inset-x-4 z-25 bg-black/75 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center text-sm font-semibold text-white shadow-xl">
                    {currentStory.content}
                  </div>
                )}
              </div>
            ) : currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden pointer-events-none">
                <img
                  key={`img-${currentStory.id}`}
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className={`w-full h-full select-none max-w-full max-h-full transition-all duration-200 ${
                    currentStory.fontStyle === 'cover' ? 'object-cover' : 'object-contain'
                  }`}
                />

                {currentStory.content && (
                  <div className="absolute bottom-4 inset-x-4 z-25 bg-black/75 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center text-sm font-semibold text-white shadow-xl">
                    {currentStory.content}
                  </div>
                )}
              </div>
            ) : (
              <div
                key={`text-${currentStory.id}`}
                className="w-full h-full flex items-center justify-center p-8 text-center overflow-hidden pointer-events-none"
                style={{
                  background:
                    currentStory.backgroundColor ||
                    'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                }}
              >
                <p
                  className={`w-full text-xl sm:text-2xl select-none break-words max-h-[70%] overflow-y-auto scrollbar-none text-slate-900 ${fontClass}`}
                >
                  {currentStory.content}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Reactions / Views / Replies */}
          <div className="relative z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-100">
            {isOwnStory ? (
              /* Author view: Viewers drawer trigger */
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(true);
                    setShowViewersDrawer(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-all cursor-pointer shadow-2xs"
                >
                  <HiOutlineEye className="w-4 h-4 text-purple-600" />
                  <span>
                    {currentStory.viewsCount || currentStory.viewers?.length || 0} views
                  </span>
                </button>

                <span className="text-[11px] font-medium text-slate-400">
                  Disappears in 24h
                </span>
              </div>
            ) : (
              /* Viewer: Quick Reactions and Message Reply */
              <div className="space-y-2">
                <div className="flex items-center justify-around gap-1">
                  {['❤️', '🔥', '😂', '😮', '😢', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiReaction(emoji)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-purple-50 text-xl flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer shadow-2xs"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${currentGroup.user.fullName}...`}
                    maxLength={150}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSendingReply}
                    className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-sm cursor-pointer"
                    title="Send reply"
                  >
                    <HiOutlinePaperAirplane className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Viewers Drawer */}
          {showViewersDrawer && (
            <div className="absolute inset-x-0 bottom-0 max-h-[70%] z-40 bg-white/98 backdrop-blur-xl border-t border-slate-200 rounded-t-3xl p-4 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HiOutlineEye className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Story Viewers ({currentStory.viewers?.length || 0})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowViewersDrawer(false);
                    setIsPaused(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-60 scrollbar-thin">
                {currentStory.viewers && currentStory.viewers.length > 0 ? (
                  currentStory.viewers.map((viewer) => (
                    <div
                      key={viewer.userId}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                          {viewer.avatarUrl ? (
                            <img
                              src={viewer.avatarUrl}
                              alt={viewer.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            viewer.fullName?.[0] || viewer.username?.[0] || 'U'
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 tracking-tight">
                            {viewer.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            @{viewer.username}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        {formatTimeAgo(viewer.viewedAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No views yet. Share with friends!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
