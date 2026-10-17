import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlinePhoto,
  HiOutlineFilm,
  HiOutlineDocumentText,
  HiOutlineMicrophone,
  HiOutlineLink,
  HiOutlineArrowDownTray,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineSpeakerXMark,
  HiOutlineSpeakerWave,
  HiOutlineArchiveBox,
  HiOutlineTrash,
  HiOutlineNoSymbol,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineEllipsisVertical,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
  HiStar,
  HiOutlineSquares2X2,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlinePhone,
  HiOutlineLockClosed,
} from 'react-icons/hi2';
import { BsPinAngleFill } from 'react-icons/bs';
import type { User } from '../services/authService';
import userService, { type UserProfileResponse } from '../services/userService';
import messageService from '../services/messageService';
import groupService, {
  type GroupDetails,
  type GroupItem,
  type GroupMemberItem,
} from '../services/groupService';
import { useVoiceCall } from '../context/CallContext';
import MediaViewerModal from './MediaViewerModal';
import Modal from './Modal';

export interface ConversationDetailsViewProps {
  user?: UserProfileResponse | User | null;
  group?: GroupItem | null;
  messages: Array<any>;
  currentUser?: User | null;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  onBack: () => void;
  // Chat settings & toggles
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isFavourite: boolean;
  isBlocked?: boolean;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onToggleMute: () => void;
  onToggleFavourite: () => void;
  onToggleBlock?: () => void;
  onClearChat: () => void;
  // Group actions
  onGroupUpdated?: (updatedGroup: GroupItem) => void;
  onLeaveGroup?: () => void;
}

type MediaTab = 'all' | 'photos' | 'videos' | 'docs' | 'voice' | 'links';

interface ExtractedMediaItem {
  id: string;
  type: 'photo' | 'video' | 'doc' | 'voice' | 'link';
  url: string;
  fileName?: string;
  fileSize?: string | number;
  content?: string;
  createdAt: string;
  senderName?: string;
}

