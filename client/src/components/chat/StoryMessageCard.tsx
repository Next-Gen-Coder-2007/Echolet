import React from 'react';
import {
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineEyeSlash,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
} from 'react-icons/hi2';
import type { StoryMessageData } from '../../services/messageService';

interface StoryMessageCardProps {
  story?: StoryMessageData | null;
  content: string;
  isMe?: boolean;
}

const COMMON_EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '😍', '🎉', '🙌', '💯', '✨', '👍', '🥰'];

export const StoryMessageCard: React.FC<StoryMessageCardProps> = ({
  story,
  content,
  isMe = false,
}) => {
  // Determine if story has passed its 24h expiration timestamp
  const isExpired = !story?.expiresAt || new Date(story.expiresAt).getTime() <= Date.now();
  const trimmedContent = (content || '').trim();
  const isSingleEmoji = COMMON_EMOJIS.includes(trimmedContent) || (trimmedContent.length <= 4 && /\p{Extended_Pictographic}/u.test(trimmedContent));

  const fontClass =
    story?.fontStyle === 'serif'
      ? 'font-serif italic'
      : story?.fontStyle === 'neon'
      ? 'font-mono uppercase tracking-wider'
      : story?.fontStyle === 'casual'
      ? 'font-sans font-medium'
      : 'font-sans font-bold';

  return (
    <div className="w-full max-w-[280px] sm:max-w-[310px] space-y-2 select-none">
      {/* Attached Story Snapshot / Expired Status Card */}
      <div
        className={`rounded-2xl overflow-hidden border transition-all ${
          isExpired
            ? isMe
              ? 'bg-slate-800/80 border-slate-700/80 text-slate-300'
              : 'bg-slate-100/90 border-slate-200 text-slate-600'
            : isMe
            ? 'bg-slate-800/95 border-purple-500/40 text-slate-200 shadow-xs'
            : 'bg-white border-purple-200/90 text-slate-800 shadow-xs'
        }`}
      >
        {/* Story Header Tag */}
        <div
          className={`px-3 py-1.5 flex items-center justify-between border-b text-[10px] font-bold ${
            isExpired
              ? isMe
                ? 'border-slate-700/60 bg-slate-900/40 text-slate-400'
                : 'border-slate-200/80 bg-slate-200/40 text-slate-500'
              : isMe
              ? 'border-purple-500/30 bg-purple-950/30 text-purple-300'
              : 'border-purple-100 bg-purple-50/70 text-purple-700'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isExpired ? (
              <HiOutlineClock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            ) : (
              <HiOutlineSparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
            )}
            <span className="truncate">
              {isExpired
                ? 'Story Expired'
                : story?.authorName
                ? `${story.authorName}'s Story`
                : 'Story'}
            </span>
          </div>

          <span
            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
              isExpired
                ? isMe
                  ? 'bg-slate-700/80 text-slate-400'
                  : 'bg-slate-200 text-slate-500'
                : isMe
                ? 'bg-purple-900/60 text-purple-300'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {isExpired ? 'Unavailable' : '24h'}
          </span>
        </div>

        {/* Story Body */}
        {isExpired ? (
          /* Expired State: Clean informative card */
          <div className="p-3 flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isMe ? 'bg-slate-700/70 text-slate-400' : 'bg-slate-200/80 text-slate-500'
              }`}
            >
              <HiOutlineEyeSlash className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold leading-tight ${
                  isMe ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Story is no longer available
              </p>
              <p
                className={`text-[10px] mt-0.5 ${
                  isMe ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                24 hours have passed
              </p>
            </div>
          </div>
        ) : (
          /* Active State: Vibrant visual preview */
          <div className="relative">
            {story?.mediaType === 'video' && story.mediaUrl ? (
              <div className="relative w-full h-36 bg-slate-950 overflow-hidden flex items-center justify-center">
                <video
                  src={story.mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm shadow-md">
                    <HiOutlineVideoCamera className="w-5 h-5 text-purple-300" />
                  </div>
                </div>
                <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between text-white text-[11px] font-medium">
                  <span className="truncate drop-shadow-sm">
                    {story.content || 'Video Story'}
                  </span>
                  <span className="text-[10px] bg-black/60 px-1.5 py-0.2 rounded-md backdrop-blur-xs font-semibold">
                    {story.duration ? `${Math.round(story.duration)}s` : 'Video'}
                  </span>
                </div>
              </div>
            ) : story?.mediaType === 'image' && story.mediaUrl ? (
              <div className="relative w-full h-36 bg-slate-900 overflow-hidden flex items-center justify-center">
                <img
                  src={story.mediaUrl}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between text-white text-[11px] font-medium">
                  <span className="truncate drop-shadow-sm">
                    {story.content || 'Photo Story'}
                  </span>
                  <HiOutlinePhoto className="w-3.5 h-3.5 shrink-0 drop-shadow-sm opacity-90" />
                </div>
              </div>
            ) : (
              <div
                className="w-full h-32 p-3.5 flex flex-col items-center justify-center text-center overflow-hidden"
                style={{
                  background:
                    story?.backgroundColor ||
                    'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                }}
              >
                <p
                  className={`text-xs sm:text-sm text-slate-900 line-clamp-3 select-none ${fontClass}`}
                >
                  "{story?.content || 'Text Story'}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User's Reaction / Message Content Attached Below Story */}
      {isSingleEmoji ? (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl shadow-sm border border-white/20 hover:scale-110 transition-transform">
            {trimmedContent}
          </div>
          <span
            className={`text-xs font-semibold ${
              isMe ? 'text-purple-200' : 'text-slate-700'
            }`}
          >
            Reacted {trimmedContent}
          </span>
        </div>
      ) : (
        <div
          className={`text-xs sm:text-sm font-medium leading-relaxed break-words px-1 ${
            isMe ? 'text-white' : 'text-slate-900'
          }`}
        >
          {trimmedContent}
        </div>
      )}
    </div>
  );
};

export default StoryMessageCard;
