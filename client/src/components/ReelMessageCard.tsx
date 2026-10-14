import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiPlay, HiArrowTopRightOnSquare } from 'react-icons/hi2';
import { reelService, type Reel } from '../services/reelService';

interface ReelMessageCardProps {
  content: string;
  mediaUrl?: string | null;
  reelId?: string | null;
  isMe?: boolean;
}

const isVideoMedia = (url?: string | null): boolean => {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  if (/\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i.test(url)) return true;
  return false;
};

const isImageMedia = (url?: string | null): boolean => {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (isVideoMedia(url)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(url)) return true;
  if (/\/image\/upload\//i.test(url)) return true;
  return false;
};

// Utility to extract a high-quality video snapshot frame as thumbnail image
const extractVideoThumbnail = (videoUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      if (!videoUrl.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = videoUrl.startsWith('data:')
        ? videoUrl
        : videoUrl.includes('#')
        ? videoUrl
        : `${videoUrl}#t=0.5`;

      const cleanup = () => {
        video.onloadeddata = null;
        video.onloadedmetadata = null;
        video.onerror = null;
        video.onseeked = null;
      };

      const captureFrame = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetW = 360;
          const targetH = 640;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            return resolve(null);
          }
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetW, targetH);

          const vw = video.videoWidth || targetW;
          const vh = video.videoHeight || targetH;
          const scale = Math.max(targetW / vw, targetH / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const dx = (targetW - dw) / 2;
          const dy = (targetH - dh) / 2;
          ctx.drawImage(video, dx, dy, dw, dh);
          cleanup();
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          cleanup();
          resolve(null);
        }
      };

      video.onloadedmetadata = () => {
        try {
          video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
        } catch {
          captureFrame();
        }
      };
      video.onseeked = () => {
        captureFrame();
      };
      video.onloadeddata = () => {
        if (!video.currentTime) {
          try {
            video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
          } catch {
            captureFrame();
          }
        }
      };
      video.onerror = () => {
        cleanup();
        resolve(null);
      };
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 3000);
    } catch {
      resolve(null);
    }
  });
};

