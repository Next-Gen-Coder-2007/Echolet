import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineBookmark,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineFilm,
  HiOutlineDocumentText,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import postService, { type Post } from '../services/postService';
import reelService, { type Reel } from '../services/reelService';
import PostCard from '../components/PostCard';
import ReelGridCard from '../components/ReelGridCard';
import type { User } from '../services/authService';

export default function Saved() {
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const [filterType, setFilterType] = useState<'all' | 'posts' | 'reels'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [loadingMoreReels, setLoadingMoreReels] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      postService.getSavedPosts().catch(() => []),
      reelService.getSavedReels(0, 15).catch(() => ({ reels: [], hasMore: false, total: 0 })),
    ]).then(([savedPosts, savedReelsRes]) => {
      if (isMounted) {
        setPosts(savedPosts || []);
        setReels(savedReelsRes.reels || []);
        setReelsHasMore(Boolean(savedReelsRes.hasMore));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoadMoreReels = async () => {
    if (loadingMoreReels || !reelsHasMore) return;
    setLoadingMoreReels(true);
    try {
      const res = await reelService.getSavedReels(reels.length, 15);
      setReels((prev) => [...prev, ...res.reels]);
      setReelsHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load more saved reels:', err);
    } finally {
      setLoadingMoreReels(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleReelRemoved = (reelId: string) => {
    setReels((prev) => prev.filter((r) => r.id !== reelId));
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReels = reels.filter(
    (r) =>
      r.caption?.toLowerCase().includes(search.toLowerCase()) ||
      r.audioTitle?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = posts.length + reels.length;

  return (
    <div className="w-full flex-1 select-none pb-12">
      {/* Top Header Bar */}
      <div className="sticky top-6 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <HiOutlineBookmark className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none truncate">
                Saved Items
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
                {totalCount} saved {totalCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center max-w-full sm:max-w-xs w-full sm:w-64">
          <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved echoes & reels..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs: All | Echoes (Posts) | Reels */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setFilterType('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HiOutlineSquares2X2 className="w-3.5 h-3.5" />
          <span>All</span>
          <span className="text-[10px] opacity-75">({totalCount})</span>
        </button>

        <button
          onClick={() => setFilterType('posts')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            filterType === 'posts'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HiOutlineDocumentText className="w-3.5 h-3.5" />
          <span>Posts</span>
          <span className="text-[10px] opacity-75">({posts.length})</span>
        </button>

        <button
          onClick={() => setFilterType('reels')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            filterType === 'reels'
              ? 'bg-gradient-to-r from-[#00b4d8] to-[#7928ca] text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HiOutlineFilm className="w-3.5 h-3.5" />
          <span>Reels</span>
          <span className="text-[10px] opacity-75">({reels.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-semibold text-slate-400">Loading saved items...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Posts Section */}
          {(filterType === 'all' || filterType === 'posts') && (
            <div className="space-y-4">
              {filterType === 'all' && (
                <div className="flex items-center justify-between pb-1">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiOutlineDocumentText className="w-3.5 h-3.5" />
                    <span>Saved Posts ({filteredPosts.length})</span>
                  </h2>
                </div>
              )}

              {filteredPosts.length === 0 ? (
                filterType === 'posts' ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <HiOutlineBookmark className="w-7 h-7 stroke-[1.8]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {search ? 'No matching saved posts' : 'No saved posts yet'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                      Bookmark posts you want to refer back to later.
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reels Section */}
          {(filterType === 'all' || filterType === 'reels') && (
            <div className="space-y-3">
              {filterType === 'all' && (
                <div className="flex items-center justify-between pb-1 pt-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HiOutlineFilm className="w-3.5 h-3.5" />
                    <span>Saved Reels ({filteredReels.length})</span>
                  </h2>
                </div>
              )}

              {filteredReels.length === 0 ? (
                filterType === 'reels' ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                      <HiOutlineFilm className="w-7 h-7 stroke-[1.8]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {search ? 'No matching saved reels' : 'No saved reels yet'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                      Save short reels in the Reels tab to watch them here whenever you want.
                    </p>
                    <Link
                      to="/reels"
                      className="mt-4 inline-block px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#00b4d8] to-[#7928ca] text-white shadow-xs hover:opacity-95 transition-all"
                    >
                      Browse Reels
                    </Link>
                  </div>
                ) : null
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {filteredReels.map((reel) => (
                      <ReelGridCard
                        key={reel.id}
                        reel={reel}
                        currentUser={currentUser}
                        mode="saved"
                        onReelRemoved={handleReelRemoved}
                      />
                    ))}
                  </div>

                  {reelsHasMore && !search && (
                    <div className="pt-6 pb-2 text-center">
                      <button
                        onClick={handleLoadMoreReels}
                        disabled={loadingMoreReels}
                        className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-white border border-slate-200 shadow-xs hover:border-purple-300 text-slate-700 hover:text-purple-600 transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        {loadingMoreReels ? (
                          <>
                            <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                            <span>Loading next 15 reels...</span>
                          </>
                        ) : (
                          <span>Load More Reels</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state for 'All' view */}
          {filterType === 'all' && filteredPosts.length === 0 && filteredReels.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <HiOutlineBookmark className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {search ? 'No matching saved items' : 'No saved items yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                {search
                  ? 'Try searching with different keywords.'
                  : 'Save posts or reels you want to keep handy!'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