// Professional Interactive Voice Note Player Card
const VoiceNoteCard: React.FC<{
  url: string;
  senderName: string;
  createdAt: string | Date;
  onDownload: () => void;
}> = ({ url, senderName, createdAt, onDownload }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.preload = 'metadata';

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Play audio error:', err));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(Math.round(newTime));
  };

  const toggleSpeed = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDateStr = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const bars = [
    30, 60, 45, 80, 50, 95, 40, 75, 90, 60, 85, 40, 70, 95, 55, 80,
    45, 90, 65, 40, 85, 60, 95, 50, 75, 40, 80, 55, 70, 90, 45, 30
  ];

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600 font-bold text-xs">
            {senderName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {senderName}
            </p>
            <p className="text-[10px] text-slate-400">
              {formatDateStr(createdAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Download audio"
        >
          <HiOutlineArrowDownTray className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/90 border border-slate-100">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
            isPlaying
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900 hover:bg-black text-white'
          }`}
          title={isPlaying ? 'Pause' : 'Play voice message'}
        >
          {isPlaying ? (
            <HiOutlinePause className="w-4 h-4 fill-current" />
          ) : (
            <HiOutlinePlay className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Waveform scrubber */}
          <div
            onClick={handleSeek}
            className="h-6 flex items-center gap-[2.5px] cursor-pointer group/wave py-1"
            title="Click to seek"
          >
            {bars.map((h, i) => {
              const barPct = (i / bars.length) * 100;
              const isPlayed = barPct <= progressPct;
              return (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-full transition-all duration-75 ${
                    isPlayed
                      ? 'bg-purple-600'
                      : 'bg-slate-200 group-hover/wave:bg-slate-300'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
            <span className="font-mono text-[10px]">
              {formatSec(currentTime)} / {formatSec(totalDuration || 0)}
            </span>

            <button
              type="button"
              onClick={toggleSpeed}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConversationDetailsView({
  user,
  group,
  messages,
  currentUser,
  isOnline,
  lastSeen,
  onBack,
  isPinned,
  isArchived,
  isMuted,
  isFavourite,
  isBlocked,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
  onToggleFavourite,
  onToggleBlock,
  onClearChat,
  onGroupUpdated,
  onLeaveGroup,
}: ConversationDetailsViewProps) {
  const navigate = useNavigate();
  const { startVoiceCall } = useVoiceCall();
  const isGroup = Boolean(group);

  // Synchronously initialize user profile from prop so there's zero layout shift
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(() => {
    if (!user) return null;
    return user as UserProfileResponse;
  });

  // Synchronously initialize group details from prop so there's zero layout shift
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(() => {
    if (!group) return null;
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      creatorId: group.creatorId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      currentUserRole: group.currentUserRole,
      members: group.membersPreview
        ? (group.membersPreview.map((m) => ({
            id: m.id || '',
            userId: m.id || '',
            role: m.role || 'member',
            joinedAt: '',
            user: {
              id: m.id || '',
              fullName: m.fullName || '',
              username: m.username || '',
              avatarUrl: m.avatarUrl,
              isOnline: m.isOnline,
            },
          })) as GroupMemberItem[])
        : [],
    };
  });
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(() => group?.name || '');
  const [editGroupDesc, setEditGroupDesc] = useState(() => group?.description || '');
  const [savingGroupEdit, setSavingGroupEdit] = useState(false);

  // Add Member to Group state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<UserProfileResponse[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<UserProfileResponse[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);

  // Media Tab & Search
  const [mediaTab, setMediaTab] = useState<MediaTab>('all');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');

  // Server-backed media pagination
  const [serverMedia, setServerMedia] = useState<any[]>([]);
  const [mediaPage, setMediaPage] = useState(1);
  const [hasMoreMedia, setHasMoreMedia] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);
  const [totalMediaCount, setTotalMediaCount] = useState(0);
  const [serverCounts, setServerCounts] = useState<{
    all: number;
    photos: number;
    videos: number;
    documents: number;
    audio: number;
    links: number;
  }>({
    all: 0,
    photos: 0,
    videos: 0,
    documents: 0,
    audio: 0,
    links: 0,
  });

  // Fullscreen Photo preview modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Confirmation dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch complete user profile if user is active
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    let isMounted = true;
    const fetchUser = async () => {
      try {
        if (user.username) {
          const res = await userService.getUserByUsername(user.username);
          if (isMounted) setUserProfile(res);
        } else if (user.id) {
          const res = await userService.getUserById(user.id);
          if (isMounted) setUserProfile(res);
        }
      } catch (err) {
        console.warn('Failed to load full user details in conversation view:', err);
      }
    };
    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Fetch full group details if group is active
  useEffect(() => {
    if (!group) {
      setGroupDetails(null);
      return;
    }

    let isMounted = true;
    setLoadingGroup(true);
    groupService
      .getGroupDetails(group.id)
      .then((data) => {
        if (isMounted) {
          setGroupDetails(data);
          setEditGroupName(data.name);
          setEditGroupDesc(data.description || '');
        }
      })
      .catch((err) => {
        console.warn('Failed to load group details in conversation view:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingGroup(false);
      });

    return () => {
      isMounted = false;
    };
  }, [group]);

  // Debounced search for adding new members
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const q = addMemberQuery.trim();
    if (!q || !isAddMemberOpen) {
      setAddMemberResults([]);
      setSearchingUsers(false);
      return;
    }

    setSearchingUsers(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const users = await userService.searchUsers(q);
        const existingMemberIds = new Set(
          groupDetails?.members.map((m) => m.userId) || []
        );
        const filtered = users.filter((u) => !existingMemberIds.has(u.id));
        setAddMemberResults(filtered);
      } catch {
        setAddMemberResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [addMemberQuery, isAddMemberOpen, groupDetails]);

  // Save edited group details
  const handleSaveGroupEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupDetails || !editGroupName.trim()) return;

    setSavingGroupEdit(true);
    try {
      const updated = await groupService.updateGroup(groupDetails.id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
      });
      setGroupDetails((prev) => (prev ? { ...prev, ...updated } : null));
      setIsEditingGroup(false);
      onGroupUpdated?.(updated);
    } catch (err: unknown) {
      console.error('Failed to update group:', err);
    } finally {
      setSavingGroupEdit(false);
    }
  };

  // Add selected members to group
  const handleAddMembersSubmit = async () => {
    if (!groupDetails || selectedToAdd.length === 0 || addingMembers) return;

    setAddingMembers(true);
    try {
      const userIds = selectedToAdd.map((u) => u.id);
      await groupService.addMembers(groupDetails.id, userIds);
      const updated = await groupService.getGroupDetails(groupDetails.id);
      setGroupDetails(updated);
      setIsAddMemberOpen(false);
      setSelectedToAdd([]);
      setAddMemberQuery('');
    } catch (err) {
      console.error('Failed to add members:', err);
    } finally {
      setAddingMembers(false);
    }
  };

  // Handle member role change (promote/demote admin)
  const handleUpdateRole = async (memberUserId: string, newRole: 'admin' | 'member') => {
    if (!groupDetails) return;
    try {
      await groupService.changeMemberRole(groupDetails.id, memberUserId, newRole);
      const updated = await groupService.getGroupDetails(groupDetails.id);
      setGroupDetails(updated);
      setOpenMemberMenuId(null);
    } catch (err) {
      console.error('Failed to update member role:', err);
    }
  };

  // Handle remove member from group
  const handleRemoveMember = async (memberUserId: string) => {
    if (!groupDetails) return;
    try {
      await groupService.removeMember(groupDetails.id, memberUserId);
      const updated = await groupService.getGroupDetails(groupDetails.id);
      setGroupDetails(updated);
      setOpenMemberMenuId(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Handle leave group
  const handleConfirmLeaveGroup = async () => {
    if (!groupDetails || leavingGroup) return;
    setLeavingGroup(true);
    try {
      await groupService.leaveGroup(groupDetails.id);
      setShowLeaveConfirm(false);
      onLeaveGroup?.();
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setLeavingGroup(false);
    }
  };

  const isInitialMount = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ensure scroll container receives and processes wheel events natively without interference
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollHeight > el.clientHeight) {
        // Prevent outer window / Lenis from intercepting while scrolling inside this container
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Fetch server-paginated media (handles chats with 1000s of media items cleanly)
  const fetchMedia = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      const targetId = isGroup ? group?.id : user?.id;
      if (!targetId) return;

      if (isLoadMore) {
        setLoadingMoreMedia(true);
      } else if (serverMedia.length === 0 && (!messages || messages.length === 0)) {
        setLoadingMedia(true);
      }

      try {
        const typeParam =
          mediaTab === 'photos'
            ? 'photo'
            : mediaTab === 'videos'
            ? 'video'
            : mediaTab === 'docs'
            ? 'document'
            : mediaTab === 'voice'
            ? 'audio'
            : mediaTab === 'links'
            ? 'link'
            : 'all';

        const res = isGroup
          ? await groupService.getGroupMedia(targetId, {
              type: typeParam,
              search: mediaSearchQuery.trim() || undefined,
              page: pageToFetch,
              limit: 40,
            })
          : await messageService.getConversationMedia(targetId, {
              type: typeParam,
              search: mediaSearchQuery.trim() || undefined,
              page: pageToFetch,
              limit: 40,
            });

        if (res?.status === 'success') {
          if (isLoadMore) {
            setServerMedia((prev) => {
              const existingIds = new Set(prev.map((m: any) => m.id));
              const fresh = (res.media || []).filter((m: any) => !existingIds.has(m.id));
              return [...prev, ...fresh];
            });
          } else {
            setServerMedia(res.media || []);
          }
          setMediaPage(pageToFetch);
          setHasMoreMedia(Boolean(res.hasMore));
          setTotalMediaCount(res.total || 0);
          if (res.counts) {
            setServerCounts(res.counts);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch server media:', err);
      } finally {
        setLoadingMedia(false);
        setLoadingMoreMedia(false);
      }
    },
    [isGroup, group?.id, user?.id, mediaTab, mediaSearchQuery, serverMedia.length, messages]
  );

  // Instant fetch on mount; debounced fetch on query change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchMedia(1, false);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchMedia(1, false);
    }, 200);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [fetchMedia]);

  const handleLoadMoreMedia = () => {
    if (loadingMedia || loadingMoreMedia || !hasMoreMedia) return;
    fetchMedia(mediaPage + 1, true);
  };

  const mediaSource = useMemo(() => {
    if (serverMedia.length > 0) return serverMedia;
    return messages || [];
  }, [serverMedia, messages]);

  // Extract all media, docs, voice, and links from the messages array
  const extractedMedia = useMemo(() => {
    const list: ExtractedMediaItem[] = [];

    (mediaSource || []).forEach((m) => {
      if (m.isDeletedForEveryone) return;

      const mediaUrl = m.mediaUrl;
      const messageType = m.messageType;
      const fileName = m.fileName;
      const fileSize = m.fileSize;
      const content = m.content || '';
      const createdAt = m.createdAt;
      const senderName = m.sender?.fullName || m.sender?.username || 'Sender';

      // 1. Photos
      if (
        messageType === 'image' ||
        (mediaUrl && /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(mediaUrl)) ||
        mediaUrl?.startsWith('data:image/')
      ) {
        if (mediaUrl) {
          list.push({
            id: `${m.id}-photo`,
            type: 'photo',
            url: mediaUrl,
            fileName: fileName || 'Photo',
            createdAt,
            senderName,
            content,
          });
        }
      }

      // 2. Videos
      else if (
        messageType === 'video' ||
        (mediaUrl && /\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i.test(mediaUrl)) ||
        mediaUrl?.startsWith('data:video/')
      ) {
        if (mediaUrl) {
          list.push({
            id: `${m.id}-video`,
            type: 'video',
            url: mediaUrl,
            fileName: fileName || 'Video clip',
            createdAt,
            senderName,
            content,
          });
        }
      }

      // 3. Documents & PDFs
      else if (
        messageType === 'document' ||
        (fileName && /\.(pdf|docx?|xlsx?|pptx?|txt|zip|csv)(\?.*)?$/i.test(fileName)) ||
        (mediaUrl && /\.(pdf|docx?|xlsx?|pptx?|txt|zip|csv)(\?.*)?$/i.test(mediaUrl))
      ) {
        if (mediaUrl) {
          list.push({
            id: `${m.id}-doc`,
            type: 'doc',
            url: mediaUrl,
            fileName: fileName || 'Document',
            fileSize,
            createdAt,
            senderName,
            content,
          });
        }
      }

      // 4. Voice / Audio
      else if (
        messageType === 'voice' ||
        messageType === 'audio' ||
        (mediaUrl && /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(mediaUrl))
      ) {
        if (mediaUrl) {
          list.push({
            id: `${m.id}-voice`,
            type: 'voice',
            url: mediaUrl,
            fileName: fileName || 'Voice Note',
            fileSize,
            createdAt,
            senderName,
          });
        }
      }

      // 5. Links
      if (content) {
        const linkMatches = content.match(/https?:\/\/[^\s]+/gi);
        if (linkMatches) {
          linkMatches.forEach((linkUrl: string, idx: number) => {
            list.push({
              id: `${m.id}-link-${idx}`,
              type: 'link',
              url: linkUrl,
              content,
              createdAt,
              senderName,
            });
          });
        }
      }
    });

    return list;
  }, [mediaSource]);

  // Counts by media type with server fallback
  const totalCount = serverCounts.all || totalMediaCount || extractedMedia.length;
  const photosCount = serverCounts.photos || extractedMedia.filter((i) => i.type === 'photo').length;
  const videosCount = serverCounts.videos || extractedMedia.filter((i) => i.type === 'video').length;
  const docsCount = serverCounts.documents || extractedMedia.filter((i) => i.type === 'doc').length;
  const voiceCount = serverCounts.audio || extractedMedia.filter((i) => i.type === 'voice').length;
  const linksCount = serverCounts.links || extractedMedia.filter((i) => i.type === 'link').length;

  // Filtered Media list based on active tab and search query
  const filteredMedia = useMemo(() => {
    let result = extractedMedia;

    if (mediaTab !== 'all') {
      const typeMap: Record<MediaTab, string> = {
        all: '',
        photos: 'photo',
        videos: 'video',
        docs: 'doc',
        voice: 'voice',
        links: 'link',
      };
      const expectedType = typeMap[mediaTab];
      result = result.filter((i) => i.type === expectedType);
    }

    const q = mediaSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          (i.fileName && i.fileName.toLowerCase().includes(q)) ||
          (i.url && i.url.toLowerCase().includes(q)) ||
          (i.content && i.content.toLowerCase().includes(q)) ||
          (i.senderName && i.senderName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [extractedMedia, mediaTab, mediaSearchQuery]);

  // Utility to download a doc/file directly
  const handleDownloadFile = (url: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (size?: string | number) => {
    if (!size) return '';
    if (typeof size === 'string' && isNaN(Number(size))) return size;
    const num = typeof size === 'number' ? size : Number(size);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLastSeen = (dateStr?: string | Date | null) => {
    if (!dateStr) return 'Offline';
    const d = new Date(dateStr);
    return `Last seen ${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const activeName = isGroup ? group?.name : userProfile?.fullName || user?.fullName || 'User';
  const activeUsername = userProfile?.username || user?.username;
  const activeAvatar = isGroup
    ? groupDetails?.avatarUrl || group?.avatarUrl
    : userProfile?.avatarUrl || user?.avatarUrl;
  const isGroupAdmin = isGroup && group?.currentUserRole === 'admin';

  return (
    <div
      data-lenis-prevent
      className="flex-1 min-h-0 w-full h-full flex flex-col bg-slate-50/70 overflow-hidden select-auto"
    >
      {/* Dedicated Header Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Back to conversation"
          >
            <HiOutlineArrowLeft className="w-5 h-5 stroke-[2.2]" />
            <span className="text-xs sm:text-sm font-bold">Back to Chat</span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
            {isGroup ? 'Group Details' : 'Contact Info'}
          </h1>
          <p className="text-[11px] text-slate-400">
            {isGroup ? `${groupDetails?.members?.length ?? group?.memberCount ?? 0} members` : `@${activeUsername}`}
          </p>
        </div>

        <div className="w-20 flex justify-end">
          {!isGroup && activeUsername && (
            <button
              type="button"
              onClick={() => navigate(`/profile/${activeUsername}`)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Profile
            </button>
          )}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div
        ref={scrollContainerRef}
        data-lenis-prevent
        className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO OVERVIEW PROFILE CARD */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden">
          {/* Background banner glow */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />

          {/* Avatar with status */}
          <div className="relative mt-2 mb-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-slate-200 p-1 border-4 border-white shadow-md relative z-10">
              {activeAvatar ? (
                <img
                  src={activeAvatar}
                  alt={activeName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xl">
                  {isGroup ? (
                    <HiOutlineUserGroup className="w-10 h-10 text-indigo-400" />
                  ) : (
                    (activeName?.[0] || 'U').toUpperCase()
                  )}
                </div>
              )}
            </div>

            {/* Online indicator for user */}
            {!isGroup && (
              <span
                className={`absolute bottom-1 right-2 w-5 h-5 rounded-full border-3 border-white z-20 ${
                  isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-slate-300'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            )}
          </div>

          {/* Name & Title */}
          <div className="relative z-10 w-full">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeName}
              </h2>
              {isGroup && isGroupAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {isGroup
                ? `${groupDetails?.members?.length ?? group?.memberCount ?? 0} members`
                : `@${activeUsername}`}
            </p>

            {/* Presence status */}
            {!isGroup && (
              <>
                <p
                  className={`text-xs mt-1.5 font-semibold ${
                    isOnline ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isOnline ? 'Active Now' : formatLastSeen(lastSeen)}
                </p>

                {/* Direct Voice Call Quick Action Button */}
                {(() => {
                  const canCall =
                    !userProfile?.isPrivate ||
                    Boolean(userProfile?.isFollowing) ||
                    Boolean(userProfile?.isFollowedBy);

                  return (
                    <div className="mt-3.5 flex items-center justify-center gap-2">
                      <button
                        id="conversation-details-voice-call-btn"
                        type="button"
                        onClick={() => {
                          if (!canCall) {
                            alert(
                              `@${user?.username}'s account is private. You can only call them once they accept your follow request or if they follow you.`
                            );
                            return;
                          }
                          if (user) {
                            startVoiceCall({
                              id: user.id,
                              fullName: user.fullName,
                              username: user.username,
                              avatarUrl: user.avatarUrl,
                              isPrivate: userProfile?.isPrivate,
                              isFollowing: userProfile?.isFollowing,
                              isFollowedBy: userProfile?.isFollowedBy,
                            });
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 ${
                          canCall
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-102 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                        title={
                          canCall
                            ? `Voice Call ${activeName}`
                            : `Calls restricted: @${user?.username}'s account is private`
                        }
                      >
                        {canCall ? (
                          <HiOutlinePhone className="w-4 h-4" />
                        ) : (
                          <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
                        )}
                        <span>Voice Call</span>
                      </button>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Bio or Group Description */}
            {(userProfile?.bio || groupDetails?.description || group?.description) && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 max-w-lg mx-auto text-xs text-slate-700 leading-relaxed text-center break-words font-medium">
                {isGroup
                  ? groupDetails?.description || group?.description
                  : userProfile?.bio}
              </div>
            )}

            {/* User Stats chips if user profile is available */}
            {!isGroup && userProfile && (
              <div className="flex items-center justify-center gap-4 sm:gap-8 mt-5 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    {userProfile.followersCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Followers
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    {userProfile.followingCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Following
                  </p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    {formatDate(userProfile.createdAt)}
                  </p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Joined
                  </p>
                </div>
              </div>
            )}

            {/* Group Admin Edit Toggle */}
            {isGroup && isGroupAdmin && !isEditingGroup && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingGroup(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <HiOutlinePencilSquare className="w-4 h-4 text-indigo-600" />
                  <span>Edit Group Info</span>
                </button>
              </div>
            )}
          </div>

          {/* Group Edit Form if active */}
          {isGroup && isEditingGroup && (
            <form
              onSubmit={handleSaveGroupEdit}
              className="mt-4 pt-4 border-t border-slate-100 w-full max-w-md space-y-3 text-left"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  required
                  maxLength={60}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingGroup(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroupEdit || !editGroupName.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-black transition-colors disabled:opacity-50"
                >
                  {savingGroupEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. GROUP MEMBERS (ONLY IF GROUP) */}
        {/* ========================================================================= */}
        {isGroup && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HiOutlineUserGroup className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Members ({groupDetails?.members?.length || group?.memberCount || 0})
                </h3>
              </div>

              {isGroupAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <HiOutlineUserPlus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Members List */}
            <div data-lenis-prevent className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {loadingGroup ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Loading members...
                </div>
              ) : groupDetails?.members && groupDetails.members.length > 0 ? (
                groupDetails.members.map((member: GroupMemberItem) => {
                  const mName = member.user?.fullName || member.user?.username || 'Member';
                  const isCurrent = member.userId === currentUser?.id;
                  const isMemberAdmin = member.role === 'admin';

                  return (
                    <div
                      key={member.id}
                      className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0 font-bold text-xs text-indigo-700 flex items-center justify-center">
                          {member.user?.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt={mName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{(mName[0] || 'U').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {mName} {isCurrent && '(You)'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            @{member.user?.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isMemberAdmin ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            Admin
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Member</span>
                        )}

                        {/* Admin Action Menu for other members */}
                        {isGroupAdmin && !isCurrent && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMemberMenuId((prev) =>
                                  prev === member.id ? null : member.id
                                )
                              }
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                            >
                              <HiOutlineEllipsisVertical className="w-4 h-4" />
                            </button>

                            {openMemberMenuId === member.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRole(
                                      member.userId,
                                      isMemberAdmin ? 'member' : 'admin'
                                    )
                                  }
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  {isMemberAdmin ? 'Dismiss Admin' : 'Make Admin'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer"
                                >
                                  Remove Member
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  No members found
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SHARED MEDIA, DOCS & LINKS EXPLORER */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Shared Media, Docs & Links
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalCount} total shared item{totalCount === 1 ? '' : 's'}
              </p>
            </div>

            {/* Instant Search Bar inside Shared Media */}
            <div className="relative w-full sm:w-64">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mediaSearchQuery}
                onChange={(e) => setMediaSearchQuery(e.target.value)}
                placeholder="Search file, photo, link..."
                className="w-full py-1.5 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium"
              />
              {mediaSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMediaSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <HiOutlineXMark className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Media Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setMediaTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>All</span>
              <span className="opacity-75 text-[10px]">({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTab('photos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'photos'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <HiOutlinePhoto className="w-3.5 h-3.5 text-emerald-500" />
              <span>Photos</span>
              <span className="opacity-75 text-[10px]">({photosCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTab('videos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'videos'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <HiOutlineFilm className="w-3.5 h-3.5 text-sky-500" />
              <span>Videos</span>
              <span className="opacity-75 text-[10px]">({videosCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTab('docs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'docs'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <HiOutlineDocumentText className="w-3.5 h-3.5 text-rose-500" />
              <span>Docs & PDFs</span>
              <span className="opacity-75 text-[10px]">({docsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTab('voice')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'voice'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <HiOutlineMicrophone className="w-3.5 h-3.5 text-amber-500" />
              <span>Audio</span>
              <span className="opacity-75 text-[10px]">({voiceCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTab('links')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                mediaTab === 'links'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <HiOutlineLink className="w-3.5 h-3.5 text-purple-500" />
              <span>Links</span>
              <span className="opacity-75 text-[10px]">({linksCount})</span>
            </button>
          </div>

          {/* Media Content Display */}
          <div className="pt-2 min-h-40">
            {loadingMedia && filteredMedia.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Loading media...</span>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <HiOutlineSquares2X2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">
                  {mediaSearchQuery
                    ? `No matching results for "${mediaSearchQuery}"`
                    : 'No shared media or documents found'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Photos, videos, and PDFs sent in this conversation will be cataloged here.
                </p>
              </div>
            ) : mediaTab === 'photos' || (mediaTab === 'all' && filteredMedia.every((i) => i.type === 'photo')) ? (
              /* Photos Grid View */
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewPhotoUrl(item.url)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-200"
                  >
                    <img
                      src={item.url}
                      alt={item.fileName || 'Photo'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] text-white font-medium truncate">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : mediaTab === 'videos' ? (
              /* Videos Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xs"
                  >
                    <video
                      src={item.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold">
                        Video
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : mediaTab === 'docs' ? (
              /* Docs & PDFs List View */
              <div className="space-y-2">
                {filteredMedia.map((item) => {
                  const isPdf =
                    item.fileName?.toLowerCase().endsWith('.pdf') ||
                    item.url.toLowerCase().includes('.pdf');

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/70 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isPdf
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {isPdf ? 'PDF' : 'DOC'}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.fileName || 'Attached Document'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatFileSize(item.fileSize)} • {formatDate(item.createdAt)} •{' '}
                            {item.senderName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(item.url, item.fileName)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Download document"
                        >
                          <HiOutlineArrowDownTray className="w-4 h-4" />
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Open document"
                        >
                          <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : mediaTab === 'voice' ? (
              /* Professional Voice Notes List */
              <div className="space-y-3">
                {filteredMedia.map((item) => (
                  <VoiceNoteCard
                    key={item.id}
                    url={item.url}
                    senderName={item.senderName || 'Voice note'}
                    createdAt={item.createdAt}
                    onDownload={() => handleDownloadFile(item.url, item.fileName || 'voice-note.webm')}
                  />
                ))}
              </div>
            ) : mediaTab === 'links' ? (
              /* Links List View */
              <div className="space-y-2">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <HiOutlineLink className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:underline truncate block"
                        >
                          {item.url}
                        </a>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {formatDate(item.createdAt)} • Shared by {item.senderName}
                        </p>
                      </div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 shrink-0"
                      title="Open Link"
                    >
                      <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              /* Mixed All Tab View */
              <div className="space-y-2.5">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.type === 'photo' ? (
                        <div
                          onClick={() => setPreviewPhotoUrl(item.url)}
                          className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 cursor-pointer"
                        >
                          <img
                            src={item.url}
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : item.type === 'video' ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                          <HiOutlineFilm className="w-4 h-4" />
                        </div>
                      ) : item.type === 'doc' ? (
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          PDF
                        </div>
                      ) : item.type === 'voice' ? (
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <HiOutlineMicrophone className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <HiOutlineLink className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.fileName || item.url}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {item.type.toUpperCase()} • {formatDate(item.createdAt)} • By {item.senderName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.type === 'photo' ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(item.url)}
                          className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          View
                        </button>
                      ) : item.type === 'doc' ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(item.url, item.fileName)}
                          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          title="Download"
                        >
                          <HiOutlineArrowDownTray className="w-4 h-4" />
                        </button>
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          title="Open"
                        >
                          <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Server Pagination: Load More */}
            {hasMoreMedia && (
              <div className="pt-4 flex flex-col items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLoadMoreMedia}
                  disabled={loadingMoreMedia}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {loadingMoreMedia ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Loading more items...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineArrowDownTray className="w-4 h-4 stroke-[2.2]" />
                      <span>Load More Media</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 font-medium">
                  Showing {filteredMedia.length} of {totalMediaCount || totalCount} items
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. CHAT MANAGEMENT & PRIVACY OPTIONS (AT LAST) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Chat Options & Privacy
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize alerts, organization, and privacy controls for this chat
            </p>
          </div>

          <div className="space-y-2">
            {/* 1. MUTE NOTIFICATIONS TOGGLE */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isMuted
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isMuted ? (
                    <HiOutlineSpeakerXMark className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <HiOutlineSpeakerWave className="w-5 h-5 stroke-[2]" />
                  )}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Mute Notifications
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isMuted
                      ? 'Notifications are currently silenced'
                      : 'Silence alerts for new messages in this chat'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleMute}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isMuted ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isMuted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 2. ARCHIVE CHAT TOGGLE */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isArchived
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <HiOutlineArchiveBox className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Archive Conversation
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isArchived
                      ? 'Chat is currently archived'
                      : 'Move this chat to the Archived tab to keep your inbox clean'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleArchive}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isArchived ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isArchived ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 3. PIN CHAT TOGGLE */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isPinned
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <BsPinAngleFill className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Pin to Top
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isPinned
                      ? 'Pinned to the top of your conversations list'
                      : 'Pin this chat to stay at the very top of your inbox'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onTogglePin}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isPinned ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPinned ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 4. STAR / FAVOURITE CHAT TOGGLE */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isFavourite
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <HiStar className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Mark as Favourite
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isFavourite
                      ? 'Chat is marked as favourite'
                      : 'Access easily through the Favourites chat tab'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleFavourite}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isFavourite ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isFavourite ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 5. CLEAR CHAT HISTORY */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <HiOutlineTrash className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Clear Chat History
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permanently delete all messages sent and received in this chat
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* 6. BLOCK USER (DIRECT CHAT ONLY) */}
            {!isGroup && onToggleBlock && (
              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between hover:bg-rose-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <HiOutlineNoSymbol className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-rose-900 leading-tight">
                      {isBlocked ? 'Unblock Contact' : 'Block Contact'}
                    </p>
                    <p className="text-[11px] text-rose-700/80 mt-0.5">
                      {isBlocked
                        ? 'Contact is currently blocked from sending you messages'
                        : 'Blocked contacts will not be able to send you messages or view your status'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBlockConfirm(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isBlocked
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                      : 'bg-white hover:bg-rose-100 border border-rose-300 text-rose-700'
                  }`}
                >
                  {isBlocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            )}

            {/* 7. LEAVE GROUP (GROUP CHAT ONLY) */}
            {isGroup && onLeaveGroup && (
              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between hover:bg-rose-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <HiOutlineTrash className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-rose-900 leading-tight">
                      Leave Group
                    </p>
                    <p className="text-[11px] text-rose-700/80 mt-0.5">
                      You will no longer receive messages or be able to participate in this group
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all cursor-pointer"
                >
                  Leave
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* ========================================================================= */}
      {/* 5. MODALS & CONFIRMATION OVERLAYS */}
      {/* ========================================================================= */}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <Modal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          size="sm"
          backdropVariant="blur"
          icon={<HiOutlineTrash className="w-5 h-5 text-rose-600 stroke-[2.2]" />}
          iconClassName="bg-rose-50 text-rose-600 border border-rose-100 shadow-xs"
          title="Clear Chat History"
          description={`Are you sure you want to clear this entire chat with ${activeName}?`}
          showCloseButton={true}
          closeButtonPosition="inside"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              All messages, photos, videos, and attachments in this conversation will be cleared from your view. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearChat();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Block User Confirmation Modal */}
      {showBlockConfirm && onToggleBlock && (
        <Modal
          isOpen={showBlockConfirm}
          onClose={() => setShowBlockConfirm(false)}
          size="sm"
          backdropVariant="blur"
          icon={<HiOutlineNoSymbol className="w-5 h-5 text-rose-600 stroke-[2.2]" />}
          iconClassName="bg-rose-50 text-rose-600 border border-rose-100 shadow-xs"
          title={isBlocked ? `Unblock @${activeUsername}?` : `Block @${activeUsername}?`}
          description={
            isBlocked
              ? 'They will be able to message you and view your presence again.'
              : 'They will no longer be able to message you or view your online status.'
          }
          showCloseButton={true}
          closeButtonPosition="inside"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {isBlocked
                ? `Unblocking @${activeUsername} allows them to send messages and connect with you on Echolet.`
                : `Blocking @${activeUsername} will prevent them from sending messages or calling you. You can unblock them at any time.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBlockConfirm(false);
                  onToggleBlock();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  isBlocked
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isBlocked ? 'Confirm Unblock' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Leave Group Confirmation Modal */}
      {showLeaveConfirm && (
        <Modal
          isOpen={showLeaveConfirm}
          onClose={() => setShowLeaveConfirm(false)}
          size="sm"
          backdropVariant="blur"
          icon={<HiOutlineTrash className="w-5 h-5 text-rose-600 stroke-[2.2]" />}
          iconClassName="bg-rose-50 text-rose-600 border border-rose-100 shadow-xs"
          title={`Leave "${activeName}"?`}
          description="Are you sure you want to leave this group conversation?"
          showCloseButton={!leavingGroup}
          closeButtonPosition="inside"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              You will be removed from this group and will no longer receive updates or messages from other members.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leavingGroup}
                onClick={handleConfirmLeaveGroup}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {leavingGroup ? 'Leaving...' : 'Confirm Leave'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Members to Group Modal */}
      {isAddMemberOpen && (
        <Modal
          isOpen={isAddMemberOpen}
          onClose={() => {
            setIsAddMemberOpen(false);
            setSelectedToAdd([]);
            setAddMemberQuery('');
          }}
          size="md"
          backdropVariant="blur"
          icon={<HiOutlineUserPlus className="w-5 h-5 text-indigo-600 stroke-[2.2]" />}
          iconClassName="bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs"
          title="Add Members to Group"
          description={`Add contacts to "${activeName}"`}
          showCloseButton={!addingMembers}
          closeButtonPosition="inside"
        >
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={addMemberQuery}
                onChange={(e) => setAddMemberQuery(e.target.value)}
                placeholder="Search people by username or name..."
                autoFocus
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 font-medium"
              />
            </div>

            {/* Selected Pills */}
            {selectedToAdd.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedToAdd.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                  >
                    <span>{u.fullName || u.username}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedToAdd((prev) => prev.filter((x) => x.id !== u.id))
                      }
                      className="hover:text-indigo-900"
                    >
                      <HiOutlineXMark className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Results */}
            <div data-lenis-prevent className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {searchingUsers ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Searching users...
                </div>
              ) : addMemberResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {addMemberQuery
                    ? 'No matching users found'
                    : 'Type a name to search for contacts to add'}
                </div>
              ) : (
                addMemberResults.map((u) => {
                  const isSelected = selectedToAdd.some((x) => x.id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedToAdd((prev) =>
                          isSelected
                            ? prev.filter((x) => x.id !== u.id)
                            : [...prev, u]
                        );
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0 font-bold text-xs text-indigo-700 flex items-center justify-center">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{(u.username[0] || 'U').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {u.fullName || u.username}
                          </p>
                          <p className="text-[11px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <HiOutlineCheck className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setSelectedToAdd([]);
                  setAddMemberQuery('');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedToAdd.length === 0 || addingMembers}
                onClick={handleAddMembersSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition-all disabled:opacity-50"
              >
                {addingMembers
                  ? 'Adding...'
                  : `Add ${selectedToAdd.length} Member${selectedToAdd.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fullscreen Photo Viewer */}
      {previewPhotoUrl && (
        <MediaViewerModal
          isOpen={Boolean(previewPhotoUrl)}
          onClose={() => setPreviewPhotoUrl(null)}
          images={[previewPhotoUrl]}
          authorName={activeName}
        />
      )}
    </div>
  );
}
