import { useState, useEffect, useTransition } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiXMark,
  HiOutlineUser,
  HiOutlineChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';

export default function Search() {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ user?: User | null }>();
  const currentUser = outletContext?.user;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileResponse[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const users = await userService.searchUsers(trimmed);
        const filtered = (users || []).filter(
          (u) =>
            u.id !== currentUser?.id &&
            u.username.toLowerCase() !== currentUser?.username?.toLowerCase()
        );

        const initialMap: Record<string, boolean> = {};
        filtered.forEach((u) => {
          initialMap[u.id] = Boolean(u.isFollowing);
        });

        startTransition(() => {
          setFollowingMap((prev) => ({ ...prev, ...initialMap }));
          setResults(filtered);
          setLoading(false);
        });
      } catch {
        startTransition(() => {
          setResults([]);
          setLoading(false);
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, currentUser]);

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

  return (
    <div className="w-full max-w-4xl mx-auto py-4">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Find People
        </h1>
        <p className="text-sm text-slate-500">
          Search for users across Echolet by their name or username.
        </p>
      </div>

      <div className="relative w-full mb-8">
        <div className="relative flex items-center">
          <HiOutlineMagnifyingGlass className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none stroke-[2]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by full name or @username..."
            autoFocus
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm sm:text-base text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/60 transition-all"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-400">Searching Echolet...</p>
          </div>
        ) : query.trim() ? (
          results.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Found {results.length} {results.length === 1 ? 'user' : 'users'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {results.map((user) => {
                  const initials = user.fullName
                    ? user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U';
                  const isFollowing = !!followingMap[user.id];

                  return (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/profile/${user.username}`)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                                {initials}
                              </span>
                            )}
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

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/messages?userId=${user.id}`);
                            }}
                            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 text-slate-700 shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                            title="Message"
                          >
                            <HiOutlineChatBubbleOvalLeftEllipsis className="w-4 h-4 stroke-[2] text-purple-600" />
                            <span className="hidden sm:inline">Message</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(user.id);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              isFollowing
                                ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                                : 'bg-gradient-to-r from-[#00b4d8] to-[#ff0080] text-white shadow-xs hover:opacity-95'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <HiOutlineMagnifyingGlass className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No users found for &quot;{query}&quot;
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try checking for typos or searching by another full name or username.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <HiOutlineUser className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-700">
              Start typing to search
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Search by display name or handle to discover community members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
