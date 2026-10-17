import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineUserPlus,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineUserMinus,
} from 'react-icons/hi2';
import Modal from './Modal';
import userService, { type FollowUserItem } from '../services/userService';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';

export interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  initialTab?: 'followers' | 'following';
  isSelf?: boolean;
  currentUser?: User | null;
  onFollowersCountChange?: (delta: number) => void;
  onFollowingCountChange?: (delta: number) => void;
}

export default function FollowListModal({
  isOpen,
  onClose,
  username,
  initialTab = 'followers',
  isSelf = false,
  currentUser,
  onFollowersCountChange,
  onFollowingCountChange,
}: FollowListModalProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowUserItem[]>([]);
  const [following, setFollowing] = useState<FollowUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  const loadData = useCallback(async () => {
    if (!username || !isOpen) return;
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const data = await userService.getUserFollowers(username);
        setFollowers(data);
      } else {
        const data = await userService.getUserFollowing(username);
        setFollowing(data);
      }
    } catch (err: any) {
      console.error('Failed to load follow list:', err);
      showError(err.response?.data?.message || 'Failed to load list', 'Error');
    } finally {
      setLoading(false);
    }
  }, [username, activeTab, isOpen, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentList = activeTab === 'followers' ? followers : following;

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q))
    );
  }, [currentList, searchQuery]);

  // Remove follower handler (when isSelf and on followers tab)
  const handleRemoveFollower = async (e: React.MouseEvent, user: FollowUserItem) => {
    e.stopPropagation();
    setActionInProgressId(user.id);
    try {
      await userService.removeFollower(user.id);
      setFollowers((prev) => prev.filter((item) => item.id !== user.id));
      onFollowersCountChange?.(-1);
      showSuccess(`Removed @${user.username} from your followers`, 'Follower Removed');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to remove follower', 'Error');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Follow / Unfollow toggle for a user row
  const handleToggleFollow = async (e: React.MouseEvent, targetUser: FollowUserItem) => {
    e.stopPropagation();
    setActionInProgressId(targetUser.id);

    const isCurrentlyFollowing = Boolean(targetUser.isFollowing);
    const isCurrentlyRequested = Boolean(targetUser.hasPendingFollowRequest);

    try {
      if (isCurrentlyFollowing || isCurrentlyRequested) {
        // Unfollow / Cancel request
        await userService.unfollowUser(targetUser.id);
        const updateItem = (item: FollowUserItem) =>
          item.id === targetUser.id
            ? { ...item, isFollowing: false, hasPendingFollowRequest: false }
            : item;

        setFollowers((prev) => prev.map(updateItem));
        setFollowing((prev) => {
          if (isSelf && activeTab === 'following') {
            return prev.filter((item) => item.id !== targetUser.id);
          }
          return prev.map(updateItem);
        });

        if (isSelf) {
          onFollowingCountChange?.(-1);
        }

        showSuccess(
          isCurrentlyRequested
            ? `Cancelled follow request to @${targetUser.username}`
            : `Unfollowed @${targetUser.username}`,
          'Updated'
        );
      } else {
        // Follow / Request to follow
        const res = await userService.followUser(targetUser.id);
        const updateItem = (item: FollowUserItem) =>
          item.id === targetUser.id
            ? {
                ...item,
                isFollowing: res.isFollowing,
                hasPendingFollowRequest: res.isRequested,
              }
            : item;

        setFollowers((prev) => prev.map(updateItem));
        setFollowing((prev) => prev.map(updateItem));

        if (res.isFollowing && isSelf) {
          onFollowingCountChange?.(1);
        }

        showSuccess(
          res.isRequested
            ? `Follow request sent to @${targetUser.username}`
            : `Now following @${targetUser.username}`,
          res.isRequested ? 'Request Sent' : 'Following'
        );
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Action failed', 'Error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUserClick = (targetUsername: string) => {
    onClose();
    navigate(`/profile/${targetUsername}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdropVariant="dark"
      showCloseButton={false}
      card={false}
      contentClassName="p-0 overflow-hidden"
    >
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[640px] w-full">
        {/* Header Tabs & Close */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('followers')}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'followers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Followers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Following
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <HiOutlineXMark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User List */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[280px]"
        >
          {loading ? (
            <div className="p-14 text-center">
              <div className="w-7 h-7 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Loading {activeTab}...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <p className="text-sm font-bold text-slate-700">No {activeTab} found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? `No matching users found for "${searchQuery}".`
                  : activeTab === 'followers'
                  ? `@${username} doesn't have any followers yet.`
                  : `@${username} isn't following anyone yet.`}
              </p>
            </div>
          ) : (
            filteredList.map((user) => {
              const userInitials = user.fullName
                ? user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U';

              const isCurrentUser = currentUser?.id === user.id || user.isSelf;

              return (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.username)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080] shrink-0">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {userInitials}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:underline">
                          {user.fullName || user.username}
                        </p>
                        {user.isPrivate && (
                          <HiOutlineLockClosed
                            title="Private Account"
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                          />
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-purple-600 font-semibold truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isCurrentUser ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500">
                        You
                      </span>
                    ) : isSelf && activeTab === 'followers' ? (
                      /* Option to remove follower on own profile */
                      <div className="flex items-center gap-1.5">
                        {!user.isFollowing && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleFollow(e, user)}
                            disabled={actionInProgressId === user.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            Follow Back
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFollower(e, user)}
                          disabled={actionInProgressId === user.id}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <HiOutlineUserMinus className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      /* Normal Follow / Following / Requested button */
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(e, user)}
                        disabled={actionInProgressId === user.id}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5 ${
                          user.isFollowing
                            ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent'
                            : user.hasPendingFollowRequest
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-rose-50 hover:text-rose-600'
                            : user.isFollowedBy
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-xs active:scale-95'
                            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                        }`}
                      >
                        {user.isFollowing ? (
                          <>
                            <HiOutlineCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Following</span>
                          </>
                        ) : user.hasPendingFollowRequest ? (
                          <>
                            <HiOutlineClock className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Requested</span>
                          </>
                        ) : user.isFollowedBy ? (
                          <>
                            <HiOutlineUserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Follow Back</span>
                          </>
                        ) : (
                          <>
                            <HiOutlineUserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
