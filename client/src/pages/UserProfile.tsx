import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import userService, { type UserProfileResponse } from '../services/userService';
import postService, { type Post } from '../services/postService';
import reelService, { type Reel } from '../services/reelService';
import PostCard from '../components/PostCard';
import ReelGridCard from '../components/ReelGridCard';
import type { User } from '../services/authService';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const [profileUser, setProfileUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'echoes' | 'reels'>('echoes');
  const [posts, setPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [loadingMoreReels, setLoadingMoreReels] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [echoesCount, setEchoesCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!username) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    userService
      .getUserByUsername(username)
      .then((data) => {
        if (isMounted) {
          if (data.username && username.toLowerCase() !== data.username.toLowerCase()) {
            navigate(`/profile/${data.username}`, { replace: true });
          }
          setProfileUser(data);
          setIsFollowing(Boolean(data.isFollowing));
          setFollowersCount(data.followersCount || 0);
          setFollowingCount(data.followingCount || 0);
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
  }, [username, navigate]);

  useEffect(() => {
    if (!profileUser?.username) return;

    let isMounted = true;
    setPostsLoading(true);

    if (activeTab === 'reels') {
      reelService
        .getUserReels(profileUser.username, 0, 15)
        .then((res) => {
          if (isMounted) {
            setUserReels(res.reels || []);
            setReelsHasMore(res.hasMore);
            setPostsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setUserReels([]);
            setReelsHasMore(false);
            setPostsLoading(false);
          }
        });
    } else {
      postService
        .getUserPosts(profileUser.username, activeTab)
        .then((data) => {
          if (isMounted) {
            setPosts(data);
            if (activeTab === 'echoes') {
              setEchoesCount(data.length);
            }
            setPostsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setPosts([]);
            setPostsLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [profileUser?.username, activeTab]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setEchoesCount((prev) => Math.max(0, prev - 1));
  };

  const handleToggleFollow = async () => {
    if (!profileUser || isFollowSubmitting) return;

    setIsFollowSubmitting(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextState) {
        const res = await userService.followUser(profileUser.id);
        setFollowersCount(res.followersCount);
      } else {
        const res = await userService.unfollowUser(profileUser.id);
        setFollowersCount(res.followersCount);
      }
    } catch {
      setIsFollowing(!nextState);
      setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  const handleLoadMoreReels = async () => {
    if (!profileUser?.username || loadingMoreReels || !reelsHasMore) return;
    setLoadingMoreReels(true);
    try {
      const res = await reelService.getUserReels(profileUser.username, userReels.length, 15);
      setUserReels((prev) => [...prev, ...res.reels]);
      setReelsHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load more reels:', err);
    } finally {
      setLoadingMoreReels(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 py-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="w-full flex-1 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl mb-6 cursor-pointer"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">User Not Found</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            The account @{username} doesn&apos;t exist or may have been removed.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer hover:bg-slate-800"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const initials = profileUser.fullName
    ? profileUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const joinedDate = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="w-full flex-1">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer"
        >
          <HiOutlineArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {profileUser.fullName}
          </h1>
          <p className="text-xs text-slate-400">@{profileUser.username}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden mb-6">
        <div className="h-36 sm:h-52 w-full bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] relative overflow-hidden">
          {profileUser.bannerUrl ? (
            <img
              src={profileUser.bannerUrl}
              alt={`${profileUser.fullName}'s banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080]" />
          )}
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-5">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-white shadow-md">
              <div className="w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {profileUser.avatarUrl ? (
                    <img
                      src={profileUser.avatarUrl}
                      alt={profileUser.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                      {initials}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {currentUser?.id === profileUser.id ||
            currentUser?.username?.toLowerCase() === profileUser.username?.toLowerCase() ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/settings/profile')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs cursor-pointer transition-all active:scale-95"
                >
                  <HiOutlinePencilSquare className="w-4 h-4 text-purple-600" />
                  <span>Edit Profile</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate(`/messages/${profileUser.username}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer transition-all"
                >
                  <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4 text-slate-700" />
                  <span>Message</span>
                </button>

                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowSubmitting}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {profileUser.fullName}
            </h2>
            <p className="text-sm font-semibold text-purple-600">
              @{profileUser.username}
            </p>
            {profileUser.bio && (
              <p className="text-xs sm:text-sm text-slate-700 font-normal mt-2.5 leading-relaxed whitespace-pre-line max-w-2xl">
                {profileUser.bio}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-6">
            <div className="flex items-center gap-1.5">
              <HiOutlineCalendar className="w-4 h-4 text-slate-400" />
              <span>Joined {joinedDate}</span>
            </div>

            {profileUser.email && (
              <div className="flex items-center gap-1.5">
                <HiOutlineEnvelope className="w-4 h-4 text-slate-400" />
                <span>{profileUser.email}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-900 mr-1.5">
                {followersCount}
              </span>
              <span className="text-slate-400">Followers</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 mr-1.5">{followingCount}</span>
              <span className="text-slate-400">Following</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 mr-1.5">{echoesCount}</span>
              <span className="text-slate-400">Echoes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-2 mb-6">
            <div className="flex border-b border-slate-100">
              {(['echoes', 'reels'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs sm:text-sm font-bold capitalize transition-colors cursor-pointer border-b-2 ${
                    activeTab === tab
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab === 'echoes' ? 'Posts' : 'Reels'}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-4">
              {postsLoading ? (
                <div className="p-10 text-center">
                  <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading {activeTab}...</p>
                </div>
              ) : activeTab === 'reels' ? (
                userReels.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-xs text-slate-400">
                      No reels shared by @{profileUser.username} yet.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                      {userReels.map((reel) => (
                        <ReelGridCard
                          key={reel.id}
                          reel={reel}
                          currentUser={currentUser}
                          mode="profile"
                        />
                      ))}
                    </div>

                    {/* Pagination / Load More 15 Reels */}
                    {reelsHasMore && (
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
                )
              ) : posts.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-xs text-slate-400">
                    No {activeTab} shared by @{profileUser.username} yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {posts.map((post) => (
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
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="hidden lg:block lg:col-span-4 sticky top-4 self-start space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">About @{profileUser.username}</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Total Echoes</span>
                <span className="font-bold text-slate-900">{echoesCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Followers</span>
                <span className="font-bold text-slate-900">{followersCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Following</span>
                <span className="font-bold text-slate-900">{followingCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Member Since</span>
                <span className="font-semibold text-slate-800">{joinedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
