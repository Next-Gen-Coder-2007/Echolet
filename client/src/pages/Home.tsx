import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineArrowPath,
  HiOutlineChatBubbleLeftRight,
  HiOutlineBell,
} from 'react-icons/hi2';
import CreatePostCard from '../components/post/CreatePostCard';
import PostCard from '../components/post/PostCard';
import WhoToFollow from '../components/common/WhoToFollow';
import Stories from '../components/story/Stories';
import { useMessage } from '../context/MessageContext';
import postService, { type Post } from '../services/postService';
import type { User } from '../services/authService';
import getSocket from '../services/socket';

export default function Home() {
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;
  const { showMessage } = useMessage();

  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      showMessage(message, type);
    },
    [showMessage]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'google_success' || params.get('auth') === 'success') {
      showToast('Signed in with Google successfully! Welcome to Echolet.', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  const fetchFeed = useCallback(
    async (type: 'for-you' | 'following', isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await postService.getFeed(type, 1, 10);
        setPosts(data.posts || []);
        setPage(1);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        console.error('Failed to load feed:', err);
        showToast('Could not refresh feed. Check your connection.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await postService.getFeed(feedType, nextPage, 10);
      const newPosts = data.posts || [];
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filtered = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filtered];
      });
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      console.error('Failed to load more feed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, page, feedType]);

  useEffect(() => {
    fetchFeed(feedType);
  }, [feedType, fetchFeed]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMorePosts]);

  useEffect(() => {
    const socket = getSocket();

    const handleNewPost = (newPost: Post) => {
      if (newPost.userId === currentUser?.id) return;

      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostDeleted = ({ postId }: { postId: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    const handlePostPollVoted = (data: { postId: string; pollOptions: any[] }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === data.postId ? { ...p, pollOptions: data.pollOptions } : p))
      );
    };

    socket.on('new_post', handleNewPost);
    socket.on('post_deleted', handlePostDeleted);
    socket.on('post_poll_voted', handlePostPollVoted);

    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('post_deleted', handlePostDeleted);
      socket.off('post_poll_voted', handlePostPollVoted);
    };
  }, [currentUser?.id]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="w-full flex-1 relative select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="sticky top-2 md:top-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-2.5 sm:p-3.5 mb-4 sm:mb-5 flex items-center justify-between transition-all">
            <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFeedType('for-you')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  feedType === 'for-you'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <HiOutlineSparkles className="w-4 h-4 stroke-[2]" />
                <span>For You</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedType('following')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  feedType === 'following'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <HiOutlineUserGroup className="w-4 h-4 stroke-[2]" />
                <span>Following</span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/notifications"
                className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer relative"
                title="Notifications"
              >
                <HiOutlineBell className="w-5 h-5 stroke-[1.8]" />
              </Link>

              <button
                type="button"
                onClick={() => fetchFeed(feedType, true)}
                disabled={refreshing}
                className="p-2 sm:p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-all cursor-pointer disabled:opacity-40"
                title="Refresh feed"
              >
                <HiOutlineArrowPath
                  className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`}
                />
              </button>
            </div>
          </div>

          <div className="block lg:hidden">
            <Stories currentUser={currentUser} showToast={showToast} variant="feed" />
          </div>

          <CreatePostCard
            currentUser={currentUser}
            onPostCreated={handlePostCreated}
            showToast={showToast}
          />

          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs sm:text-sm font-semibold text-slate-400">Loading Echoes...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4">
                <HiOutlineChatBubbleLeftRight className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {feedType === 'following' ? 'No echoes from following yet' : 'No echoes shared yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {feedType === 'following'
                  ? 'Follow creators from the suggested list on the right or explore the "For You" feed!'
                  : 'Be the first voice to spark a conversation. Share an echo above!'}
              </p>
              {feedType === 'following' && (
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => setFeedType('for-you')}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
                  >
                    Explore For You
                  </button>
                  <Link
                    to="/search"
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Find People
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostDeleted={handlePostDeleted}
                  showToast={showToast}
                />
              ))}

              {/* Incremental Lazy Load Sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="py-5 flex justify-center items-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/90 shadow-2xs">
                      <HiOutlineArrowPath className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Retrieving more echoes...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-4 sticky top-6 self-start space-y-5">
          <WhoToFollow currentUser={currentUser} showToast={showToast} />
          <Stories currentUser={currentUser} showToast={showToast} />
        </div>
      </div>
    </div>
  );
}
