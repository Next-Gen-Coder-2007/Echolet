import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import userService, { type UserProfileResponse } from '../services/userService';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'echoes' | 'media' | 'likes'>('echoes');

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
  }, [username]);

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

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12">
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
    <div className="w-full max-w-4xl mx-auto py-4">
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
        <div className="h-36 sm:h-44 w-full bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] relative" />

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

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate(`/messages?userId=${profileUser.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200/90 bg-white hover:bg-purple-50/50 hover:border-purple-300 hover:text-purple-600 text-slate-700 shadow-xs cursor-pointer transition-all"
              >
                <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4 stroke-[2] text-purple-600" />
                <span>Message</span>
              </button>

              <button
                onClick={handleToggleFollow}
                disabled={isFollowSubmitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-gradient-to-r from-[#00b4d8] to-[#ff0080] text-white hover:opacity-95'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {profileUser.fullName}
            </h2>
            <p className="text-sm font-semibold text-purple-600">
              @{profileUser.username}
            </p>
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
              <span className="font-bold text-slate-900 mr-1.5">0</span>
              <span className="text-slate-400">Echoes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-2">
        <div className="flex border-b border-slate-100">
          {(['echoes', 'media', 'likes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold capitalize transition-colors cursor-pointer border-b-2 ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-8 text-center">
          <p className="text-xs text-slate-400">
            No {activeTab} shared by @{profileUser.username} yet.
          </p>
        </div>
      </div>
    </div>
  );
}
