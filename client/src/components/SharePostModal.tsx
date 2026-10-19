import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import {
  HiCheck,
  HiOutlineClipboardDocument,
  HiOutlineShare,
  HiMagnifyingGlass,
  HiPaperAirplane,
  HiUserGroup,
  HiUser,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineHeart,
  HiOutlinePhoto,
  HiOutlineFilm,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import {
  FaWhatsapp,
  FaXTwitter,
  FaTelegram,
  FaFacebook,
  FaEnvelope,
} from 'react-icons/fa6';
import postService, { type Post } from '../services/postService';
import { messageService } from '../services/messageService';
import { groupService, type GroupItem } from '../services/groupService';
import { userService } from '../services/userService';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';
import Modal from './Modal';

export interface SharePostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onShareSuccess?: (postId: string, newSharesCount: number) => void;
}

interface FriendOption {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  isFollowing?: boolean;
  isFollower?: boolean;
  isMutual?: boolean;
}

export default function SharePostModal({
  post,
  isOpen,
  onClose,
  currentUser,
  onShareSuccess,
}: SharePostModalProps) {
  const { showMessage } = useMessage();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Active section tab: Friends or Groups
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');

  // Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isBatchSending, setIsBatchSending] = useState(false);

  // Platform contacts (users talked before or followed)
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendOption[]>([]);
  const [recentSentUsers, setRecentSentUsers] = useState<FriendOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Platform groups state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const storageKey = currentUser
    ? `echolet_recent_post_sent_${currentUser.id}`
    : 'echolet_recent_post_sent_guest';

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Toggle group selection
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const totalSelected = selectedUserIds.size + selectedGroupIds.size;

  // Load allowed contacts: conversations + following
  useEffect(() => {
    if (!isOpen || !currentUser) {
      setFriends([]);
      setFilteredFriends([]);
      setRecentSentUsers([]);
      setGroups([]);
      setFilteredGroups([]);
      setSearchQuery('');
      setSelectedUserIds(new Set());
      setSelectedGroupIds(new Set());
      return;
    }

    let isMounted = true;
    setLoadingFriends(true);

    // 1. Read stored recently sent users from localStorage
    let storedRecent: FriendOption[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        storedRecent = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse recent sent users for post share:', e);
    }

    // 2. Fetch connections (strictly followers and following)
    userService
      .getConnections()
      .then((connections) => {
        if (!isMounted) return;

        const list: FriendOption[] = (connections || []).map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl || undefined,
          isFollowing: u.isFollowing,
          isFollower: u.isFollower,
          isMutual: u.isMutual,
        }));

        setFriends(list);
        setFilteredFriends(list);

        // Keep recent sent users only if they are still among current connections
        const connectionIds = new Set(list.map((c) => c.id));
        const validRecent = storedRecent.filter((r) => connectionIds.has(r.id));
        setRecentSentUsers(validRecent.length > 0 ? validRecent : list.slice(0, 5));
      })
      .catch((err) => {
        console.warn('Failed to load connections for sharing post:', err);
        if (isMounted) {
          setFriends([]);
          setFilteredFriends([]);
          setRecentSentUsers([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingFriends(false);
      });

    // 3. Fetch groups user belongs to
    setLoadingGroups(true);
    groupService
      .getGroups()
      .then((gList: GroupItem[]) => {
        if (!isMounted) return;
        setGroups(gList || []);
        setFilteredGroups(gList || []);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load groups for post share:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingGroups(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser, storageKey]);

  // Search filter
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();

    if (activeTab === 'friends') {
      if (!trimmed) {
        setFilteredFriends(friends);
        return;
      }
      const localMatches = friends.filter(
        (f) =>
          f.username.toLowerCase().includes(trimmed) ||
          (f.fullName && f.fullName.toLowerCase().includes(trimmed))
      );
      setFilteredFriends(localMatches);
    } else {
      if (!trimmed) {
        setFilteredGroups(groups);
      } else {
        setFilteredGroups(
          groups.filter((g) => g.name.toLowerCase().includes(trimmed))
        );
      }
    }
  }, [searchQuery, friends, groups, activeTab]);

  if (!isOpen || !post) return null;

  const postUrl = `${window.location.origin}/post/${post.id}`;
  const creatorUsername = post.user?.username || 'user';
  const shareTitle = `Echo by @${creatorUsername} on Echolet`;
  const shareSnippet = post.content ? post.content.slice(0, 120) : '';
  const shareText = shareSnippet
    ? `"${shareSnippet}${post.content.length > 120 ? '...' : ''}" by @${creatorUsername} on Echolet`
    : `Check out this echo by @${creatorUsername} on Echolet`;

  const recordShare = async () => {
    try {
      const res = await postService.sharePost(post.id);
      if (onShareSuccess) {
        onShareSuccess(post.id, res.sharesCount);
      }
    } catch (err) {
      console.warn('Failed to record share count on server:', err);
    }
  };

  const updateRecentSentUsersBatch = (sentFriends: FriendOption[]) => {
    try {
      const raw = localStorage.getItem(storageKey);
      let list: FriendOption[] = raw ? JSON.parse(raw) : [];
      const sentMap = new Map(sentFriends.map((f) => [f.id, f]));
      list = list.filter((u) => !sentMap.has(u.id));
      list.unshift(...sentFriends);
      const updated5 = list.slice(0, 5);
      localStorage.setItem(storageKey, JSON.stringify(updated5));
      setRecentSentUsers(updated5);
    } catch (err) {
      console.warn('Failed to update recent sent users batch:', err);
    }
  };

  // Handle batch sending to all selected friends and groups
  const handleBatchSend = async () => {
    if (totalSelected === 0 || isBatchSending) return;
    if (!currentUser) {
      showMessage('Please log in to share echoes with friends and groups', 'info');
      return;
    }

    setIsBatchSending(true);

    try {
      const mediaToSend = post.mediaUrls?.[0] || undefined;
      const shareMessage = `Check out this echo by @${creatorUsername} on Echolet!\n${postUrl}`;

      const userIds = Array.from(selectedUserIds);
      const groupIds = Array.from(selectedGroupIds);

      // Send to selected friends
      const userSends = userIds.map((userId) =>
        messageService.sendMessage(userId, shareMessage, {
          mediaUrl: mediaToSend,
          messageType: 'post',
        })
      );

      // Send to selected groups
      const groupSends = groupIds.map((groupId) =>
        groupService.sendGroupMessage(groupId, shareMessage, {
          mediaUrl: mediaToSend,
          messageType: 'post',
        })
      );

      await Promise.allSettled([...userSends, ...groupSends]);

      // Update recently sent users in localStorage
      const sentFriends = friends.filter((f) => selectedUserIds.has(f.id));
      if (sentFriends.length > 0) {
        updateRecentSentUsersBatch(sentFriends);
      }

      recordShare();
      showMessage(
        `Echo sent to ${totalSelected} recipient${totalSelected > 1 ? 's' : ''}!`,
        'success'
      );

      setSelectedUserIds(new Set());
      setSelectedGroupIds(new Set());
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send echo';
      showMessage(msg, 'error');
    } finally {
      setIsBatchSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = postUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showMessage('Post link copied to clipboard!', 'success');
      recordShare();
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showMessage('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        setSharing(true);
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: postUrl,
        });
        recordShare();
        showMessage('Shared successfully!', 'success');
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showMessage('Failed to share', 'error');
        }
      } finally {
        setSharing(false);
      }
    }
  };

  const handleSocialShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
          `${shareText}\n\n${postUrl}`
        )}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      recordShare();
      showMessage('Opened share link!', 'success');
      onClose();
    }
  };

  const primaryThumb = post.mediaUrls?.[0];
  const isVideo =
    post.mediaType === 'video' ||
    (primaryThumb && /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(primaryThumb));
  const isPoll = post.mediaType === 'poll' || Boolean(post.pollOptions?.length);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdropVariant="blur"
      icon={<HiOutlineShare className="w-5 h-5 text-indigo-600 stroke-[2.2]" />}
      iconClassName="bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-xs"
      title={
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Share Echo</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            Post
          </span>
        </div>
      }
      description="Send to your contacts or groups on Echolet, or share externally"
      showCloseButton={!isBatchSending}
      closeButtonPosition="inside"
    >
      <div className="select-none space-y-4">
        {/* Post Preview Card Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3 transition-all">
          <Avatar
            src={post.user?.avatarUrl}
            name={post.user?.fullName || creatorUsername}
            size="sm"
            className="shrink-0 border border-slate-300/60 shadow-2xs"
          />

          {/* Post info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 truncate">
                {post.user?.fullName || creatorUsername}
              </span>
              <span className="text-[11px] text-slate-400">@{creatorUsername}</span>
            </div>

            {post.content && (
              <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                {post.content}
              </p>
            )}

            {/* Media / Poll indicator badges */}
            <div className="flex items-center gap-2 mt-2">
              {isPoll && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                  <HiOutlineChartBar className="w-3 h-3" />
                  <span>Poll ({post.pollOptions?.length || 0} options)</span>
                </span>
              )}
              {isVideo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                  <HiOutlineFilm className="w-3 h-3" />
                  <span>Video Clip</span>
                </span>
              )}
              {!isVideo && post.mediaUrls && post.mediaUrls.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <HiOutlinePhoto className="w-3 h-3" />
                  <span>
                    {post.mediaUrls.length} Photo{post.mediaUrls.length > 1 ? 's' : ''}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                <HiOutlineHeart className="w-3 h-3" />
                <span>{post.likesCount || 0}</span>
                <span className="mx-0.5">•</span>
                <HiOutlineChatBubbleOvalLeftEllipsis className="w-3 h-3" />
                <span>{post.commentsCount || 0}</span>
              </span>
            </div>
          </div>

          {/* Small thumbnail preview if image exists */}
          {primaryThumb && !isVideo && (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
              <img
                src={primaryThumb}
                alt="Post preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="space-y-3.5">
            {/* Category Segmented Tabs: Friends & Groups */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('friends');
                  setSearchQuery('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'friends'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <HiUser className="w-3.5 h-3.5" />
                <span>Friends</span>
                {selectedUserIds.size > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {selectedUserIds.size}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('groups');
                  setSearchQuery('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'groups'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <HiUserGroup className="w-3.5 h-3.5" />
                <span>Groups</span>
                {selectedGroupIds.size > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {selectedGroupIds.size}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: FRIENDS */}
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {/* Recent Sent Friends as Avatar Bubbles */}
                {recentSentUsers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Recent Contacts
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/80">
                        Tap to select
                      </span>
                    </div>

                    <div className="bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100">
                      <div className="flex items-center gap-3 overflow-x-auto py-1 px-1 scrollbar-none justify-start">
                        {recentSentUsers.slice(0, 6).map((user) => {
                          const isSelected = selectedUserIds.has(user.id);

                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleUserSelection(user.id)}
                              className="flex flex-col items-center gap-1 group cursor-pointer shrink-0 focus:outline-none transition-transform active:scale-95"
                              title={
                                isSelected
                                  ? `Deselect @${user.username}`
                                  : `Select @${user.username}`
                              }
                            >
                              <div className="relative">
                                <div
                                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-indigo-600 shadow-xs shadow-indigo-500/25 scale-105'
                                      : 'border-slate-200 group-hover:border-indigo-400'
                                  }`}
                                >
                                    <Avatar
                                      src={user.avatarUrl}
                                      name={user.fullName || user.username}
                                      size="full"
                                    />
                                </div>

                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white transition-all shadow-2xs ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white scale-105'
                                      : 'bg-slate-300 text-white group-hover:bg-indigo-400'
                                  }`}
                                >
                                  {isSelected ? (
                                    <HiCheck className="w-2.5 h-2.5 stroke-[3]" />
                                  ) : (
                                    <span className="text-[9px] font-bold leading-none">+</span>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`text-[11px] font-semibold truncate max-w-[56px] text-center transition-colors ${
                                  isSelected
                                    ? 'text-indigo-600 font-bold'
                                    : 'text-slate-700 group-hover:text-indigo-600'
                                }`}
                              >
                                {user.username}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Bar for Friends */}
                {friends.length > 0 && (
                  <div className="relative">
                    <HiMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts by name or @username..."
                      className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                )}

                {/* Friends List with Multi-Select Checkboxes */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                  {loadingFriends ? (
                    <div className="py-8 text-center">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Loading contacts...</p>
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      <HiUser className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <p className="text-xs">No matching contacts found</p>
                    </div>
                  ) : (
                    filteredFriends.map((f) => {
                      const isSelected = selectedUserIds.has(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleUserSelection(f.id)}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={f.avatarUrl}
                              name={f.fullName || f.username}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {f.fullName || f.username}
                                </p>
                                {(f.isMutual || f.isFollowing || f.isFollower) && (
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
                                      f.isMutual
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : f.isFollowing
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {f.isMutual ? 'Mutual' : f.isFollowing ? 'Following' : 'Follower'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                @{f.username}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <HiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GROUPS */}
            {activeTab === 'groups' && (
              <div className="space-y-3">
                {/* Search Bar for Groups */}
                {groups.length > 0 && (
                  <div className="relative">
                    <HiMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search groups by name..."
                      className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                )}

                {/* Groups List */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                  {loadingGroups ? (
                    <div className="py-8 text-center">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Loading groups...</p>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      <HiUserGroup className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <p className="text-xs">No matching groups found</p>
                    </div>
                  ) : (
                    filteredGroups.map((g) => {
                      const isSelected = selectedGroupIds.has(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroupSelection(g.id)}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <HiUserGroup className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {g.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {g.memberCount || 1} member{(g.memberCount || 1) > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <HiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Log in to instantly share this echo with your Echolet contacts & groups!
            </p>
          </div>
        )}

        {/* Action Controls & External Sharing */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {/* Batch Send Button (when items selected) */}
          {totalSelected > 0 && (
            <button
              type="button"
              disabled={isBatchSending}
              onClick={handleBatchSend}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isBatchSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Echo...</span>
                </>
              ) : (
                <>
                  <HiPaperAirplane className="w-4 h-4" />
                  <span>
                    Send to {totalSelected} Recipient{totalSelected > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Quick Copy Link & Native Share Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              {copied ? (
                <>
                  <HiCheck className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <HiOutlineClipboardDocument className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                disabled={sharing}
                onClick={handleNativeShare}
                className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HiOutlineShare className="w-4 h-4" />
                <span>Device Share</span>
              </button>
            )}
          </div>

          {/* External Social Platform Links */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-0.5">
              Share via other apps
            </span>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleSocialShare('whatsapp')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/60 text-slate-600 hover:text-emerald-600 flex flex-col items-center gap-1 transition-all cursor-pointer group"
                title="Share to WhatsApp"
              >
                <FaWhatsapp className="w-4 h-4 text-emerald-500 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-semibold">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare('twitter')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex flex-col items-center gap-1 transition-all cursor-pointer group"
                title="Share to X (Twitter)"
              >
                <FaXTwitter className="w-4 h-4 text-slate-800 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-semibold">X</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare('telegram')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/60 text-slate-600 hover:text-sky-600 flex flex-col items-center gap-1 transition-all cursor-pointer group"
                title="Share to Telegram"
              >
                <FaTelegram className="w-4 h-4 text-sky-500 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-semibold">Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare('facebook')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/60 text-slate-600 hover:text-blue-600 flex flex-col items-center gap-1 transition-all cursor-pointer group"
                title="Share to Facebook"
              >
                <FaFacebook className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-semibold">Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare('email')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/60 text-slate-600 hover:text-purple-600 flex flex-col items-center gap-1 transition-all cursor-pointer group"
                title="Share via Email"
              >
                <FaEnvelope className="w-4 h-4 text-purple-600 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-semibold">Email</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