export const ReelMessageCard: React.FC<ReelMessageCardProps> = ({
  content,
  mediaUrl: initialMediaUrl,
  reelId: propReelId,
  isMe,
}) => {
  const navigate = useNavigate();

  // Extract Reel ID from content if not explicitly passed
  const reelIdMatch = content.match(/\/reels\/([a-zA-Z0-9_-]+)/i);
  const targetReelId = propReelId || (reelIdMatch ? reelIdMatch[1] : null);

  // Extract creator username from content if present
  const creatorMatch = content.match(/@([a-zA-Z0-9_.-]+)/i);
  const matchedCreator = creatorMatch ? creatorMatch[1] : null;

  // Extract any personal note (excluding standard share template)
  const cleanNote = content
    .replace(/Check out this reel by @[^\s]+ on Echolet!?/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\/reels\/[a-zA-Z0-9_-]+/gi, '')
    .trim();

  const [reel, setReel] = useState<Reel | null>(null);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

  // Fetch reel details (thumbnail, caption, creator) if targetReelId is present
  useEffect(() => {
    if (!targetReelId) return;

    let isMounted = true;
    reelService
      .getReelById(targetReelId)
      .then((data) => {
        if (isMounted) setReel(data);
      })
      .catch((err) => {
        console.warn('Could not fetch reel details for preview card:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetReelId]);

  // Determine image thumbnail vs video source
  const rawImageThumb =
    (isImageMedia(reel?.thumbnailUrl) ? reel?.thumbnailUrl : null) ||
    (isImageMedia(initialMediaUrl) ? initialMediaUrl : null) ||
    (reel?.thumbnailUrl && !isVideoMedia(reel?.thumbnailUrl) ? reel?.thumbnailUrl : null);

  const videoSource =
    (isVideoMedia(initialMediaUrl) ? initialMediaUrl : null) ||
    (isVideoMedia(reel?.videoUrl) ? reel?.videoUrl : null) ||
    reel?.videoUrl ||
    null;

  // If thumbnail image is not available directly, generate a snapshot from videoSource
  useEffect(() => {
    if (rawImageThumb || generatedThumbnail || !videoSource) return;

    let isMounted = true;
    extractVideoThumbnail(videoSource).then((thumb) => {
      if (isMounted && thumb) {
        setGeneratedThumbnail(thumb);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [rawImageThumb, videoSource, generatedThumbnail]);

  const [imgFailed, setImgFailed] = useState(false);

  const activeThumbnail = !imgFailed ? (rawImageThumb || generatedThumbnail) : null;

  const creatorUsername = reel?.user?.username || matchedCreator || 'user';
  const creatorAvatar = reel?.user?.avatarUrl;
  const caption = reel?.caption;

  const handleOpenReel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetReelId) {
      navigate(`/reels/${targetReelId}`);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 my-1 w-[220px] sm:w-[240px]">
      {/* Optional Personal Note */}
      {cleanNote && (
        <p
          className={`text-xs font-medium px-1 break-words ${
            isMe ? 'text-white/95' : 'text-slate-800'
          }`}
        >
          {cleanNote}
        </p>
      )}

      {/* Reel Card Container (Clicking anywhere navigates to Reels page) */}
      <div
        onClick={handleOpenReel}
        className="relative aspect-[9/15] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-white/10 group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl select-none"
        title="Click to watch reel on Echolet"
      >
        {/* Background Visual: Guaranteed Thumbnail Image */}
        {activeThumbnail ? (
          <img
            src={activeThumbnail}
            alt={caption || 'Reel thumbnail'}
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : videoSource ? (
          <video
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.playsInline = true;
                const p = el.play();
                if (p !== undefined) {
                  p.then(() => {
                    el.pause();
                    el.currentTime = 0.5;
                  }).catch(() => {});
                }
              }
            }}
            src={
              videoSource.startsWith('data:')
                ? videoSource
                : videoSource.includes('#')
                ? videoSource
                : `${videoSource}#t=0.001`
            }
            preload="auto"
            muted
            playsInline
            onLoadedMetadata={(e) => {
              try {
                e.currentTarget.currentTime = 0.5;
              } catch {}
            }}
            onLoadedData={(e) => {
              try {
                e.currentTarget.currentTime = 0.5;
              } catch {}
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black text-slate-400 p-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
              🎬
            </div>
            <p className="text-xs font-bold text-white">Echolet Reel</p>
            <p className="text-[11px] text-slate-400 mt-1">Tap to watch</p>
          </div>
        )}

        {/* Ambient Dark Gradient Wash */}
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors pointer-events-none" />

        {/* Top Header Badge Overlay */}
        <div className="absolute top-0 inset-x-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-sm">
            <span className="text-xs">🎬</span>
            <span className="text-[10px] font-extrabold tracking-wide uppercase text-purple-200">
              Reel
            </span>
          </div>

          <div className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] text-white/80 font-medium">
            Watch
          </div>
        </div>

        {/* Center Prominent Play / Watch Badge */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-115 group-hover:bg-purple-600 group-hover:border-purple-400">
            <HiPlay className="w-6 h-6 text-white translate-x-0.5" />
          </div>
        </div>

        {/* Bottom Details Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3 pt-8 flex flex-col gap-2 bg-gradient-to-t from-black via-black/85 to-transparent z-10">
          {/* Creator Profile */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-600/70 border border-white/30 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(creatorUsername[0] || 'U').toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs font-bold text-white truncate drop-shadow-sm">
              @{creatorUsername}
            </p>
          </div>

          {/* Caption Snippet */}
          {caption && (
            <p className="text-[11px] text-white/85 line-clamp-2 leading-relaxed drop-shadow-sm">
              {caption}
            </p>
          )}

          {/* Watch on Reels CTA Button */}
          <button
            type="button"
            onClick={handleOpenReel}
            className="w-full mt-0.5 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Watch on Reels</span>
            <HiArrowTopRightOnSquare className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReelMessageCard;
