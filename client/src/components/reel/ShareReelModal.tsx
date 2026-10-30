import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import Avatar from '../common/Avatar';
import {
  HiXMark,
  HiCheck,
  HiOutlineClipboardDocument,
  HiOutlineShare,
  HiMagnifyingGlass,
  HiPaperAirplane,
  HiUserGroup,
  HiUser,
} from 'react-icons/hi2';
import {
  FaWhatsapp,
  FaXTwitter,
  FaTelegram,
  FaFacebook,
  FaEnvelope,
} from 'react-icons/fa6';
import reelService, { type Reel } from '../../services/reelService';
import { messageService } from '../../services/messageService';
import { groupService, type GroupItem } from '../../services/groupService';
import { userService } from '../../services/userService';
import type { User } from '../../services/authService';
import { useMessage } from '../../context/MessageContext';

interface ShareReelModalProps {
  reel: Reel | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onShareSuccess?: (reelId: string, newSharesCount: number) => void;
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

export default function ShareReelModal({
  reel,
  isOpen,
  onClose,
  currentUser,
  onShareSuccess,
}: ShareReelModalProps) {
  const { showMessage } = useMessage();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Active section tab: Friends or Groups
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');

  // Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isBatchSending, setIsBatchSending] = useState(false);

  // Platform contacts (ONLY users we talked before or followed)
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
    ? `echolet_recent_reel_sent_${currentUser.id}`
    : 'echolet_recent_reel_sent_guest';

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

  // Load ONLY allowed contacts: users talked before (conversations) + users followed
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
      console.warn('Failed to parse recent sent users:', e);
    }

