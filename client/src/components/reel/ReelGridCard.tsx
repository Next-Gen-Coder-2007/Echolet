import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import {
  HiOutlinePlay,
  HiHeart,
  HiOutlineHeart,
  HiBookmark,
  HiOutlineBookmark,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineMusicalNote,
} from 'react-icons/hi2';
import reelService, { type Reel } from '../../services/reelService';
import type { User } from '../../services/authService';
import { useMessage } from '../../context/MessageContext';

interface ReelGridCardProps {
  reel: Reel;
  currentUser?: User | null;
  mode?: 'saved' | 'liked' | 'profile' | 'grid';
  onReelUpdated?: (updatedReel: Reel) => void;
  onReelRemoved?: (reelId: string) => void;
}

export default function ReelGridCard({
  reel,
  currentUser,
  mode = 'grid',
  onReelUpdated,
  onReelRemoved,
}: ReelGridCardProps) {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [isLiked, setIsLiked] = useState(Boolean(reel.isLiked));
  const [isBookmarked, setIsBookmarked] = useState(Boolean(reel.isBookmarked ?? true));
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoSrc = reel.videoUrl?.includes('#')
    ? reel.videoUrl
    : `${reel.videoUrl}#t=0.001`;

  const handleCardClick = () => {
    navigate(`/reels/${reel.id}`);
  };

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0.1;
      } catch {
        // ignore
      }
    }
  };

  const handleVideoLoadedData = () => {
    setVideoLoaded(true);
    if (videoRef.current && videoRef.current.currentTime === 0) {
      try {
        videoRef.current.currentTime = 0.1;
      } catch {
        // ignore
      }
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showMessage('Please log in to manage saved reels', 'info');
      return;
    }

    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      const res = await reelService.toggleBookmarkReel(reel.id);
      setIsBookmarked(res.isBookmarked);
      if (!res.isBookmarked && mode === 'saved' && onReelRemoved) {
        onReelRemoved(reel.id);
      }
      showMessage(
        res.isBookmarked ? 'Reel saved' : 'Reel removed from saved',
        'success'
      );
    } catch {
      setIsBookmarked(!nextState);
      showMessage('Failed to update bookmark', 'error');
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showMessage('Please log in to like reels', 'info');
      return;
    }

    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await reelService.toggleLikeReel(reel.id);
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
      if (!res.isLiked && mode === 'liked' && onReelRemoved) {
        onReelRemoved(reel.id);
      }
      if (onReelUpdated) {
        onReelUpdated({ ...reel, isLiked: res.isLiked, likesCount: res.likesCount });
      }
    } catch {
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      showMessage('Failed to update like', 'error');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-[9/16] rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer select-none"
    >
      {/* Fallback Shimmer/Skeleton while frame loads */}
      {!videoLoaded && !reel.thumbnailUrl && (
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-purple-900/20 to-slate-800 animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <HiOutlinePlay className="w-5 h-5 text-white/50" />
          </div>
        </div>
      )}

      {/* Video element with auto frame seeking on load */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={reel.thumbnailUrl || undefined}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={handleVideoLoadedData}
        className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out bg-transparent ${
          reel.displayMode === 'contain' ? 'object-contain' : 'object-cover'
        }`}
      />

      {/* Aesthetic Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

      {/* Center Play Button Overlay on Hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md text-slate-900 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
          <HiOutlinePlay className="w-6 h-6 ml-0.5 fill-current text-purple-600" />
        </div>
      </div>

      {/* Top Right Action Button */}
      {(mode === 'saved' || mode === 'liked') && (
        <div className="absolute top-2.5 right-2.5 z-10">
          {mode === 'saved' ? (
            <button
              onClick={handleToggleBookmark}
              className="p-2 rounded-xl backdrop-blur-md border border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all cursor-pointer shadow-xs active:scale-95"
              title={isBookmarked ? 'Remove from saved' : 'Save reel'}
            >
              {isBookmarked ? (
                <HiBookmark className="w-4 h-4 fill-white text-white" />
              ) : (
                <HiOutlineBookmark className="w-4 h-4 stroke-[2] text-white" />
              )}
            </button>
          ) : (
            <button
              onClick={handleToggleLike}
              className="p-2 rounded-xl backdrop-blur-md border border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all cursor-pointer shadow-xs active:scale-95"
              title={isLiked ? 'Unlike reel' : 'Like reel'}
            >
              {isLiked ? (
                <HiHeart className="w-4 h-4 fill-white text-white" />
              ) : (
                <HiOutlineHeart className="w-4 h-4 stroke-[2] text-white" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Badges Top Left (Duration & Folder) */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
        {reel.duration ? (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-md text-white/90 border border-white/10 shadow-2xs">
            {Math.round(reel.duration)}s
          </span>
        ) : null}
        {reel.bookmarkCollection && reel.bookmarkCollection !== 'Default' && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/60 backdrop-blur-md text-white/90 border border-white/10 shadow-2xs truncate max-w-[85px]">
            {reel.bookmarkCollection}
          </span>
        )}
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-col gap-1.5 text-white pointer-events-none">
        {/* Creator profile */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <Link
            to={`/profile/${reel.user?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/40"
          >
            <Avatar
              src={reel.user?.avatarUrl}
              name={reel.user?.fullName || reel.user?.username}
              size="xs"
              className="w-full h-full text-[9px]"
            />
          </Link>
          <Link
            to={`/profile/${reel.user?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-bold truncate hover:underline drop-shadow-sm text-white"
          >
            @{reel.user?.username}
          </Link>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-[11px] line-clamp-2 text-white/90 leading-tight font-normal drop-shadow-sm">
            {reel.caption}
          </p>
        )}

        {/* Audio tag & stats */}
        <div className="flex items-center justify-between text-[10px] text-white/85 pt-1">
          <div className="flex items-center gap-1 truncate max-w-[65%]">
            <HiOutlineMusicalNote className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="truncate">
              {reel.audioTitle || `Original Audio`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-semibold text-white/90">
            <div className="flex items-center gap-0.5">
              <HiHeart className="w-3 h-3 fill-white text-white" />
              <span>{likesCount}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <HiOutlineChatBubbleOvalLeftEllipsis className="w-3 h-3 stroke-[2] text-white" />
              <span>{reel.commentsCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
