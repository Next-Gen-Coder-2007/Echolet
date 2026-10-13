import React, { useState, useRef, useEffect } from 'react';
import {
  HiOutlineFilm,
  HiOutlineArrowUpTray,
  HiOutlineMusicalNote,
  HiOutlineSparkles,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
} from 'react-icons/hi2';
import Modal from './Modal';
import reelService, { type Reel } from '../services/reelService';
import type { User } from '../services/authService';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onReelCreated?: (reel: Reel) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CreateReelModal({
  isOpen,
  onClose,
  currentUser,
  onReelCreated,
  showToast,
}: CreateReelModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [audioTitle, setAudioTitle] = useState<string>('');
  const [duration, setDuration] = useState<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Set default audio title when user is available
  useEffect(() => {
    if (currentUser?.username && !audioTitle) {
      setAudioTitle(`Original Audio · @${currentUser.username}`);
    }
  }, [currentUser, audioTitle]);

  // Clean up object URLs on unmount / change
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const resetForm = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl('');
    setThumbnailUrl('');
    setCaption('');
    setDuration(null);
    setIsSubmitting(false);
    setUploadProgress('');
    setError(null);
    if (currentUser?.username) {
      setAudioTitle(`Original Audio · @${currentUser.username}`);
    } else {
      setAudioTitle('');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/')) {
      const msg = 'Please choose a valid video file (MP4, WebM, QuickTime).';
      setError(msg);
      showToast?.(msg, 'error');
      return;
    }

    if (file.size > 70 * 1024 * 1024) {
      const msg = 'Video is too large. Please select a clip under 70MB.';
      setError(msg);
      showToast?.(msg, 'error');
      return;
    }

    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(objectUrl);
    setIsPlaying(true);
  };

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(Math.round(video.duration || 0));
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
  };

  const handleVideoSeeked = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.85);
        setThumbnailUrl(frameData);
      }
    } catch (err) {
      console.warn('Could not extract video thumbnail:', err);
    }
  };

  const togglePlay = () => {
    if (!videoPlayerRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play();
      setIsPlaying(true);
    } else {
      videoPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.muted = !videoPlayerRef.current.muted;
    setIsMuted(videoPlayerRef.current.muted);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read video file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      showToast?.('Please select a video for your reel.', 'error');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Preparing video...');

    try {
      setUploadProgress('Encoding video data...');
      const videoDataUrl = await readFileAsDataURL(videoFile);

      setUploadProgress('Publishing reel...');
      const newReel = await reelService.createReel({
        videoUrl: videoDataUrl,
        thumbnailUrl: thumbnailUrl || null,
        caption: caption.trim() || undefined,
        audioTitle: audioTitle.trim() || undefined,
        duration: duration || null,
      });

      showToast?.('Reel published successfully!', 'success');
      onReelCreated?.(newReel);
      handleClose();
    } catch (err: any) {
      console.error('Failed to create reel:', err);
      let errMsg =
        err?.response?.data?.message || 'Failed to upload and publish reel. Please try a smaller video.';
      if (err?.response?.status === 413) {
        errMsg = 'Video file payload is too large for the server. Please choose a slightly smaller or compressed video.';
      }
      setError(errMsg);
      showToast?.(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      backdropVariant="blur"
      icon={<HiOutlineFilm className="w-5 h-5 text-purple-600 stroke-[2.2]" />}
      title={
        <div className="flex items-center gap-2">
          <span>Create Reel</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            Shorts
          </span>
        </div>
      }
      description="Share high-energy vertical video moments with sound"
      showCloseButton={!isSubmitting}
      closeButtonPosition="inside"
    >
      <div className="w-full">
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {!videoPreviewUrl ? (
          /* Upload Drop Area */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
              isDragging
                ? 'border-purple-400 bg-purple-50/70 scale-[0.99]'
                : 'border-slate-200 bg-slate-50/50 hover:border-purple-400 hover:bg-purple-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/m4v"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00b4d8]/15 via-[#7928ca]/15 to-[#ff0080]/15 border border-purple-200 flex items-center justify-center text-purple-600 mb-4 shadow-xs">
              <HiOutlineArrowUpTray className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-base font-bold text-slate-800 mb-1.5">
              Drag and drop your video here, or browse
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
              Supports 9:16 vertical MP4, WebM, and QuickTime clips up to 35MB.
            </p>

            <button
              type="button"
              className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-xs hover:opacity-95 transition-all"
            >
              Select Video File
            </button>
          </div>
        ) : (
          /* Video Editor / Info Form */
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-5">
            {/* Left Column: Vertical Video Preview */}
            <div className="sm:w-[220px] shrink-0 flex flex-col items-center">
              <div className="relative w-full aspect-[9/16] max-w-[200px] bg-black rounded-2xl overflow-hidden border border-slate-300 shadow-md group">
                <video
                  ref={videoPlayerRef}
                  src={videoPreviewUrl}
                  loop
                  autoPlay
                  playsInline
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onSeeked={handleVideoSeeked}
                  className="w-full h-full object-cover"
                />

                {/* Play/Pause overlay */}
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-lg">
                    {isPlaying ? (
                      <HiOutlinePause className="w-5 h-5" />
                    ) : (
                      <HiOutlinePlay className="w-5 h-5 ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Bottom Video Controls overlay */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white/90 z-10">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 rounded-lg bg-black/60 backdrop-blur-md hover:bg-black/80 transition-colors cursor-pointer text-xs flex items-center"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <HiOutlineSpeakerXMark className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <HiOutlineSpeakerWave className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>

                  {duration !== null && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono font-medium">
                      {Math.floor(duration / 60)}:
                      {(duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>

              {/* Change video button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="mt-2.5 text-xs text-slate-500 hover:text-purple-600 font-semibold transition-colors cursor-pointer"
              >
                Change video clip
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/m4v"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {/* Right Column: Details & Submit */}
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                {/* Caption Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption, tags (#echolet, #reels)..."
                    maxLength={500}
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all"
                  />
                  <div className="flex justify-end mt-0.5 text-[11px] text-slate-400">
                    {caption.length}/500
                  </div>
                </div>

                {/* Audio Title Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <HiOutlineMusicalNote className="w-3.5 h-3.5 text-purple-600" />
                    Audio Track Name
                  </label>
                  <input
                    type="text"
                    value={audioTitle}
                    onChange={(e) => setAudioTitle(e.target.value)}
                    placeholder="e.g. Original Audio · @username"
                    maxLength={80}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>

                {/* Auto Cover Frame */}
                {thumbnailUrl && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <img
                      src={thumbnailUrl}
                      alt="Reel Cover"
                      className="w-10 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Auto-Generated Cover</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Selected automatically from the video for feed & search.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{uploadProgress || 'Publishing...'}</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineFilm className="w-4 h-4" />
                      <span>Publish Reel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