    // 2. Fetch connections (strictly followers and following)
    userService
      .getConnections()
      .then((connections) => {
        if (!isMounted) return;

        const allowedFriends: FriendOption[] = (connections || []).map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl || undefined,
          isFollowing: u.isFollowing,
          isFollower: u.isFollower,
          isMutual: u.isMutual,
        }));

        setFriends(allowedFriends);
        setFilteredFriends(allowedFriends);

        // Populate recent 5 sent friends (only if they are among current connections)
        const allowedIdSet = new Set(allowedFriends.map((f) => f.id));
        const validRecent = storedRecent.filter((r) => allowedIdSet.has(r.id));
        for (const f of allowedFriends) {
          if (validRecent.length >= 5) break;
          if (!validRecent.some((r) => r.id === f.id)) {
            validRecent.push(f);
          }
        }
        setRecentSentUsers(validRecent.slice(0, 5));
        setLoadingFriends(false);
      })
      .catch((err) => {
        console.error('Failed to load contacts for reel share:', err);
        if (isMounted) {
          setFriends([]);
          setFilteredFriends([]);
          setRecentSentUsers([]);
          setLoadingFriends(false);
        }
      });

    // 3. Fetch groups for group sharing
    setLoadingGroups(true);
    groupService
      .getGroups()
      .then((gList) => {
        if (!isMounted) return;
        setGroups(gList || []);
        setFilteredGroups(gList || []);
      })
      .catch((err) => {
        console.warn('Failed to load groups for reel share:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingGroups(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser, storageKey]);

  // Handle searching friends & groups strictly within allowed contacts
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();

    if (activeTab === 'friends') {
      if (!trimmed) {
        setFilteredFriends(friends);
        return;
      }

      // Filter ONLY within users we talked before or followed
      const localMatches = friends.filter(
        (f) =>
          f.username.toLowerCase().includes(trimmed) ||
          (f.fullName && f.fullName.toLowerCase().includes(trimmed))
      );
      setFilteredFriends(localMatches);
    } else {
      // Groups search
      if (!trimmed) {
        setFilteredGroups(groups);
      } else {
        setFilteredGroups(
          groups.filter((g) => g.name.toLowerCase().includes(trimmed))
        );
      }
    }
  }, [searchQuery, friends, groups, activeTab]);

  if (!isOpen || !reel) return null;

  const reelUrl = `${window.location.origin}/reels/${reel.id}`;
  const shareTitle = `Watch @${reel.user?.username}'s reel on Echolet`;
  const shareText = reel.caption
    ? `"${reel.caption}" by @${reel.user?.username} on Echolet`
    : `Check out this reel by @${reel.user?.username} on Echolet`;

  const recordShare = async () => {
    try {
      const res = await reelService.shareReel(reel.id);
      if (onShareSuccess) {
        onShareSuccess(reel.id, res.sharesCount);
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

  // Robust thumbnail extractor: captures live DOM video or offscreen canvas snapshot
  const extractReelThumbnail = async (targetReel: Reel): Promise<string | undefined> => {
    // 1. Try snapping directly from currently playing or mounted video elements in DOM
    try {
      const videos = Array.from(document.querySelectorAll('video'));
      const activeVideo =
        videos.find(
          (v) =>
            (v.src && (v.src === targetReel.videoUrl || v.currentSrc === targetReel.videoUrl)) ||
            (v.dataset && v.dataset.reelId === targetReel.id)
        ) ||
        videos.find((v) => v.readyState >= 2 && v.videoWidth > 0 && !v.paused) ||
        videos.find((v) => v.videoWidth > 0);

      if (activeVideo && activeVideo.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        const targetW = 360;
        const targetH = 640;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetW, targetH);
          const vw = activeVideo.videoWidth;
          const vh = activeVideo.videoHeight;
          const scale = Math.max(targetW / vw, targetH / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const dx = (targetW - dw) / 2;
          const dy = (targetH - dh) / 2;
          ctx.drawImage(activeVideo, dx, dy, dw, dh);

          // Verify that this is a real non-black frame
          const data = ctx.getImageData(0, 0, targetW, targetH).data;
          let brightness = 0;
          for (let i = 0; i < data.length; i += 400) {
            brightness += data[i] + data[i + 1] + data[i + 2];
          }

          if (brightness > 40) {
            const thumbData = canvas.toDataURL('image/jpeg', 0.85);
            if (thumbData && thumbData.length > 500) {
              return thumbData;
            }
          }
        }
      }
    } catch (domErr) {
      console.warn('Could not snapshot DOM video element:', domErr);
    }

    // 2. If reel already has a valid image thumbnail
    if (
      targetReel.thumbnailUrl &&
      !targetReel.thumbnailUrl.startsWith('data:video/') &&
      !/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(targetReel.thumbnailUrl)
    ) {
      return targetReel.thumbnailUrl;
    }

    // 3. Fallback: offscreen video load and canvas capture
    if (targetReel.videoUrl) {
      try {
        const offscreenThumb = await new Promise<string | null>((resolve) => {
          const video = document.createElement('video');
          if (!targetReel.videoUrl.startsWith('data:')) {
            video.crossOrigin = 'anonymous';
          }
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';
          video.src = targetReel.videoUrl;

          const cleanup = () => {
            video.onloadeddata = null;
            video.onerror = null;
            video.onseeked = null;
          };

          const capture = () => {
            try {
              const canvas = document.createElement('canvas');
              const targetW = 360;
              const targetH = 640;
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                cleanup();
                return resolve(null);
              }
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, targetW, targetH);
              const vw = video.videoWidth || targetW;
              const vh = video.videoHeight || targetH;
              const scale = Math.max(targetW / vw, targetH / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              const dx = (targetW - dw) / 2;
              const dy = (targetH - dh) / 2;
              ctx.drawImage(video, dx, dy, dw, dh);
              cleanup();
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch {
              cleanup();
              resolve(null);
            }
          };

          video.onloadeddata = () => {
            try {
              video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
            } catch {
              capture();
            }
          };
          video.onseeked = () => {
            capture();
          };
          video.onerror = () => {
            cleanup();
            resolve(null);
          };
          setTimeout(() => {
            cleanup();
            resolve(null);
          }, 2200);
        });

        if (offscreenThumb) return offscreenThumb;
      } catch {
        // Fall through
      }
    }

    // 4. Return videoUrl so card can paint via auto-play video frame
    return targetReel.videoUrl || undefined;
  };

  // Handle batch sending to all selected friends and groups
  const handleBatchSend = async () => {
    if (totalSelected === 0 || isBatchSending) return;
    if (!currentUser) {
      showMessage('Please log in to share reels with friends and groups', 'info');
      return;
    }

    setIsBatchSending(true);

    try {
      const mediaToSend = await extractReelThumbnail(reel);
      const shareMessage = `Check out this reel by @${reel.user?.username || 'user'} on Echolet!\n${reelUrl}`;

      const userIds = Array.from(selectedUserIds);
      const groupIds = Array.from(selectedGroupIds);

      // Send to all selected friends
      const userSends = userIds.map((userId) =>
        messageService.sendMessage(userId, shareMessage, {
          mediaUrl: mediaToSend,
          messageType: 'reel',
        })
      );

      // Send to all selected groups
      const groupSends = groupIds.map((groupId) =>
        groupService.sendGroupMessage(groupId, shareMessage, {
          mediaUrl: mediaToSend,
          messageType: 'reel',
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
        `Reel sent to ${totalSelected} recipient${totalSelected > 1 ? 's' : ''}!`,
        'success'
      );

      setSelectedUserIds(new Set());
      setSelectedGroupIds(new Set());
      onClose();
    } catch (err: any) {
      console.error('Failed to send reel:', err);
      showMessage(err?.response?.data?.message || 'Failed to send reel', 'error');
    } finally {
      setIsBatchSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reelUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reelUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showMessage('Reel link copied to clipboard!', 'success');
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
          url: reelUrl,
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
    const encodedUrl = encodeURIComponent(reelUrl);
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
          `${shareText}\n\n${reelUrl}`
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

  const modalContent = (
    <div
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      data-lenis-prevent
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 touch-pan-y"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        data-lenis-prevent
        className="share-reel-modal w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6 gap-3 animate-in zoom-in-95 duration-200 touch-pan-y"
      >
        {/* Header (shrink-0) */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <HiOutlineShare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Share Reel
              </h3>
              <p className="text-xs text-slate-400">
                Send to your contacts or groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body: flex-1 min-h-0 guarantees standard CSS flex scrolling */}
        <div
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 overscroll-contain touch-pan-y"
        >
          {currentUser ? (
            <div className="flex flex-col gap-3">
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
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HiUser className="w-3.5 h-3.5" />
                  <span>Friends</span>
                  {selectedUserIds.size > 0 && (
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center">
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
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HiUserGroup className="w-3.5 h-3.5" />
                  <span>Groups</span>
                  {selectedGroupIds.size > 0 && (
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {selectedGroupIds.size}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: FRIENDS (Talked before OR followed) */}
              {activeTab === 'friends' && (
                <div className="flex flex-col gap-3">
                  {/* Recent Sent Friends as Avatar Bubbles */}
                  {recentSentUsers.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Recent Friends
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100/80">
                          Tap to select
                        </span>
                      </div>

                      <div className="bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100">
                        <div className="flex items-center gap-3 sm:gap-3.5 overflow-x-auto py-1 px-1 scrollbar-none justify-start">
                          {recentSentUsers.slice(0, 5).map((user) => {
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
                                {/* Avatar Bubble */}
                                <div className="relative">
                                  <div
                                    className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full p-0.5 border-2 transition-all duration-200 ${
                                      isSelected
                                        ? 'border-purple-600 shadow-md shadow-purple-500/25 scale-105'
                                        : 'border-slate-200 group-hover:border-purple-400'
                                    }`}
                                  >
                                    <Avatar
                                      src={user.avatarUrl}
                                      name={user.fullName || user.username}
                                      size="full"
                                    />
                                  </div>

                                  {/* Selection Checkmark Badge */}
                                  <div
                                    className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white transition-all shadow-xs ${
                                      isSelected
                                        ? 'bg-purple-600 text-white scale-105'
                                        : 'bg-slate-300 text-white group-hover:bg-purple-400'
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
                                  className={`text-[11px] font-semibold truncate max-w-[58px] text-center transition-colors ${
                                    isSelected
                                      ? 'text-purple-600 font-bold'
                                      : 'text-slate-700 group-hover:text-purple-600'
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
                        placeholder="Search your contacts by name or @username..."
                        className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  {/* Friends List with Multi-Select Checkboxes */}
                  <div
                    data-lenis-prevent
                    onWheel={(e) => e.stopPropagation()}
                    className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-2xs touch-pan-y"
                  >
                    {loadingFriends && friends.length === 0 ? (
                      <div className="py-6 text-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">Loading contacts...</p>
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="py-7 text-center px-4">
                        <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-2 text-base font-bold">
                          💬
                        </div>
                        <p className="text-xs font-bold text-slate-700">No connections available</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                          You can share reels with people you follow or who follow you.
                        </p>
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <div className="py-6 text-center px-4">
                        <p className="text-xs font-semibold text-slate-600">No contacts found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No matching followers or following found
                        </p>
                      </div>
                    ) : (
                      filteredFriends.map((friend) => {
                        const isSelected = selectedUserIds.has(friend.id);

                        return (
                          <div
                            key={friend.id}
                            onClick={() => toggleUserSelection(friend.id)}
                            className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                              isSelected ? 'bg-purple-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <Avatar
                                  src={friend.avatarUrl}
                                  name={friend.fullName || friend.username}
                                  size="sm"
                                  className="shrink-0"
                                />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {friend.fullName || friend.username}
                                  </p>
                                  {(friend.isMutual || friend.isFollowing || friend.isFollower) && (
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
                                        friend.isMutual
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : friend.isFollowing
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      {friend.isMutual ? 'Mutual' : friend.isFollowing ? 'Following' : 'Follower'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate">
                                  @{friend.username}
                                </p>
                              </div>
                            </div>

                            {/* Selection Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'border-2 border-slate-300'
                              }`}
                            >
                              {isSelected && <HiCheck className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: GROUPS */}
              {activeTab === 'groups' && (
                <div className="flex flex-col gap-3">
                  {/* Search Bar for Groups */}
                  {groups.length > 0 && (
                    <div className="relative">
                      <HiMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your groups..."
                        className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  {/* Groups List with Multi-Select Checkboxes */}
                  <div
                    data-lenis-prevent
                    onWheel={(e) => e.stopPropagation()}
                    className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-2xs touch-pan-y"
                  >
                    {loadingGroups && groups.length === 0 ? (
                      <div className="py-6 text-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">Loading your groups...</p>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="py-6 text-center px-4">
                        <p className="text-xs font-semibold text-slate-600">No groups found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {groups.length === 0
                            ? 'You have not joined any groups yet'
                            : 'No groups matched your search'}
                        </p>
                      </div>
                    ) : (
                      filteredGroups.map((group) => {
                        const isSelected = selectedGroupIds.has(group.id);

                        return (
                          <div
                            key={group.id}
                            onClick={() => toggleGroupSelection(group.id)}
                            className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                              isSelected ? 'bg-purple-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <Avatar
                                  src={group.avatarUrl}
                                  name={group.name}
                                  size="sm"
                                  className="shrink-0"
                                />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {group.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                                </p>
                              </div>
                            </div>

                            {/* Selection Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'border-2 border-slate-300'
                              }`}
                            >
                              {isSelected && <HiCheck className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-xs text-slate-600 font-medium">
                Log in to send this reel directly to friends and groups on Echolet.
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-100 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 absolute">
              Or share externally
            </span>
          </div>

          {/* Copy Link Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Reel Link
            </label>
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-slate-50 border border-slate-200/80 focus-within:border-slate-400 transition-colors">
              <input
                type="text"
                readOnly
                value={reelUrl}
                className="bg-transparent text-xs text-slate-700 font-mono flex-1 outline-hidden select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <HiCheck className="w-4 h-4 stroke-[2]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <HiOutlineClipboardDocument className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Apps */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Share to other apps
            </label>
            <div className="grid grid-cols-5 gap-2 text-center">
              {/* WhatsApp */}
              <button
                onClick={() => handleSocialShare('whatsapp')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FaWhatsapp className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                  WhatsApp
                </span>
              </button>

              {/* X / Twitter */}
              <button
                onClick={() => handleSocialShare('twitter')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FaXTwitter className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                  X
                </span>
              </button>

              {/* Telegram */}
              <button
                onClick={() => handleSocialShare('telegram')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FaTelegram className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                  Telegram
                </span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleSocialShare('facebook')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FaFacebook className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                  Facebook
                </span>
              </button>

              {/* Email */}
              <button
                onClick={() => handleSocialShare('email')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FaEnvelope className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full">
                  Email
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Bar: Multi-Select Send Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="min-w-0 flex-1">
            {totalSelected === 0 ? (
              <p className="text-xs text-slate-400 font-medium truncate">
                Select friends or groups above to send
              </p>
            ) : (
              <p className="text-xs text-slate-700 font-medium truncate">
                <span className="font-extrabold text-purple-600">{totalSelected}</span>{' '}
                recipient{totalSelected > 1 ? 's' : ''} selected
                {selectedUserIds.size > 0 && selectedGroupIds.size > 0 && (
                  <span className="text-[11px] text-slate-400 ml-1">
                    ({selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''},{' '}
                    {selectedGroupIds.size} group{selectedGroupIds.size > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={sharing}
                className="p-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                title="More Share Options"
              >
                <HiOutlineShare className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleBatchSend}
              disabled={totalSelected === 0 || isBatchSending}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                totalSelected === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : isBatchSending
                  ? 'bg-purple-600 text-white opacity-85 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-95 shadow-purple-500/25'
              }`}
            >
              {isBatchSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <HiPaperAirplane className="w-3.5 h-3.5" />
                  <span>Send Reel {totalSelected > 0 ? `(${totalSelected})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
