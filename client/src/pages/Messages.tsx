import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import {
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePencilSquare,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowUturnRight,
  HiOutlineTrash,
  HiOutlineFaceSmile,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineArrowDownTray,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineInformationCircle,
  HiOutlinePlus,
  HiOutlineMicrophone,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineStar,
  HiStar,
  HiOutlineArchiveBox,
  HiOutlineSpeakerXMark,
  HiOutlineSpeakerWave,
  HiOutlineNoSymbol,
  HiOutlineEllipsisVertical,
  HiOutlineEnvelope,
  HiOutlineEnvelopeOpen,
  HiOutlineGlobeAlt,
} from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import messageService, {
  type MessageItem,
  type ConversationItem,
  type ChatSettings,
} from '../services/messageService';
import groupService, {
  type GroupItem,
  type GroupMessageItem,
} from '../services/groupService';
import globalChatService, {
  type GlobalMessageItem,
} from '../services/globalChatService';
import userService, { type UserProfileResponse } from '../services/userService';
import type { User } from '../services/authService';
import getSocket, { joinUserRoom } from '../services/socket';
import { useMessage } from '../context/MessageContext';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupInfoModal from '../components/GroupInfoModal';
import GlobalChatRoom from '../components/GlobalChatRoom';
import ChatPollWidget from '../components/ChatPollWidget';
import ChatMediaAttachment from '../components/ChatMediaAttachment';
import ChatAttachmentMenu from '../components/ChatAttachmentMenu';
import CreateChatPollModal from '../components/CreateChatPollModal';

// WhatsApp-like dual tick SVG indicator
const MessageTicks: React.FC<{
  status?: 'sent' | 'delivered' | 'read';
  isRead?: boolean;
}> = ({ status, isRead }) => {
  const isViewed = status === 'read' || isRead;
  const isDelivered = status === 'delivered' || isViewed;

  if (isViewed) {
    return (
      <svg
        className="w-3.5 h-3.5 text-sky-400 shrink-0 inline-block transition-colors"
        viewBox="0 0 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Read"
      >
        <title>Read</title>
        <path d="M1 8.5l3.5 3.5L11 4" />
        <path d="M5 8.5l3.5 3.5L15 4" />
      </svg>
    );
  }

  if (isDelivered) {
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-400 shrink-0 inline-block transition-colors"
        viewBox="0 0 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Delivered"
      >
        <title>Delivered</title>
        <path d="M1 8.5l3.5 3.5L11 4" />
        <path d="M5 8.5l3.5 3.5L15 4" />
      </svg>
    );
  }

  return (
    <svg
      className="w-3 h-3 text-slate-400 shrink-0 inline-block transition-colors"
      viewBox="0 0 16 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Sent"
    >
      <title>Sent</title>
      <path d="M2.5 8.5l4 4L14 4" />
    </svg>
  );
};

// Reusable Pin icon
const PinIcon: React.FC<{ className?: string; filled?: boolean }> = ({
  className = 'w-4 h-4',
  filled = false,
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17z" />
  </svg>
);

// Reusable Voice Note Audio Player bubble component
const VoiceNotePlayer: React.FC<{
  audioUrl?: string;
  duration?: number;
  isMe?: boolean;
  extraRight?: React.ReactNode;
}> = ({ audioUrl, duration = 0, isMe = false, extraRight }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

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
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(Math.round(newTime));
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const waveformBars = [
    24, 45, 68, 38, 55, 88, 42, 78, 96, 60, 82, 48, 92, 70, 46, 84,
    58, 88, 42, 68, 98, 52, 76, 62, 86, 38, 72, 54, 82, 58, 36, 22
  ];

  return (
    <div className="flex items-center gap-3 py-1.5 px-0.5 min-w-[240px] sm:min-w-[270px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 cursor-pointer ${
          isMe
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? (
          <HiOutlinePause className="w-5 h-5 fill-current" />
        ) : (
          <HiOutlinePlay className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
        <div
          onClick={handleSeek}
          className="h-6 flex items-center gap-[2.5px] cursor-pointer py-1 group/wave"
          title="Click to seek"
        >
          {waveformBars.map((h, i) => {
            const barPct = (i / waveformBars.length) * 100;
            const isPlayed = barPct <= progressPct;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-all duration-100 ${
                  isPlayed
                    ? isMe
                      ? 'bg-purple-300'
                      : 'bg-purple-600'
                    : isMe
                    ? 'bg-slate-700/80 group-hover/wave:bg-slate-600'
                    : 'bg-slate-200 group-hover/wave:bg-slate-300'
                }`}
              />
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between text-[11px] font-medium leading-none select-none ${
            isMe ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              {formatSeconds(isPlaying ? currentTime : totalDuration || 0)}
            </span>
            <button
              type="button"
              onClick={toggleSpeed}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                isMe
                  ? 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-purple-600 hover:bg-purple-50'
              }`}
              title="Playback speed"
            >
              {playbackRate}x
            </button>
            <HiOutlineMicrophone className="w-3.5 h-3.5 opacity-60" />
          </div>

          {extraRight && <div className="ml-auto">{extraRight}</div>}
        </div>
      </div>
    </div>
  );
};

// Reusable Live Voice Recording Bar component
const VoiceRecorderBar: React.FC<{
  onCancel: () => void;
  onSend: (audioUrl: string, duration: number) => void;
}> = ({ onCancel, onSend }) => {
  const { showError } = useMessage();
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        let options: MediaRecorderOptions = {};
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            options = { mimeType: 'audio/webm;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            options = { mimeType: 'audio/ogg;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
          }
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(200);

        timerRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.error('Microphone access error:', err);
        showError('Could not access microphone. Please check your browser permissions.', 'Microphone Error');
        onCancel();
      }
    }

    startRecording();

    return () => {
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onCancel]);

  const handleStopAndSend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      onCancel();
      return;
    }

    const duration = Math.max(1, seconds);

    mediaRecorder.onstop = () => {
      const mime = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        onSend(base64Data, duration);
      };
      reader.readAsDataURL(audioBlob);
    };

    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2 bg-rose-50/90 border border-rose-200 rounded-2xl animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
        <span className="text-sm font-bold text-rose-700 flex items-center gap-2">
          Recording <span className="font-mono text-xs">{formatTime(seconds)}</span>
        </span>
        <div className="hidden sm:flex items-center gap-1 h-3.5">
          <span className="w-1 bg-rose-400 h-2 animate-pulse rounded-full" />
          <span className="w-1 bg-rose-500 h-3.5 animate-bounce rounded-full" />
          <span className="w-1 bg-rose-400 h-2.5 animate-pulse rounded-full" />
          <span className="w-1 bg-rose-500 h-4 animate-bounce rounded-full" />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDiscard}
          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
          title="Discard recording"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleStopAndSend}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Send voice note"
        >
          <HiOutlinePaperAirplane className="w-3.5 h-3.5 rotate-90" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

