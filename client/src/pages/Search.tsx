import { useState, useEffect, useTransition } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiXMark,
  HiOutlineUser,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineFilm,
  HiOutlineDocumentText,
  HiOutlinePlay,
  HiOutlineHeart,
  HiOutlineMusicalNote,
  HiOutlineArrowRight,
} from 'react-icons/hi2';
import searchService from '../services/searchService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { Post } from '../services/postService';
import type { Reel } from '../services/reelService';
import type { User } from '../services/authService';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useMessage } from '../context/MessageContext';

type SearchTab = 'all' | 'accounts' | 'posts' | 'reels';

export default function Search() {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;
  const { showMessage } = useMessage();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [accounts, setAccounts] = useState<UserProfileResponse[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const [selectedReelPreview, setSelectedReelPreview] = useState<Reel | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setAccounts([]);
      setPosts([]);
      setReels([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchService.search(trimmed, activeTab, 25);

        const initialFollowMap: Record<string, boolean> = {};
        (data.accounts || []).forEach((u) => {
          initialFollowMap[u.id] = Boolean(u.isFollowing);
        });

        startTransition(() => {
          setAccounts(data.accounts || []);
          setPosts(data.posts || []);
          setReels(data.reels || []);
          setFollowingMap((prev) => ({ ...prev, ...initialFollowMap }));
          setLoading(false);
        });
      } catch (err) {
        console.error('Search failed:', err);
        startTransition(() => {
          setAccounts([]);
          setPosts([]);
          setReels([]);
          setLoading(false);
        });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const toggleFollow = async (userId: string) => {
    const isCurrentlyFollowing = !!followingMap[userId];
    const nextState = !isCurrentlyFollowing;

    setFollowingMap((prev) => ({
      ...prev,
      [userId]: nextState,
    }));

    try {
      if (nextState) {
        await userService.followUser(userId);
      } else {
        await userService.unfollowUser(userId);
      }
    } catch {
      setFollowingMap((prev) => ({
        ...prev,
        [userId]: isCurrentlyFollowing,
      }));
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const totalResultsCount = accounts.length + posts.length + reels.length;

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">
          Explore Echolet
        </h1>
        <p className="text-sm text-slate-500">
          Search across posts, accounts, and short reels in real time.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full mb-4">
        <div className="relative flex items-center">
          <HiOutlineMagnifyingGlass className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none stroke-[2]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, @accounts, or reels..."
            autoFocus
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm sm:text-base text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/60 transition-all"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
              title="Clear search"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All', icon: HiOutlineMagnifyingGlass, count: totalResultsCount },
          { id: 'accounts', label: 'Accounts', icon: HiOutlineUser, count: accounts.length },
          { id: 'posts', label: 'Posts', icon: HiOutlineDocumentText, count: posts.length },
          { id: 'reels', label: 'Reels', icon: HiOutlineFilm, count: reels.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SearchTab)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-sm shadow-purple-500/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {query.trim() && !loading && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results Viewport */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-400">
              Searching {activeTab === 'all' ? 'Echolet' : activeTab}...
            </p>
          </div>
        ) : query.trim() ? (
          /* When results are present or empty */
          totalResultsCount === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <HiOutlineMagnifyingGlass className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No results found for &quot;{query}&quot;
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try searching for another keyword, username, hashtags, or switch tabs.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* === TAB: ALL or TAB: ACCOUNTS === */}
              {(activeTab === 'all' || activeTab === 'accounts') && accounts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineUser className="w-4 h-4 text-purple-500" />
                      <span>Accounts ({accounts.length})</span>
                    </h2>
                    {activeTab === 'all' && accounts.length > 4 && (
                      <button
                        onClick={() => setActiveTab('accounts')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                      >
                        View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {(activeTab === 'all' ? accounts.slice(0, 6) : accounts).map((user) => {
                      const isFollowing = !!followingMap[user.id];

                      return (
                        <div
                          key={user.id}
                          onClick={() => navigate(`/profile/${user.username}`)}
                          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                <Avatar
                                  src={user.avatarUrl}
                                  name={user.fullName || user.username}
                                  size="w-full h-full"
                                />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                                {user.fullName}
                              </h3>
                              <p className="text-xs font-medium text-slate-400 truncate">
                                @{user.username}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/messages/${user.username}`);
                              }}
                              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:text-purple-600 text-slate-600 transition-colors cursor-pointer"
                              title="Message"
                            >
                              <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4" />
                            </button>

                            {currentUser?.id !== user.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFollow(user.id);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isFollowing
                                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                                    : 'bg-gradient-to-r from-[#00b4d8] to-[#ff0080] text-white shadow-2xs hover:opacity-95'
                                }`}
                              >
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === TAB: ALL or TAB: REELS === */}
              {(activeTab === 'all' || activeTab === 'reels') && reels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineFilm className="w-4 h-4 text-purple-500" />
                      <span>Reels ({reels.length})</span>
                    </h2>
                    {activeTab === 'all' && reels.length > 4 && (
                      <button
                        onClick={() => setActiveTab('reels')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                      >
                        View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(activeTab === 'all' ? reels.slice(0, 4) : reels).map((reel) => {
                      return (
                        <div
                          key={reel.id}
                          onClick={() => setSelectedReelPreview(reel)}
                          className="group relative aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer select-none"
                        >
                          {reel.thumbnailUrl ? (
                            <img
                              src={reel.thumbnailUrl}
                              alt={reel.caption || 'Reel'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <video
                              src={reel.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          )}

                          {/* Gradient Overlays */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                          {/* Top Play/Duration Badge */}
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono flex items-center gap-1">
                            <HiOutlinePlay className="w-3 h-3 text-purple-400" />
                            {reel.duration ? `${reel.duration}s` : 'Reel'}
                          </div>

                          {/* Center Play Icon Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                              <HiOutlinePlay className="w-5 h-5 ml-0.5" />
                            </div>
                          </div>

                          {/* Bottom Info: Creator & Likes */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Avatar
                                src={reel.user?.avatarUrl}
                                name={reel.user?.fullName || reel.user?.username}
                                size="xs"
                                className="w-5 h-5 text-[9px] shrink-0"
                              />
                              <span className="text-xs font-semibold truncate drop-shadow-sm">
                                @{reel.user?.username}
                              </span>
                            </div>

                            {reel.caption && (
                              <p className="text-[11px] text-white/90 line-clamp-1 mb-1 font-normal">
                                {reel.caption}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-white/80">
                              <span className="flex items-center gap-1 font-bold">
                                <HiOutlineHeart className="w-3 h-3 text-rose-400" />
                                {reel.likesCount || 0}
                              </span>
                              {reel.audioTitle && (
                                <span className="flex items-center gap-1 truncate max-w-[90px]">
                                  <HiOutlineMusicalNote className="w-3 h-3 text-purple-300" />
                                  {reel.audioTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === TAB: ALL or TAB: POSTS === */}
              {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineDocumentText className="w-4 h-4 text-purple-500" />
                      <span>Posts ({posts.length})</span>
                    </h2>
                    {activeTab === 'all' && posts.length > 5 && (
                      <button
                        onClick={() => setActiveTab('posts')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                      >
                        View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {(activeTab === 'all' ? posts.slice(0, 5) : posts).map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={currentUser}
                        onPostDeleted={handlePostDeleted}
                        showToast={showMessage}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Initial Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3.5">
              <HiOutlineMagnifyingGlass className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Start typing to search Echolet
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Find accounts by name, posts by words or hashtags, and discover trending short reels.
            </p>
          </div>
        )}
      </div>

      {/* Reel Preview Modal (when clicking a reel from search) */}
      <Modal
        isOpen={Boolean(selectedReelPreview)}
        onClose={() => setSelectedReelPreview(null)}
        size="sm"
        backdropVariant="blur"
        showCloseButton={true}
        closeButtonPosition="outside"
      >
        {selectedReelPreview && (
          <div className="relative w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-end">
            <video
              src={selectedReelPreview.videoUrl}
              autoPlay
              controls
              loop
              playsInline
              className="w-full h-full object-cover"
            />

            <Link
              to={selectedReelPreview ? `/reels/${selectedReelPreview.id}` : '/reels'}
              className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white text-xs font-bold shadow-md hover:opacity-95"
            >
              Open in Reels Feed
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
