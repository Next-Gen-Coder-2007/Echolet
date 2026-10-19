import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineUser,
} from 'react-icons/hi2';
import postService, { type Post } from '../services/postService';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import type { User } from '../services/authService';

export default function PostDetail({ user: propUser }: { user?: User | null } = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = propUser !== undefined ? propUser : outletContext?.user;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    postService
      .getPostById(id)
      .then((data) => {
        if (isMounted) {
          setPost(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <div className="w-full flex-1 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8">
          {/* Header bar */}
          <div className="sticky top-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 mb-5 flex items-center gap-3 transition-all">
            <Link
              to="/"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Echo</h1>
              <p className="text-xs text-slate-400">View discussion and replies</p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs sm:text-sm font-semibold text-slate-400">Loading Echo...</p>
            </div>
          ) : error || !post ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <HiOutlineChatBubbleBottomCenterText className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Echo not found</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                This post may have been deleted or the link is invalid.
              </p>
              <Link
                to="/"
                className="mt-4 inline-block px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Go to Feed
              </Link>
            </div>
          ) : (
            <PostCard
              post={post}
              currentUser={currentUser}
              onPostDeleted={() => setPost(null)}
            />
          )}
        </div>

        {/* Right Info Sidebar */}
        <div className="hidden lg:block lg:col-span-4 sticky top-4 self-start space-y-5">
          {post?.user && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3.5">Author Info</h3>
              <div
                onClick={() => navigate(`/profile/${post.user?.username}`)}
                className="flex items-center gap-3 cursor-pointer group mb-4"
              >
                <Avatar
                  src={post.user.avatarUrl}
                  name={post.user.fullName || post.user.username}
                  size="w-12 h-12"
                  className="ring-1 ring-slate-200 group-hover:ring-slate-400 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                    {post.user.fullName}
                  </div>
                  <div className="text-xs text-slate-400 truncate">@{post.user.username}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${post.user?.username}`)}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HiOutlineUser className="w-3.5 h-3.5" />
                  <span>View Profile</span>
                </button>
                {currentUser?.id !== post.user.id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${post.user?.username}`)}
                    className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <HiOutlineChatBubbleOvalLeftEllipsis className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Discussion Rules</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Keep discussions respectful and constructive. You can reply directly to any comment to create threaded conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
