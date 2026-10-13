import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import {
  HiOutlineFilm,
  HiOutlinePlus,
  HiOutlineHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineShare,
  HiOutlineBookmark,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
  HiOutlinePlay,
  HiOutlineMusicalNote,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import CreateReelModal from '../components/CreateReelModal';
import reelService, { type Reel } from '../services/reelService';
import { useMessage } from '../context/MessageContext';
import type { User } from '../services/authService';

export default function Reels() {
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
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [pausedReelIds, setPausedReelIds] = useState<Record<string, boolean>>({});
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  // Fetch only the first 1 reel or specific reel on initial load/refresh (runs once)
  const fetchInitialReels = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (reelId && !isRefresh) {
        try {
          const specificReel = await reelService.getReelById(reelId);
          if (specificReel) {
            setReels([specificReel]);
            setHasMore(true);
            setActiveReelIndex(0);
            updateUrl(specificReel.id);
            return;
          }
        } catch (idErr) {
          console.warn(`Could not load reel ${reelId}, falling back to feed:`, idErr);
        }
      }

      const data = await reelService.getReels(0, 1);
      const initialReel = data.reels?.[0];
      if (initialReel) {
        setReels([initialReel]);
        setHasMore(Boolean(data.hasMore));
        setActiveReelIndex(0);
        updateUrl(initialReel.id);
      } else {
        setReels([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load reel:', err);
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

  // Fetch strictly the next 1 reel (limit: 1, offset: reels.length)
  const fetchNextSingleReel = useCallback(async () => {
    if (isFetchingNextRef.current || !hasMore) return null;
    isFetchingNextRef.current = true;

    try {
      const currentOffset = reels.length;
      const data = await reelService.getReels(currentOffset, 1);
      if (data.reels && data.reels.length > 0) {
        const nextReel = data.reels[0];
        setReels((prev) => {
          if (prev.some((r) => r.id === nextReel.id)) return prev;
          return [...prev, nextReel];
        });
        setHasMore(Boolean(data.hasMore));
        return nextReel;
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch next reel:', err);
    } finally {
      isFetchingNextRef.current = false;
    }
    return null;
  }, [hasMore, reels.length]);

  // Navigate forward or backward through reels, preserving previous reels state
  const goToReel = useCallback(
    async (index: number) => {
      if (index < 0 || index === activeReelIndex) return;
      if (isAnimatingRef.current) return;

      // Going backward or to already loaded reel (index < reels.length):
      // The previous reel is preserved in state!
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
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 430);
        return;
      }

      // Going forward past current loaded reels: fetch the next reel
      if (hasMore) {
        isAnimatingRef.current = true;
        const nextReel = await fetchNextSingleReel();
        isAnimatingRef.current = false;
        if (nextReel) {
          setActiveReelIndex(reels.length);
          updateUrl(nextReel.id);
        }
      }
    },
    [reels, activeReelIndex, hasMore, fetchNextSingleReel, updateUrl]
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

  // Instagram-style mouse wheel navigation on the reel card (one flick = one reel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimatingRef.current) return;
      if (Math.abs(e.deltaY) < 18) return;

      if (e.deltaY > 0) {
        goToReel(activeReelIndex + 1);
      } else {
        goToReel(activeReelIndex - 1);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [activeReelIndex, goToReel]);

  // Touch swipe support for mobile/touchpads
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (Math.abs(diff) > 40) {
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

  return (
    <div className="w-full h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col items-center select-none bg-slate-50/50">
      {/* Top Header Bar */}
      <div className="w-full max-w-[430px] flex items-center justify-between py-2 px-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] flex items-center justify-center shadow-xs">
            <HiOutlineFilm className="w-4 h-4 text-white stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Reels</h1>
            <p className="text-[11px] font-medium text-slate-400">Discover trending videos</p>
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
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-xs hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <HiOutlinePlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Reel</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-400">Loading reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm">
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
        <div className="flex-1 min-h-0 relative flex items-center justify-center w-full pb-2">
          {/* Desktop Next/Prev Quick Navigation Pills */}
          <div className="hidden lg:flex flex-col items-center gap-2 absolute right-[calc(50%-250px)] z-20">
            <button
              onClick={() => goToReel(activeReelIndex - 1)}
              disabled={activeReelIndex === 0}
              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-600 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Previous Reel (↑)"
            >
              <HiOutlineChevronUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => goToReel(activeReelIndex + 1)}
              disabled={activeReelIndex >= reels.length - 1 && !hasMore}
              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-600 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Next Reel (↓)"
            >
              <HiOutlineChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Instagram-Style Clean Light Reel Card Player Window */}
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="w-full max-w-[390px] h-full rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden relative select-none"
          >
            {/* 60fps GPU-Accelerated Sliding Track with Instagram Spring Curve */}
            <div
              className="w-full h-full flex flex-col will-change-transform"
              style={{
                transform: `translate3d(0, -${activeReelIndex * 100}%, 0)`,
                transition: 'transform 420ms cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              {reels.map((reel, index) => {
              const isPaused = pausedReelIds[reel.id] ?? index !== activeReelIndex;
              const authorInitials = reel.user?.fullName
                ? reel.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U';
              const progressPct = playbackProgress[reel.id] || 0;

              return (
                <div
                  key={reel.id}
                  className="relative w-full h-full shrink-0 snap-center flex items-center justify-center bg-slate-900 overflow-hidden"
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
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {/* Gentle Top & Bottom Gradient Shadows for Contrast */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                  {/* Centered Play Icon Overlay When Paused */}
                  {isPaused && (
                    <div
                      onClick={() => togglePlayPause(reel.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-auto"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md text-slate-900 border border-white flex items-center justify-center shadow-lg">
                        <HiOutlinePlay className="w-7 h-7 ml-0.5 stroke-[2.2]" />
                      </div>
                    </div>
                  )}

                  {/* Top Header Overlay: Sound Toggle */}
                  <div className="absolute top-3.5 right-3.5 z-20 flex items-center justify-end text-slate-800 pointer-events-auto">
                    <button
                      onClick={toggleGlobalMute}
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200/80 text-slate-700 transition-all cursor-pointer shadow-2xs"
                      title={isGlobalMuted ? 'Unmute' : 'Mute'}
                    >
                      {isGlobalMuted ? (
                        <HiOutlineSpeakerXMark className="w-4 h-4 text-rose-500" />
                      ) : (
                        <HiOutlineSpeakerWave className="w-4 h-4 text-slate-800" />
                      )}
                    </button>
                  </div>

                  {/* Bottom Creator Card (Light Frosted Theme) */}
                  <div className="absolute bottom-4 left-3 right-16 z-20 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-white/80 shadow-md flex flex-col gap-1.5">
                      {/* Creator Profile Row */}
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${reel.user?.username}`}
                          className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0"
                        >
                          <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                            {reel.user?.avatarUrl ? (
                              <img
                                src={reel.user.avatarUrl}
                                alt={reel.user.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-purple-600">
                                {authorInitials}
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/profile/${reel.user?.username}`}
                            className="font-bold text-xs text-slate-900 hover:text-purple-600 truncate block"
                          >
                            {reel.user?.fullName || reel.user?.username}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            @{reel.user?.username}
                          </p>
                        </div>
                      </div>

                      {/* Caption */}
                      {reel.caption && (
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-normal">
                          {reel.caption}
                        </p>
                      )}

                      {/* Audio Track Tag */}
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md w-fit max-w-full">
                        <HiOutlineMusicalNote className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {reel.audioTitle || `Original Audio · @${reel.user?.username}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Rail: Visual Static Display Icons (No Interactive Functional Overlays) */}
                  <div className="absolute bottom-4 right-2.5 z-20 flex flex-col items-center gap-3 pointer-events-none">
                    {/* Like Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 flex items-center justify-center shadow-md text-slate-700">
                      <HiOutlineHeart className="w-5 h-5 stroke-[2]" />
                    </div>

                    {/* Comment Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 flex items-center justify-center shadow-md text-slate-700">
                      <HiOutlineChatBubbleOvalLeftEllipsis className="w-5 h-5 stroke-[2]" />
                    </div>

                    {/* Bookmark Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 flex items-center justify-center shadow-md text-slate-700">
                      <HiOutlineBookmark className="w-5 h-5 stroke-[2]" />
                    </div>

                    {/* Share Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 flex items-center justify-center shadow-md text-slate-700">
                      <HiOutlineShare className="w-4 h-4 stroke-[2]" />
                    </div>
                  </div>

                  {/* Playback Progress Scrubber Line */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30 z-30">
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
    </div>
  );
}
