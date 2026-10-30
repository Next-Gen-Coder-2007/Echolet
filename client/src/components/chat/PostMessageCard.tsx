import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import {
  HiArrowTopRightOnSquare,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineHeart,
  HiOutlineFilm,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import postService, { type Post } from '../../services/postService';

interface PostMessageCardProps {
  content: string;
  mediaUrl?: string | null;
  postId?: string | null;
  isMe?: boolean;
}

export const PostMessageCard: React.FC<PostMessageCardProps> = ({
  content,
  mediaUrl: initialMediaUrl,
  postId: propPostId,
  isMe,
}) => {
  const navigate = useNavigate();

  // Extract Post ID from content if not explicitly passed
  const postIdMatch = content.match(/\/post(?:s)?\/([a-zA-Z0-9_-]+)/i);
  const targetPostId = propPostId || (postIdMatch ? postIdMatch[1] : null);

  // Extract creator username from content if present
  const creatorMatch = content.match(/@([a-zA-Z0-9_.-]+)/i);
  const matchedCreator = creatorMatch ? creatorMatch[1] : null;

  // Extract any personal note (excluding standard share template)
  const cleanNote = content
    .replace(/Check out this (?:echo|post) by @[^\s]+ on Echolet!?/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\/post(?:s)?\/[a-zA-Z0-9_-]+/gi, '')
    .trim();

  const [post, setPost] = useState<Post | null>(null);

  // Fetch post details if targetPostId is present
  useEffect(() => {
    if (!targetPostId) return;

    let isMounted = true;
    postService
      .getPostById(targetPostId)
      .then((data) => {
        if (isMounted && data) {
          setPost(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch post details for message card:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetPostId]);

  const creatorUsername = post?.user?.username || matchedCreator || 'user';
  const creatorAvatar = post?.user?.avatarUrl;
  const creatorFullName = post?.user?.fullName;
  const postSnippet = post?.content || '';
  const mediaImage = post?.mediaUrls?.[0] || initialMediaUrl;
  const isVideo =
    post?.mediaType === 'video' ||
    (mediaImage && /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(mediaImage));
  const isPoll = post?.mediaType === 'poll' || Boolean(post?.pollOptions?.length);

  const handleOpenPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetPostId) {
      navigate(`/post/${targetPostId}`);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 my-1 w-[220px] sm:w-[250px] select-none">
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

      {/* Post Card Container */}
      <div
        onClick={handleOpenPost}
        className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
          isMe
            ? 'bg-slate-900/90 hover:bg-slate-900 border-indigo-400/30 text-white'
            : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900'
        }`}
      >
        {/* Post Card Header */}
        <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={creatorAvatar}
              name={creatorFullName || creatorUsername}
              size="xs"
              className="w-6 h-6 shrink-0 text-[10px]"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold leading-tight block truncate">
                {creatorFullName || creatorUsername}
              </span>
              <span className="text-[10px] opacity-70 block truncate">
                @{creatorUsername}
              </span>
            </div>
          </div>

          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
              isMe
                ? 'bg-white/15 text-indigo-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}
          >
            Echo
          </span>
        </div>

        {/* Media Thumbnail Preview (if any) */}
        {mediaImage && (
          <div className="relative w-full aspect-video bg-black/10 overflow-hidden">
            {isVideo ? (
              <video
                src={mediaImage}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={mediaImage}
                alt="Echo media"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            {isVideo && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                  <HiOutlineFilm className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post Content Preview */}
        <div className="p-3 pt-2.5">
          {postSnippet ? (
            <p className="text-xs line-clamp-3 leading-relaxed opacity-90 break-words font-normal">
              {postSnippet}
            </p>
          ) : (
            <p className="text-xs italic opacity-60">Echo preview</p>
          )}

          {/* Badges for Poll or Additional Photos */}
          {isPoll && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-purple-600 dark:text-purple-300">
              <HiOutlineChartBar className="w-3.5 h-3.5" />
              <span>Poll ({post?.pollOptions?.length || 0} choices)</span>
            </div>
          )}

          {/* Card Footer: counts + open action */}
          <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] opacity-70">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <HiOutlineHeart className="w-3.5 h-3.5" />
                <span>{post?.likesCount || 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <HiOutlineChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                <span>{post?.commentsCount || 0}</span>
              </span>
            </div>

            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 group-hover:text-indigo-600 transition-colors">
              <span>View</span>
              <HiArrowTopRightOnSquare className="w-3 h-3 stroke-[2]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostMessageCard;