// Context Menu / Dropdown for Chat items & Chat header
const ChatActionDropdown: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isUnread: boolean;
  isFavourite: boolean;
  isBlocked?: boolean;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onToggleMute: () => void;
  onToggleUnread: () => void;
  onToggleFavourite: () => void;
  onToggleBlock?: () => void;
  onClearChat: () => void;
}> = ({
  isOpen,
  onClose,
  isPinned,
  isArchived,
  isMuted,
  isUnread,
  isFavourite,
  isBlocked,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
  onToggleUnread,
  onToggleFavourite,
  onToggleBlock,
  onClearChat,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-8 z-50 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150"
      >
      <button
        type="button"
        onClick={() => {
          onTogglePin();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <PinIcon className="w-4 h-4 text-purple-600" filled={isPinned} />
        <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleMute();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        {isMuted ? (
          <HiOutlineSpeakerWave className="w-4 h-4 text-slate-500" />
        ) : (
          <HiOutlineSpeakerXMark className="w-4 h-4 text-amber-500" />
        )}
        <span>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleFavourite();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        {isFavourite ? (
          <HiStar className="w-4 h-4 text-amber-500" />
        ) : (
          <HiOutlineStar className="w-4 h-4 text-amber-500" />
        )}
        <span>{isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleUnread();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        {isUnread ? (
          <HiOutlineEnvelopeOpen className="w-4 h-4 text-purple-600" />
        ) : (
          <HiOutlineEnvelope className="w-4 h-4 text-purple-600" />
        )}
        <span>{isUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleArchive();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <HiOutlineArchiveBox className="w-4 h-4 text-slate-500" />
        <span>{isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
      </button>

      {onToggleBlock && (
        <button
          type="button"
          onClick={() => {
            onToggleBlock();
            onClose();
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 hover:text-red-600"
        >
          <HiOutlineNoSymbol className="w-4 h-4 text-red-500" />
          <span>{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
        </button>
      )}

      <div className="h-px bg-slate-100 my-1" />

      <button
        type="button"
        onClick={() => {
          onClearChat();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer text-rose-600 font-medium"
      >
        <HiOutlineTrash className="w-4 h-4 text-rose-500" />
        <span>Clear Chat</span>
      </button>
    </div>
    </>
  );
};

// Reusable user avatar with graceful fallback & online status badge
const UserAvatar: React.FC<{
  user?: { fullName?: string; username?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  showBadge?: boolean;
}> = ({ user, size = 'md', isOnline = false, showBadge = false }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const badgeSize = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
  }[size];

  return (
    <div className={`relative shrink-0 ${sizeClasses}`}>
      {user?.avatarUrl && !imgError ? (
        <img
          src={user.avatarUrl}
          alt={user.fullName || user.username || 'User'}
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-full object-cover shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-linear-to-tr from-slate-900 to-slate-700 text-white font-bold flex items-center justify-center uppercase shadow-2xs select-none`}
        >
          {user?.fullName?.[0] || user?.username?.[0] || 'U'}
        </div>
      )}
      {showBadge && (
        <span
          className={`absolute bottom-0 right-0 ${badgeSize} rounded-full ring-white transition-all ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

// Group avatar with multi-user badge
const GroupAvatar: React.FC<{
  group?: { name?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
}> = ({ group, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  return (
    <div className={`relative shrink-0 ${sizeClasses}`}>
      {group?.avatarUrl ? (
        <img
          src={group.avatarUrl}
          alt={group.name || 'Group'}
          className={`${sizeClasses} rounded-2xl object-cover shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-tr from-indigo-700 via-purple-700 to-indigo-900 text-white font-bold flex items-center justify-center uppercase shadow-2xs select-none`}
        >
          <HiOutlineUserGroup className="w-5 h-5 text-indigo-100" />
        </div>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white shadow-2xs"
        title="Group Chat"
      >
        <HiOutlineUserGroup className="w-2 h-2" />
      </span>
    </div>
  );
};

// Deterministic colorful sender name for group chats
const SENDER_COLORS = [
  'text-indigo-600',
  'text-rose-600',
  'text-emerald-600',
  'text-amber-600',
  'text-sky-600',
  'text-violet-600',
  'text-teal-600',
  'text-fuchsia-600',
];

const getSenderColor = (id?: string) => {
  if (!id) return 'text-indigo-600';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

// WhatsApp / Telegram style Multi-select Action Bar
const MultiSelectActionBar: React.FC<{
  selectedCount: number;
  isAllSelected: boolean;
  onClear: () => void;
  onToggleSelectAll: () => void;
  onCopy: () => void;
  onForward: () => void;
  onExport: () => void;
  onStar?: () => void;
  onDelete: () => void;
}> = ({
  selectedCount,
  isAllSelected,
  onClear,
  onToggleSelectAll,
  onCopy,
  onForward,
  onExport,
  onStar,
  onDelete,
}) => {
  return (
    <div className="px-4 py-3 border-b border-purple-100 bg-linear-to-r from-purple-50/90 via-white to-purple-50/90 flex items-center justify-between shrink-0 shadow-xs animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Exit selection mode"
        >
          <HiOutlineXMark className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold shadow-2xs">
            {selectedCount}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-800 hidden sm:inline">
            selected
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={onToggleSelectAll}
          className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer transition-colors"
        >
          {isAllSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Star */}
        {onStar && (
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onStar}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
            title="Star selected messages"
          >
            <HiStar className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">Star</span>
          </button>
        )}

        {/* Copy */}
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onCopy}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs hover:border-slate-300"
          title="Copy selected messages"
        >
          <HiOutlineClipboardDocument className="w-4 h-4 text-purple-600" />
          <span className="hidden md:inline">Copy</span>
        </button>

        {/* Forward */}
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onForward}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs hover:border-slate-300"
          title="Forward selected messages"
        >
          <HiOutlineArrowUturnRight className="w-4 h-4 text-blue-600" />
          <span className="hidden md:inline">Forward</span>
        </button>

        {/* Export */}
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onExport}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs hover:border-slate-300"
          title="Export selected messages"
        >
          <HiOutlineArrowDownTray className="w-4 h-4 text-emerald-600" />
          <span className="hidden md:inline">Export</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onDelete}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-rose-600 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
          title="Delete selected messages"
        >
          <HiOutlineTrash className="w-4 h-4" />
          <span className="hidden md:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};

export default function Messages() {
  const { showSuccess, showError, showInfo, showWarning } = useMessage();
  const { username: paramUsername } = useParams<{ username?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{
    user?: User | null;
    refreshUnreadCount?: () => void;
  }>();
  const currentUser = outletContext?.user;
  const refreshUnreadCount = outletContext?.refreshUnreadCount;

  const targetUserParam =
    paramUsername || searchParams.get('user') || searchParams.get('username') || searchParams.get('userId');
  const targetGroupParam = searchParams.get('group') || searchParams.get('groupId');

  // Filter tabs: 'all' | 'direct' | 'groups' | 'global' | 'favourites' | 'archived'
  const [chatTab, setChatTab] = useState<
    'all' | 'direct' | 'groups' | 'global' | 'favourites' | 'archived'
  >(paramUsername === 'global' || searchParams.get('room') === 'global' ? 'global' : 'all');

  // Global Chat state
  const [isGlobalActive, setIsGlobalActive] = useState<boolean>(
    paramUsername === 'global' || searchParams.get('room') === 'global' || searchParams.get('type') === 'global'
  );
  const [globalStats, setGlobalStats] = useState<{
    onlineCount: number;
    lastMessage?: GlobalMessageItem | null;
  }>({ onlineCount: 1, lastMessage: null });

  // Chat preferences & settings state
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    archivedChats: [],
    mutedChats: [],
    pinnedChats: [],
    unreadChats: [],
    favouriteChats: [],
    blockedUsers: [],
  });

  // Voice note recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Clear chat modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const location = useLocation();

  // Dropdown menu states
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setIsHeaderMenuOpen(false);
    setOpenChatMenuId(null);
  }, [location.pathname, location.search]);

  // Direct conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfileResponse | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Group conversations state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupItem | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessageItem[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [groupTypingUsers, setGroupTypingUsers] = useState<
    Record<string, { username: string; fullName: string }>
  >({});

  // Input & sending state
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  // Presence & Typing state (Direct)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Message Actions state (edit, reply, forward, delete)
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [editingGroupMsg, setEditingGroupMsg] = useState<GroupMessageItem | null>(null);
  const [replyingToGroupMsg, setReplyingToGroupMsg] = useState<GroupMessageItem | null>(null);

  // Multi-select & Batch Actions State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Forwarding State (supports single and multiple)
  const [forwardingMessages, setForwardingMessages] = useState<(MessageItem | GroupMessageItem)[]>([]);
  const setForwardingMessage = useCallback((m: MessageItem | GroupMessageItem | null) => {
    setForwardingMessages(m ? [m] : []);
  }, []);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetIds, setForwardingTargetIds] = useState<string[]>([]);
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  // Deleting State (supports single and multiple)
  const [deletingMessages, setDeletingMessages] = useState<(MessageItem | GroupMessageItem)[]>([]);
  const setDeletingMessage = useCallback((m: MessageItem | null) => {
    setDeletingMessages(m ? [m] : []);
  }, []);
  const setDeletingGroupMsg = useCallback((m: GroupMessageItem | null) => {
    setDeletingMessages(m ? [m] : []);
  }, []);
  const [isDeleting, setIsDeleting] = useState(false);
  const isSendingRef = useRef(false);

  // MessageContext popup integration helper
  const showFeedbackToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) => {
      if (type === 'success') {
        showSuccess(text, title || 'Success');
      } else if (type === 'error') {
        showError(text, title || 'Error');
      } else if (type === 'warning') {
        showWarning(text, title || 'Warning');
      } else {
        showInfo(text, title || 'Notice');
      }
    },
    [showSuccess, showError, showWarning, showInfo]
  );

  // Deduplicated message streams for rendering
  const deduplicatedGroupMessages = useMemo(() => {
    const seen = new Set<string>();
    return groupMessages.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [groupMessages]);

  const deduplicatedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  // Current active message stream and selection state
  const currentActiveMessages = useMemo(() => {
    if (activeGroup) return deduplicatedGroupMessages;
    if (activeUser) return deduplicatedMessages;
    return [];
  }, [activeGroup, activeUser, deduplicatedGroupMessages, deduplicatedMessages]);

  const selectedMessagesList = useMemo(() => {
    if (selectedMessageIds.size === 0) return [];
    return currentActiveMessages.filter((m) => selectedMessageIds.has(m.id));
  }, [currentActiveMessages, selectedMessageIds]);

  const isAllSelected = useMemo(() => {
    const selectable = currentActiveMessages.filter((m) => !m.isDeletedForEveryone);
    return selectable.length > 0 && selectable.every((m) => selectedMessageIds.has(m.id));
  }, [currentActiveMessages, selectedMessageIds]);

  const toggleSelectMessage = useCallback((id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const selectable = currentActiveMessages.filter((m) => !m.isDeletedForEveryone);
    if (isAllSelected) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(selectable.map((m) => m.id)));
    }
  }, [currentActiveMessages, isAllSelected]);

  const handleClearSelection = useCallback(() => {
    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleCopySelected = useCallback(async () => {
    if (selectedMessagesList.length === 0) return;
    const sorted = [...selectedMessagesList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let textToCopy = '';
    if (sorted.length === 1) {
      textToCopy = sorted[0].content;
    } else {
      textToCopy = sorted
        .map((m) => {
          let senderName = m.senderId === currentUser?.id ? 'You' : (activeUser?.fullName || 'User');
          if ('sender' in m && m.sender) {
            senderName = m.sender.fullName || m.sender.username || 'User';
          }
          const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `[${timeStr}] ${senderName}: ${m.content}`;
        })
        .join('\n');
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      showFeedbackToast(
        `Copied ${sorted.length} message${sorted.length > 1 ? 's' : ''} to clipboard`,
        'success'
      );
    } catch (err) {
      console.error('Copy failed:', err);
      showFeedbackToast('Failed to copy to clipboard', 'error');
    }
  }, [selectedMessagesList, currentUser, activeUser, showFeedbackToast]);

  const handleForwardSelected = useCallback(() => {
    if (selectedMessagesList.length === 0) return;
    setForwardingMessages(selectedMessagesList);
    setForwardingTargetIds([]);
  }, [selectedMessagesList]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedMessagesList.length === 0) return;
    setDeletingMessages(selectedMessagesList);
  }, [selectedMessagesList]);

  const handleStarSelected = useCallback(async () => {
    if (selectedMessagesList.length === 0) return;
    try {
      if (activeGroup) {
        for (const msg of selectedMessagesList) {
          const res = await groupService.toggleStarGroupMessage(activeGroup.id, msg.id);
          setGroupMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, starredBy: res.message.starredBy } : m))
          );
        }
      } else {
        for (const msg of selectedMessagesList) {
          const res = await messageService.toggleStarMessage(msg.id);
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, starredBy: res.message.starredBy } : m))
          );
        }
      }
      showFeedbackToast(
        `Updated star status for ${selectedMessagesList.length} message${selectedMessagesList.length > 1 ? 's' : ''}`,
        'success'
      );
      handleClearSelection();
    } catch {
      showFeedbackToast('Failed to update star on selected messages', 'error');
    }
  }, [selectedMessagesList, activeGroup, showFeedbackToast, handleClearSelection]);

  const handleExportSelected = useCallback(() => {
    if (selectedMessagesList.length === 0) return;
    const sorted = [...selectedMessagesList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const chatTitle = activeGroup?.name || activeUser?.fullName || 'Chat';
    const exportHeader = `Echolet Chat Transcript - ${chatTitle}\nExported on: ${new Date().toLocaleString()}\nMessages: ${sorted.length}\n${'='.repeat(40)}\n\n`;
    const exportBody = sorted
      .map((m) => {
        let senderName = m.senderId === currentUser?.id ? 'You' : (activeUser?.fullName || 'User');
        if ('sender' in m && m.sender) {
          senderName = m.sender.fullName || m.sender.username || 'User';
        }
        const dateStr = new Date(m.createdAt).toLocaleString();
        return `[${dateStr}] ${senderName}:\n${m.content}\n`;
      })
      .join('\n');

    const blob = new Blob([exportHeader + exportBody], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Echolet-${chatTitle.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedbackToast(
      `Exported ${sorted.length} message${sorted.length > 1 ? 's' : ''} to file`,
      'success'
    );
  }, [selectedMessagesList, activeGroup, activeUser, currentUser, showFeedbackToast]);

  const canDeleteSelectedForEveryone = useMemo(() => {
    if (deletingMessages.length === 0) return false;
    if (deletingMessages.some((m) => m.isDeletedForEveryone)) return false;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (activeGroup) {
      if (activeGroup.currentUserRole === 'admin') return true;
      return deletingMessages.every((m) => {
        const isSender = m.senderId === currentUser?.id;
        const isRecent = Date.now() - new Date(m.createdAt).getTime() <= TWENTY_FOUR_HOURS_MS;
        return isSender && isRecent;
      });
    }
    return deletingMessages.every((m) => {
      const isSender = m.senderId === currentUser?.id;
      const isRecent = Date.now() - new Date(m.createdAt).getTime() <= TWENTY_FOUR_HOURS_MS;
      return isSender && isRecent;
    });
  }, [deletingMessages, activeGroup, currentUser]);

  // Emoji Picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join user room on mount or user change
  useEffect(() => {
    if (currentUser?.id) {
      joinUserRoom(currentUser.id);
    }
  }, [currentUser?.id]);

  // Stable refs to prevent cascading re-renders and loops
  const conversationsRef = useRef<ConversationItem[]>([]);
  conversationsRef.current = conversations;

  const groupsRef = useRef<GroupItem[]>([]);
  groupsRef.current = groups;

  const activeUserRef = useRef<UserProfileResponse | null>(null);
  activeUserRef.current = activeUser;

  const activeGroupRef = useRef<GroupItem | null>(null);
  activeGroupRef.current = activeGroup;

  const currentUserRef = useRef<User | null | undefined>(currentUser);
  currentUserRef.current = currentUser;

  // Fetch Direct Conversations
  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      conversationsRef.current = data;
      data.forEach((c) => {
        if (c.user.lastSeen) {
          setLastSeenMap((prev) => ({ ...prev, [c.user.id]: c.user.lastSeen! }));
        }
        if (c.user.isOnline) {
          setOnlineUserIds((prev) => new Set([...prev, c.user.id]));
        }
      });
      refreshUnreadCount?.();
      return data;
    } catch {
      return [];
    }
  }, [refreshUnreadCount]);

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    try {
      const list = await groupService.getGroups();
      setGroups(list);
      groupsRef.current = list;
      return list;
    } catch {
      return [];
    }
  }, []);

  const fetchMessages = useCallback(
    async (userId: string) => {
      try {
        const data = await messageService.getMessages(userId);
        setMessages(data);
        refreshUnreadCount?.();
      } catch {}
    },
    [refreshUnreadCount]
  );

  const fetchGroupMessagesList = useCallback(async (groupId: string) => {
    try {
      const data = await groupService.getGroupMessages(groupId);
      setGroupMessages(data);
    } catch {}
  }, []);

  const fetchChatSettings = useCallback(async () => {
    try {
      const data = await messageService.getChatSettings();
      setChatSettings(data);
    } catch {}
  }, []);

  // Chat preference toggle handlers
  const togglePinChat = async (chatId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_pin', chatId);
      setChatSettings(res);
      showFeedbackToast(
        res.pinnedChats.includes(chatId) ? 'Chat pinned to top' : 'Chat unpinned',
        'success'
      );
    } catch {
      showFeedbackToast('Failed to update pin status', 'error');
    }
  };

  const toggleArchiveChat = async (chatId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_archive', chatId);
      setChatSettings(res);
      showFeedbackToast(
        res.archivedChats.includes(chatId) ? 'Chat archived' : 'Chat unarchived',
        'success'
      );
    } catch {
      showFeedbackToast('Failed to update archive status', 'error');
    }
  };

  const toggleMuteChat = async (chatId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_mute', chatId);
      setChatSettings(res);
      showFeedbackToast(
        res.mutedChats.includes(chatId) ? 'Notifications muted' : 'Notifications unmuted',
        'success'
      );
    } catch {
      showFeedbackToast('Failed to update mute status', 'error');
    }
  };

  const toggleUnreadChat = async (chatId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_unread', chatId);
      setChatSettings(res);
      showFeedbackToast(
        res.unreadChats.includes(chatId) ? 'Marked as unread' : 'Marked as read',
        'success'
      );
    } catch {
      showFeedbackToast('Failed to update unread status', 'error');
    }
  };

  const toggleFavouriteChat = async (chatId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_favourite', chatId);
      setChatSettings(res);
      showFeedbackToast(
        res.favouriteChats.includes(chatId) ? 'Added to favourites' : 'Removed from favourites',
        'success'
      );
    } catch {
      showFeedbackToast('Failed to update favourites', 'error');
    }
  };

  const toggleBlockUser = async (userId: string) => {
    try {
      const res = await messageService.updateChatSettings('toggle_block', userId);
      setChatSettings(res);
      showFeedbackToast(
        res.blockedUsers.includes(userId) ? 'Contact blocked' : 'Contact unblocked',
        'info'
      );
    } catch {
      showFeedbackToast('Failed to update block status', 'error');
    }
  };

  const handleConfirmClearChat = async () => {
    try {
      if (activeGroup) {
        await groupService.clearGroupChat(activeGroup.id);
        setGroupMessages([]);
        showFeedbackToast('Group chat cleared', 'success');
      } else if (activeUser) {
        await messageService.clearConversation(activeUser.id);
        setMessages([]);
        showFeedbackToast('Chat cleared', 'success');
      }
      setIsClearModalOpen(false);
      fetchConversations();
    } catch {
      showFeedbackToast('Failed to clear chat', 'error');
    }
  };

  const handleToggleStarMessage = async (msgId: string) => {
    try {
      if (activeGroup) {
        const res = await groupService.toggleStarGroupMessage(activeGroup.id, msgId);
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, starredBy: res.message.starredBy } : m))
        );
        showFeedbackToast(res.isStarred ? 'Message starred' : 'Message unstarred', 'success');
      } else {
        const res = await messageService.toggleStarMessage(msgId);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, starredBy: res.message.starredBy } : m))
        );
        showFeedbackToast(res.isStarred ? 'Message starred' : 'Message unstarred', 'success');
      }
    } catch {
      showFeedbackToast('Failed to star message', 'error');
    }
  };

  const handleTogglePinMessage = async (msgId: string) => {
    try {
      if (activeGroup) {
        const res = await groupService.togglePinGroupMessage(activeGroup.id, msgId);
        setGroupMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                isPinned: res.message.isPinned,
                pinnedAt: res.message.pinnedAt,
                pinnedBy: res.message.pinnedBy,
              };
            }
            if (res.isPinned) {
              return {
                ...m,
                isPinned: false,
                pinnedAt: undefined,
                pinnedBy: undefined,
              };
            }
            return m;
          })
        );
        showFeedbackToast(res.isPinned ? 'Message pinned' : 'Message unpinned', 'success');
      } else {
        const res = await messageService.togglePinMessage(msgId);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                isPinned: res.message.isPinned,
                pinnedAt: res.message.pinnedAt,
                pinnedBy: res.message.pinnedBy,
              };
            }
            if (res.isPinned) {
              return {
                ...m,
                isPinned: false,
                pinnedAt: undefined,
                pinnedBy: undefined,
              };
            }
            return m;
          })
        );
        showFeedbackToast(res.isPinned ? 'Message pinned' : 'Message unpinned', 'success');
      }
    } catch {
      showFeedbackToast('Failed to pin message', 'error');
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSelectMedia = async (file: File, type: 'image' | 'video') => {
    if (file.size > 15 * 1024 * 1024) {
      showFeedbackToast('File size exceeds 15MB limit', 'error');
      return;
    }
    try {
      showFeedbackToast('Uploading media...', 'info');
      const dataUrl = await readFileAsDataUrl(file);
      if (activeGroup) {
        const sent = await groupService.sendGroupMessage(activeGroup.id, '', {
          messageType: type,
          mediaUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setGroupMessages((prev) => [...prev, sent]);
        fetchGroups();
      } else if (activeUser) {
        const sent = await messageService.sendMessage(activeUser.id, '', {
          messageType: type,
          mediaUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setMessages((prev) => [...prev, sent]);
        fetchConversations();
      }
      showFeedbackToast('Media sent', 'success');
    } catch {
      showFeedbackToast('Failed to send media', 'error');
    }
  };

  const handleSelectDocument = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      showFeedbackToast('File size exceeds 15MB limit', 'error');
      return;
    }
    try {
      showFeedbackToast('Uploading document...', 'info');
      const dataUrl = await readFileAsDataUrl(file);
      if (activeGroup) {
        const sent = await groupService.sendGroupMessage(activeGroup.id, '', {
          messageType: 'document',
          mediaUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setGroupMessages((prev) => [...prev, sent]);
        fetchGroups();
      } else if (activeUser) {
        const sent = await messageService.sendMessage(activeUser.id, '', {
          messageType: 'document',
          mediaUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setMessages((prev) => [...prev, sent]);
        fetchConversations();
      }
      showFeedbackToast('Document sent', 'success');
    } catch {
      showFeedbackToast('Failed to send document', 'error');
    }
  };

  const handleCreatePoll = async (question: string, options: string[], timer?: string | null) => {
    try {
      if (activeGroup) {
        const sent = await groupService.sendGroupMessage(activeGroup.id, '', {
          messageType: 'poll',
          poll: { question, options, duration: timer || undefined },
        });
        setGroupMessages((prev) => [...prev, sent]);
        fetchGroups();
      } else if (activeUser) {
        const sent = await messageService.sendMessage(activeUser.id, '', {
          messageType: 'poll',
          poll: { question, options, duration: timer || undefined },
        });
        setMessages((prev) => [...prev, sent]);
        fetchConversations();
      }
      showFeedbackToast('Poll created', 'success');
    } catch {
      showFeedbackToast('Failed to create poll', 'error');
    }
  };

  const handleVotePoll = async (messageId: string, optionId: string) => {
    try {
      if (activeGroup) {
        const res = await groupService.votePoll(activeGroup.id, messageId, optionId);
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, poll: res.poll } : m))
        );
      } else {
        const res = await messageService.votePoll(messageId, optionId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, poll: res.poll } : m))
        );
      }
    } catch {
      showFeedbackToast('Failed to vote on poll', 'error');
    }
  };

  const handleSendVoiceNote = async (audioUrl: string, duration: number) => {
    setIsRecordingVoice(false);
    try {
      if (activeGroup) {
        const sent = await groupService.sendGroupMessage(activeGroup.id, 'Voice message', {
          messageType: 'voice',
          audioUrl,
          audioDuration: duration,
        });
        setGroupMessages((prev) => [...prev, sent]);
        fetchGroups();
      } else if (activeUser) {
        const sent = await messageService.sendMessage(activeUser.id, 'Voice message', {
          messageType: 'voice',
          audioUrl,
          audioDuration: duration,
        });
        setMessages((prev) => [...prev, sent]);
        fetchConversations();
      }
      showFeedbackToast('Voice note sent', 'success');
    } catch (err) {
      console.error('Send voice note error:', err);
      showFeedbackToast('Failed to send voice note', 'error');
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchGroups();
    fetchChatSettings();
  }, [fetchConversations, fetchGroups, fetchChatSettings]);

  // Unified URL Synchronization Effect (deterministic, no cascading loops)
  useEffect(() => {
    if (targetGroupParam) {
      // 1. Group Chat selected
      setActiveUser(null);
      setMessages([]);

      const existingGroup = groupsRef.current.find((g) => g.id === targetGroupParam);
      if (existingGroup) {
        setActiveGroup(existingGroup);
      } else {
        groupService
          .getGroupDetails(targetGroupParam)
          .then((details) => {
            if (details) {
              const mappedGroup: GroupItem = {
                id: details.id,
                name: details.name,
                description: details.description,
                avatarUrl: details.avatarUrl,
                creatorId: details.creatorId,
                createdAt: details.createdAt,
                updatedAt: details.updatedAt,
                memberCount: details.members.length,
                currentUserRole: details.currentUserRole,
                unreadCount: 0,
              };
              setActiveGroup(mappedGroup);
            }
          })
          .catch(() => {});
      }

      getSocket().emit('join_group', targetGroupParam);
      fetchGroupMessagesList(targetGroupParam);
      groupService.markGroupAsRead(targetGroupParam).catch(() => {});
      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroupParam ? { ...g, unreadCount: 0 } : g))
      );
    } else if (
      targetUserParam === 'global' ||
      searchParams.get('room') === 'global' ||
      searchParams.get('type') === 'global'
    ) {
      // Global Chat Selected
      setIsGlobalActive(true);
      setActiveGroup(null);
      setActiveUser(null);
      setGroupMessages([]);
    } else if (targetUserParam) {
      // 2. Direct Chat selected
      setIsGlobalActive(false);
      setActiveGroup(null);
      setGroupMessages([]);

      const clean = targetUserParam.toLowerCase();
      const existingConv = conversationsRef.current.find(
        (c) =>
          c.user.username.toLowerCase() === clean ||
          c.user.id.toLowerCase() === clean
      );

      if (existingConv) {
        setActiveUser(existingConv.user);
        fetchMessages(existingConv.user.id);
        if (currentUser?.id) {
          getSocket().emit('mark_as_read', {
            readerId: currentUser.id,
            partnerId: existingConv.user.id,
          });
        }
        messageService
          .markMessagesAsRead(existingConv.user.id)
          .then(() => refreshUnreadCount?.())
          .catch(() => {});
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === existingConv.user.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } else {
        userService
          .getUserByUsername(targetUserParam)
          .then((u) => {
            if (u) {
              setActiveUser(u);
              fetchMessages(u.id);
              if (currentUser?.id) {
                getSocket().emit('mark_as_read', {
                  readerId: currentUser.id,
                  partnerId: u.id,
                });
              }
              messageService
                .markMessagesAsRead(u.id)
                .then(() => refreshUnreadCount?.())
                .catch(() => {});
              if (u.lastSeen) {
                setLastSeenMap((prev) => ({ ...prev, [u.id]: u.lastSeen! }));
              }
            }
          })
          .catch(() => {});
      }
    } else {
      // 3. No active chat
      setActiveUser(null);
      setActiveGroup(null);
      setMessages([]);
      setGroupMessages([]);
    }
  }, [
    targetUserParam,
    targetGroupParam,
    fetchMessages,
    fetchGroupMessagesList,
    currentUser?.id,
    refreshUnreadCount,
  ]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    // Direct Messages socket handlers
    const handleNewMessage = (msg: MessageItem) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (
        curUser &&
        (msg.senderId === curUser.id || msg.receiverId === curUser.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.senderId === curUser.id && curId) {
          socket.emit('mark_as_read', { readerId: curId, partnerId: curUser.id });
          messageService
            .markMessagesAsRead(curUser.id)
            .then(() => refreshUnreadCount?.())
            .catch(() => {});

          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === curUser.id
                ? { ...c, unreadCount: 0, lastMessage: msg }
                : c
            )
          );
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === curUser.id ? { ...c, lastMessage: msg } : c
            )
          );
        }
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === msg.senderId
              ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg }
              : c
          )
        );
      }
    };

    const handleMessagesRead = ({
      readerId,
      partnerId,
    }: {
      readerId: string;
      partnerId: string;
      messageIds?: string[];
    }) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (curUser && readerId === curUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === curId ? { ...m, isRead: true, status: 'read' } : m
          )
        );
      }

      if (readerId === curId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === partnerId ? { ...c, unreadCount: 0 } : c
          )
        );
      }

      refreshUnreadCount?.();
    };

    const handleMessagesDelivered = ({
      receiverId,
      messageIds,
    }: {
      receiverId: string;
      messageIds: string[];
    }) => {
      const curUser = activeUserRef.current;
      const curId = currentUserRef.current?.id;

      if (curUser && receiverId === curUser.id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === curId && messageIds.includes(m.id) && m.status === 'sent') {
              return { ...m, status: 'delivered' };
            }
            return m;
          })
        );
      }
    };

    const handleMessageEdited = (edited: MessageItem) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
      );
    };

    const handleMessageDeletedForEveryone = ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeletedForEveryone: true,
                content,
                isPinned: false,
                pinnedAt: undefined,
                pinnedBy: undefined,
                starredBy: [],
              }
            : m
        )
      );
      showInfo('A message was deleted for everyone', 'Message Deleted');
    };

    const handleOnlineUsers = (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
    };

    const handleUserStatus = ({
      userId,
      isOnline,
      lastSeen,
    }: {
      userId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });

      if (lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
      }
    };

    const handleTyping = ({ senderId }: { senderId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    };

    const handleStopTyping = ({ senderId }: { senderId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
    };

    // Group Messages socket handlers
    const handleNewGroupMessage = (msg: GroupMessageItem) => {
      const curGroup = activeGroupRef.current;
      const curId = currentUserRef.current?.id;

      if (curGroup && curGroup.id === msg.groupId) {
        setGroupMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        groupService.markGroupAsRead(msg.groupId).catch(() => {});

        setGroups((prev) =>
          prev.map((g) =>
            g.id === msg.groupId
              ? { ...g, lastMessage: msg, unreadCount: 0 }
              : g
          )
        );
      } else {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === msg.groupId
              ? {
                  ...g,
                  lastMessage: msg,
                  unreadCount:
                    msg.senderId === curId ? g.unreadCount : g.unreadCount + 1,
                }
              : g
          )
        );
      }
    };

    const handleGroupMessageEdited = (edited: GroupMessageItem) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === edited.groupId) {
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
        );
      }
    };

    const handleGroupMessageDeleted = ({
      groupId,
      messageId,
      isDeletedForEveryone,
    }: {
      groupId: string;
      messageId: string;
      isDeletedForEveryone: boolean;
    }) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === groupId) {
        setGroupMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? isDeletedForEveryone
                ? {
                    ...m,
                    isDeletedForEveryone: true,
                    content: 'This message was deleted',
                    isPinned: false,
                    pinnedAt: undefined,
                    pinnedBy: undefined,
                    starredBy: [],
                  }
                : m
              : m
          )
        );
        if (isDeletedForEveryone) {
          showInfo('A message in this group was deleted', 'Message Deleted');
        }
      }
    };

    const handleGroupTyping = ({
      groupId,
      userId,
      userName,
    }: {
      groupId: string;
      userId: string;
      userName: string;
    }) => {
      const curGroup = activeGroupRef.current;
      const curId = currentUserRef.current?.id;
      if (curGroup && curGroup.id === groupId && userId !== curId) {
        setGroupTypingUsers((prev) => ({
          ...prev,
          [userId]: { username: userName, fullName: userName },
        }));
      }
    };

    const handleGroupStopTyping = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const curGroup = activeGroupRef.current;
      if (curGroup && curGroup.id === groupId) {
        setGroupTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    const handleGroupCreated = (group: GroupItem) => {
      socket.emit('join_group', group.id);
      fetchGroups();
    };

    const handleGroupUpdated = (updatedGroup: GroupItem) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g))
      );
      if (activeGroupRef.current?.id === updatedGroup.id) {
        setActiveGroup((prev) => (prev ? { ...prev, ...updatedGroup } : null));
      }
    };

    const handleGroupMemberUpdate = ({
      groupId,
      event,
      userId,
    }: {
      groupId: string;
      event: string;
      userId?: string;
    }) => {
      const curId = currentUserRef.current?.id;
      if (event === 'left' || event === 'removed') {
        if (userId === curId) {
          if (activeGroupRef.current?.id === groupId) {
            setActiveGroup(null);
            navigate('/messages');
          }
        }
      }
      fetchGroups();
    };

    // Subscriptions
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    const handleMessageStarred = (updated: MessageItem) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, starredBy: updated.starredBy } : m))
      );
    };

    const handleGroupMessageStarred = (updated: GroupMessageItem) => {
      setGroupMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, starredBy: updated.starredBy } : m))
      );
    };

    const handleMessagePinned = (updated: MessageItem) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? { ...m, isPinned: updated.isPinned, pinnedAt: updated.pinnedAt, pinnedBy: updated.pinnedBy }
            : updated.isPinned
            ? { ...m, isPinned: false, pinnedAt: undefined, pinnedBy: undefined }
            : m
        )
      );
    };

    const handleGroupMessagePinned = (updated: GroupMessageItem) => {
      setGroupMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? { ...m, isPinned: updated.isPinned, pinnedAt: updated.pinnedAt, pinnedBy: updated.pinnedBy }
            : updated.isPinned
            ? { ...m, isPinned: false, pinnedAt: undefined, pinnedBy: undefined }
            : m
        )
      );
    };

    const handleChatCleared = ({ partnerId }: { userId: string; partnerId: string }) => {
      if (activeUserRef.current?.id === partnerId) {
        setMessages([]);
      }
      fetchConversations();
    };

    const handleGroupChatCleared = ({ groupId }: { groupId: string }) => {
      if (activeGroupRef.current?.id === groupId) {
        setGroupMessages([]);
      }
      fetchGroups();
    };

    const handleChatSettingsUpdated = (settings: ChatSettings) => {
      setChatSettings(settings);
    };

    socket.on('message_starred', handleMessageStarred);
    socket.on('group_message_starred', handleGroupMessageStarred);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('group_message_pinned', handleGroupMessagePinned);
    socket.on('chat_cleared', handleChatCleared);
    socket.on('group_chat_cleared', handleGroupChatCleared);
    socket.on('chat_settings_updated', handleChatSettingsUpdated);

    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status', handleUserStatus);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_message_edited', handleGroupMessageEdited);
    socket.on('group_message_deleted', handleGroupMessageDeleted);
    socket.on('group_typing', handleGroupTyping);
    socket.on('group_stop_typing', handleGroupStopTyping);
    socket.on('group_created', handleGroupCreated);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('group_member_update', handleGroupMemberUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted_for_everyone', handleMessageDeletedForEveryone);
      socket.off('message_starred', handleMessageStarred);
      socket.off('group_message_starred', handleGroupMessageStarred);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('group_message_pinned', handleGroupMessagePinned);
      socket.off('chat_cleared', handleChatCleared);
      socket.off('group_chat_cleared', handleGroupChatCleared);
      socket.off('chat_settings_updated', handleChatSettingsUpdated);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_status', handleUserStatus);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);

      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_message_edited', handleGroupMessageEdited);
      socket.off('group_message_deleted', handleGroupMessageDeleted);
      socket.off('group_typing', handleGroupTyping);
      socket.off('group_stop_typing', handleGroupStopTyping);
      socket.off('group_created', handleGroupCreated);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('group_member_update', handleGroupMemberUpdate);
    };
  }, [
    currentUser?.id,
    fetchConversations,
    fetchGroups,
    refreshUnreadCount,
    navigate,
  ]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (deduplicatedMessages.length > 0 || deduplicatedGroupMessages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deduplicatedMessages, deduplicatedGroupMessages]);

  // Select Direct Contact
  const selectUser = (u: UserProfileResponse) => {
    setShowEmojiPicker(false);
    setIsGlobalActive(false);
    setIsHeaderMenuOpen(false);
    setOpenChatMenuId(null);
    setActiveGroup(null);
    setActiveUser(u);
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setReplyingToGroupMsg(null);
    setEditingGroupMsg(null);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());

    setConversations((prev) =>
      prev.map((c) => (c.user.id === u.id ? { ...c, unreadCount: 0 } : c))
    );
    navigate(`/messages/${encodeURIComponent(u.username)}`);
  };

  // Select Group Chat
  const selectGroup = (g: GroupItem) => {
    setShowEmojiPicker(false);
    setIsGlobalActive(false);
    setIsHeaderMenuOpen(false);
    setOpenChatMenuId(null);
    setActiveUser(null);
    setActiveGroup(g);
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setReplyingToGroupMsg(null);
    setEditingGroupMsg(null);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());

    setGroups((prev) =>
      prev.map((item) => (item.id === g.id ? { ...item, unreadCount: 0 } : item))
    );
    navigate(`/messages?group=${encodeURIComponent(g.id)}`);
  };

  // Select Global Chat
  const selectGlobalChat = () => {
    setShowEmojiPicker(false);
    setActiveGroup(null);
    setActiveUser(null);
    setIsGlobalActive(true);
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setReplyingToGroupMsg(null);
    setEditingGroupMsg(null);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    navigate('/messages/global');
  };

  // Global Chat preview loader & socket sync
  useEffect(() => {
    globalChatService
      .getMessages(1)
      .then((res) => {
        setGlobalStats({
          onlineCount: res.onlineCount || 1,
          lastMessage: res.messages?.[res.messages.length - 1] || null,
        });
      })
      .catch(() => {});

    const socket = getSocket();
    const handleGlobalNew = (msg: GlobalMessageItem) => {
      setGlobalStats((prev) => ({
        ...prev,
        lastMessage: msg,
      }));
    };
    const handleGlobalCount = ({ count }: { count: number }) => {
      setGlobalStats((prev) => ({
        ...prev,
        onlineCount: count,
      }));
    };

    socket.on('global_new_message', handleGlobalNew);
    socket.on('global_online_count', handleGlobalCount);

    return () => {
      socket.off('global_new_message', handleGlobalNew);
      socket.off('global_online_count', handleGlobalCount);
    };
  }, []);

  // Close emoji picker and exit selection on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) setShowEmojiPicker(false);
        if (isSelectionMode) handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (showEmojiPicker) {
      window.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showEmojiPicker, isSelectionMode, handleClearSelection]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? text.length;
      const end = input.selectionEnd ?? text.length;
      const newText = text.substring(0, start) + emojiData.emoji + text.substring(end);
      setText(newText);
      setTimeout(() => {
        input.focus();
        const cursorPosition = start + emojiData.emoji.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
      }, 10);
    } else {
      setText((prev) => prev + emojiData.emoji);
    }
  };

  // Typing event handler
  const handleInputChange = (val: string) => {
    setText(val);
    const socket = getSocket();

    if (activeUser && currentUser) {
      socket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
      }, 2200);
    } else if (activeGroup && currentUser) {
      socket.emit('group_typing', {
        groupId: activeGroup.id,
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.username,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('group_stop_typing', {
          groupId: activeGroup.id,
          userId: currentUser.id,
        });
      }, 2200);
    }
  };

  const cancelTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const socket = getSocket();
    if (activeUser && currentUser) {
      socket.emit('stop_typing', { senderId: currentUser.id, receiverId: activeUser.id });
    } else if (activeGroup && currentUser) {
      socket.emit('group_stop_typing', {
        groupId: activeGroup.id,
        userId: currentUser.id,
      });
    }
  };

  // Send message handler (Direct or Group)
  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending || isSendingRef.current) return;

    isSendingRef.current = true;
    cancelTyping();
    setShowEmojiPicker(false);
    setSending(true);

    try {
      if (activeGroup) {
        // Group Send / Edit / Reply
        if (editingGroupMsg) {
          const updated = await groupService.editGroupMessage(
            activeGroup.id,
            editingGroupMsg.id,
            content
          );
          setGroupMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          setEditingGroupMsg(null);
          setText('');
        } else {
          const replyInfo = replyingToGroupMsg
            ? {
                id: replyingToGroupMsg.id,
                senderId: replyingToGroupMsg.senderId || '',
                senderName:
                  replyingToGroupMsg.senderId === currentUser?.id
                    ? 'You'
                    : replyingToGroupMsg.sender?.fullName ||
                      replyingToGroupMsg.sender?.username ||
                      'Someone',
                content: replyingToGroupMsg.content,
              }
            : null;

          setText('');
          const sent = await groupService.sendGroupMessage(activeGroup.id, content, {
            replyTo: replyInfo,
          });
          setGroupMessages((prev) => {
            if (prev.some((m) => m.id === sent.id)) return prev;
            return [...prev, sent];
          });
          setReplyingToGroupMsg(null);
          fetchGroups();
        }
      } else if (activeUser) {
        // Direct Send / Edit / Reply
        if (editingMessage) {
          const updated = await messageService.editMessage(editingMessage.id, content);
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          setEditingMessage(null);
          setText('');
        } else {
          const replyInfo = replyingTo
            ? {
                id: replyingTo.id,
                senderId: replyingTo.senderId,
                senderName:
                  replyingTo.senderId === currentUser?.id
                    ? 'You'
                    : activeUser.fullName || activeUser.username,
                content: replyingTo.content,
              }
            : null;

          setText('');
          const sent = await messageService.sendMessage(activeUser.id, content, {
            replyTo: replyInfo,
          });

          setMessages((prev) => {
            if (prev.some((m) => m.id === sent.id)) return prev;
            return [...prev, sent];
          });
          setReplyingTo(null);
          fetchConversations();
        }
      }
    } catch {
      setText(content);
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  const handleStartEdit = (m: MessageItem) => {
    setEditingMessage(m);
    setReplyingTo(null);
    setText(m.content);
  };

  const handleStartGroupEdit = (m: GroupMessageItem) => {
    setEditingGroupMsg(m);
    setReplyingToGroupMsg(null);
    setText(m.content);
  };

  const handleExecuteForward = async () => {
    if (forwardingMessages.length === 0 || forwardingTargetIds.length === 0) return;
    try {
      const sorted = [...forwardingMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (const targetId of forwardingTargetIds) {
        if (targetId.startsWith('group:')) {
          const groupId = targetId.replace('group:', '');
          for (const msg of sorted) {
            await groupService.sendGroupMessage(groupId, msg.content);
          }
        } else {
          for (const msg of sorted) {
            await messageService.sendMessage(targetId, msg.content, {
              isForwarded: true,
            });
          }
        }
      }
      setForwardSuccess(true);
      fetchConversations();
      fetchGroups();
      showFeedbackToast(
        `Forwarded ${sorted.length} message${sorted.length > 1 ? 's' : ''} successfully`,
        'success'
      );
      setTimeout(() => {
        setForwardSuccess(false);
        setForwardingMessages([]);
        setForwardingTargetIds([]);
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
      }, 900);
    } catch (err) {
      console.error('Forward failed:', err);
      showFeedbackToast('Failed to forward messages', 'error');
    }
  };

  const handleDeleteMessages = async (mode: 'for_me' | 'for_everyone') => {
    if (deletingMessages.length === 0 || isDeleting) return;
    setIsDeleting(true);
    try {
      const deletedIds = new Set(deletingMessages.map((m) => m.id));
      if (activeGroup) {
        for (const m of deletingMessages) {
          await groupService.deleteGroupMessage(activeGroup.id, m.id, mode);
        }
        if (mode === 'for_everyone') {
          setGroupMessages((prev) =>
            prev.map((m) =>
              deletedIds.has(m.id)
                ? {
                    ...m,
                    isDeletedForEveryone: true,
                    content: 'This message was deleted',
                    isPinned: false,
                    pinnedAt: undefined,
                    pinnedBy: undefined,
                    starredBy: [],
                  }
                : m
            )
          );
        } else {
          setGroupMessages((prev) => prev.filter((m) => !deletedIds.has(m.id)));
        }
        fetchGroups();
      } else {
        for (const m of deletingMessages) {
          await messageService.deleteMessage(m.id, mode);
        }
        if (mode === 'for_everyone') {
          setMessages((prev) =>
            prev.map((m) =>
              deletedIds.has(m.id)
                ? {
                    ...m,
                    isDeletedForEveryone: true,
                    content: 'This message was deleted',
                    isPinned: false,
                    pinnedAt: undefined,
                    pinnedBy: undefined,
                    starredBy: [],
                  }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => !deletedIds.has(m.id)));
        }
        fetchConversations();
      }
      const count = deletingMessages.length;
      showSuccess(
        count === 1 ? 'Message deleted' : `${count} messages deleted`,
        'Message Deleted'
      );
      setDeletingMessages([]);
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
    } catch (err) {
      console.error('Delete message failed:', err);
      showError('Failed to delete messages', 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2');
      }, 1800);
    }
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Offline';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  const isPartnerOnline = activeUser ? onlineUserIds.has(activeUser.id) : false;
  const partnerLastSeen = activeUser ? lastSeenMap[activeUser.id] || activeUser.lastSeen : undefined;
  const isPartnerTyping = activeUser ? Boolean(typingUsers[activeUser.id]) : false;

  // Check chat preferences helpers
  const isChatPinned = (id: string) => Boolean(chatSettings.pinnedChats?.includes(id));
  const isChatArchived = (id: string) => Boolean(chatSettings.archivedChats?.includes(id));
  const isChatMuted = (id: string) => Boolean(chatSettings.mutedChats?.includes(id));
  const isChatFavourite = (id: string) => Boolean(chatSettings.favouriteChats?.includes(id));
  const isChatUnread = (id: string, naturalUnread: number) =>
    naturalUnread > 0 || Boolean(chatSettings.unreadChats?.includes(id));

  // Filter direct conversations
  const filteredDirect = conversations
    .filter((c) => {
      const matchSearch =
        c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.user.username?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      const archived = isChatArchived(c.user.id);
      if (chatTab === 'archived') return archived;
      if (archived) return false;

      if (chatTab === 'favourites') return isChatFavourite(c.user.id);
      return true;
    })
    .sort((a, b) => {
      const aPinned = isChatPinned(a.user.id);
      const bPinned = isChatPinned(b.user.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = new Date(a.lastMessage?.createdAt || a.user.createdAt || 0).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.user.createdAt || 0).getTime();
      return bTime - aTime;
    });

  // Filter groups
  const filteredGroups = groups
    .filter((g) => {
      const matchSearch =
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      const archived = isChatArchived(g.id);
      if (chatTab === 'archived') return archived;
      if (archived) return false;

      if (chatTab === 'favourites') return isChatFavourite(g.id);
      return true;
    })
    .sort((a, b) => {
      const aPinned = isChatPinned(a.id);
      const bPinned = isChatPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt).getTime();
      return bTime - aTime;
    });

  // Combined and sorted list for "All", "Favourites", "Archived" tabs
  type UnifiedItem =
    | { type: 'direct'; data: ConversationItem; timestamp: number; isPinned: boolean }
    | { type: 'group'; data: GroupItem; timestamp: number; isPinned: boolean };

  const unifiedList: UnifiedItem[] = [
    ...conversations
      .filter((c) => {
        const matchSearch =
          c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          c.user.username?.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        const archived = isChatArchived(c.user.id);
        if (chatTab === 'archived') return archived;
        if (archived) return false;

        if (chatTab === 'favourites') return isChatFavourite(c.user.id);
        return true;
      })
      .map((c) => ({
        type: 'direct' as const,
        data: c,
        isPinned: isChatPinned(c.user.id),
        timestamp: new Date(c.lastMessage?.createdAt || c.user.createdAt || 0).getTime(),
      })),
    ...groups
      .filter((g) => {
        const matchSearch =
          g.name?.toLowerCase().includes(search.toLowerCase()) ||
          g.description?.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        const archived = isChatArchived(g.id);
        if (chatTab === 'archived') return archived;
        if (archived) return false;

        if (chatTab === 'favourites') return isChatFavourite(g.id);
        return true;
      })
      .map((g) => ({
        type: 'group' as const,
        data: g,
        isPinned: isChatPinned(g.id),
        timestamp: new Date(g.lastMessage?.createdAt || g.updatedAt || g.createdAt).getTime(),
      })),
  ].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });

  // Active chat state helpers
  const activePinnedMessage = activeGroup
    ? groupMessages.find((m) => m.isPinned && !m.isDeletedForEveryone)
    : messages.find((m) => m.isPinned && !m.isDeletedForEveryone);

  const isContactBlocked = activeUser
    ? Boolean(chatSettings.blockedUsers?.includes(activeUser.id))
    : false;

  const groupTypingNames = Object.values(groupTypingUsers).map((u) => u.fullName || u.username);

  const renderMessageContent = (content: string, isDeleted: boolean, isMe: boolean) => {
    if (isDeleted) {
      return (
        <span className="italic opacity-60 flex items-center gap-1.5 text-xs sm:text-sm select-none">
          <svg
            className="w-3.5 h-3.5 text-slate-400 shrink-0 inline-block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          This message was deleted
        </span>
      );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${
              isMe ? 'text-sky-300 hover:text-sky-200' : 'text-sky-600 hover:text-sky-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const hasActiveChat = Boolean(activeUser || activeGroup || isGlobalActive);

  return (
    <div className="w-full h-[calc(100vh-2.5rem)] sm:h-[calc(100vh-3.5rem)] min-h-[580px] flex gap-4 select-none relative">
      {/* Left Pane: Conversations & Groups List */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 h-full ${
          hasActiveChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Messages</h1>
              <button
                type="button"
                onClick={selectGlobalChat}
                className={`inline-flex items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
                  isGlobalActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Global Chat"
              > 
                <HiOutlineGlobeAlt className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
                title="Create a new Group Chat"
              >
                <HiOutlinePlus className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
              <button
                onClick={() => navigate('/search')}
                className="text-xs sm:text-sm font-semibold text-purple-600 hover:text-purple-700 cursor-pointer px-1 py-1"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center mb-3">
            <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chats or groups..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all"
            />
          </div>

          {/* Category Tabs: All / Direct / Groups + Favs / Archived */}
          <div className="w-full flex items-center justify-between p-1 bg-slate-100/80 rounded-xl gap-1">
            <div className="flex-1 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setChatTab('all')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  chatTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setChatTab('direct')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  chatTab === 'direct'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setChatTab('groups')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all relative text-center cursor-pointer ${
                  chatTab === 'groups'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Groups</span>
                {groups.reduce((acc, g) => acc + g.unreadCount, 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block ml-1 align-top" />
                )}
              </button>
            </div>

            <div className="w-[1px] h-4 bg-slate-200/90 shrink-0" />

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setChatTab(chatTab === 'favourites' ? 'all' : 'favourites')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  chatTab === 'favourites'
                    ? 'bg-white text-amber-500 shadow-xs'
                    : 'text-slate-400 hover:text-amber-500'
                }`}
                title="Favourite chats"
              >
                <HiStar className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={() => setChatTab(chatTab === 'archived' ? 'all' : 'archived')}
                className={`p-1.5 rounded-lg transition-all relative cursor-pointer ${
                  chatTab === 'archived'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Archived chats"
              >
                <HiOutlineArchiveBox className="w-4 h-4" />
                {(chatSettings.archivedChats?.length || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                    {chatSettings.archivedChats.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {chatTab === 'favourites' && (
            <div className="mt-2 px-3 py-1.5 bg-amber-50/80 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-amber-800">
                <HiStar className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Favourite Chats
              </span>
              <button
                type="button"
                onClick={() => setChatTab('all')}
                className="text-amber-700 hover:text-amber-900 hover:underline text-[11px] font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {chatTab === 'archived' && (
            <div className="mt-2 px-3 py-1.5 bg-slate-100/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <HiOutlineArchiveBox className="w-3.5 h-3.5 text-slate-600" />
                Archived Chats ({chatSettings.archivedChats?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => setChatTab('all')}
                className="text-purple-600 hover:text-purple-800 hover:underline text-[11px] font-bold cursor-pointer"
              >
                Show All
              </button>
            </div>
          )}
        </div>

        {/* Chat List Items */}
        <div
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 overscroll-contain"
        >
          {chatTab === 'groups' ? (
            // Only Groups
            filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <HiOutlineUserGroup className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No groups found.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isSelected = activeGroup?.id === g.id;
                const isPinned = isChatPinned(g.id);
                const isMuted = isChatMuted(g.id);
                const isFavourite = isChatFavourite(g.id);
                const isArchived = isChatArchived(g.id);
                const hasUnread = isChatUnread(g.id, g.unreadCount);

                return (
                  <div
                    key={g.id}
                    onClick={() => selectGroup(g)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer group relative ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <GroupAvatar group={g} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{g.name}</span>
                          {isPinned && <PinIcon className="w-3.5 h-3.5 text-purple-600 shrink-0 inline" filled={true} />}
                          {isMuted && <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" />}
                          {isFavourite && <HiStar className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {g.lastMessage && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(g.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenChatMenuId(openChatMenuId === g.id ? null : g.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Chat options"
                          >
                            <HiOutlineEllipsisVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {g.lastMessage ? (
                            <>
                              <span className="font-semibold text-slate-700">
                                {g.lastMessage.sender?.fullName?.split(' ')[0] ||
                                  g.lastMessage.sender?.username ||
                                  'User'}
                                :{' '}
                              </span>
                              <span>
                                {g.lastMessage.messageType === 'voice'
                                  ? '🎵 Voice note'
                                  : g.lastMessage.content}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No messages yet</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                            {g.memberCount} members
                          </span>
                          {hasUnread && (
                            <span className="bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                              {g.unreadCount || 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChatActionDropdown
                      isOpen={openChatMenuId === g.id}
                      onClose={() => setOpenChatMenuId(null)}
                      isPinned={isPinned}
                      isArchived={isArchived}
                      isMuted={isMuted}
                      isUnread={hasUnread}
                      isFavourite={isFavourite}
                      onTogglePin={() => togglePinChat(g.id)}
                      onToggleArchive={() => toggleArchiveChat(g.id)}
                      onToggleMute={() => toggleMuteChat(g.id)}
                      onToggleUnread={() => toggleUnreadChat(g.id)}
                      onToggleFavourite={() => toggleFavouriteChat(g.id)}
                      onClearChat={() => {
                        setActiveGroup(g);
                        setIsClearModalOpen(true);
                      }}
                    />
                  </div>
                );
              })
            )
          ) : chatTab === 'direct' ? (
            // Only Direct
            filteredDirect.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No direct messages found.
              </div>
            ) : (
              filteredDirect.map((c) => {
                const isSelected = activeUser?.id === c.user.id;
                const isUserOnline = onlineUserIds.has(c.user.id);
                const isTyping = Boolean(typingUsers[c.user.id]);
                const isPinned = isChatPinned(c.user.id);
                const isMuted = isChatMuted(c.user.id);
                const isFavourite = isChatFavourite(c.user.id);
                const isArchived = isChatArchived(c.user.id);
                const isBlocked = Boolean(chatSettings.blockedUsers?.includes(c.user.id));
                const hasUnread = isChatUnread(c.user.id, c.unreadCount);

                return (
                  <div
                    key={c.user.id}
                    onClick={() => selectUser(c.user)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer group relative ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <UserAvatar
                      user={c.user}
                      size="md"
                      isOnline={isUserOnline}
                      showBadge={true}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{c.user.fullName}</span>
                          {isPinned && <PinIcon className="w-3.5 h-3.5 text-purple-600 shrink-0 inline" filled={true} />}
                          {isMuted && <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" />}
                          {isFavourite && <HiStar className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
                          {isBlocked && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-600 text-[9px] font-bold rounded-md">
                              Blocked
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {c.lastMessage && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenChatMenuId(openChatMenuId === c.user.id ? null : c.user.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Chat options"
                          >
                            <HiOutlineEllipsisVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {isTyping ? (
                            <span className="text-emerald-600 font-semibold animate-pulse">
                              typing...
                            </span>
                          ) : c.lastMessage?.messageType === 'voice' ? (
                            '🎵 Voice note'
                          ) : (
                            c.lastMessage?.content || `@${c.user.username}`
                          )}
                        </p>
                        {hasUnread && (
                          <span className="bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-xs">
                            {c.unreadCount || 1}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChatActionDropdown
                      isOpen={openChatMenuId === c.user.id}
                      onClose={() => setOpenChatMenuId(null)}
                      isPinned={isPinned}
                      isArchived={isArchived}
                      isMuted={isMuted}
                      isUnread={hasUnread}
                      isFavourite={isFavourite}
                      isBlocked={isBlocked}
                      onTogglePin={() => togglePinChat(c.user.id)}
                      onToggleArchive={() => toggleArchiveChat(c.user.id)}
                      onToggleMute={() => toggleMuteChat(c.user.id)}
                      onToggleUnread={() => toggleUnreadChat(c.user.id)}
                      onToggleFavourite={() => toggleFavouriteChat(c.user.id)}
                      onToggleBlock={() => toggleBlockUser(c.user.id)}
                      onClearChat={() => {
                        setActiveUser(c.user);
                        setIsClearModalOpen(true);
                      }}
                    />
                  </div>
                );
              })
            )
          ) : (
            // All / Favourites / Archived Chats
            <>
              {/* Global Chat Item in Sidebar */}
              {chatTab === 'all' && (!search || 'global chat'.includes(search.toLowerCase()) || 'public'.includes(search.toLowerCase())) && (
                <div
                  onClick={selectGlobalChat}
                  className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer group relative border-b border-slate-100 ${
                    isGlobalActive
                      ? 'bg-purple-50/80'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <HiOutlineGlobeAlt className="w-6 h-6" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        Global Chat
                      </span>
                      {globalStats.lastMessage && (
                        <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                          {new Date(globalStats.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 truncate pr-2">
                        {globalStats.lastMessage ? (
                          <>
                            <span className="font-semibold text-slate-700">
                              {globalStats.lastMessage.sender?.fullName?.split(' ')[0] ||
                                globalStats.lastMessage.sender?.username ||
                                'User'}
                              :{' '}
                            </span>
                            <span>
                              {globalStats.lastMessage.messageType === 'voice'
                                ? '🎵 Voice note'
                                : globalStats.lastMessage.content}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            Connect with everyone in Echolet
                          </span>
                        )}
                      </p>

                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {globalStats.onlineCount} online
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {unifiedList.length === 0 && chatTab !== 'all' ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  {chatTab === 'favourites'
                    ? 'No favourite chats yet. Star conversations to access them quickly.'
                    : chatTab === 'archived'
                    ? 'No archived chats.'
                    : 'No conversations yet. Start chatting or create a group!'}
                </div>
              ) : (
                unifiedList.map((item) => {
                if (item.type === 'group') {
                  const g = item.data;
                  const isSelected = activeGroup?.id === g.id;
                  const isPinned = isChatPinned(g.id);
                  const isMuted = isChatMuted(g.id);
                  const isFavourite = isChatFavourite(g.id);
                  const isArchived = isChatArchived(g.id);
                  const hasUnread = isChatUnread(g.id, g.unreadCount);

                  return (
                    <div
                      key={`group-${g.id}`}
                      onClick={() => selectGroup(g)}
                      className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer group relative ${
                        isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <GroupAvatar group={g} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="truncate">{g.name}</span>
                            {isPinned && <PinIcon className="w-3.5 h-3.5 text-purple-600 shrink-0 inline" filled={true} />}
                            {isMuted && <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" />}
                            {isFavourite && <HiStar className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {g.lastMessage && (
                              <span className="text-[11px] text-slate-400">
                                {new Date(g.lastMessage.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenChatMenuId(openChatMenuId === g.id ? null : g.id);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Chat options"
                            >
                              <HiOutlineEllipsisVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-500 truncate pr-2">
                            {g.lastMessage ? (
                              <>
                                <span className="font-semibold text-slate-700">
                                  {g.lastMessage.sender?.fullName?.split(' ')[0] ||
                                    g.lastMessage.sender?.username ||
                                    'User'}
                                  :{' '}
                                </span>
                                <span>
                                  {g.lastMessage.messageType === 'voice'
                                    ? '🎵 Voice note'
                                    : g.lastMessage.content}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">No messages yet</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                              {g.memberCount}m
                            </span>
                            {hasUnread && (
                              <span className="bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                                {g.unreadCount || 1}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChatActionDropdown
                        isOpen={openChatMenuId === g.id}
                        onClose={() => setOpenChatMenuId(null)}
                        isPinned={isPinned}
                        isArchived={isArchived}
                        isMuted={isMuted}
                        isUnread={hasUnread}
                        isFavourite={isFavourite}
                        onTogglePin={() => togglePinChat(g.id)}
                        onToggleArchive={() => toggleArchiveChat(g.id)}
                        onToggleMute={() => toggleMuteChat(g.id)}
                        onToggleUnread={() => toggleUnreadChat(g.id)}
                        onToggleFavourite={() => toggleFavouriteChat(g.id)}
                        onClearChat={() => {
                          setActiveGroup(g);
                          setIsClearModalOpen(true);
                        }}
                      />
                    </div>
                  );
                }

                // Direct message card
                const c = item.data;
                const isSelected = activeUser?.id === c.user.id;
                const isUserOnline = onlineUserIds.has(c.user.id);
                const isTyping = Boolean(typingUsers[c.user.id]);
                const isPinned = isChatPinned(c.user.id);
                const isMuted = isChatMuted(c.user.id);
                const isFavourite = isChatFavourite(c.user.id);
                const isArchived = isChatArchived(c.user.id);
                const isBlocked = Boolean(chatSettings.blockedUsers?.includes(c.user.id));
                const hasUnread = isChatUnread(c.user.id, c.unreadCount);

                return (
                  <div
                    key={`user-${c.user.id}`}
                    onClick={() => selectUser(c.user)}
                    className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors cursor-pointer group relative ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <UserAvatar
                      user={c.user}
                      size="md"
                      isOnline={isUserOnline}
                      showBadge={true}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{c.user.fullName}</span>
                          {isPinned && <PinIcon className="w-3.5 h-3.5 text-purple-600 shrink-0 inline" filled={true} />}
                          {isMuted && <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" />}
                          {isFavourite && <HiStar className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />}
                          {isBlocked && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-600 text-[9px] font-bold rounded-md">
                              Blocked
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {c.lastMessage && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenChatMenuId(openChatMenuId === c.user.id ? null : c.user.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Chat options"
                          >
                            <HiOutlineEllipsisVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 truncate pr-2">
                          {isTyping ? (
                            <span className="text-emerald-600 font-semibold animate-pulse">
                              typing...
                            </span>
                          ) : c.lastMessage?.messageType === 'voice' ? (
                            '🎵 Voice note'
                          ) : (
                            c.lastMessage?.content || `@${c.user.username}`
                          )}
                        </p>
                        {hasUnread && (
                          <span className="bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-xs">
                            {c.unreadCount || 1}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChatActionDropdown
                      isOpen={openChatMenuId === c.user.id}
                      onClose={() => setOpenChatMenuId(null)}
                      isPinned={isPinned}
                      isArchived={isArchived}
                      isMuted={isMuted}
                      isUnread={hasUnread}
                      isFavourite={isFavourite}
                      isBlocked={isBlocked}
                      onTogglePin={() => togglePinChat(c.user.id)}
                      onToggleArchive={() => toggleArchiveChat(c.user.id)}
                      onToggleMute={() => toggleMuteChat(c.user.id)}
                      onToggleUnread={() => toggleUnreadChat(c.user.id)}
                      onToggleFavourite={() => toggleFavouriteChat(c.user.id)}
                      onToggleBlock={() => toggleBlockUser(c.user.id)}
                      onClearChat={() => {
                        setActiveUser(c.user);
                        setIsClearModalOpen(true);
                      }}
                    />
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>

      {/* Right Pane: Active Chat Window (Global OR Direct OR Group) */}
      <div
        className={`flex-1 min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full ${
          !hasActiveChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {isGlobalActive ? (
          // ======================== GLOBAL CHAT ACTIVE ========================
          <GlobalChatRoom
            currentUser={currentUser}
            onBack={() => {
              setIsGlobalActive(false);
              navigate('/messages');
            }}
          />
        ) : activeGroup ? (
          // ======================== GROUP CHAT ACTIVE ========================
          <>
            {/* Group Header */}
            {/* Group Header */}
            {isSelectionMode ? (
              <MultiSelectActionBar
                selectedCount={selectedMessageIds.size}
                isAllSelected={isAllSelected}
                onClear={handleClearSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onCopy={handleCopySelected}
                onForward={handleForwardSelected}
                onExport={handleExportSelected}
                onStar={handleStarSelected}
                onDelete={handleDeleteSelected}
              />
            ) : (
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      setActiveGroup(null);
                      navigate('/messages');
                    }}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                  >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                  </button>

                  <div
                    onClick={() => setIsGroupInfoOpen(true)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 hover:opacity-90 transition-opacity"
                  >
                    <GroupAvatar group={activeGroup} size="md" />

                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 leading-tight truncate flex items-center gap-1.5">
                        <span className="truncate">{activeGroup.name}</span>
                        {isChatPinned(activeGroup.id) && (
                          <PinIcon className="w-4 h-4 text-purple-600 inline shrink-0" filled={true} />
                        )}
                        {isChatMuted(activeGroup.id) && (
                          <HiOutlineSpeakerXMark className="w-4 h-4 text-slate-400 inline shrink-0" />
                        )}
                        {isChatFavourite(activeGroup.id) && (
                          <HiStar className="w-4 h-4 text-amber-500 inline shrink-0" />
                        )}
                        {activeGroup.currentUserRole === 'admin' && (
                          <span className="px-1.5 py-0.2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold rounded-md">
                            Admin
                          </span>
                        )}
                      </h2>
                      <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate text-slate-500">
                        {groupTypingNames.length > 0 ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {groupTypingNames.join(', ')} typing...
                          </span>
                        ) : (
                          <span>{activeGroup.memberCount || 0} members • Tap for info</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSelectionMode(true)}
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                    title="Select messages"
                  >
                    <HiOutlineSquares2X2 className="w-4 h-4 text-purple-600" />
                    <span className="hidden sm:inline">Select</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGroupInfoOpen(true)}
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <HiOutlineInformationCircle className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Group Info</span>
                  </button>

                  {/* Group header options menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
                      title="More options"
                    >
                      <HiOutlineEllipsisVertical className="w-4 h-4" />
                    </button>
                    <ChatActionDropdown
                      isOpen={isHeaderMenuOpen}
                      onClose={() => setIsHeaderMenuOpen(false)}
                      isPinned={isChatPinned(activeGroup.id)}
                      isArchived={isChatArchived(activeGroup.id)}
                      isMuted={isChatMuted(activeGroup.id)}
                      isUnread={isChatUnread(activeGroup.id, activeGroup.unreadCount)}
                      isFavourite={isChatFavourite(activeGroup.id)}
                      onTogglePin={() => togglePinChat(activeGroup.id)}
                      onToggleArchive={() => toggleArchiveChat(activeGroup.id)}
                      onToggleMute={() => toggleMuteChat(activeGroup.id)}
                      onToggleUnread={() => toggleUnreadChat(activeGroup.id)}
                      onToggleFavourite={() => toggleFavouriteChat(activeGroup.id)}
                      onClearChat={() => setIsClearModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Message Banner */}
            {activePinnedMessage && (
              <div className="px-5 py-2.5 bg-purple-50/90 border-b border-purple-100 flex items-center justify-between shadow-2xs">
                <div
                  onClick={() => scrollToMessage(activePinnedMessage.id)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
                  title="Click to jump to message"
                >
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                    <PinIcon className="w-4 h-4" filled={true} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-800 flex items-center gap-1.5">
                      <span>Pinned Message</span>
                      <span className="text-[10px] text-purple-500 font-normal">• Tap to jump</span>
                    </p>
                    <p className="text-xs text-slate-700 truncate max-w-md">
                      {activePinnedMessage.messageType === 'voice'
                        ? '🎵 Voice note'
                        : activePinnedMessage.content}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePinMessage(activePinnedMessage.id)}
                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                  title="Unpin message"
                >
                  Unpin
                </button>
              </div>
            )}

            {/* Group Message Stream */}
            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
            >
              {deduplicatedGroupMessages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <HiOutlineUserGroup className="w-10 h-10 text-slate-300 mb-2" />
                  <span>Welcome to {activeGroup.name}! Send the first message to kick off the group chat.</span>
                </div>
              ) : (
                <>
                  {deduplicatedGroupMessages.map((m) => {
                    const isSystem = m.messageType === 'system';
                    const isMe = m.senderId === currentUser?.id;
                    const isText = (!m.messageType || m.messageType === 'text') && !m.audioUrl && !m.mediaUrl && !m.poll;
                    const elapsedMs = Date.now() - new Date(m.createdAt).getTime();
                    const isEditable = isMe && !m.isDeletedForEveryone && isText && elapsedMs <= 10 * 60 * 1000;
                    const canDelete = isMe || activeGroup.currentUserRole === 'admin';
                    const isSelected = selectedMessageIds.has(m.id);

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-medium text-slate-500 text-center shadow-2xs">
                            {m.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        onClick={() => {
                          if (isSelectionMode && !m.isDeletedForEveryone) {
                            toggleSelectMessage(m.id);
                          }
                        }}
                        className={`group flex items-center gap-2 transition-all duration-200 rounded-2xl p-1 ${
                          isSelectionMode && !m.isDeletedForEveryone
                            ? 'cursor-pointer hover:bg-slate-100/60'
                            : ''
                        } ${isSelected ? 'bg-purple-50/70' : ''}`}
                      >
                        {/* Checkbox for selection mode */}
                        {isSelectionMode && !m.isDeletedForEveryone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectMessage(m.id);
                            }}
                            className="p-1 shrink-0 cursor-pointer self-center transition-transform active:scale-90"
                            aria-label={isSelected ? 'Deselect message' : 'Select message'}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-2xs scale-105'
                                  : 'border-slate-300 hover:border-purple-400 bg-white'
                              }`}
                            >
                              {isSelected && <HiOutlineCheck className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </button>
                        )}

                        <div
                          className={`flex-1 flex items-end gap-2 transition-all duration-300 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Sender Avatar for other members */}
                          {!isMe && (
                            <div className="shrink-0 mb-1">
                              <UserAvatar user={m.sender || undefined} size="sm" />
                            </div>
                          )}

                          {/* Hover action toolbar for Sender */}
                          {isMe && !m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToGroupMsg(m);
                                  setEditingGroupMsg(null);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Reply"
                              >
                                <HiOutlineArrowUturnLeft className="w-4 h-4" />
                              </button>

                              {isText && m.content && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.content);
                                    showSuccess('Message copied to clipboard');
                                  }}
                                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Copy text"
                                >
                                  <HiOutlineClipboardDocument className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSelectionMode(true);
                                  toggleSelectMessage(m.id);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Select message"
                              >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStarMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'text-amber-500 bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'Unstar message'
                                    : 'Star message'
                                }
                              >
                                {m.starredBy?.includes(currentUser?.id || '') ? (
                                  <HiStar className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <HiOutlineStar className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePinMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.isPinned
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={m.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <PinIcon className="w-4 h-4" filled={Boolean(m.isPinned)} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setForwardingMessages([
                                    {
                                      id: m.id,
                                      senderId: m.senderId,
                                      content: m.content,
                                      createdAt: m.createdAt,
                                      sender: m.sender,
                                    } as unknown as MessageItem,
                                  ]);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Forward"
                              >
                                <HiOutlineArrowUturnRight className="w-4 h-4" />
                              </button>

                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => handleStartGroupEdit(m)}
                                  className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                  title="Edit message (10m limit)"
                                >
                                  <HiOutlinePencilSquare className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeletingGroupMsg(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {isMe && m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDeletingGroupMsg(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete for me"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Bubble */}
                          <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
                            <div
                              className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed flex flex-col gap-1 shadow-2xs relative transition-all ${
                                isSelected ? 'ring-2 ring-purple-500 shadow-md ring-offset-2' : ''
                              } ${
                                isMe
                                  ? m.isDeletedForEveryone
                                    ? 'bg-slate-800/80 text-slate-300 rounded-br-xs border border-slate-700/60'
                                    : 'bg-slate-900 text-white rounded-br-xs'
                                  : m.isDeletedForEveryone
                                  ? 'bg-slate-100 text-slate-500 rounded-bl-xs border border-slate-200/90'
                                  : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                              }`}
                            >
                              {/* Colorful sender header in group chat */}
                              {!isMe && !m.isDeletedForEveryone && (
                                <div
                                  className={`text-[11px] font-bold ${getSenderColor(
                                    m.senderId
                                  )} leading-tight select-none pb-0.5`}
                                >
                                  {m.sender?.fullName || m.sender?.username || 'Group Member'}
                                </div>
                              )}

                              {/* Reply Quoted Card */}
                              {m.replyTo && !m.isDeletedForEveryone && (
                                <div
                                  onClick={() => scrollToMessage(m.replyTo!.id)}
                                  className={`p-2 rounded-xl text-xs cursor-pointer border-l-3 transition-colors ${
                                    isMe
                                      ? 'bg-slate-800/90 border-purple-400 text-slate-200 hover:bg-slate-800'
                                      : 'bg-slate-100/90 border-purple-500 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="font-bold text-[11px] text-purple-400 truncate">
                                    {m.replyTo.senderName || 'Original message'}
                                  </div>
                                  <div className="truncate text-[11px] opacity-80 mt-0.5">
                                    {m.replyTo.content}
                                  </div>
                                </div>
                              )}

                              {/* Message content: poll, voice, media, or text */}
                              {!m.isDeletedForEveryone && m.messageType === 'poll' && m.poll ? (
                                <ChatPollWidget
                                  poll={m.poll}
                                  currentUserId={currentUser?.id}
                                  onVote={(optionId) => handleVotePoll(m.id, optionId)}
                                  isMe={isMe}
                                />
                              ) : m.messageType === 'voice' || m.audioUrl ? (
                                <VoiceNotePlayer
                                  audioUrl={m.audioUrl}
                                  duration={m.audioDuration}
                                  isMe={isMe}
                                  extraRight={
                                    <div className="flex items-center gap-1.5 ml-auto select-none leading-none">
                                      {m.starredBy?.includes(currentUser?.id || '') && (
                                        <HiStar
                                          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
                                          title="Starred message"
                                        />
                                      )}
                                      {m.isPinned && (
                                        <span title="Pinned message" className="text-purple-400">
                                          <PinIcon className="w-3 h-3 shrink-0" filled={true} />
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  }
                                />
                              ) : (
                                <div>
                                  {!m.isDeletedForEveryone && m.mediaUrl && (
                                    <ChatMediaAttachment
                                      type={m.messageType}
                                      mediaUrl={m.mediaUrl}
                                      fileName={m.fileName}
                                      fileSize={m.fileSize}
                                      authorName={isMe ? 'You' : m.sender?.fullName}
                                    />
                                  )}
                                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 mt-1">
                                    <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                                      {renderMessageContent(
                                        m.content,
                                        Boolean(m.isDeletedForEveryone),
                                        isMe
                                      )}
                                    </span>

                                    <div className="flex items-center gap-1.5 ml-auto shrink-0 select-none pb-0.5 leading-none">
                                      {m.starredBy?.includes(currentUser?.id || '') && (
                                        <HiStar
                                          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
                                          title="Starred message"
                                        />
                                      )}
                                      {m.isPinned && (
                                        <span title="Pinned message" className="text-purple-400">
                                          <PinIcon className="w-3 h-3 shrink-0" filled={true} />
                                        </span>
                                      )}
                                      {m.isEdited && !m.isDeletedForEveryone && (
                                        <span className="text-[10px] italic text-slate-400">edited</span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hover action toolbar for incoming group messages */}
                          {!isMe && !m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToGroupMsg(m);
                                  setEditingGroupMsg(null);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Reply"
                              >
                                <HiOutlineArrowUturnLeft className="w-4 h-4" />
                              </button>

                              {isText && m.content && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.content);
                                    showSuccess('Message copied to clipboard');
                                  }}
                                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Copy text"
                                >
                                  <HiOutlineClipboardDocument className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSelectionMode(true);
                                  toggleSelectMessage(m.id);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Select message"
                              >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStarMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'text-amber-500 bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'Unstar message'
                                    : 'Star message'
                                }
                              >
                                {m.starredBy?.includes(currentUser?.id || '') ? (
                                  <HiStar className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <HiOutlineStar className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePinMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.isPinned
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={m.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <PinIcon className="w-4 h-4" filled={Boolean(m.isPinned)} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setForwardingMessages([
                                    {
                                      id: m.id,
                                      senderId: m.senderId,
                                      content: m.content,
                                      createdAt: m.createdAt,
                                      sender: m.sender,
                                    } as unknown as MessageItem,
                                  ]);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Forward"
                              >
                                <HiOutlineArrowUturnRight className="w-4 h-4" />
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingGroupMsg(m)}
                                  className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete message"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {!isMe && m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDeletingGroupMsg(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete for me"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Selection Mode Notice OR Standard Message Input */}
            {isSelectionMode ? (
              <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  <span>Selection mode active • Tap messages to select or deselect</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Replying banner */}
                {replyingToGroupMsg && (
                  <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-8 rounded-full bg-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-indigo-600 truncate">
                          Replying to{' '}
                          {replyingToGroupMsg.senderId === currentUser?.id
                            ? 'yourself'
                            : replyingToGroupMsg.sender?.fullName ||
                              replyingToGroupMsg.sender?.username}
                        </p>
                        <p className="text-xs text-slate-600 truncate">{replyingToGroupMsg.content}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingToGroupMsg(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Editing banner */}
                {editingGroupMsg && (
                  <div className="px-5 py-2.5 bg-purple-50 border-t border-purple-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-8 rounded-full bg-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-purple-700">Editing Message</p>
                        <p className="text-xs text-slate-600 truncate">{editingGroupMsg.content}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroupMsg(null);
                        setText('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Message Input for Group */}
                {isRecordingVoice ? (
                  <VoiceRecorderBar
                    onCancel={() => setIsRecordingVoice(false)}
                    onSend={handleSendVoiceNote}
                  />
                ) : (
                  <form
                    onSubmit={onSend}
                    className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 relative"
                  >
                    <div className="relative">
                      <button
                        ref={emojiButtonRef}
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className={`p-2.5 rounded-full transition-colors ${
                          showEmojiPicker
                            ? 'text-purple-600 bg-purple-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <HiOutlineFaceSmile className="w-5 h-5" />
                      </button>

                      {showEmojiPicker && (
                        <div
                          ref={emojiPickerRef}
                          className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
                        >
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            lazyLoadEmojis={true}
                            width={320}
                            height={400}
                          />
                        </div>
                      )}
                    </div>

                    <ChatAttachmentMenu
                      onSelectMedia={handleSelectMedia}
                      onSelectDocument={handleSelectDocument}
                      onOpenPollModal={() => setIsPollModalOpen(true)}
                    />

                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={`Message #${activeGroup.name}...`}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-full text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0 cursor-pointer"
                      title="Record voice note"
                    >
                      <HiOutlineMicrophone className="w-5 h-5" />
                    </button>

                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                    >
                      <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        ) : activeUser ? (
          // ======================== DIRECT CHAT ACTIVE ========================
          <>
            {/* Active Direct Chat Header */}
            {isSelectionMode ? (
              <MultiSelectActionBar
                selectedCount={selectedMessageIds.size}
                isAllSelected={isAllSelected}
                onClear={handleClearSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onCopy={handleCopySelected}
                onForward={handleForwardSelected}
                onExport={handleExportSelected}
                onStar={handleStarSelected}
                onDelete={handleDeleteSelected}
              />
            ) : (
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      setActiveUser(null);
                      navigate('/messages');
                    }}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                  >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                  </button>
                  <div
                    onClick={() => navigate(`/profile/${activeUser.username}`)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <UserAvatar
                      user={activeUser}
                      size="md"
                      isOnline={isPartnerOnline}
                      showBadge={true}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                          {activeUser.fullName}
                        </h2>
                        {isChatPinned(activeUser.id) && (
                          <span title="Pinned chat" className="text-purple-600">
                            <PinIcon className="w-3.5 h-3.5 inline" filled />
                          </span>
                        )}
                        {isChatMuted(activeUser.id) && (
                          <span title="Muted notifications" className="text-slate-400">
                            <HiOutlineSpeakerXMark className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                        {isChatFavourite(activeUser.id) && (
                          <span title="Favourite chat" className="text-amber-500">
                            <HiStar className="w-3.5 h-3.5 inline fill-amber-400" />
                          </span>
                        )}
                        {isContactBlocked && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                            Blocked
                          </span>
                        )}
                      </div>
                      <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate">
                        {isPartnerTyping ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            typing...
                          </span>
                        ) : isPartnerOnline ? (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {formatLastSeen(partnerLastSeen)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSelectionMode(true)}
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                    title="Select messages"
                  >
                    <HiOutlineSquares2X2 className="w-4 h-4 text-purple-600" />
                    <span className="hidden sm:inline">Select</span>
                  </button>

                  <button
                    onClick={() => navigate(`/profile/${activeUser.username}`)}
                    className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
                  >
                    Profile
                  </button>

                  {/* Direct chat header options menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
                      title="More options"
                    >
                      <HiOutlineEllipsisVertical className="w-4 h-4" />
                    </button>
                    <ChatActionDropdown
                      isOpen={isHeaderMenuOpen}
                      onClose={() => setIsHeaderMenuOpen(false)}
                      isPinned={isChatPinned(activeUser.id)}
                      isArchived={isChatArchived(activeUser.id)}
                      isMuted={isChatMuted(activeUser.id)}
                      isUnread={isChatUnread(activeUser.id, 0)}
                      isFavourite={isChatFavourite(activeUser.id)}
                      isBlocked={isContactBlocked}
                      onTogglePin={() => togglePinChat(activeUser.id)}
                      onToggleArchive={() => toggleArchiveChat(activeUser.id)}
                      onToggleMute={() => toggleMuteChat(activeUser.id)}
                      onToggleUnread={() => toggleUnreadChat(activeUser.id)}
                      onToggleFavourite={() => toggleFavouriteChat(activeUser.id)}
                      onToggleBlock={() => toggleBlockUser(activeUser.id)}
                      onClearChat={() => setIsClearModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Message Banner */}
            {activePinnedMessage && (
              <div className="px-5 py-2.5 bg-purple-50/90 border-b border-purple-100 flex items-center justify-between shadow-2xs">
                <div
                  onClick={() => scrollToMessage(activePinnedMessage.id)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
                  title="Click to jump to message"
                >
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                    <PinIcon className="w-4 h-4" filled={true} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-800 flex items-center gap-1.5">
                      <span>Pinned Message</span>
                      <span className="text-[10px] text-purple-500 font-normal">• Tap to jump</span>
                    </p>
                    <p className="text-xs text-slate-700 truncate max-w-md">
                      {activePinnedMessage.messageType === 'voice'
                        ? '🎵 Voice note'
                        : activePinnedMessage.content}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePinMessage(activePinnedMessage.id)}
                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                  title="Unpin message"
                >
                  Unpin
                </button>
              </div>
            )}

            {/* Direct Messages Feed */}
            <div
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
            >
              {deduplicatedMessages.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm p-6">
                  <span>Send a message to start the conversation</span>
                </div>
              ) : (
                <>
                  {deduplicatedMessages.map((m) => {
                    const isMe = m.senderId === currentUser?.id;
                    const isText = (!m.messageType || m.messageType === 'text') && !m.audioUrl && !m.mediaUrl && !m.poll;
                    const elapsedMs = Date.now() - new Date(m.createdAt).getTime();
                    const isEditable = isMe && !m.isDeletedForEveryone && isText && elapsedMs <= 10 * 60 * 1000;
                    const isSelected = selectedMessageIds.has(m.id);

                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        onClick={() => {
                          if (isSelectionMode && !m.isDeletedForEveryone) {
                            toggleSelectMessage(m.id);
                          }
                        }}
                        className={`group flex items-center gap-2 transition-all duration-200 rounded-2xl p-1 ${
                          isSelectionMode && !m.isDeletedForEveryone
                            ? 'cursor-pointer hover:bg-slate-100/60'
                            : ''
                        } ${isSelected ? 'bg-purple-50/70' : ''}`}
                      >
                        {/* Checkbox for selection mode */}
                        {isSelectionMode && !m.isDeletedForEveryone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectMessage(m.id);
                            }}
                            className="p-1 shrink-0 cursor-pointer self-center transition-transform active:scale-90"
                            aria-label={isSelected ? 'Deselect message' : 'Select message'}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-2xs scale-105'
                                  : 'border-slate-300 hover:border-purple-400 bg-white'
                              }`}
                            >
                              {isSelected && <HiOutlineCheck className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </button>
                        )}

                        <div
                          className={`flex-1 flex items-end gap-2 transition-all duration-300 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!isMe && (
                            <div className="shrink-0 mb-1">
                              <UserAvatar user={activeUser} size="sm" />
                            </div>
                          )}

                          {isMe && !m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(m);
                                  setEditingMessage(null);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Reply"
                              >
                                <HiOutlineArrowUturnLeft className="w-4 h-4" />
                              </button>

                              {isText && m.content && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.content);
                                    showSuccess('Message copied to clipboard');
                                  }}
                                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Copy text"
                                >
                                  <HiOutlineClipboardDocument className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSelectionMode(true);
                                  toggleSelectMessage(m.id);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Select message"
                              >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStarMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'text-amber-500 bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'Unstar message'
                                    : 'Star message'
                                }
                              >
                                {m.starredBy?.includes(currentUser?.id || '') ? (
                                  <HiStar className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <HiOutlineStar className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePinMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.isPinned
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={m.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <PinIcon className="w-4 h-4" filled={Boolean(m.isPinned)} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setForwardingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Forward"
                              >
                                <HiOutlineArrowUturnRight className="w-4 h-4" />
                              </button>

                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(m)}
                                  className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                  title="Edit message (10m limit)"
                                >
                                  <HiOutlinePencilSquare className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeletingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {isMe && m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDeletingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete for me"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Bubble */}
                          <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
                            <div
                              className={`px-3.5 py-2 rounded-2xl text-sm sm:text-base leading-relaxed flex flex-col gap-1 shadow-2xs relative transition-all ${
                                isSelected ? 'ring-2 ring-purple-500 shadow-md ring-offset-2' : ''
                              } ${
                                isMe
                                  ? m.isDeletedForEveryone
                                    ? 'bg-slate-800/80 text-slate-300 rounded-br-xs border border-slate-700/60'
                                    : 'bg-slate-900 text-white rounded-br-xs'
                                  : m.isDeletedForEveryone
                                  ? 'bg-slate-100 text-slate-500 rounded-bl-xs border border-slate-200/90'
                                  : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                              }`}
                            >
                              {m.isForwarded && !m.isDeletedForEveryone && (
                                <div className="flex items-center gap-1 text-[11px] italic font-medium pb-0.5 text-slate-400">
                                  <HiOutlineArrowUturnRight className="w-3 h-3 rotate-[-15deg]" />
                                  <span>Forwarded</span>
                                </div>
                              )}

                              {m.replyTo && !m.isDeletedForEveryone && (
                                <div
                                  onClick={() => scrollToMessage(m.replyTo!.id)}
                                  className={`p-2 rounded-xl text-xs cursor-pointer border-l-3 transition-colors ${
                                    isMe
                                      ? 'bg-slate-800/90 border-purple-400 text-slate-200 hover:bg-slate-800'
                                      : 'bg-slate-100/90 border-purple-500 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="font-bold text-[11px] text-purple-400 truncate">
                                    {m.replyTo.senderName || 'Original message'}
                                  </div>
                                  <div className="truncate text-[11px] opacity-80 mt-0.5">
                                    {m.replyTo.content}
                                  </div>
                                </div>
                              )}

                              {/* Message content: poll, voice, media, or text */}
                              {!m.isDeletedForEveryone && m.messageType === 'poll' && m.poll ? (
                                <ChatPollWidget
                                  poll={m.poll}
                                  currentUserId={currentUser?.id}
                                  onVote={(optionId) => handleVotePoll(m.id, optionId)}
                                  isMe={isMe}
                                />
                              ) : m.messageType === 'voice' || m.audioUrl ? (
                                <VoiceNotePlayer
                                  audioUrl={m.audioUrl}
                                  duration={m.audioDuration}
                                  isMe={isMe}
                                  extraRight={
                                    <div className="flex items-center gap-1.5 ml-auto select-none leading-none">
                                      {m.starredBy?.includes(currentUser?.id || '') && (
                                        <HiStar
                                          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
                                          title="Starred message"
                                        />
                                      )}
                                      {m.isPinned && (
                                        <span title="Pinned message" className="text-purple-400">
                                          <PinIcon className="w-3 h-3 shrink-0" filled={true} />
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {isMe && !m.isDeletedForEveryone && (
                                        <MessageTicks status={m.status} isRead={m.isRead} />
                                      )}
                                    </div>
                                  }
                                />
                              ) : (
                                <div>
                                  {!m.isDeletedForEveryone && m.mediaUrl && (
                                    <ChatMediaAttachment
                                      type={m.messageType}
                                      mediaUrl={m.mediaUrl}
                                      fileName={m.fileName}
                                      fileSize={m.fileSize}
                                      authorName={isMe ? 'You' : activeUser?.fullName}
                                    />
                                  )}
                                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 mt-1">
                                    <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                                      {renderMessageContent(
                                        m.content,
                                        Boolean(m.isDeletedForEveryone),
                                        isMe
                                      )}
                                    </span>

                                    <div className="flex items-center gap-1.5 ml-auto shrink-0 select-none pb-0.5 leading-none">
                                      {m.starredBy?.includes(currentUser?.id || '') && (
                                        <HiStar
                                          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
                                          title="Starred message"
                                        />
                                      )}
                                      {m.isPinned && (
                                        <span title="Pinned message" className="text-purple-400">
                                          <PinIcon className="w-3 h-3 shrink-0" filled={true} />
                                        </span>
                                      )}
                                      {m.isEdited && !m.isDeletedForEveryone && (
                                        <span className="text-[10px] italic text-slate-400">edited</span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {isMe && !m.isDeletedForEveryone && (
                                        <MessageTicks status={m.status} isRead={m.isRead} />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {!isMe && !m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(m);
                                  setEditingMessage(null);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Reply"
                              >
                                <HiOutlineArrowUturnLeft className="w-4 h-4" />
                              </button>

                              {isText && m.content && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.content);
                                    showSuccess('Message copied to clipboard');
                                  }}
                                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Copy text"
                                >
                                  <HiOutlineClipboardDocument className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSelectionMode(true);
                                  toggleSelectMessage(m.id);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Select message"
                              >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStarMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'text-amber-500 bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={
                                  m.starredBy?.includes(currentUser?.id || '')
                                    ? 'Unstar message'
                                    : 'Star message'
                                }
                              >
                                {m.starredBy?.includes(currentUser?.id || '') ? (
                                  <HiStar className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <HiOutlineStar className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePinMessage(m.id)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  m.isPinned
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={m.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <PinIcon className="w-4 h-4" filled={Boolean(m.isPinned)} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setForwardingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Forward"
                              >
                                <HiOutlineArrowUturnRight className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {!isMe && m.isDeletedForEveryone && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDeletingMessage(m)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete for me"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Selection Mode Notice OR Standard Direct Input */}
            {isSelectionMode ? (
              <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  <span>Selection mode active • Tap messages to select or deselect</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Replying banner */}
                {replyingTo && (
                  <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-8 rounded-full bg-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-purple-600 truncate">
                          Replying to{' '}
                          {replyingTo.senderId === currentUser?.id
                            ? 'yourself'
                            : activeUser.fullName || activeUser.username}
                        </p>
                        <p className="text-xs text-slate-600 truncate">{replyingTo.content}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Editing banner */}
                {editingMessage && (
                  <div className="px-5 py-2.5 bg-purple-50 border-t border-purple-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-8 rounded-full bg-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-purple-700">Editing Message</p>
                        <p className="text-xs text-slate-600 truncate">{editingMessage.content}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setText('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Direct Input Form */}
                {isContactBlocked ? (
                  <div className="p-4 border-t border-slate-100 bg-rose-50/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-rose-800">
                      <HiOutlineNoSymbol className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>You have blocked this contact. Unblock them to send messages.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBlockUser(activeUser.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                    >
                      Unblock
                    </button>
                  </div>
                ) : isRecordingVoice ? (
                  <VoiceRecorderBar
                    onCancel={() => setIsRecordingVoice(false)}
                    onSend={handleSendVoiceNote}
                  />
                ) : (
                  <form
                    onSubmit={onSend}
                    className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 relative"
                  >
                    <div className="relative">
                      <button
                        ref={emojiButtonRef}
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className={`p-2.5 rounded-full transition-colors ${
                          showEmojiPicker
                            ? 'text-purple-600 bg-purple-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <HiOutlineFaceSmile className="w-5 h-5" />
                      </button>

                      {showEmojiPicker && (
                        <div
                          ref={emojiPickerRef}
                          className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
                        >
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            lazyLoadEmojis={true}
                            width={320}
                            height={400}
                          />
                        </div>
                      )}
                    </div>

                    <ChatAttachmentMenu
                      onSelectMedia={handleSelectMedia}
                      onSelectDocument={handleSelectDocument}
                      showPoll={false}
                    />

                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-full text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0 cursor-pointer"
                      title="Record voice note"
                    >
                      <HiOutlineMicrophone className="w-5 h-5" />
                    </button>

                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                    >
                      <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        ) : (
          // ======================== EMPTY STATE ========================
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5 text-slate-400 border border-slate-200 shadow-2xs">
              <HiOutlineChatBubbleLeftRight className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Your Messages</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
              Select a conversation from the left, start a new direct message, or create a group to chat with multiple members.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selectGlobalChat}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
              >
                <HiOutlineGlobeAlt className="w-4 h-4" />
                <span>Global Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xs hover:bg-slate-800 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
              >
                <HiOutlineUserGroup className="w-4 h-4 text-indigo-400" />
                <span>Create Group</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-white active:scale-98 transition-all cursor-pointer"
              >
                Find People
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newGroup) => {
          fetchGroups();
          selectGroup(newGroup);
        }}
        currentUserId={currentUser?.id}
      />

      {/* Group Info Modal */}
      {activeGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          groupId={activeGroup.id}
          currentUserId={currentUser?.id}
          onGroupUpdated={(updated) => {
            setActiveGroup((prev) => (prev ? { ...prev, ...updated } : null));
            fetchGroups();
          }}
          onLeaveGroup={() => {
            setActiveGroup(null);
            fetchGroups();
            navigate('/messages');
          }}
        />
      )}

      {/* Delete Confirmation Modal (Direct or Group, Single or Batch) */}
      {deletingMessages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {deletingMessages.length === 1
                  ? 'Delete Message'
                  : `Delete ${deletingMessages.length} Messages`}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold">
                {deletingMessages.length} item{deletingMessages.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {deletingMessages.length === 1
                ? 'Are you sure you want to delete this message?'
                : `Are you sure you want to delete these ${deletingMessages.length} selected messages?`}
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {/* Delete for everyone option */}
              {canDeleteSelectedForEveryone && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteMessages('for_everyone')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                  <span>Delete for everyone</span>
                </button>
              )}

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteMessages('for_me')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete for me
              </button>

              <button
                type="button"
                onClick={() => setDeletingMessages([])}
                className="w-full py-2 px-4 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal (Direct and Group, Single or Batch) */}
      {forwardingMessages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {forwardingMessages.length === 1
                    ? 'Forward Message'
                    : `Forward ${forwardingMessages.length} Messages`}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                  {forwardingMessages.length} msg{forwardingMessages.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForwardingMessages([]);
                  setForwardingTargetIds([]);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative flex items-center">
                <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Search contacts or groups to forward to..."
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 max-h-64">
              {/* Direct Conversations */}
              {conversations.filter(
                (c) =>
                  c.user.fullName?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                  c.user.username?.toLowerCase().includes(forwardSearch.toLowerCase())
              ).length > 0 && (
                <div className="py-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Direct Chats
                  </div>
                  {conversations
                    .filter(
                      (c) =>
                        c.user.fullName?.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                        c.user.username?.toLowerCase().includes(forwardSearch.toLowerCase())
                    )
                    .map((c) => {
                      const isSelected = forwardingTargetIds.includes(c.user.id);
                      return (
                        <button
                          key={`forward-user-${c.user.id}`}
                          type="button"
                          onClick={() => {
                            setForwardingTargetIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== c.user.id)
                                : [...prev, c.user.id]
                            );
                          }}
                          className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar user={c.user} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {c.user.fullName}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                @{c.user.username}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <HiOutlineCheck className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Groups */}
              {groups.filter((g) =>
                g.name?.toLowerCase().includes(forwardSearch.toLowerCase())
              ).length > 0 && (
                <div className="py-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Groups
                  </div>
                  {groups
                    .filter((g) =>
                      g.name?.toLowerCase().includes(forwardSearch.toLowerCase())
                    )
                    .map((g) => {
                      const targetKey = `group:${g.id}`;
                      const isSelected = forwardingTargetIds.includes(targetKey);
                      return (
                        <button
                          key={`forward-group-${g.id}`}
                          type="button"
                          onClick={() => {
                            setForwardingTargetIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== targetKey)
                                : [...prev, targetKey]
                            );
                          }}
                          className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GroupAvatar group={g} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {g.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {g.memberCount} members
                              </p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <HiOutlineCheck className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setForwardingMessages([]);
                  setForwardingTargetIds([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={forwardingTargetIds.length === 0 || forwardSuccess}
                onClick={handleExecuteForward}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {forwardSuccess ? (
                  <>
                    <HiOutlineCheck className="w-4 h-4 stroke-[3]" /> Forwarded!
                  </>
                ) : (
                  <>
                    <HiOutlineArrowUturnRight className="w-4 h-4" /> Forward (
                    {forwardingTargetIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <HiOutlineTrash className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear chat history?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeGroup
                    ? `All messages in #${activeGroup.name} will be cleared for you.`
                    : activeUser
                    ? `All messages with ${activeUser.fullName} will be cleared for you.`
                    : 'All messages in this conversation will be cleared.'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              This action cannot be undone. Messages will be permanently cleared from your chat view.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearChat}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Chat Poll Modal */}
      <CreateChatPollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSubmit={handleCreatePoll}
      />
    </div>
  );
}
