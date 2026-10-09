import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiHeart,
  HiOutlineHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineBookmark,
  HiBookmark,
  HiOutlineShare,
  HiOutlineEllipsisHorizontal,
  HiOutlineTrash,
  HiOutlineLink,
  HiOutlinePaperAirplane,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowsPointingOut,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi2';
import postService, { type Post, type PostComment } from '../services/postService';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';
import MediaViewerModal from './MediaViewerModal';

interface PostCardProps {
  post: Post;
  currentUser?: User | null;
  onPostDeleted?: (postId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface RecursiveCommentItemProps {
  comment: PostComment;
  allComments: PostComment[];
  depth: number;
  currentUser?: User | null;
  postAuthorId: string;
  onToggleLike: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onSubmitReply: (parentId: string, text: string) => Promise<void>;
  formatTime: (dateStr: string) => string;
  renderFormattedContent: (text: string) => React.ReactNode;
}

/**
 * Truly recursive comment component that nests infinitely to ANY depth.
 * Allows replying to any reply with inline reply composer and collapse/expand threads.
 */
function RecursiveCommentItem({
  comment,
  allComments,
  depth,
  currentUser,
  postAuthorId,
  onToggleLike,
  onDeleteComment,
  onSubmitReply,
  formatTime,
  renderFormattedContent,
}: RecursiveCommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Find all direct children of this comment
  const childReplies = allComments.filter((c) => c.parentId === comment.id);

  const authorInitial =
    comment.user?.fullName?.[0] || comment.user?.username?.[0] || 'U';
  const canDelete =
    currentUser?.id === comment.userId || currentUser?.id === postAuthorId;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || submittingReply) return;

    setSubmittingReply(true);
    try {
      await onSubmitReply(comment.id, trimmed);
      setReplyText('');
      setIsReplying(false);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Indentation logic: indent progressively, capped at depth 6 so mobile screens stay responsive
  const indentClass =
    depth === 0
      ? ''
      : depth <= 6
      ? 'ml-3 sm:ml-5 pl-2.5 sm:pl-3.5 border-l-2 border-slate-200/90'
      : 'ml-2 pl-2 border-l-2 border-slate-300';

  return (
    <div className={`mt-2.5 ${indentClass}`}>
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors group">
        <Link to={`/profile/${comment.user?.username}`} className="shrink-0">
          {comment.user?.avatarUrl ? (
            <img
              src={comment.user.avatarUrl}
              alt={comment.user.fullName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              {authorInitial}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/profile/${comment.user?.username}`}
                className="font-bold text-xs sm:text-sm text-slate-900 hover:text-slate-700 leading-tight truncate"
              >
                {comment.user?.fullName}
              </Link>
              <span className="text-[10px] text-slate-400">
                @{comment.user?.username}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">
              {formatTime(comment.createdAt)}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-800 mt-1 whitespace-pre-wrap break-words leading-relaxed font-normal">
            {renderFormattedContent(comment.content)}
          </div>

          {/* Comment Action Bar */}
          <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
            {/* Like Comment */}
            <button
              type="button"
              onClick={() => onToggleLike(comment.id)}
              className={`flex items-center gap-1 cursor-pointer transition-colors ${
                comment.isLiked ? 'text-rose-600' : 'hover:text-rose-600'
              }`}
            >
              {comment.isLiked ? (
                <HiHeart className="w-4 h-4 text-rose-600" />
              ) : (
                <HiOutlineHeart className="w-4 h-4" />
              )}
              <span>{comment.likesCount || 0}</span>
            </button>

            {/* Reply Button */}
            <button
              type="button"
              onClick={() => setIsReplying(!isReplying)}
              className={`flex items-center gap-1 cursor-pointer transition-colors ${
                isReplying ? 'text-slate-900 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <HiOutlineArrowUturnLeft className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>

            {/* Collapse toggle if replies exist */}
            {childReplies.length > 0 && (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-0.5 text-slate-400 hover:text-slate-700 text-[11px] cursor-pointer ml-auto"
              >
                {collapsed ? (
                  <>
                    <HiChevronDown className="w-3 h-3" />
                    <span>Show {childReplies.length} {childReplies.length === 1 ? 'reply' : 'replies'}</span>
                  </>
                ) : (
                  <>
                    <HiChevronUp className="w-3 h-3" />
                    <span>Hide replies</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Inline Reply Form */}
          {isReplying && (
            <form onSubmit={handleSendReply} className="mt-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in">
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus-within:border-slate-500 shadow-2xs">
                <input
                  type="text"
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to @${comment.user?.username || 'user'}...`}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-1.5 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyText.trim() || submittingReply}
                  className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-all flex items-center gap-1"
                >
                  {submittingReply ? 'Sending...' : 'Reply'}
                </button>
              </div>
            </form>
          )}
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteComment(comment.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-opacity"
            title="Delete comment"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Render Nested Children Recursively */}
      {!collapsed && childReplies.length > 0 && (
        <div className="space-y-1">
          {childReplies.map((child) => (
            <RecursiveCommentItem
              key={child.id}
              comment={child}
              allComments={allComments}
              depth={depth + 1}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
              onToggleLike={onToggleLike}
              onDeleteComment={onDeleteComment}
              onSubmitReply={onSubmitReply}
              formatTime={formatTime}
              renderFormattedContent={renderFormattedContent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({
  post,
  currentUser,
  onPostDeleted,
  showToast,
}: PostCardProps) {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    } else {
      showMessage(msg, type);
    }
  };

  // Post states
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount || 0);

  // Dropdown & Menu
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media Viewer modal for viewing photos
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  // Comments section
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isAuthor = currentUser?.id === post.userId;
  const authorInitial = post.user?.fullName?.[0] || post.user?.username?.[0] || 'U';

  const formatTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m`;
      if (diffHour < 24) return `${diffHour}h`;
      if (diffDay < 7) return `${diffDay}d`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      notify('Please log in to like this echo', 'info');
      navigate('/login');
      return;
    }

    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await postService.toggleLike(post.id);
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
    } catch {
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      notify('Failed to update like status', 'error');
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentUser) {
      notify('Please log in to save this echo', 'info');
      navigate('/login');
      return;
    }

    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    setBookmarksCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await postService.toggleBookmark(post.id);
      setIsBookmarked(res.isBookmarked);
      setBookmarksCount(res.bookmarksCount);
      notify(
        res.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks',
        'info'
      );
    } catch {
      setIsBookmarked(!nextState);
      setBookmarksCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      notify('Failed to update bookmark', 'error');
    }
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard?.writeText(postUrl);
    setShowMenu(false);
    notify('Post link copied to clipboard!', 'info');
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this Echo?')) return;

    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
      notify('Echo deleted', 'info');
      onPostDeleted?.(post.id);
    } catch {
      notify('Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const toggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && comments.length === 0) {
      setLoadingComments(true);
      try {
        const fetched = await postService.getComments(post.id);
        setComments(fetched);
      } catch {
        notify('Failed to load comments', 'error');
      } finally {
        setLoadingComments(false);
      }
    }
  };

  // Add top-level comment
  const handleAddTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify('Please log in to leave a comment', 'info');
      navigate('/login');
      return;
    }

    const text = newCommentText.trim();
    if (!text || submittingComment) return;

    setSubmittingComment(true);
    try {
      const { comment, commentsCount: updatedCount } = await postService.addComment(
        post.id,
        text
      );
      setComments((prev) => [...prev, comment]);
      setCommentsCount(updatedCount);
      setNewCommentText('');
      notify('Comment added', 'success');
    } catch {
      notify('Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Add nested reply to any comment or sub-comment
  const handleAddNestedReply = async (parentId: string, text: string) => {
    if (!currentUser) {
      notify('Please log in to reply', 'info');
      navigate('/login');
      return;
    }

    try {
      const { comment, commentsCount: updatedCount } = await postService.addComment(
        post.id,
        text,
        parentId
      );
      setComments((prev) => [...prev, comment]);
      setCommentsCount(updatedCount);
      notify('Reply posted', 'success');
    } catch {
      notify('Failed to post reply', 'error');
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!currentUser) {
      notify('Please log in to like comments', 'info');
      navigate('/login');
      return;
    }

    // Optimistic toggle
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likesCount: nextLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1),
          };
        }
        return c;
      })
    );

    try {
      const res = await postService.toggleCommentLike(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isLiked: res.isLiked, likesCount: res.likesCount } : c))
      );
    } catch {
      // Revert if error
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const reverted = !c.isLiked;
            return {
              ...c,
              isLiked: reverted,
              likesCount: reverted ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1),
            };
          }
          return c;
        })
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { commentsCount: updatedCount } = await postService.deleteComment(commentId);
      // Remove this comment and all its nested descendants
      setComments((prev) => {
        const toDeleteIds = new Set<string>([commentId]);
        let added = true;
        while (added) {
          added = false;
          for (const c of prev) {
            if (c.parentId && toDeleteIds.has(c.parentId) && !toDeleteIds.has(c.id)) {
              toDeleteIds.add(c.id);
              added = true;
            }
          }
        }
        return prev.filter((c) => !toDeleteIds.has(c.id));
      });
      setCommentsCount(updatedCount);
      notify('Comment deleted', 'info');
    } catch {
      notify('Failed to delete comment', 'error');
    }
  };

  // Auto-linked content
  const renderFormattedContent = (text: string) => {
    const regex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-700 hover:underline break-all inline-flex items-center gap-0.5 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 shrink-0 inline" />
          </a>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            className="font-bold text-slate-900 hover:text-purple-600 hover:underline cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/search?q=${encodeURIComponent(part)}`);
            }}
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        const handle = part.slice(1);
        return (
          <span
            key={index}
            className="font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${handle}`);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Root comments (depth 0)
  const rootComments = comments.filter((c) => !c.parentId);

  const mediaList = post.mediaUrls || [];

  return (
    <>
      <MediaViewerModal
        isOpen={activeMediaIndex !== null}
        onClose={() => setActiveMediaIndex(null)}
        images={mediaList}
        initialIndex={activeMediaIndex ?? 0}
        authorName={post.user?.fullName}
      />

      <article
        id={`post-${post.id}`}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5 select-none transition-all hover:border-slate-300"
      >
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <Link
              to={`/profile/${post.user?.username}`}
              className="shrink-0 group block"
            >
              {post.user?.avatarUrl ? (
                <img
                  src={post.user.avatarUrl}
                  alt={post.user.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-slate-400 transition-all"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 group-hover:bg-slate-800 transition-colors">
                  {authorInitial}
                </div>
              )}
            </Link>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/profile/${post.user?.username}`}
                  className="font-bold text-sm sm:text-base text-slate-900 hover:text-slate-700 transition-colors leading-tight"
                >
                  {post.user?.fullName}
                </Link>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400 font-medium">
                  {formatTime(post.createdAt)}
                </span>
              </div>
              <Link
                to={`/profile/${post.user?.username}`}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors block mt-0.5"
              >
                @{post.user?.username}
              </Link>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Options"
            >
              <HiOutlineEllipsisHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-9 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 animate-in fade-in">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <HiOutlineLink className="w-4 h-4 text-slate-500" />
                  Copy link
                </button>

                {isAuthor && (
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <HiOutlineTrash className="w-4 h-4 text-rose-500" />
                    Delete Echo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {post.content && (
          <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap break-words mb-3.5 font-normal">
            {renderFormattedContent(post.content)}
          </div>
        )}

        {mediaList.length > 0 && (
          <div className="mb-4">
            {mediaList.length === 1 && (
              <div
                onClick={() => setActiveMediaIndex(0)}
                className="relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900/5 cursor-pointer group shadow-2xs hover:shadow-md transition-all duration-300 max-h-[520px] flex items-center justify-center"
              >
                <img
                  src={mediaList[0]}
                  alt="Echo attachment"
                  className="w-full h-auto max-h-[520px] object-cover sm:object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.015]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 pointer-events-none" />
                <div className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md transform translate-y-1 group-hover:translate-y-0">
                  <HiOutlineArrowsPointingOut className="w-4 h-4" />
                </div>
              </div>
            )}

            {mediaList.length === 2 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100/50 p-1.5 shadow-2xs">
                {mediaList.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveMediaIndex(i)}
                    className="relative aspect-4/3 rounded-xl overflow-hidden cursor-pointer group bg-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Echo attachment ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 pointer-events-none" />
                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                      <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mediaList.length === 3 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100/50 p-1.5 shadow-2xs aspect-[16/10] sm:aspect-[16/9]">
                <div
                  onClick={() => setActiveMediaIndex(0)}
                  className="relative h-full rounded-xl overflow-hidden cursor-pointer group bg-slate-200"
                >
                  <img
                    src={mediaList[0]}
                    alt="Echo attachment 1"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 pointer-events-none" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                    <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="grid grid-rows-2 gap-2 h-full">
                  {mediaList.slice(1, 3).map((url, i) => (
                    <div
                      key={i + 1}
                      onClick={() => setActiveMediaIndex(i + 1)}
                      className="relative h-full rounded-xl overflow-hidden cursor-pointer group bg-slate-200"
                    >
                      <img
                        src={url}
                        alt={`Echo attachment ${i + 2}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 pointer-events-none" />
                      <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                        <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mediaList.length >= 4 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100/50 p-1.5 shadow-2xs">
                {mediaList.slice(0, 4).map((url, i) => {
                  const isFourthAndMore = i === 3 && mediaList.length > 4;
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveMediaIndex(i)}
                      className="relative aspect-4/3 rounded-xl overflow-hidden cursor-pointer group bg-slate-200"
                    >
                      <img
                        src={url}
                        alt={`Echo attachment ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {isFourthAndMore ? (
                        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white font-bold group-hover:bg-slate-950/65 transition-colors">
                          <span className="text-xl sm:text-2xl font-black">+{mediaList.length - 3}</span>
                          <span className="text-[11px] font-medium text-slate-300">more photos</span>
                        </div>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 pointer-events-none" />
                          <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                            <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Engagement Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-slate-600 text-xs sm:text-sm font-semibold">
          {/* Like */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isLiked
                ? 'text-rose-600 bg-rose-50'
                : 'hover:text-rose-600 hover:bg-slate-100'
            }`}
            title="Like"
          >
            {isLiked ? (
              <HiHeart className="w-5 h-5 text-rose-600 scale-110 transition-transform" />
            ) : (
              <HiOutlineHeart className="w-5 h-5" />
            )}
            <span>{likesCount}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={toggleComments}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              showComments ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Comments"
          >
            <HiOutlineChatBubbleOvalLeftEllipsis className="w-5 h-5" />
            <span>{commentsCount}</span>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isBookmarked
                ? 'text-slate-900 bg-slate-100'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Save / Bookmark"
          >
            {isBookmarked ? (
              <HiBookmark className="w-5 h-5 text-slate-900" />
            ) : (
              <HiOutlineBookmark className="w-5 h-5" />
            )}
            <span>{bookmarksCount}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            title="Share link"
          >
            <HiOutlineShare className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Comments Section (Arbitrary Infinite Nesting) */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 animate-in fade-in">
            {/* Top-Level Add Comment Bar */}
            <form onSubmit={handleAddTopComment}>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Leave a comment on this echo..."
                  className="flex-1 bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submittingComment}
                  className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                >
                  {submittingComment ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <HiOutlinePaperAirplane className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-xs sm:text-sm text-slate-400 py-3 font-medium">
                No comments yet. Start the conversation!
              </p>
            ) : (
              <div
                data-lenis-prevent
                className="space-y-2 max-h-96 overflow-y-auto pr-1"
              >
                {rootComments.map((rootComm) => (
                  <RecursiveCommentItem
                    key={rootComm.id}
                    comment={rootComm}
                    allComments={comments}
                    depth={0}
                    currentUser={currentUser}
                    postAuthorId={post.userId}
                    onToggleLike={handleToggleCommentLike}
                    onDeleteComment={handleDeleteComment}
                    onSubmitReply={handleAddNestedReply}
                    formatTime={formatTime}
                    renderFormattedContent={renderFormattedContent}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    </>
  );
}
