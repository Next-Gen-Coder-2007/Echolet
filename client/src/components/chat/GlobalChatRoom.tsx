import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineGlobeAlt,
  HiOutlinePaperAirplane,
  HiOutlineFaceSmile,
  HiOutlineMicrophone,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineArrowUturnLeft,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineTrash,
  HiOutlineChevronDown,
} from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import globalChatService, {
  type GlobalMessageItem,
} from '../../services/globalChatService';
import type { User } from '../../services/authService';
import getSocket from '../../services/socket';
import { useMessage } from '../../context/MessageContext';
import ChatPollWidget from './ChatPollWidget';
import ChatMediaAttachment from './ChatMediaAttachment';
import ChatAttachmentMenu from './ChatAttachmentMenu';
import CreateChatPollModal from './CreateChatPollModal';
import ReelMessageCard from './ReelMessageCard';
import PostMessageCard from './PostMessageCard';
import StoryMessageCard from './StoryMessageCard';
import Avatar from '../common/Avatar';

// Distinct sender colors identical to group messages
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

// Clean UserAvatar component matching Messages.tsx
const UserAvatar: React.FC<{
  user?: { fullName?: string; username?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  showBadge?: boolean;
}> = ({ user, size = 'sm', isOnline = false, showBadge = false }) => {

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
      <Avatar
        src={user?.avatarUrl}
        name={user?.fullName || user?.username}
        size={size}
        className={sizeClasses}
      />
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

// Reusable Voice Note Audio Player bubble component with ultra-fluid requestAnimationFrame playback
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
  const animFrameRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Ultra-fluid 60/120fps progress tracking via requestAnimationFrame
  const updateFluidProgress = useCallback(() => {
    if (audioRef.current && !isDraggingRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!audioRef.current.paused && !audioRef.current.ended) {
        animFrameRef.current = requestAnimationFrame(updateFluidProgress);
      }
    }
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updateFluidProgress);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl, updateFluidProgress]);

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
    } else {
      audioRef.current
        .play()
        .catch((err) => console.error('Audio play error:', err));
    }
  };

  const seekToRatio = (ratio: number) => {
    if (!audioRef.current || !totalDuration) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const newTime = clamped * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || !totalDuration) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekToRatio(ratio);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !progressBarRef.current || !totalDuration) return;
    e.stopPropagation();
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekToRatio(ratio);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
  };

  const formatSeconds = (sec: number) => {
    const sVal = Math.max(0, isFinite(sec) ? sec : 0);
    const mins = Math.floor(sVal / 60);
    const s = Math.floor(sVal % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct =
    totalDuration > 0
      ? Math.max(0, Math.min(100, (currentTime / totalDuration) * 100))
      : 0;

  // 36 bars with organic acoustic waveform contours
  const waveformBars = [
    24, 38, 62, 44, 60, 88, 50, 78, 96, 68, 84, 54, 94, 72, 50, 90,
    64, 98, 48, 70, 94, 56, 80, 66, 90, 44, 76, 58, 86, 62, 40, 26,
    46, 72, 52, 32
  ];

  return (
    <div className="flex items-center gap-3 py-1.5 px-0.5 min-w-[245px] sm:min-w-[280px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-90 cursor-pointer ${
          isMe
            ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-slate-900/10'
            : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
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
        {/* Continuous Fluid Sub-pixel Waveform */}
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-7 flex items-center cursor-pointer select-none group/wave py-1"
          title="Click or drag to seek"
        >
          {/* Base Unplayed Layer */}
          <div className="absolute inset-0 flex items-center gap-[2.5px] pointer-events-none">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  isMe
                    ? 'bg-purple-300/35 group-hover/wave:bg-purple-300/45'
                    : 'bg-slate-200 dark:bg-slate-700/80 group-hover/wave:bg-slate-300 dark:group-hover/wave:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Ultra-fluid Liquid Active Layer (sub-pixel overflow mask) */}
          <div
            style={{ width: `${progressPct}%` }}
            className="absolute inset-y-0 left-0 flex items-center overflow-hidden pointer-events-none z-10"
          >
            <div className="w-[200px] sm:w-[230px] h-full flex items-center gap-[2.5px] shrink-0">
              {waveformBars.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-full ${
                    isMe
                      ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                      : 'bg-gradient-to-t from-purple-600 to-indigo-500 shadow-[0_0_8px_rgba(147,51,234,0.35)]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Gliding Micro-Scrubber Indicator */}
          <div
            style={{ left: `${progressPct}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20"
          >
            <div
              className={`w-1.5 h-5 rounded-full shadow-md ${
                isMe
                  ? 'bg-white ring-2 ring-white/60'
                  : 'bg-purple-600 ring-2 ring-purple-400/60'
              } opacity-90 group-hover/wave:scale-125 transition-transform`}
            />
          </div>
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


// Reusable Live Voice Recording Bar component with Web Audio API real-time visualizer
const LiveVoiceRecorder: React.FC<{
  onCancel: () => void;
  onSend: (audioUrl: string, duration: number) => void;
}> = ({ onCancel, onSend }) => {
  const { showError } = useMessage();
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>(() =>
    new Array(24).fill(15)
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

        // Real-time Web Audio API frequency analysis
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioCtxRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.75;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const drawWave = () => {
              if (analyserRef.current && !isCancelled) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const bars: number[] = [];
                const step = Math.max(1, Math.floor(bufferLength / 24));
                for (let i = 0; i < 24; i++) {
                  const val = dataArray[i * step] || 0;
                  const pct = Math.max(15, Math.min(100, Math.round((val / 255) * 95) + 12));
                  bars.push(pct);
                }
                setFrequencyData(bars);
                animFrameRef.current = requestAnimationFrame(drawWave);
              }
            };
            drawWave();
          }
        } catch (audioErr) {
          console.warn('Web Audio visualizer fallback:', audioErr);
        }

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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onCancel, showError]);

  const togglePauseResume = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    } else if (mr.state === 'paused') {
      mr.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    }
  };

  const handleStopAndSend = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
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
    <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 dark:from-rose-950/30 dark:via-purple-950/20 dark:to-slate-900/40 border border-rose-500/25 rounded-2xl backdrop-blur-md shadow-sm animate-in fade-in duration-200">
      {/* Recording status & Elapsed Timer */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-wider uppercase select-none">
          <span className={`w-2 h-2 rounded-full bg-rose-500 ${isPaused ? 'opacity-50' : 'animate-ping'}`} />
          {isPaused ? 'PAUSED' : 'REC'}
        </span>
        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 select-none">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Live Audio Visualizer Frequency Bars */}
      <div className="flex-1 max-w-[200px] sm:max-w-[260px] h-7 flex items-center justify-center gap-[3px] px-2 overflow-hidden">
        {frequencyData.map((heightPct, idx) => (
          <div
            key={idx}
            style={{ height: `${heightPct}%` }}
            className={`flex-1 rounded-full transition-all duration-75 ${
              isPaused
                ? 'bg-slate-300 dark:bg-slate-600'
                : 'bg-gradient-to-t from-rose-500 to-purple-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
            }`}
          />
        ))}
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Pause / Resume Button */}
        <button
          type="button"
          onClick={togglePauseResume}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isPaused ? 'Resume recording' : 'Pause recording'}
        >
          {isPaused ? (
            <HiOutlinePlay className="w-4 h-4 fill-current ml-0.5" />
          ) : (
            <HiOutlinePause className="w-4 h-4 fill-current" />
          )}
        </button>

        {/* Discard Button */}
        <button
          type="button"
          onClick={handleDiscard}
          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Discard recording"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleStopAndSend}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          title="Send voice note"
        >
          <HiOutlinePaperAirplane className="w-3.5 h-3.5 rotate-90" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};


interface GlobalChatRoomProps {
  currentUser?: User | null;
  onBack?: () => void;
}

export default function GlobalChatRoom({ currentUser, onBack }: GlobalChatRoomProps) {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useMessage();

  const [messages, setMessages] = useState<GlobalMessageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Input states
  const [text, setText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<GlobalMessageItem | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState<boolean>(false);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<
    Record<string, { username: string; fullName?: string }>
  >({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const isNearBottomRef = useRef<boolean>(true);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const nearBottom = distanceToBottom < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  };

  // Close emoji picker when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await globalChatService.getMessages(100);
        if (!isMounted) return;
        setMessages(res.messages || []);
        setTimeout(() => scrollToBottom('auto'), 100);
      } catch (err: any) {
        showError(err.response?.data?.message || 'Failed to load Global Chat');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: GlobalMessageItem) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (isNearBottomRef.current || msg.senderId === currentUser?.id) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    const handleMessageEdited = (edited: GlobalMessageItem) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
      );
    };

    const handleGlobalTyping = ({
      userId,
      userName,
    }: {
      userId: string;
      userName: string;
    }) => {
      if (userId === currentUser?.id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: { username: userName, fullName: userName },
      }));
    };

    const handleGlobalStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    };

    socket.on('global_new_message', handleNewMessage);
    socket.on('global_message_edited', handleMessageEdited);
    socket.on('global_typing', handleGlobalTyping);
    socket.on('global_stop_typing', handleGlobalStopTyping);

    return () => {
      socket.off('global_new_message', handleNewMessage);
      socket.off('global_message_edited', handleMessageEdited);
      socket.off('global_typing', handleGlobalTyping);
      socket.off('global_stop_typing', handleGlobalStopTyping);
    };
  }, [currentUser?.id]);

  // Typing event emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const socket = getSocket();
    if (!isTypingRef.current && currentUser) {
      isTypingRef.current = true;
      socket.emit('global_typing', {
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && currentUser) {
        isTypingRef.current = false;
        socket.emit('global_stop_typing', { userId: currentUser.id });
      }
    }, 2000);
  };

  const stopTypingNow = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && currentUser) {
      isTypingRef.current = false;
      getSocket().emit('global_stop_typing', { userId: currentUser.id });
    }
  };

  // Send message handler
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    stopTypingNow();
    setSending(true);

    try {
      const replyData = replyingTo
        ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId || '',
            senderName:
              replyingTo.senderId === currentUser?.id
                ? 'You'
                : replyingTo.sender?.fullName || replyingTo.sender?.username || 'User',
            content: replyingTo.content,
          }
        : null;

      setText('');
      setReplyingTo(null);

      const sent = await globalChatService.sendMessage(trimmed, {
        replyTo: replyData,
        messageType: 'text',
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });

      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to send message');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Helper to read file as Base64 data URL
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Media handler (photos & videos)
  const handleSelectMedia = async (file: File, type: 'image' | 'video') => {
    if (file.size > 15 * 1024 * 1024) {
      showError('File size exceeds 15MB limit');
      return;
    }
    try {
      showInfo('Uploading media...');
      const dataUrl = await readFileAsDataUrl(file);
      const sent = await globalChatService.sendMessage('', {
        messageType: type,
        mediaUrl: dataUrl,
        fileName: file.name,
        fileSize: file.size,
      });
      setMessages((prev) => [...prev, sent]);
      showSuccess('Media sent');
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to send media');
    }
  };

  // Document handler
  const handleSelectDocument = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      showError('File size exceeds 15MB limit');
      return;
    }
    try {
      showInfo('Uploading document...');
      const dataUrl = await readFileAsDataUrl(file);
      const sent = await globalChatService.sendMessage('', {
        messageType: 'document',
        mediaUrl: dataUrl,
        fileName: file.name,
        fileSize: file.size,
      });
      setMessages((prev) => [...prev, sent]);
      showSuccess('Document sent');
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to send document');
    }
  };

  // Poll creation handler
  const handleCreatePoll = async (question: string, options: string[], timer?: string | null) => {
    try {
      const sent = await globalChatService.sendMessage('', {
        messageType: 'poll',
        poll: { question, options, duration: timer || undefined },
      });
      setMessages((prev) => [...prev, sent]);
      showSuccess('Poll created');
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to create poll');
    }
  };

  // Poll vote handler
  const handleVotePoll = async (messageId: string, optionId: string) => {
    try {
      const updated = await globalChatService.votePoll(messageId, optionId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, poll: updated.poll } : m))
      );
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to vote on poll');
    }
  };

  // Voice note handler
  const handleSendVoiceNote = async (audioUrl: string, duration: number) => {
    setIsRecordingVoice(false);
    try {
      const sent = await globalChatService.sendMessage('Voice note', {
        messageType: 'voice',
        audioUrl,
        audioDuration: duration,
      });
      setMessages((prev) => [...prev, sent]);
      showSuccess('Voice note sent');
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to send voice note');
    }
  };

  // Mention user helper
  const handleMentionUser = (username: string) => {
    setText((prev) => `${prev ? prev + ' ' : ''}@${username} `);
    inputRef.current?.focus();
  };

  // Filter messages by search query
  const displayedMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender?.username?.toLowerCase().includes(q) ||
        m.sender?.fullName?.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Format message text with clickable mentions
  const renderMessageContent = (content: string) => {
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const u = part.substring(1);
        const isCurrent = currentUser?.username === u;
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${u}`);
            }}
            className={`font-semibold cursor-pointer rounded px-1 transition-colors ${
              isCurrent
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'text-purple-600 hover:underline'
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const typingNames = Object.values(typingUsers).map((u) => u.fullName || u.username);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-white overflow-hidden relative">
      {/* Header - Simple and consistent with Messages.tsx */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
              title="Back"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Simple Globe Avatar */}
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <HiOutlineGlobeAlt className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
              Global Chat
            </h2>
            <div className="text-xs flex items-center gap-1.5 mt-0.5 truncate text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Public chat room</span>
            </div>
          </div>
        </div>

        {/* Search Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isSearchOpen
                ? 'bg-purple-50 text-purple-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Search messages"
          >
            <HiOutlineMagnifyingGlass className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      {isSearchOpen && (
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Global Chat..."
            className="flex-1 text-xs sm:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Messages Feed Area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div
          ref={containerRef}
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-50/20 overscroll-contain"
        >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <HiOutlineGlobeAlt className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Say hello and start the conversation with the Echolet community!
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const sender = msg.sender;

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-2 transition-all duration-200 ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Sender Avatar for incoming messages */}
                {!isMe && (
                  <div
                    onClick={() => sender?.username && navigate(`/profile/${sender.username}`)}
                    className="shrink-0 mb-1 cursor-pointer"
                    title={`View ${sender?.username || 'user'} profile`}
                  >
                    <UserAvatar user={sender || undefined} size="sm" />
                  </div>
                )}

                {/* Hover action toolbar for Sender (Reply only - no pin, delete, edit, or reactions) */}
                {isMe && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(msg);
                        inputRef.current?.focus();
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <HiOutlineArrowUturnLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Message Bubble */}
                <div className="flex flex-col max-w-[80%] sm:max-w-[70%]">
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed flex flex-col gap-1 shadow-2xs relative transition-all ${
                      isMe
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/90'
                    }`}
                  >
                    {/* Sender Header for incoming messages */}
                    {!isMe && (
                      <div
                        className={`text-[11px] font-bold ${getSenderColor(
                          msg.senderId
                        )} leading-tight select-none pb-0.5 flex items-center gap-1.5`}
                      >
                        <span
                          onClick={() => sender?.username && navigate(`/profile/${sender.username}`)}
                          className="hover:underline cursor-pointer"
                        >
                          {sender?.fullName || sender?.username || 'User'}
                        </span>
                        {sender?.username && (
                          <span
                            onClick={() => handleMentionUser(sender.username)}
                            className="text-[10px] text-slate-400 hover:text-purple-600 cursor-pointer font-normal"
                            title="Click to mention"
                          >
                            @{sender.username}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quoted Reply Card */}
                    {msg.replyTo && (
                      <div
                        className={`p-2 rounded-xl text-xs border-l-3 transition-colors ${
                          isMe
                            ? 'bg-slate-800/90 border-purple-400 text-slate-200'
                            : 'bg-slate-100/90 border-purple-500 text-slate-700'
                        }`}
                      >
                        <div className="font-bold text-[11px] text-purple-400 truncate">
                          {msg.replyTo.senderName || 'Original message'}
                        </div>
                        <div className="truncate text-[11px] opacity-80 mt-0.5">
                          {msg.replyTo.content}
                        </div>
                      </div>
                    )}

                    {/* Content: Poll, Voice, Media, or Text */}
                    {msg.messageType === 'poll' && msg.poll ? (
                      <ChatPollWidget
                        poll={msg.poll}
                        currentUserId={currentUser?.id}
                        onVote={(optionId) => handleVotePoll(msg.id, optionId)}
                        isMe={isMe}
                      />
                    ) : !msg.isDeleted && (msg.messageType === 'voice' || msg.audioUrl) ? (
                      <VoiceNotePlayer
                        audioUrl={msg.audioUrl || ''}
                        duration={msg.audioDuration}
                        isMe={isMe}
                        extraRight={
                          <span className="text-[10px] text-slate-400 ml-auto select-none leading-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        }
                      />
                    ) : (msg.messageType === 'story_reply' || msg.story) ? (
                      <div>
                        <StoryMessageCard
                          story={msg.story}
                          content={msg.content}
                          isMe={isMe}
                        />
                        <div className="flex items-center gap-1.5 ml-auto justify-end select-none pb-0.5 leading-none mt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (msg.messageType === 'reel' || /\/reels\/[a-zA-Z0-9_-]+/i.test(msg.content || '')) ? (
                      <div>
                        <ReelMessageCard
                          content={msg.content}
                          mediaUrl={msg.mediaUrl}
                          isMe={isMe}
                        />
                        <div className="flex items-center gap-1.5 ml-auto justify-end select-none pb-0.5 leading-none mt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (msg.messageType === 'post' || /\/post(?:s)?\/[a-zA-Z0-9_-]+/i.test(msg.content || '')) ? (
                      <div>
                        <PostMessageCard
                          content={msg.content}
                          mediaUrl={msg.mediaUrl}
                          isMe={isMe}
                        />
                        <div className="flex items-center gap-1.5 ml-auto justify-end select-none pb-0.5 leading-none mt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {msg.mediaUrl && (
                          <ChatMediaAttachment
                            type={msg.messageType}
                            mediaUrl={msg.mediaUrl}
                            fileName={msg.fileName}
                            fileSize={msg.fileSize}
                            authorName={isMe ? 'You' : msg.sender?.fullName}
                          />
                        )}
                        {msg.content && (
                          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 mt-1">
                            <span className="whitespace-pre-wrap break-words flex-1 min-w-[60px]">
                              {renderMessageContent(msg.content)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-auto shrink-0 select-none pb-0.5">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp for poll or media without text content */}
                    {(!msg.content || msg.messageType === 'poll') && msg.messageType !== 'voice' && !msg.audioUrl && (
                      <div className="flex items-center justify-end text-[10px] text-slate-400 select-none pt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover action toolbar for incoming messages (Reply only) */}
                {!isMe && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(msg);
                        inputRef.current?.focus();
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <HiOutlineArrowUturnLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 right-4 z-20 p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
            title="Scroll to bottom"
          >
            <HiOutlineChevronDown className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-5 py-1.5 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-500 italic flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {typingNames.slice(0, 3).join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing...
          </span>
        </div>
      )}

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 rounded-full bg-purple-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-purple-600 truncate">
                Replying to{' '}
                {replyingTo.senderId === currentUser?.id
                  ? 'yourself'
                  : replyingTo.sender?.fullName || replyingTo.sender?.username || 'User'}
              </p>
              <p className="text-xs text-slate-600 truncate">{replyingTo.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form Bar - Matches Messages.tsx */}
      <div className="p-2 sm:p-3 md:p-4 border-t border-slate-100 bg-white flex items-center gap-1.5 sm:gap-2 shrink-0 relative pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-3 md:pb-4">
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-16 left-2 sm:left-4 z-40 shadow-xl rounded-2xl border border-slate-200 overflow-hidden max-w-[calc(100vw-1.5rem)]"
          >
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => {
                setText((prev) => prev + data.emoji);
              }}
              lazyLoadEmojis={true}
              width={320}
              height={400}
            />
          </div>
        )}

        {isRecordingVoice ? (
          <LiveVoiceRecorder
            onCancel={() => setIsRecordingVoice(false)}
            onSend={handleSendVoiceNote}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2"
          >
            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer ${
                showEmojiPicker
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Add Emoji"
            >
              <HiOutlineFaceSmile className="w-5 h-5" />
            </button>

            {/* Attachment Menu (Photos/Videos, Document, Poll) */}
            <ChatAttachmentMenu
              onSelectMedia={handleSelectMedia}
              onSelectDocument={handleSelectDocument}
              onOpenPollModal={() => setIsPollModalOpen(true)}
            />

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleInputChange}
              placeholder="Message #global-chat... (@mention supported)"
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />

            {/* Voice Record Toggle */}
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className={`p-2 sm:p-2.5 rounded-full text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0 cursor-pointer ${
                text.trim() ? 'hidden sm:inline-flex' : 'inline-flex'
              }`}
              title="Record voice note"
            >
              <HiOutlineMicrophone className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className={`p-2 sm:p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 ${
                !text.trim() ? 'hidden sm:inline-flex' : 'inline-flex'
              }`}
            >
              <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
            </button>
          </form>
        )}
      </div>

      {/* Create Chat Poll Modal */}
      <CreateChatPollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSubmit={handleCreatePoll}
      />
    </div>
  );
}
