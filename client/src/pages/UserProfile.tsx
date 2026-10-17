import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlinePencilSquare,
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import userService, { type UserProfileResponse } from '../services/userService';
import postService, { type Post } from '../services/postService';
import reelService, { type Reel } from '../services/reelService';
import getSocket from '../services/socket';
import PostCard from '../components/PostCard';
import ReelGridCard from '../components/ReelGridCard';
import FollowListModal from '../components/FollowListModal';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;
  const { showSuccess, showError, showWarning } = useMessage();

  const [profileUser, setProfileUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [hasIncomingFollowRequest, setHasIncomingFollowRequest] = useState(false);
  const [canViewContent, setCanViewContent] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [isRequestProcessing, setIsRequestProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'echoes' | 'reels'>('echoes');
  const [posts, setPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [loadingMoreReels, setLoadingMoreReels] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [echoesCount, setEchoesCount] = useState(0);

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  const handleOpenFollowModal = (tab: 'followers' | 'following') => {
    const isProfileSelf =
      currentUser?.id === profileUser?.id ||
      currentUser?.username?.toLowerCase() === profileUser?.username?.toLowerCase();

    if (!canViewContent && !isProfileSelf) {
      showError('This account is private. Follow to view followers and following.', 'Private Account');
      return;
    }
    setFollowModalTab(tab);
    setFollowModalOpen(true);
  };

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
          setIsRequested(Boolean(data.hasPendingFollowRequest));
          setIsFollowedBy(Boolean(data.isFollowedBy));
          setHasIncomingFollowRequest(Boolean(data.hasIncomingFollowRequest));
          setCanViewContent(Boolean(data.canViewContent));
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

  // Real-time socket updates for follow relationships & requests
  useEffect(() => {
    if (!profileUser?.id || !currentUser?.id) return;

    const socket = getSocket();

    const handleFollowUpdated = (data: { followerId: string; followingId: string; isFollowing: boolean }) => {
      if (data.followerId === currentUser.id && data.followingId === profileUser.id) {
        setIsFollowing(data.isFollowing);
        if (data.isFollowing) {
          setIsRequested(false);
          setCanViewContent(true);
        }
      } else if (data.followerId === profileUser.id && data.followingId === currentUser.id) {
        setIsFollowedBy(data.isFollowing);
      }
    };

    const handleFollowRequestUpdated = (data: { requesterId: string; targetId: string; status: string }) => {
      if (data.requesterId === currentUser.id && data.targetId === profileUser.id) {
        if (data.status === 'accepted') {
          setIsFollowing(true);
          setIsRequested(false);
          setCanViewContent(true);
          showSuccess(`@${profileUser.username} accepted your follow request!`, 'Request Approved');
        } else if (data.status === 'declined' || data.status === 'cancelled') {
          setIsRequested(false);
        } else if (data.status === 'pending') {
          setIsRequested(true);
        }
      } else if (data.requesterId === profileUser.id && data.targetId === currentUser.id) {
        if (data.status === 'pending') {
          setHasIncomingFollowRequest(true);
        } else {
          setHasIncomingFollowRequest(false);
        }
      }
    };

    socket.on('follow_updated', handleFollowUpdated);
    socket.on('follow_request_updated', handleFollowRequestUpdated);

    return () => {
      socket.off('follow_updated', handleFollowUpdated);
      socket.off('follow_request_updated', handleFollowRequestUpdated);
    };
  }, [profileUser?.id, profileUser?.username, currentUser?.id, showSuccess]);

  // Load posts or reels only if canViewContent is true
  useEffect(() => {
    if (!profileUser?.username || !canViewContent) {
      setPosts([]);
      setUserReels([]);
      setPostsLoading(false);
      return;
    }

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
  }, [profileUser?.username, activeTab, canViewContent]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setEchoesCount((prev) => Math.max(0, prev - 1));
  };

  const handleToggleFollow = async () => {
    if (!profileUser || isFollowSubmitting) return;

    setIsFollowSubmitting(true);

    // If currently following or requested, clicking means unfollow / cancel request
    if (isFollowing || isRequested) {
      const prevFollowing = isFollowing;
      const prevRequested = isRequested;
      setIsFollowing(false);
      setIsRequested(false);
      if (prevFollowing) {
        setFollowersCount((prev) => Math.max(0, prev - 1));
      }
      if (profileUser.isPrivate && currentUser?.id !== profileUser.id) {
        setCanViewContent(false);
      }

      try {
        const res = await userService.unfollowUser(profileUser.id);
        setFollowersCount(res.followersCount);
        showSuccess(
          prevRequested ? 'Follow request cancelled' : `Unfollowed @${profileUser.username}`,
          'Updated'
        );
      } catch {
        setIsFollowing(prevFollowing);
        setIsRequested(prevRequested);
        if (prevFollowing) {
          setFollowersCount((prev) => prev + 1);
        }
        if (profileUser.isPrivate && currentUser?.id !== profileUser.id) {
          setCanViewContent(prevFollowing);
        }
      } finally {
        setIsFollowSubmitting(false);
      }
      return;
    }

    // Attempting to follow:
    try {
      const res = await userService.followUser(profileUser.id);
      if (res.isRequested) {
        setIsRequested(true);
        setIsFollowing(false);
        showSuccess(`Follow request sent to @${profileUser.username}`, 'Request Sent');
      } else {
        setIsFollowing(true);
        setIsRequested(false);
        setCanViewContent(true);
        setFollowersCount(res.followersCount);
        showSuccess(`Now following @${profileUser.username}`, 'Following');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to follow user', 'Action Failed');
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  const handleAcceptIncomingRequest = async () => {
    if (!profileUser || isRequestProcessing) return;
    setIsRequestProcessing(true);
    try {
      const requests = await userService.getPendingFollowRequests();
      const targetReq = requests.find((r) => r.requesterId === profileUser.id);
      if (targetReq) {
        const res = await userService.acceptFollowRequest(targetReq.id);
        setHasIncomingFollowRequest(false);
        setIsFollowedBy(Boolean(res.isFollowingRequester));
        showSuccess(`Accepted @${profileUser.username}'s follow request`, 'Request Approved');
      } else {
        setHasIncomingFollowRequest(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to accept follow request', 'Error');
    } finally {
      setIsRequestProcessing(false);
    }
  };

  const handleDeclineIncomingRequest = async () => {
    if (!profileUser || isRequestProcessing) return;
    setIsRequestProcessing(true);
    try {
      const requests = await userService.getPendingFollowRequests();
      const targetReq = requests.find((r) => r.requesterId === profileUser.id);
      if (targetReq) {
        await userService.declineFollowRequest(targetReq.id);
        setHasIncomingFollowRequest(false);
        showSuccess(`Declined @${profileUser.username}'s follow request`, 'Request Declined');
      } else {
        setHasIncomingFollowRequest(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to decline follow request', 'Error');
    } finally {
      setIsRequestProcessing(false);
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

  const isSelf =
    currentUser?.id === profileUser.id ||
    currentUser?.username?.toLowerCase() === profileUser.username?.toLowerCase();

  return (
    <div className="w-full flex-1">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer"
        >
          <HiOutlineArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {profileUser.fullName}
              </h1>
              {profileUser.isPrivate && (
                <span title="Private Account" className="p-1 rounded-full bg-slate-100 text-slate-600">
                  <HiOutlineLockClosed className="w-3.5 h-3.5 stroke-[2]" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">@{profileUser.username}</p>
          </div>
        </div>
      </div>

      {/* Incoming Follow Request Notification Alert */}
      {hasIncomingFollowRequest && !isSelf && (
        <div className="mb-5 p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <HiOutlineUserPlus className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                @{profileUser.username} sent you a follow request
              </p>
              <p className="text-[11px] text-slate-500">
                They want to follow your account and view your private updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAcceptIncomingRequest}
              disabled={isRequestProcessing}
              className="flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={handleDeclineIncomingRequest}
              disabled={isRequestProcessing}
              className="flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Profile Card */}
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

            {isSelf ? (
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
                {(() => {
                  const canMessageAndCall =
                    isSelf ||
                    !profileUser.isPrivate ||
                    Boolean(isFollowing) ||
                    Boolean(isFollowedBy);

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canMessageAndCall) {
                          showWarning(
                            `@${profileUser.username}'s account is private. You can only message or call them once they accept your follow request or if they follow you.`,
                            'Messaging Restricted'
                          );
                          return;
                        }
                        navigate(`/messages/${profileUser.username}`);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border shadow-2xs transition-all ${
                        canMessageAndCall
                          ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer active:scale-98'
                          : 'border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed'
                      }`}
                      title={
                        canMessageAndCall
                          ? `Message @${profileUser.username}`
                          : `Private account: @${profileUser.username} must accept your follow request or follow you to message`
                      }
                    >
                      {canMessageAndCall ? (
                        <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4 text-slate-700" />
                      ) : (
                        <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Message</span>
                    </button>
                  );
                })()}

                {/* Follow Button with Follow Back & Requested Logic */}
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowSubmitting}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5 ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200'
                      : isRequested
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                      : isFollowedBy
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-md shadow-purple-500/20 active:scale-95'
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <HiOutlineCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>Following</span>
                    </>
                  ) : isRequested ? (
                    <>
                      <HiOutlineClock className="w-4 h-4 stroke-[2.5]" />
                      <span>Requested</span>
                    </>
                  ) : isFollowedBy ? (
                    <>
                      <HiOutlineUserPlus className="w-4 h-4 stroke-[2.5]" />
                      <span>Follow Back</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineUserPlus className="w-4 h-4 stroke-[2.5]" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {profileUser.fullName}
              </h2>
              {profileUser.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  <HiOutlineLockClosed className="w-3 h-3" />
                  Private
                </span>
              )}
            </div>
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
            <button
              type="button"
              onClick={() => handleOpenFollowModal('followers')}
              className="group text-left cursor-pointer transition-opacity hover:opacity-80"
            >
              <span className="font-bold text-slate-900 mr-1.5 group-hover:text-purple-600 transition-colors">
                {followersCount}
              </span>
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Followers</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenFollowModal('following')}
              className="group text-left cursor-pointer transition-opacity hover:opacity-80"
            >
              <span className="font-bold text-slate-900 mr-1.5 group-hover:text-purple-600 transition-colors">
                {followingCount}
              </span>
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Following</span>
            </button>
            <div>
              <span className="font-bold text-slate-900 mr-1.5">{echoesCount}</span>
              <span className="text-slate-400">Echoes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts & Reels Section OR Private Account Lock Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8">
          {!canViewContent ? (
            /* Premium Private Account Lock Screen */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-8 sm:p-14 text-center flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-200/60 flex items-center justify-center mb-5 text-purple-600 shadow-sm">
                <HiOutlineLockClosed className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.8]" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                This Account is Private
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
                Follow @{profileUser.username} to see their echoes, photos, and reels.
              </p>
              {isRequested ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold shadow-xs">
                  <HiOutlineClock className="w-4 h-4 text-purple-600 stroke-[2]" />
                  <span>Follow request sent • Pending approval</span>
                </div>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowSubmitting}
                  className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-sm active:scale-95 inline-flex items-center gap-2"
                >
                  <HiOutlineUserPlus className="w-4 h-4 stroke-[2]" />
                  <span>{isFollowedBy ? 'Follow Back to View' : 'Send Follow Request'}</span>
                </button>
              )}
            </div>
          ) : (
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
          )}
        </div>

        {/* Right Info Sidebar */}
        <div className="hidden lg:block lg:col-span-4 sticky top-4 self-start space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">About @{profileUser.username}</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Privacy Status</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  {profileUser.isPrivate ? (
                    <>
                      <HiOutlineLockClosed className="w-3.5 h-3.5 text-purple-600" />
                      <span>Private Account</span>
                    </>
                  ) : (
                    <span>Public Account</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Total Echoes</span>
                <span className="font-bold text-slate-900">{echoesCount}</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenFollowModal('followers')}
                className="w-full flex items-center justify-between py-1.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 px-1.5 rounded-xl transition-colors group"
              >
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Followers</span>
                <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{followersCount}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenFollowModal('following')}
                className="w-full flex items-center justify-between py-1.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 px-1.5 rounded-xl transition-colors group"
              >
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Following</span>
                <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{followingCount}</span>
              </button>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Member Since</span>
                <span className="font-semibold text-slate-800">{joinedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profileUser && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          username={profileUser.username}
          initialTab={followModalTab}
          isSelf={isSelf}
          currentUser={currentUser}
          onFollowersCountChange={(delta) => setFollowersCount((prev) => Math.max(0, prev + delta))}
          onFollowingCountChange={(delta) => setFollowingCount((prev) => Math.max(0, prev + delta))}
        />
      )}
    </div>
  );
}
