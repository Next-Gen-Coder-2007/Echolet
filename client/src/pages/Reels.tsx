import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, Link, useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineFilm,
  HiOutlinePlus,
  HiOutlineHeart,
  HiHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineShare,
  HiOutlineBookmark,
  HiBookmark,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
  HiOutlinePlay,
  HiOutlineMusicalNote,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import CreateReelModal from '../components/reel/CreateReelModal';
import ReelCommentsSidePanel from '../components/reel/ReelCommentsSidePanel';
import ShareReelModal from '../components/reel/ShareReelModal';
import reelService, { type Reel } from '../services/reelService';
import { useMessage } from '../context/MessageContext';
import type { User } from '../services/authService';
import Avatar from '../components/common/Avatar';

function formatShortCount(num: number | undefined): string {
  if (!num || num <= 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return num.toString();
}

export default function Reels() {
  const navigate = useNavigate();
  const { reelId } = useParams<{ reelId?: string }>();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;
  const { showMessage } = useMessage();

  const [reels, setReels] = useState<Reel[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [shareModalReel, setShareModalReel] = useState<Reel | null>(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [pausedReelIds, setPausedReelIds] = useState<Record<string, boolean>>({});
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});

  const toggleCaptionExpand = (targetReelId: string) => {
    setExpandedCaptions((prev) => ({ ...prev, [targetReelId]: !prev[targetReelId] }));
  };

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef(false);
  const isFetchingNextRef = useRef(false);
  const isInitialLoadedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  // Sync browser address bar to /reels/:reelId without triggering React Router route remounts
  const updateUrl = useCallback((id: string) => {
    if (window.location.pathname !== `/reels/${id}`) {
      window.history.replaceState(null, '', `/reels/${id}`);
    }
  }, []);

  // Preload initial batch of 20 reels, including specific reel if URL contains /reels/:reelId
  const fetchInitialReels = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await reelService.getReels(0, 20);
      const feedReels = data.reels || [];

      if (reelId && !isRefresh) {
        let targetReel: Reel | null = feedReels.find((r) => r.id === reelId) || null;
        if (!targetReel) {
          try {
            targetReel = await reelService.getReelById(reelId);
          } catch (idErr) {
            console.warn(`Could not load reel ${reelId}:`, idErr);
          }
        }

        if (targetReel) {
          const otherReels = feedReels.filter((r) => r.id !== targetReel.id);
          const combined = [targetReel, ...otherReels];
          setReels(combined);
          setActiveReelIndex(0);
          setHasMore(Boolean(data.hasMore));
          updateUrl(targetReel.id);
          return;
        }
      }

      setReels(feedReels);
      setActiveReelIndex(0);
      setHasMore(Boolean(data.hasMore));
      if (feedReels[0]) {
        updateUrl(feedReels[0].id);
      }
    } catch (err) {
      console.error('Failed to load reels feed:', err);
      showMessage('Could not load reels feed. Check your connection.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reelId, updateUrl, showMessage]);

  useEffect(() => {
    if (!isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      fetchInitialReels();
    }
  }, [fetchInitialReels]);

  // Fetch next batch of 20 reels in the background
  const fetchMoreReels = useCallback(async () => {
    if (isFetchingNextRef.current || !hasMore) return;
    isFetchingNextRef.current = true;

    try {
      const currentOffset = reels.length;
      const data = await reelService.getReels(currentOffset, 20);
      if (data.reels && data.reels.length > 0) {
        setReels((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = data.reels.filter((r) => !existingIds.has(r.id));
          if (!fresh.length) return prev;
          return [...prev, ...fresh];
        });
        setHasMore(Boolean(data.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch more reels:', err);
    } finally {
      isFetchingNextRef.current = false;
    }
  }, [hasMore, reels.length]);

  // Navigate forward or backward through reels, preserving active state & smooth GPU sliding
  const goToReel = useCallback(
    async (index: number) => {
      if (index < 0 || index === activeReelIndex) return;
      if (isAnimatingRef.current) return;

      // When index is already loaded in reels
      if (index < reels.length) {
        isAnimatingRef.current = true;
        setActiveReelIndex(index);
        const targetReel = reels[index];
        if (targetReel) {
          updateUrl(targetReel.id);
          const vid = videoRefs.current[targetReel.id];
          if (vid) {
            vid.currentTime = 0;
            vid.play().catch(() => {});
          }
        }

        // Trigger background prefetch when within 4 reels of the end
        if (index >= reels.length - 4 && hasMore && !isFetchingNextRef.current) {
          fetchMoreReels();
        }

        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 380);
        return;
      }

      // If requested index is beyond loaded reels and more exist on server
      if (hasMore && !isFetchingNextRef.current) {
        isAnimatingRef.current = true;
        await fetchMoreReels();
        isAnimatingRef.current = false;
      }
    },
    [reels, activeReelIndex, hasMore, fetchMoreReels, updateUrl]
  );

  // Sync active reel if user uses browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/reels\/([^/]+)/);
      if (match && match[1]) {
        const idFromUrl = match[1];
        const idx = reels.findIndex((r) => r.id === idFromUrl);
        if (idx !== -1 && idx !== activeReelIndex) {
          setActiveReelIndex(idx);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [reels, activeReelIndex]);

  // Mouse wheel navigation on stage and player card (one flick = one reel)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (e: WheelEvent) => {
      // If modal is open or event originates from modal or scrollable container, don't hijack!
      if (shareModalReel || isModalOpen) {
        return;
      }

      if (
        (e.target as HTMLElement)?.closest('.comments-scroll-area') ||
        (e.target as HTMLElement)?.closest('.share-reel-modal') ||
        (e.target as HTMLElement)?.closest('[data-lenis-prevent]') ||
        (e.target as HTMLElement)?.closest('[role="dialog"]')
      ) {
        return;
      }

      // If user is typing in input or textarea, let it behave normally
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      e.preventDefault();
      if (isAnimatingRef.current) return;
      if (Math.abs(e.deltaY) < 18) return;

      if (e.deltaY > 0) {
        goToReel(activeReelIndex + 1);
      } else {
        goToReel(activeReelIndex - 1);
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stage.removeEventListener('wheel', onWheel);
    };
  }, [activeReelIndex, goToReel, shareModalReel, isModalOpen]);

  // Touch swipe support for mobile/touchpads
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isCommentsOpen || shareModalReel || isModalOpen) return;
    if (touchStartY.current !== null && e.cancelable) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        goToReel(activeReelIndex + 1);
      } else {
        goToReel(activeReelIndex - 1);
      }
    }
  };

  // Keyboard navigation (ArrowUp/ArrowDown/Space/M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToReel(activeReelIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToReel(activeReelIndex - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        const currentReel = reels[activeReelIndex];
        if (currentReel) togglePlayPause(currentReel.id);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleGlobalMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, goToReel, reels]);

  // Play active video, pause all other videos
  useEffect(() => {
    reels.forEach((reel, index) => {
      const video = videoRefs.current[reel.id];
      if (!video) return;

      if (index === activeReelIndex) {
        if (!pausedReelIds[reel.id]) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    });
  }, [activeReelIndex, reels, pausedReelIds]);

  const togglePlayPause = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPausedReelIds((prev) => ({ ...prev, [reelId]: false }));
    } else {
      video.pause();
      setPausedReelIds((prev) => ({ ...prev, [reelId]: true }));
    }
  };

  const toggleGlobalMute = () => {
    const nextMuted = !isGlobalMuted;
    setIsGlobalMuted(nextMuted);
    Object.values(videoRefs.current).forEach((v) => {
      if (v) v.muted = nextMuted;
    });
  };

  const handleVideoTimeUpdate = (reelId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      setPlaybackProgress((prev) => ({ ...prev, [reelId]: pct }));
    }
  };

  const handleReelCreated = (newReel: Reel) => {
    setReels((prev) => [newReel, ...prev]);
    setActiveReelIndex(0);
    updateUrl(newReel.id);
  };

  const handleToggleLike = async (targetReel: Reel) => {
    if (!currentUser) {
      showMessage('Please log in to like reels', 'info');
      return;
    }

    const nextIsLiked = !targetReel.isLiked;
    const nextCount = nextIsLiked
      ? (targetReel.likesCount || 0) + 1
      : Math.max(0, (targetReel.likesCount || 0) - 1);

    // Optimistic UI update
    setReels((prev) =>
      prev.map((r) =>
        r.id === targetReel.id
          ? { ...r, isLiked: nextIsLiked, likesCount: nextCount }
          : r
      )
    );

    try {
      const res = await reelService.toggleLikeReel(targetReel.id);
      setReels((prev) =>
        prev.map((r) =>
          r.id === targetReel.id
            ? { ...r, isLiked: res.isLiked, likesCount: res.likesCount }
            : r
        )
      );
    } catch (err) {
      console.error('Like reel failed:', err);
      // Revert optimistic update
      setReels((prev) =>
        prev.map((r) =>
          r.id === targetReel.id
            ? { ...r, isLiked: targetReel.isLiked, likesCount: targetReel.likesCount }
            : r
        )
      );
      showMessage('Failed to like reel', 'error');
    }
  };

  const handleToggleBookmark = async (targetReel: Reel) => {
    if (!currentUser) {
      showMessage('Please log in to save reels', 'info');
      return;
    }

    const nextIsBookmarked = !targetReel.isBookmarked;

    // Optimistic UI update
    setReels((prev) =>
      prev.map((r) =>
        r.id === targetReel.id
          ? { ...r, isBookmarked: nextIsBookmarked }
          : r
      )
    );

    try {
      const res = await reelService.toggleBookmarkReel(targetReel.id);
      setReels((prev) =>
        prev.map((r) =>
          r.id === targetReel.id
            ? { ...r, isBookmarked: res.isBookmarked }
            : r
        )
      );
      showMessage(
        res.isBookmarked ? 'Reel saved to bookmarks' : 'Reel removed from saved',
        'success'
      );
    } catch (err) {
      console.error('Bookmark reel failed:', err);
      setReels((prev) =>
        prev.map((r) =>
          r.id === targetReel.id
            ? { ...r, isBookmarked: targetReel.isBookmarked }
            : r
        )
      );
      showMessage('Failed to update saved reel', 'error');
    }
  };

  const handleOpenShareModal = (targetReel: Reel) => {
    setShareModalReel(targetReel);
  };

  const handleShareSuccess = (reelId: string, sharesCount: number) => {
    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, sharesCount } : r))
    );
  };

  const handleCommentsCountChange = (count: number) => {
    setReels((prev) =>
      prev.map((r, i) => (i === activeReelIndex ? { ...r, commentsCount: count } : r))
    );
  };

  const currentReel = reels[activeReelIndex];

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center select-none h-full relative">
      {/* Top Header Bar (Desktop only) */}
      <div className="hidden md:flex w-full max-w-6xl items-center justify-between py-2 px-6 mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] flex items-center justify-center shadow-xs">
            <HiOutlineFilm className="w-4 h-4 text-white stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Reels</h1>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Discover trending short videos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInitialReels(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh reels"
          >
            <HiOutlineArrowPath
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`}
            />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-xs hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <HiOutlinePlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Reel</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-400">Loading reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm py-20">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <HiOutlineFilm className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">No reels posted yet</h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Be the very first creator to share a short reel on Echolet!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <HiOutlinePlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create First Reel</span>
          </button>
        </div>
      ) : (
        <div
          ref={stageRef}
          className="flex-1 min-h-0 relative flex items-center justify-center gap-3.5 sm:gap-5 lg:gap-6 w-full max-w-6xl pb-0 md:pb-2 px-0 md:px-4 h-full"
        >
          {/* Mobile Floating Overlay Header on Top of Video (<md) */}
          <div className="md:hidden absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/');
                }}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
                title="Go back"
              >
                <HiOutlineArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] p-[1.5px] flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-black/60 rounded-[9px] flex items-center justify-center text-white">
                  <HiOutlineFilm className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <span className="font-black text-base text-white tracking-tight drop-shadow-md">
                Reels
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => fetchInitialReels(true)}
                disabled={refreshing}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
                title="Refresh reels"
              >
                <HiOutlineArrowPath className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-md hover:opacity-95 flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <HiOutlinePlus className="w-3 h-3 stroke-[3]" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Main Reel Card Player Window - Edge-to-edge on mobile, 9:16 card on desktop */}
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full md:w-auto h-full max-h-full md:max-h-[82vh] md:aspect-[9/16] rounded-none md:rounded-3xl bg-black border-0 md:border border-slate-200/90 shadow-none md:shadow-2xl overflow-hidden select-none shrink-0 touch-none overscroll-none"
          >
            {/* 60fps GPU-Accelerated Sliding Track */}
            <div
              className="w-full h-full flex flex-col will-change-transform"
              style={{
                transform: `translate3d(0, -${activeReelIndex * 100}%, 0)`,
                transition: 'transform 420ms cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              {reels.map((reel, index) => {
                const isPaused = pausedReelIds[reel.id] ?? index !== activeReelIndex;
                const progressPct = playbackProgress[reel.id] || 0;
                const isExpanded = expandedCaptions[reel.id];

                return (
                  <div
                    key={reel.id}
                    className="relative w-full h-full shrink-0 snap-center flex items-center justify-center bg-black overflow-hidden"
                  >
                    {/* Video Player */}
                    <video
                      ref={(el) => {
                        videoRefs.current[reel.id] = el;
                      }}
                      src={reel.videoUrl}
                      poster={reel.thumbnailUrl || undefined}
                      loop
                      playsInline
                      muted={isGlobalMuted}
                      onTimeUpdate={(e) => handleVideoTimeUpdate(reel.id, e)}
                      onClick={() => togglePlayPause(reel.id)}
                      className="w-full h-full cursor-pointer bg-black object-cover"
                    />

                    {/* Contrast Gradient Overlays */}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none" />

                    {/* Centered Play Icon Overlay When Paused */}
                    {isPaused && (
                      <div
                        onClick={() => togglePlayPause(reel.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer pointer-events-auto"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/95 backdrop-blur-md text-slate-900 border border-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
                          <HiOutlinePlay className="w-8 h-8 ml-1 fill-purple-600 text-purple-600" />
                        </div>
                      </div>
                    )}

                    {/* Top Left Controls: Sound & Playback Toggles */}
                    <div className="absolute top-14 md:top-4 left-3.5 md:left-4 z-20 flex items-center gap-2 pointer-events-auto">
                      <button
                        onClick={() => togglePlayPause(reel.id)}
                        className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
                        title={isPaused ? 'Play (Space)' : 'Pause (Space)'}
                      >
                        {isPaused ? (
                          <HiOutlinePlay className="w-4 h-4 ml-0.5 fill-current" />
                        ) : (
                          <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-xs">❚❚</span>
                        )}
                      </button>

                      <button
                        onClick={toggleGlobalMute}
                        className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
                        title={isGlobalMuted ? 'Unmute (M)' : 'Mute (M)'}
                      >
                        {isGlobalMuted ? (
                          <HiOutlineSpeakerXMark className="w-4 h-4 text-rose-400" />
                        ) : (
                          <HiOutlineSpeakerWave className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Inside Reel: Bottom Creator Info Overlay - YouTube Shorts Style */}
                    <div className="absolute bottom-4 left-3 right-16 md:right-4 z-20 pointer-events-auto flex flex-col gap-2 text-white">
                      {/* Creator Row */}
                      <div className="flex items-center gap-2.5">
                        <Link
                          to={`/profile/${reel.user?.username}`}
                          className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0 shadow-md hover:scale-105 transition-transform"
                        >
                          <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                            <Avatar
                              src={reel.user?.avatarUrl}
                              name={reel.user?.fullName || reel.user?.username}
                              size="w-full h-full"
                              textClassName="text-[11px] font-black"
                            />
                          </div>
                        </Link>

                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${reel.user?.username}`}
                              className="font-extrabold text-sm text-white hover:underline truncate block drop-shadow-md leading-tight"
                            >
                              {reel.user?.fullName || reel.user?.username}
                            </Link>
                            <Link
                              to={`/profile/${reel.user?.username}`}
                              className="text-[11px] text-white/80 font-medium truncate block drop-shadow-sm mt-0.5"
                            >
                              @{reel.user?.username}
                            </Link>
                          </div>

                          <Link
                            to={`/profile/${reel.user?.username}`}
                            className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/95 hover:bg-white text-slate-900 shadow-md backdrop-blur-md transition-all active:scale-95 shrink-0 ml-auto"
                          >
                            View Profile
                          </Link>
                        </div>
                      </div>

                      {/* Caption with clean toggle */}
                      {reel.caption && (
                        <div className="text-xs sm:text-sm text-white/95 font-normal leading-relaxed drop-shadow-md">
                          <p className={isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
                            {reel.caption}
                          </p>
                          {reel.caption.length > 70 && (
                            <button
                              onClick={() => toggleCaptionExpand(reel.id)}
                              className="text-[11px] font-bold text-white/80 hover:text-white underline mt-0.5 cursor-pointer"
                            >
                              {isExpanded ? 'Show less' : '...more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Audio Tag Pill */}
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-1 rounded-full w-fit max-w-[90%] border border-white/15 shadow-sm transition-colors cursor-pointer">
                        <HiOutlineMusicalNote className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
                        <span className="truncate">
                          {reel.audioTitle || `Original Audio · @${reel.user?.username}`}
                        </span>
                      </div>
                    </div>

                    {/* Mobile-only Floating Action Rail over video (<md) */}
                    <div className="flex md:hidden absolute bottom-4 right-2.5 z-20 flex-col items-center gap-3.5 pointer-events-auto">
                      {/* Like */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(reel);
                          }}
                          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 ${
                            reel.isLiked
                              ? 'bg-rose-500/30 border-rose-400 text-rose-400'
                              : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
                          }`}
                          title={reel.isLiked ? 'Unlike' : 'Like'}
                        >
                          {reel.isLiked ? (
                            <HiHeart className="w-5 h-5 fill-current" />
                          ) : (
                            <HiOutlineHeart className="w-5 h-5 stroke-[2]" />
                          )}
                        </button>
                        <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          {formatShortCount(reel.likesCount)}
                        </span>
                      </div>

                      {/* Comment */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCommentsOpen((prev) => !prev);
                          }}
                          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 ${
                            isCommentsOpen
                              ? 'bg-purple-600/30 border-purple-400 text-purple-300'
                              : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
                          }`}
                          title="Comments"
                        >
                          <HiOutlineChatBubbleOvalLeftEllipsis className="w-5 h-5 stroke-[2]" />
                        </button>
                        <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          {formatShortCount(reel.commentsCount)}
                        </span>
                      </div>

                      {/* Save */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBookmark(reel);
                          }}
                          className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 ${
                            reel.isBookmarked
                              ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                              : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
                          }`}
                          title={reel.isBookmarked ? 'Saved' : 'Save reel'}
                        >
                          {reel.isBookmarked ? (
                            <HiBookmark className="w-5 h-5 fill-current" />
                          ) : (
                            <HiOutlineBookmark className="w-5 h-5 stroke-[2]" />
                          )}
                        </button>
                        <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          Save
                        </span>
                      </div>

                      {/* Share */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenShareModal(reel);
                          }}
                          className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg text-white transition-all cursor-pointer active:scale-90"
                          title="Share reel"
                        >
                          <HiOutlineShare className="w-4 h-4 stroke-[2]" />
                        </button>
                        <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          Share
                        </span>
                      </div>

                      {/* Rotating Vinyl Disc (TikTok/Reels Style) */}
                      <div className="pt-1">
                        <div
                          className={`w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-slate-900 to-slate-700 shadow-xl border border-white/20 flex items-center justify-center ${
                            isPaused ? '' : 'animate-spin [animation-duration:5s]'
                          }`}
                        >
                          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                            <Avatar
                              src={reel.user?.avatarUrl}
                              name={reel.user?.fullName || reel.user?.username}
                              size="w-full h-full"
                              textClassName="text-[8px] font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Playback Progress Scrubber Line */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-30">
                      <div
                        className="h-full bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Floating Action Column - YouTube Shorts Layout (>= md) */}
          {currentReel && (
            <div className="hidden md:flex flex-col items-center justify-end gap-3.5 pb-2 shrink-0 select-none">
              {/* Like Action */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLike(currentReel);
                  }}
                  className={`w-12 h-12 rounded-full border shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 ${
                    currentReel.isLiked
                      ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-rose-100'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800'
                  }`}
                  title={currentReel.isLiked ? 'Unlike' : 'Like'}
                >
                  {currentReel.isLiked ? (
                    <HiHeart className="w-6 h-6 fill-rose-500 text-rose-500 animate-in zoom-in-75 duration-200" />
                  ) : (
                    <HiOutlineHeart className="w-6 h-6 stroke-[2]" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-700">
                  {formatShortCount(currentReel.likesCount)}
                </span>
              </div>

              {/* Comment Action */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCommentsOpen((prev) => !prev);
                  }}
                  className={`w-12 h-12 rounded-full border shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 ${
                    isCommentsOpen
                      ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-purple-100'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800'
                  }`}
                  title={isCommentsOpen ? 'Close comments' : 'Comments'}
                >
                  <HiOutlineChatBubbleOvalLeftEllipsis className="w-6 h-6 stroke-[2]" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  {formatShortCount(currentReel.commentsCount)}
                </span>
              </div>

              {/* Bookmark / Save Action */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleBookmark(currentReel);
                  }}
                  className={`w-12 h-12 rounded-full border shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 ${
                    currentReel.isBookmarked
                      ? 'bg-amber-50 border-amber-200 text-amber-500 shadow-amber-100'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800'
                  }`}
                  title={currentReel.isBookmarked ? 'Saved' : 'Save reel'}
                >
                  {currentReel.isBookmarked ? (
                    <HiBookmark className="w-6 h-6 fill-amber-500 text-amber-500 animate-in zoom-in-75 duration-200" />
                  ) : (
                    <HiOutlineBookmark className="w-6 h-6 stroke-[2]" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Save
                </span>
              </div>

              {/* Share Action */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShareModal(currentReel);
                  }}
                  className="w-12 h-12 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 flex items-center justify-center shadow-md text-slate-800 transition-all cursor-pointer active:scale-90 hover:scale-105"
                  title="Share reel"
                >
                  <HiOutlineShare className="w-5 h-5 stroke-[2]" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Share
                </span>
              </div>
            </div>
          )}

          {/* Comments Panel: Aligned on Desktop beside the video, Bottom Sheet on Mobile */}
          {isCommentsOpen && currentReel && (
            <div className="md:relative md:inset-auto md:z-auto md:h-full md:max-h-[82vh] md:w-[340px] sm:md:w-[370px] lg:md:w-[390px] md:flex md:flex-col shrink-0">
              <ReelCommentsSidePanel
                key={currentReel.id}
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                reel={currentReel}
                currentUser={currentUser}
                onCommentsCountChange={handleCommentsCountChange}
              />
            </div>
          )}

          {/* Desktop Next/Previous Navigation Buttons (YouTube Shorts Style) */}
          <div className="hidden lg:flex flex-col items-center gap-3 shrink-0 ml-1">
            <button
              onClick={() => goToReel(activeReelIndex - 1)}
              disabled={activeReelIndex === 0}
              className="w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-sm text-slate-700 hover:text-purple-600 hover:border-purple-300 hover:shadow-md disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer active:scale-90 flex items-center justify-center"
              title="Previous Reel (↑ or k)"
            >
              <HiOutlineChevronUp className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => goToReel(activeReelIndex + 1)}
              disabled={activeReelIndex >= reels.length - 1 && !hasMore}
              className="w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-sm text-slate-700 hover:text-purple-600 hover:border-purple-300 hover:shadow-md disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer active:scale-90 flex items-center justify-center"
              title="Next Reel (↓ or j)"
            >
              <HiOutlineChevronDown className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}

      {/* Reel Creator Modal */}
      <CreateReelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        onReelCreated={handleReelCreated}
        showToast={showMessage}
      />

      {/* Real Working Share Reel Modal */}
      <ShareReelModal
        reel={shareModalReel}
        isOpen={Boolean(shareModalReel)}
        onClose={() => setShareModalReel(null)}
        currentUser={currentUser}
        onShareSuccess={handleShareSuccess}
      />
    </div>
  );
}
