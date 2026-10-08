import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineBookmark,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import postService, { type Post } from '../services/postService';
import PostCard from '../components/PostCard';
import type { User } from '../services/authService';

export default function Saved() {
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    postService
      .getSavedPosts()
      .then((data) => {
        if (isMounted) {
          setPosts(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPosts([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full flex-1 select-none">
      {/* Header Container */}
      <div className="sticky top-4 z-30 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 mb-5 flex items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <HiOutlineArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <HiOutlineBookmark className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none truncate">
                    Saved Echoes
                  </h1>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
                    {posts.length} {posts.length === 1 ? 'echo' : 'echoes'}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center max-w-xs w-full sm:w-64">
              <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved echoes..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs sm:text-sm font-semibold text-slate-400">Loading saved echoes...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <HiOutlineBookmark className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {search ? 'No matching saved echoes' : 'No saved echoes yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                {search
                  ? 'Try adjusting your search terms.'
                  : 'When you see an echo you love, click the bookmark icon to save it here.'}
              </p>
              {!search && (
                <Link
                  to="/"
                  className="mt-4 inline-block px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Explore Feed
                </Link>
              )}
            </div>
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
  );
}
