import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineHeart,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineBookmark,
  HiOutlineShare,
  HiOutlineLink,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowLeft,
  HiChevronDown,
  HiChevronUp,
  HiOutlineChartBar,
  HiOutlineClock,
} from 'react-icons/hi2';
import postService, { type Post, type PostComment } from '../services/postService';
import MediaViewerModal from '../components/MediaViewerModal';
import Avatar from '../components/Avatar';

/**
 * Recursive read-only comment component for public post view
 */
function PublicCommentNode({
  comment,
  allComments,
  depth,
  formatTime,
  renderFormattedContent,
  onPromptLogin,
}: {
  comment: PostComment;
  allComments: PostComment[];
  depth: number;
  formatTime: (dateStr: string) => string;
  renderFormattedContent: (text: string) => React.ReactNode;
  onPromptLogin: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const childReplies = allComments.filter((c) => c.parentId === comment.id);

  const indentClass =
    depth === 0
      ? ''
      : depth <= 6
      ? 'ml-3 sm:ml-5 pl-2.5 sm:pl-3.5 border-l-2 border-slate-200/90'
      : 'ml-2 pl-2 border-l-2 border-slate-300';

  return (
    <div className={`mt-2.5 ${indentClass}`}>
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors">
        <Avatar
          src={comment.user?.avatarUrl}
          name={comment.user?.fullName || comment.user?.username}
          size="sm"
          className="ring-1 ring-slate-200 shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-tight truncate">
                {comment.user?.fullName}
              </span>
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

          <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={onPromptLogin}
              className="flex items-center gap-1 hover:text-rose-600 transition-colors cursor-pointer"
              title="Log in to like"
            >
              <HiOutlineHeart className="w-3.5 h-3.5" />
              <span>{comment.likesCount || 0}</span>
            </button>

            <button
              type="button"
              onClick={onPromptLogin}
              className="hover:text-slate-900 transition-colors cursor-pointer text-[11px]"
            >
              Reply
            </button>

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
        </div>
      </div>

      {!collapsed && childReplies.length > 0 && (
        <div className="space-y-1">
          {childReplies.map((child) => (
            <PublicCommentNode
              key={child.id}
              comment={child}
              allComments={allComments}
              depth={depth + 1}
              formatTime={formatTime}
              renderFormattedContent={renderFormattedContent}
              onPromptLogin={onPromptLogin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicPostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    Promise.all([
      postService.getPostById(id),
      postService.getComments(id).catch(() => []),
    ])
      .then(([postData, commentsData]) => {
        if (isMounted) {
          setPost(postData);
          setComments(commentsData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load public post:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePromptLogin = () => {
    navigate('/login', { state: { from: `/post/${id}` } });
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

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
      return past.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

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
          >
            <span>{part}</span>
            <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 shrink-0 inline" />
          </a>
        );
      }
      if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span
            key={index}
            onClick={handlePromptLogin}
            className="font-bold text-slate-900 hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const mediaList = post?.mediaUrls || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      <MediaViewerModal
        isOpen={activeMediaIndex !== null}
        onClose={() => setActiveMediaIndex(null)}
        images={mediaList}
        initialIndex={activeMediaIndex ?? 0}
        authorName={post?.user?.fullName}
      />

      {/* Standalone Public Header (Not using AppLayout) */}
      <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-40 backdrop-blur-md shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs group-hover:scale-105 transition-transform">
              E
            </span>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              Echolet
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              state={{ from: `/post/${id}` }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Log In
            </Link>
            <Link
              to="/register"
              state={{ from: `/post/${id}` }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl sm:max-w-3xl w-full mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/90 shadow-sm">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs sm:text-sm font-semibold text-slate-400">Loading post...</p>
          </div>
        ) : error || !post ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Echo Not Found</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
              This post may have been removed by its author or the link is invalid.
            </p>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Back link */}
            <div className="flex items-center justify-between">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <HiOutlineArrowLeft className="w-4 h-4" />
                <span>Explore Echolet</span>
              </Link>

              {copiedLink && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Link copied to clipboard!
                </span>
              )}
            </div>

            {/* Standalone Post Card */}
            <article className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 select-none">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={post.user?.avatarUrl}
                    name={post.user?.fullName || post.user?.username}
                    size="xl"
                    className="w-12 h-12 rounded-full ring-1 ring-slate-200 shrink-0"
                  />

                  <div>
                    <div className="font-bold text-base text-slate-900 leading-tight">
                      {post.user?.fullName}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>@{post.user?.username} · {formatTime(post.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Share post"
                >
                  <HiOutlineShare className="w-5 h-5" />
                </button>
              </div>

              {/* Text content */}
              {post.content && (
                <div className="text-base sm:text-lg text-slate-900 leading-relaxed whitespace-pre-wrap break-words mb-4 font-normal">
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
                        alt="Echo media"
                        className="w-full h-auto max-h-[520px] object-cover sm:object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.015]"
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

              {/* Poll Widget */}
              {post.pollOptions && post.pollOptions.length >= 2 && (
                <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-slate-50 to-indigo-50/40 border border-purple-200/80 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                      <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        <HiOutlineChartBar className="w-3.5 h-3.5" />
                      </div>
                      <span>Poll</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {Boolean(post.isPollExpired || (post.pollExpiresAt && new Date(post.pollExpiresAt) <= new Date())) ? (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Poll Ended
                        </span>
                      ) : post.pollExpiresAt ? (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <HiOutlineClock className="w-3 h-3 text-amber-600" />
                          Timed Poll
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          No timer
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-full">
                        {post.pollOptions.reduce((s, o) => s + (o.votes || 0), 0)} votes
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const totalVotes = post.pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                      return post.pollOptions.map((opt, idx) => {
                        const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                        return (
                          <div
                            key={idx}
                            onClick={handlePromptLogin}
                            className="relative overflow-hidden p-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm cursor-pointer hover:border-purple-300 transition-all select-none"
                          >
                            <div
                              style={{ width: `${pct}%` }}
                              className="absolute top-0 bottom-0 left-0 bg-purple-100/70 transition-all duration-500 rounded-xl"
                            />
                            <div className="relative z-10 flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-800">{opt.text}</span>
                              <span className="font-semibold text-slate-600 text-xs">{pct}% ({opt.votes || 0})</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2.5 text-right font-medium">
                    Log in to vote and participate
                  </p>
                </div>
              )}

              {/* Post Activity & Reactions Summary Row (Public View) */}
              {((Array.isArray(post.reactions) && post.reactions.length > 0) || (post.commentsCount || 0) > 0) && (
                <div className="flex items-center justify-between pb-3 px-0.5 text-xs text-slate-500 font-medium select-none">
                  {Array.isArray(post.reactions) && post.reactions.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center -space-x-1">
                        {Array.from(new Set(post.reactions.map((r) => r.emoji))).slice(0, 3).map((emoji, i) => (
                          <span
                            key={emoji}
                            style={{ zIndex: 3 - i }}
                            className="w-5 h-5 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-xs shadow-2xs"
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                      <span className="font-semibold text-slate-600 text-xs">
                        {post.reactions.length} {post.reactions.length === 1 ? 'reaction' : 'reactions'}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {(post.commentsCount || 0) > 0 && (
                    <span className="text-xs font-semibold text-slate-400">
                      {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                    </span>
                  )}
                </div>
              )}

              {/* Engagement Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-slate-600 text-xs sm:text-sm font-semibold">
                <button
                  type="button"
                  onClick={handlePromptLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Log in to like"
                >
                  <HiOutlineHeart className="w-5 h-5" />
                  <span>Like</span>
                </button>

                <button
                  type="button"
                  onClick={handlePromptLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Comments"
                >
                  <HiOutlineChatBubbleOvalLeftEllipsis className="w-5 h-5" />
                  <span>{post.commentsCount || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePromptLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Save post"
                >
                  <HiOutlineBookmark className="w-5 h-5" />
                  <span>{post.bookmarksCount || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Copy link"
                >
                  <HiOutlineLink className="w-5 h-5" />
                </button>
              </div>
            </article>

            {/* Prominent Call to Action Banner */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Join the conversation on Echolet
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md leading-relaxed">
                  Sign in or create an account to reply to this echo, like comments, and follow creators.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <Link
                  to="/login"
                  state={{ from: `/post/${id}` }}
                  className="flex-1 sm:flex-none text-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  state={{ from: `/post/${id}` }}
                  className="flex-1 sm:flex-none text-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            {/* Discussion Thread (Public Read-Only with Infinite Nesting) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Replies & Discussion ({comments.length})
                </h3>
                <button
                  type="button"
                  onClick={handlePromptLogin}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  + Write reply
                </button>
              </div>

              {comments.length === 0 ? (
                <p className="text-center text-xs sm:text-sm text-slate-400 py-6">
                  No replies yet. Be the first to join the discussion!
                </p>
              ) : (
                <div className="space-y-2">
                  {rootComments.map((rootComm) => (
                    <PublicCommentNode
                      key={rootComm.id}
                      comment={rootComm}
                      allComments={comments}
                      depth={0}
                      formatTime={formatTime}
                      renderFormattedContent={renderFormattedContent}
                      onPromptLogin={handlePromptLogin}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
    </div>
  );
}
