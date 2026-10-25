import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  HiOutlineBookmark,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineFilm,
  HiOutlineDocumentText,
  HiOutlineSquares2X2,
  HiOutlineFolderPlus,
  HiOutlinePencilSquare,
  HiOutlineFolder,
  HiOutlineArrowsUpDown,
} from 'react-icons/hi2';
import postService, { type Post } from '../services/postService';
import reelService, { type Reel } from '../services/reelService';
import collectionService, { type BookmarkCollection } from '../services/collectionService';
import PostCard from '../components/PostCard';
import ReelGridCard from '../components/ReelGridCard';
import BookmarkCollectionModal from '../components/BookmarkCollectionModal';
import SaveToCollectionModal from '../components/SaveToCollectionModal';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';

export default function Saved() {
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;
  const { showSuccess, showError } = useMessage();

  // Active folder / collection: 'all' or user-created collection name
  const [activeCollection, setActiveCollection] = useState<string>('all');
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);

  // Content state
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'reels'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [loadingMoreReels, setLoadingMoreReels] = useState(false);

  // Modals state
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<BookmarkCollection | null>(null);

  // Item move to collection modal state
  const [moveModalItem, setMoveModalItem] = useState<{
    id: string;
    type: 'post' | 'reel';
    currentCollection: string;
    title?: string;
  } | null>(null);

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    try {
      const res = await collectionService.getCollections();
      setCollections(res.collections || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, []);

  // Fetch saved items (posts and reels)
  const fetchSavedItems = useCallback(async (collection: string) => {
    try {
      const [savedPosts, savedReelsRes] = await Promise.all([
        postService.getSavedPosts(collection).catch(() => []),
        reelService.getSavedReels(0, 15, collection).catch(() => ({ reels: [], hasMore: false, total: 0 })),
      ]);
      setPosts(savedPosts || []);
      setReels(savedReelsRes.reels || []);
      setReelsHasMore(Boolean(savedReelsRes.hasMore));
    } catch (err) {
      console.error('Failed to load saved items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    collectionService.getCollections()
      .then((res) => {
        if (isMounted) setCollections(res.collections || []);
      })
      .catch((err) => {
        console.error('Failed to load collections:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      postService.getSavedPosts(activeCollection).catch(() => []),
      reelService.getSavedReels(0, 15, activeCollection).catch(() => ({ reels: [], hasMore: false, total: 0 })),
    ])
      .then(([savedPosts, savedReelsRes]) => {
        if (isMounted) {
          setPosts(savedPosts || []);
          setReels(savedReelsRes.reels || []);
          setReelsHasMore(Boolean(savedReelsRes.hasMore));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load saved items:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollection]);

  const handleLoadMoreReels = async () => {
    if (loadingMoreReels || !reelsHasMore) return;
    setLoadingMoreReels(true);
    try {
      const res = await reelService.getSavedReels(reels.length, 15, activeCollection);
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
    fetchCollections();
  };

  const handleReelRemoved = (reelId: string) => {
    setReels((prev) => prev.filter((r) => r.id !== reelId));
    fetchCollections();
  };

  // Create or Update Collection Handler
  const handleSaveCollection = async (data: { name: string; icon: string; color: string }) => {
    try {
      if (collectionToEdit) {
        await collectionService.updateCollection(collectionToEdit.id, data);
        showSuccess(`Collection "${data.name}" updated!`);
        if (activeCollection === collectionToEdit.name) {
          setActiveCollection(data.name);
        }
      } else {
        const created = await collectionService.createCollection(data);
        showSuccess(`Collection "${created.name}" created!`);
        setLoading(true);
        setActiveCollection(created.name);
      }
      await fetchCollections();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save collection';
      showError(msg);
      throw err;
    }
  };

  // Delete Collection Handler
  const handleDeleteCollection = async (
    id: string,
    action: 'move_to_default' | 'delete_bookmarks'
  ) => {
    try {
      await collectionService.deleteCollection(id, action);
      showSuccess('Collection deleted');
      setLoading(true);
      setActiveCollection('all');
      await fetchCollections();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete collection';
      showError(msg);
      throw err;
    }
  };

  // Move item (post or reel) to a different collection
  const handleMoveItemCollection = async (targetCollectionName: string) => {
    if (!moveModalItem) return;
    try {
      if (moveModalItem.type === 'post') {
        await postService.updateBookmarkCollection(moveModalItem.id, targetCollectionName);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === moveModalItem.id
              ? { ...p, bookmarkCollection: targetCollectionName }
              : p
          )
        );
      } else {
        await reelService.updateReelBookmarkCollection(moveModalItem.id, targetCollectionName);
        setReels((prev) =>
          prev.map((r) =>
            r.id === moveModalItem.id
              ? { ...r, bookmarkCollection: targetCollectionName }
              : r
          )
        );
      }

      showSuccess(`Moved to "${targetCollectionName}"`);
      await fetchCollections();

      // If filtering by a specific folder and moved out, refresh
      if (activeCollection !== 'all' && activeCollection !== targetCollectionName) {
        fetchSavedItems(activeCollection);
      }
    } catch (err: unknown) {
      showError('Failed to move item');
      console.error(err);
    }
  };

  const handleCreateCollectionInline = async (name: string) => {
    const created = await collectionService.createCollection({ name, icon: '', color: '#6366f1' });
    await fetchCollections();
    await handleMoveItemCollection(created.name);
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
  const currentCollectionObj = collections.find((c) => c.name === activeCollection);

  return (
    <div className="w-full flex-1 select-none pb-14">
      {/* Top Header Bar */}
      <div className="sticky top-14 md:top-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <HiOutlineBookmark className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none truncate">
                Saved & Bookmarks
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
                {activeCollection === 'all'
                  ? `${totalCount} total ${totalCount === 1 ? 'item' : 'items'}`
                  : `${totalCount} in ${activeCollection}`}
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
            placeholder={`Search ${activeCollection === 'all' ? 'all saved' : activeCollection}...`}
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Folders & Collections Shelf */}
      <div className="mb-5 bg-white/80 backdrop-blur-xs p-3 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <HiOutlineFolder className="w-4 h-4 text-purple-600" />
            <span>Collections & Folders</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setCollectionToEdit(null);
              setIsCollectionModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <HiOutlineFolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Scrollable Folder Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All Saved Items Chip */}
          <button
            type="button"
            onClick={() => setActiveCollection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
              activeCollection === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-102'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
            }`}
          >
            <span>All Items</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCollection === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {collections.reduce((sum, c) => sum + c.totalCount, 0) || totalCount}
            </span>
          </button>

          {/* User Collections */}
          {collections.map((col) => {
            const isActive = activeCollection === col.name;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveCollection(col.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-102'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.color || '#8b5cf6' }}
                />
                <span>{col.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {col.totalCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Custom Collection Banner */}
      {currentCollectionObj && (
        <div className="mb-5 p-3.5 sm:p-4 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: `${currentCollectionObj.color}20`,
                color: currentCollectionObj.color,
              }}
            >
              <HiOutlineFolder className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                {currentCollectionObj.name}
              </h2>
              <p className="text-xs text-slate-500">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} saved in this folder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCollectionToEdit(currentCollectionObj);
                setIsCollectionModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <HiOutlinePencilSquare className="w-3.5 h-3.5" />
              <span>Edit Folder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCollection('all')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-white/80 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* Content Filter Tabs: All | Echoes (Posts) | Reels */}
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
                      {search
                        ? 'No matching saved posts'
                        : activeCollection !== 'all'
                        ? `No saved posts in "${activeCollection}" yet`
                        : 'No saved posts yet'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                      {activeCollection !== 'all'
                        ? `Save posts to "${activeCollection}" to keep them organized here.`
                        : 'Bookmark posts you want to refer back to later.'}
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <div key={post.id} className="relative group/postCard">
                      {/* Folder / Collection Badge Bar above card */}
                      <div className="flex items-center justify-between px-3 py-1 mb-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="font-semibold text-slate-700">
                            {post.bookmarkCollection && post.bookmarkCollection !== 'Default'
                              ? `Folder: ${post.bookmarkCollection}`
                              : 'Saved'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMoveModalItem({
                              id: post.id,
                              type: 'post',
                              currentCollection: post.bookmarkCollection || 'Default',
                              title: post.content?.slice(0, 30),
                            })
                          }
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer transition-colors"
                        >
                          <HiOutlineArrowsUpDown className="w-3.5 h-3.5" />
                          <span>Change Folder</span>
                        </button>
                      </div>

                      <PostCard
                        post={post}
                        currentUser={currentUser}
                        onPostDeleted={handlePostDeleted}
                      />
                    </div>
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
                      {search
                        ? 'No matching saved reels'
                        : activeCollection !== 'all'
                        ? `No saved reels in "${activeCollection}" yet`
                        : 'No saved reels yet'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                      Save short reels to watch them here whenever you want.
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
                      <div key={reel.id} className="relative group/reelCard flex flex-col">
                        <ReelGridCard
                          reel={reel}
                          currentUser={currentUser}
                          mode="saved"
                          onReelRemoved={handleReelRemoved}
                        />
                        {/* Change Folder Action under Reel Card */}
                        <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-slate-500">
                          <span className="truncate max-w-[80px] font-semibold text-slate-600">
                            {reel.bookmarkCollection && reel.bookmarkCollection !== 'Default'
                              ? reel.bookmarkCollection
                              : 'Saved'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveModalItem({
                                id: reel.id,
                                type: 'reel',
                                currentCollection: reel.bookmarkCollection || 'Default',
                                title: reel.caption?.slice(0, 30),
                              });
                            }}
                            className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                          >
                            Move
                          </button>
                        </div>
                      </div>
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
                {search
                  ? 'No matching saved items'
                  : activeCollection !== 'all'
                  ? `No saved items in "${activeCollection}" yet`
                  : 'No saved items yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                {search
                  ? 'Try searching with different keywords.'
                  : activeCollection !== 'all'
                  ? `Organize your saved items by moving posts or reels into "${activeCollection}".`
                  : 'Save posts or reels you want to keep handy!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bookmark Collection Create/Edit Modal */}
      {isCollectionModalOpen && (
        <BookmarkCollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => {
            setIsCollectionModalOpen(false);
            setCollectionToEdit(null);
          }}
          collectionToEdit={collectionToEdit}
          onSave={handleSaveCollection}
          onDelete={handleDeleteCollection}
        />
      )}

      {/* Move Item to Collection Modal */}
      {moveModalItem && (
        <SaveToCollectionModal
          isOpen={Boolean(moveModalItem)}
          onClose={() => setMoveModalItem(null)}
          collections={collections}
          currentCollection={moveModalItem.currentCollection}
          itemTitle={moveModalItem.title}
          onSelectCollection={handleMoveItemCollection}
          onCreateCollectionInline={handleCreateCollectionInline}
        />
      )}
    </div>
  );
}
