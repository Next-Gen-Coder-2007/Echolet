import React, { useState, useEffect, useRef } from 'react';
import {
  HiXMark,
  HiPaperAirplane,
  HiOutlineFaceSmile,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
} from 'react-icons/hi2';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

export interface MediaUploadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  mediaType: 'image' | 'video';
  previewUrl: string;
  recipientName: string;
  recipientAvatar?: string | null;
  isGroup?: boolean;
  onSend: (caption: string) => Promise<void> | void;
  isSending?: boolean;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '👍', '✨', '🎉', '😍', '🙌'];

export const MediaUploadPreviewModal: React.FC<MediaUploadPreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  mediaType,
  previewUrl,
  recipientName,
  recipientAvatar,
  isGroup = false,
  onSend,
  isSending = false,
}) => {
  const [caption, setCaption] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCaption('');
      setShowEmojiPicker(false);
      // Autofocus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else if (!isSending) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showEmojiPicker, isSending, onClose]);

  // Handle outside click for emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  if (!isOpen || !previewUrl) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;
    onSend(caption.trim());
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setCaption((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleQuickEmoji = (emoji: string) => {
    setCaption((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Modal Card */}
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            {recipientAvatar ? (
              <img
                src={recipientAvatar}
                alt={recipientName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/50 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                {recipientName ? recipientName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-300">
                  {mediaType === 'image' ? 'Send Photo' : 'Send Video'}
                </span>
                <span className="text-white/30 text-xs">•</span>
                <span className="text-xs text-white/70 truncate">
                  {isGroup ? `#${recipientName}` : recipientName}
                </span>
              </div>
              {file && (
                <p className="text-[11px] text-white/50 truncate">
                  {file.name} {file.size ? `(${formatFileSize(file.size)})` : ''}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            title="Discard and close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Center Preview Area */}
        <div className="flex-1 min-h-[220px] max-h-[56vh] flex items-center justify-center p-4 bg-black/50 overflow-hidden relative select-none">
          {mediaType === 'image' ? (
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-[52vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/15"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                <HiOutlinePhoto className="w-3.5 h-3.5 text-purple-400" />
                <span>Image</span>
              </div>
            </div>
          ) : (
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[52vh] max-w-full rounded-2xl shadow-2xl ring-1 ring-white/15 bg-black"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                <HiOutlineVideoCamera className="w-3.5 h-3.5 text-purple-400" />
                <span>Video</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Reactions Bar */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-slate-900/90 border-t border-white/5">
          <span className="text-[11px] text-white/40 mr-1 hidden sm:inline">Quick emojis:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base p-1 hover:bg-white/10 rounded-lg transition-transform active:scale-90 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Caption Input & Actions Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 flex flex-col gap-3 relative shrink-0">
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/15"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                lazyLoadEmojis={true}
                width={320}
                height={380}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                showEmojiPicker
                  ? 'bg-purple-600/30 text-purple-400 border border-purple-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Add emoji to caption"
            >
              <HiOutlineFaceSmile className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={500}
                disabled={isSending}
                className="w-full bg-white/5 border border-white/15 hover:border-white/25 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {caption.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">
                  {caption.length}/500
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <HiPaperAirplane className="w-4 h-4 rotate-45" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MediaUploadPreviewModal;
