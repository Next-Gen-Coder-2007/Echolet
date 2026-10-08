import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineUserPlus, HiOutlineCheck } from 'react-icons/hi2';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';

interface WhoToFollowProps {
  currentUser?: User | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WhoToFollow({ currentUser, showToast }: WhoToFollowProps) {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    } else {
      showMessage(msg, type);
    }
  };

  const [suggestedUsers, setSuggestedUsers] = useState<UserProfileResponse[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    userService
      .searchUsers('a')
      .then((users) => {
        if (!isMounted) return;
        const filtered = (users || [])
          .filter((u) => u.id !== currentUser?.id)
          .slice(0, 4);
        setSuggestedUsers(filtered);
        const map: Record<string, boolean> = {};
        filtered.forEach((u) => {
          map[u.id] = Boolean(u.isFollowing);
        });
        setFollowedIds(map);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleToggleFollow = async (user: UserProfileResponse) => {
    const isCurrentlyFollowing = Boolean(followedIds[user.id]);
    setFollowedIds((prev) => ({ ...prev, [user.id]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await userService.unfollowUser(user.id);
        notify(`Unfollowed @${user.username}`, 'info');
      } else {
        await userService.followUser(user.id);
        notify(`Following @${user.username}`, 'success');
      }
    } catch {
      setFollowedIds((prev) => ({ ...prev, [user.id]: isCurrentlyFollowing }));
      notify('Failed to update follow status', 'error');
    }
  };

  if (suggestedUsers.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Who to follow
        </h3>
        <Link
          to="/search"
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3.5">
        {suggestedUsers.map((su) => {
          const isFollowing = Boolean(followedIds[su.id]);
          return (
            <div
              key={su.id}
              className="pt-3.5 first:pt-0 flex items-center justify-between gap-3 border-t first:border-t-0 border-slate-100"
            >
              <div
                onClick={() => navigate(`/profile/${su.username}`)}
                className="flex items-center gap-3 min-w-0 cursor-pointer group"
              >
                {su.avatarUrl ? (
                  <img
                    src={su.avatarUrl}
                    alt={su.fullName}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-slate-400 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-slate-800">
                    {su.fullName?.[0] || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                    {su.fullName}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    @{su.username}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFollow(su)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isFollowing ? (
                  <>
                    <HiOutlineCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <HiOutlineUserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
