import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineXMark,
  HiOutlineHandThumbUp,
  HiHandThumbUp,
  HiOutlineHandThumbDown,
  HiHandThumbDown,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlineBars3BottomLeft,
  HiOutlineEllipsisVertical,
  HiChevronDown,
  HiChevronUp,
  HiOutlineChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import reelService, { type Reel, type ReelComment } from '../../services/reelService';
import type { User } from '../../services/authService';
import { useMessage } from '../../context/MessageContext';
import Avatar from '../common/Avatar';

interface ReelCommentsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  reel: Reel;
  currentUser?: User | null;
  onCommentsCountChange?: (count: number) => void;
}

function formatTimeAgoYouTube(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

export default function ReelCommentsSidePanel({
  isOpen,
  onClose,
  reel,
  currentUser,
  onCommentsCountChange,
}: ReelCommentsSidePanelProps) {
  const { showMessage } = useMessage();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inputContent, setInputContent] = useState('');
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    username: string;
  } | null>(null);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [activeMenuCommentId, setActiveMenuCommentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const commentsListRef = useRef<HTMLDivElement | null>(null);

  // Fetch comments when opened or reel changed
  useEffect(() => {
    if (!isOpen || !reel?.id) return;

    let isMounted = true;
    setLoading(true);

    reelService
      .getComments(reel.id)
      .then((data) => {
        if (isMounted) {
          setComments(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load reel comments:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, reel?.id]);

  // Close context dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuCommentId(null);
    };
    if (activeMenuCommentId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuCommentId]);

  // Handle submitting comment or reply
  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputContent.trim();
    if (!content || submitting || !currentUser) {
      if (!currentUser) {
        showMessage('Please log in to comment', 'info');
      }
      return;
    }

    setSubmitting(true);
    try {
      const parentId = replyingTo?.id || null;
      const res = await reelService.addComment(reel.id, content, parentId);

      if (parentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), res.comment],
              };
            }
            return c;
          })
        );
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        setComments((prev) => [res.comment, ...prev]);
        if (commentsListRef.current) {
          commentsListRef.current.scrollTop = 0;
        }
      }

      setInputContent('');
      setReplyingTo(null);
      if (onCommentsCountChange) {
        onCommentsCountChange(res.commentsCount);
      }
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      showMessage(err?.response?.data?.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle like or dislike reaction
  const handleToggleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!currentUser) {
      showMessage('Please log in to react to comments', 'info');
      return;
    }

    try {
      const res = await reelService.toggleCommentReaction(commentId, type);

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              likesCount: res.likesCount,
              dislikesCount: res.dislikesCount,
              userReaction: res.userReaction,
            };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: c.replies.map((reply) =>
                reply.id === commentId
                  ? {
                      ...reply,
                      likesCount: res.likesCount,
                      dislikesCount: res.dislikesCount,
                      userReaction: res.userReaction,
                    }
                  : reply
              ),
            };
          }
          return c;
        })
      );
    } catch (err: any) {
      console.error('Reaction failed:', err);
      showMessage('Could not update reaction', 'error');
    }
  };

  // Pin or unpin comment (creator only)
  const handleTogglePin = async (commentId: string) => {
    if (!currentUser || currentUser.id !== reel.userId) {
      showMessage('Only the reel creator can pin a comment', 'error');
      return;
    }

    try {
      const res = await reelService.togglePinComment(reel.id, commentId);

      setComments((prev) => {
        const updated = prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, isPinned: res.isPinned };
          }
          if (res.isPinned) {
            return { ...c, isPinned: false };
          }
          return c;
        });

        return [...updated].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (sortBy === 'top') {
            return (b.likesCount || 0) - (a.likesCount || 0);
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      showMessage(res.message, 'success');
      setActiveMenuCommentId(null);
    } catch (err: any) {
      console.error('Pin comment error:', err);
      showMessage(err?.response?.data?.message || 'Failed to pin comment', 'error');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const res = await reelService.deleteComment(commentId);

      if (parentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).filter((r) => r.id !== commentId),
              };
            }
            return c;
          })
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }

      if (onCommentsCountChange) {
        onCommentsCountChange(res.commentsCount);
      }
      showMessage('Comment deleted', 'success');
      setActiveMenuCommentId(null);
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      showMessage('Failed to delete comment', 'error');
    }
  };

  const handleStartReply = (commentId: string, authorUsername: string) => {
    setReplyingTo({ id: commentId, username: authorUsername });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleExpandReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleSort = () => {
    const nextSort = sortBy === 'top' ? 'newest' : 'top';
    setSortBy(nextSort);
    setComments((prev) =>
      [...prev].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (nextSort === 'top') {
          return (b.likesCount || 0) - (a.likesCount || 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    );
  };

  if (!isOpen) return null;

  const isReelCreator = currentUser?.id === reel.userId;

  return (
    <>
      {/* Mobile Backdrop - Semi-transparent dark overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998] md:hidden animate-in fade-in duration-200"
      />

      {/* Main Comments Container:
          - Mobile (< md): Half-height bottom sheet (~58vh) with rounded-t-[32px] curve borders popping from bottom
          - Desktop (>= md): Docked side-by-side card with the video */}
      <div className="fixed bottom-0 inset-x-0 z-[9999] h-[58vh] max-h-[72vh] rounded-t-[32px] border-t border-slate-200/90 shadow-[0_-12px_40px_rgba(0,0,0,0.28)] bg-white flex flex-col overflow-hidden text-slate-800 select-none animate-in slide-in-from-bottom duration-300 ease-out md:static md:z-20 md:w-full md:max-w-[380px] sm:md:max-w-[400px] md:h-full md:rounded-3xl md:border md:border-slate-200/90 md:shadow-sm md:animate-in md:slide-in-from-right-4 md:duration-200">
        {/* Mobile Drag / Grabber Indicator Pill */}
        <div
          onClick={onClose}
          className="pt-3 pb-1 flex justify-center md:hidden shrink-0 cursor-pointer"
          title="Tap or drag to close"
        >
          <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors" />
        </div>

        {/* Header (Comments count + Sort + Close) */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Comments
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
              {reel.commentsCount || comments.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Sort Toggle Button */}
            <button
              onClick={toggleSort}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={`Sorting by: ${sortBy === 'top' ? 'Top comments' : 'Newest'}`}
            >
              <HiOutlineBars3BottomLeft className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close comments"
            >
              <HiOutlineXMark className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Comments Scrollable Area */}
        <div
          ref={commentsListRef}
          className="comments-scroll-area flex-1 overflow-y-auto px-4 py-3.5 space-y-3 scroll-smooth"
        >
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-24 text-center px-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 shadow-2xs">
                <HiOutlineChatBubbleOvalLeftEllipsis className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">No comments yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Be the first to share your thoughts on this reel!
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = currentUser?.id === comment.userId;
              const isCommentByCreator = comment.userId === reel.userId;
              const hasReplies = comment.replies && comment.replies.length > 0;
              const isRepliesExpanded = expandedReplies[comment.id];

              return (
                <div
                  key={comment.id}
                  className={`group flex flex-col gap-1 transition-colors rounded-2xl p-2.5 ${
                    comment.isPinned
                      ? 'bg-amber-50/70 border border-amber-200/80 shadow-2xs'
                      : 'bg-slate-50/70 border border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Pinned by creator badge */}
                  {comment.isPinned && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md w-fit mb-1 border border-amber-200/60">
                      <BsPinAngleFill className="w-3.5 h-3.5 text-amber-600 rotate-45" />
                      <span>Pinned by creator</span>
                    </div>
                  )}

                  {/* Main Comment Row */}
                  <div className="flex items-start gap-2.5">
                    {/* User Avatar */}
                    <Link
                      to={`/profile/${comment.user?.username}`}
                      className="shrink-0 mt-0.5"
                    >
                      <Avatar
                        src={comment.user?.avatarUrl}
                        name={comment.user?.fullName || comment.user?.username}
                        size="w-8 h-8"
                        className="border border-slate-200"
                      />
                    </Link>

                    {/* Content & Actions */}
                    <div className="flex-1 min-w-0">
                      {/* Name, Creator Check, Time, Menu */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/profile/${comment.user?.username}`}
                            className="text-xs font-bold text-slate-900 hover:text-purple-600 truncate"
                          >
                            @{comment.user?.username}
                          </Link>

                          {isCommentByCreator && (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase">
                              Creator
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            · {formatTimeAgoYouTube(comment.createdAt)}
                          </span>
                        </div>

                        {/* Three dots menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuCommentId((prev) =>
                                prev === comment.id ? null : comment.id
                              );
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                          >
                            <HiOutlineEllipsisVertical className="w-4 h-4" />
                          </button>

                          {/* Context Menu Popup */}
                          {activeMenuCommentId === comment.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-6 z-30 w-36 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                            >
                              {isReelCreator && (
                                <button
                                  onClick={() => handleTogglePin(comment.id)}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  {comment.isPinned ? (
                                    <>
                                      <BsPinAngleFill className="w-3.5 h-3.5 rotate-45 text-amber-500" />
                                      <span>Unpin</span>
                                    </>
                                  ) : (
                                    <>
                                      <BsPinAngle className="w-3.5 h-3.5" />
                                      <span>Pin comment</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {(isCommentAuthor || isReelCreator) && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                >
                                  <HiOutlineTrash className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(comment.content);
                                  showMessage('Comment copied', 'info');
                                  setActiveMenuCommentId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-600 cursor-pointer"
                              >
                                Copy text
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Comment Content */}
                      <p className="text-xs sm:text-sm font-normal text-slate-700 leading-relaxed mt-0.5 break-words">
                        {comment.content}
                      </p>

                      {/* Interaction Action Row */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {/* Like Button */}
                        <button
                          onClick={() => handleToggleReaction(comment.id, 'like')}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            comment.userReaction === 'like'
                              ? 'text-purple-600 font-bold'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                          title="Like"
                        >
                          {comment.userReaction === 'like' ? (
                            <HiHandThumbUp className="w-3.5 h-3.5" />
                          ) : (
                            <HiOutlineHandThumbUp className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-semibold">
                            {comment.likesCount ? comment.likesCount : ''}
                          </span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleToggleReaction(comment.id, 'dislike')}
                          className={`flex items-center transition-colors cursor-pointer ${
                            comment.userReaction === 'dislike'
                              ? 'text-rose-500 font-bold'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                          title="Dislike"
                        >
                          {comment.userReaction === 'dislike' ? (
                            <HiHandThumbDown className="w-3.5 h-3.5" />
                          ) : (
                            <HiOutlineHandThumbDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Reply Button */}
                        <button
                          onClick={() =>
                            handleStartReply(
                              comment.id,
                              comment.user?.username || 'user'
                            )
                          }
                          className="text-[11px] font-bold text-slate-500 hover:text-purple-600 cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Nested Replies Toggle */}
                      {hasReplies && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleExpandReplies(comment.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer py-0.5"
                          >
                            {isRepliesExpanded ? (
                              <HiChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <HiChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                            <span>
                              {comment.replies!.length}{' '}
                              {comment.replies!.length === 1 ? 'reply' : 'replies'}
                            </span>
                          </button>

                          {/* Expanded Replies Thread */}
                          {isRepliesExpanded && (
                            <div className="mt-2 space-y-2 pl-3 border-l-2 border-slate-200/90 ml-2">
                              {comment.replies!.map((reply) => {
                                const isReplyAuthor = currentUser?.id === reply.userId;
                                const isReplyCreator = reply.userId === reel.userId;

                                return (
                                  <div
                                    key={reply.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-start gap-2.5"
                                  >
                                    <Link
                                      to={`/profile/${reply.user?.username}`}
                                      className="shrink-0 mt-0.5"
                                    >
                                      <Avatar
                                        src={reply.user?.avatarUrl}
                                        name={reply.user?.fullName || reply.user?.username}
                                        size="w-6 h-6"
                                        className="border border-slate-200"
                                      />
                                    </Link>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Link
                                          to={`/profile/${reply.user?.username}`}
                                          className="text-xs font-bold text-slate-900 hover:text-purple-600 truncate"
                                        >
                                          @{reply.user?.username}
                                        </Link>

                                        {isReplyCreator && (
                                          <span className="px-1 py-0.2 rounded bg-purple-100 text-purple-700 text-[8px] font-extrabold uppercase">
                                            Creator
                                          </span>
                                        )}

                                        <span className="text-[11px] text-slate-400">
                                          · {formatTimeAgoYouTube(reply.createdAt)}
                                        </span>
                                      </div>

                                      <p className="text-xs sm:text-sm font-normal text-slate-700 leading-relaxed mt-0.5 break-words">
                                        {reply.content}
                                      </p>

                                      <div className="flex items-center gap-4 mt-1.5 text-xs">
                                        <button
                                          onClick={() => handleToggleReaction(reply.id, 'like')}
                                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                                            reply.userReaction === 'like'
                                              ? 'text-purple-600 font-bold'
                                              : 'text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          {reply.userReaction === 'like' ? (
                                            <HiHandThumbUp className="w-3.5 h-3.5" />
                                          ) : (
                                            <HiOutlineHandThumbUp className="w-3.5 h-3.5" />
                                          )}
                                          <span className="text-[10px] font-semibold">
                                            {reply.likesCount ? reply.likesCount : ''}
                                          </span>
                                        </button>

                                        <button
                                          onClick={() => handleToggleReaction(reply.id, 'dislike')}
                                          className={`flex items-center transition-colors cursor-pointer ${
                                            reply.userReaction === 'dislike'
                                              ? 'text-rose-500 font-bold'
                                              : 'text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          {reply.userReaction === 'dislike' ? (
                                            <HiHandThumbDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <HiOutlineHandThumbDown className="w-3.5 h-3.5" />
                                          )}
                                        </button>

                                        <button
                                          onClick={() =>
                                            handleStartReply(
                                              comment.id,
                                              reply.user?.username || 'user'
                                            )
                                          }
                                          className="text-[10px] font-bold text-slate-500 hover:text-purple-600 cursor-pointer"
                                        >
                                          Reply
                                        </button>

                                        {(isReplyAuthor || isReelCreator) && (
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(reply.id, comment.id)
                                            }
                                            className="text-slate-400 hover:text-rose-600 transition-colors ml-auto p-0.5"
                                            title="Delete reply"
                                          >
                                            <HiOutlineTrash className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Sticky Input Bar */}
        <div className="p-3.5 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0">
          {/* Replying banner */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs mb-2 border border-purple-200/60">
              <span>
                Replying to <span className="font-bold">@{replyingTo.username}</span>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-purple-500 hover:text-purple-800 cursor-pointer"
                title="Cancel reply"
              >
                <HiOutlineXMark className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2.5">
            {/* Current User Circular Avatar */}
            <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
              <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                <Avatar
                  src={currentUser?.avatarUrl}
                  name={currentUser?.fullName || currentUser?.username}
                  size="w-full h-full"
                  textClassName="text-xs"
                />
              </div>
            </div>

            {/* Input Line */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.username}...`
                    : 'Add a comment...'
                }
                className="w-full py-2 pl-3.5 pr-10 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
              />

              {inputContent.trim() && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white hover:opacity-95 transition-all cursor-pointer shadow-2xs"
                  title="Post comment"
                >
                  <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
