import React, { useState, useRef } from 'react';
import {
  HiOutlinePhoto,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiCheck,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineVideoCamera,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowsPointingIn,
} from 'react-icons/hi2';
import Modal from '../common/Modal';
import type { User } from '../../services/authService';
import storyService, { type StoryItem } from '../../services/storyService';
import uploadService from '../../services/uploadService';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null | undefined;
  onStoryCreated: (story: StoryItem) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const GRADIENTS = [
  {
    id: 'lavender',
    name: 'Lavender Haze',
    bg: 'from-purple-100 via-pink-100 to-indigo-100',
    css: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 50%, #e0e7ff 100%)',
    defaultTextColor: 'dark',
  },
  {
    id: 'sunset',
    name: 'Sunset Peach',
    bg: 'from-amber-100 via-rose-100 to-orange-100',
    css: 'linear-gradient(135deg, #fef3c7 0%, #ffe4e6 50%, #ffedd5 100%)',
    defaultTextColor: 'dark',
  },
  {
    id: 'mint',
    name: 'Mint Breeze',
    bg: 'from-emerald-100 via-teal-100 to-cyan-100',
    css: 'linear-gradient(135deg, #d1fae5 0%, #ccfbf1 50%, #cffafe 100%)',
    defaultTextColor: 'dark',
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    bg: 'from-blue-100 via-sky-100 to-indigo-100',
    css: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 50%, #e0e7ff 100%)',
    defaultTextColor: 'dark',
  },
  {
    id: 'purple',
    name: 'Royal Violet',
    bg: 'from-indigo-600 via-purple-600 to-pink-500',
    css: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #ec4899 100%)',
    defaultTextColor: 'light',
  },
  {
    id: 'cyber',
    name: 'Cyber Pink',
    bg: 'from-fuchsia-600 via-rose-600 to-amber-500',
    css: 'linear-gradient(135deg, #c026d3 0%, #e11d48 50%, #f59e0b 100%)',
    defaultTextColor: 'light',
  },
  {
    id: 'ocean',
    name: 'Deep Blue',
    bg: 'from-blue-600 via-indigo-600 to-violet-800',
    css: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #5b21b6 100%)',
    defaultTextColor: 'light',
  },
  {
    id: 'minimal',
    name: 'Slate Minimal',
    bg: 'from-slate-100 via-slate-200 to-zinc-200',
    css: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #e4e4e7 100%)',
    defaultTextColor: 'dark',
  },
];

const FONTS = [
  { id: 'modern', name: 'Modern Sans', styleClass: 'font-sans font-bold' },
  { id: 'serif', name: 'Editorial Serif', styleClass: 'font-serif italic font-semibold' },
  { id: 'neon', name: 'Cyber Glow', styleClass: 'font-mono font-black uppercase tracking-wider' },
  { id: 'casual', name: 'Playful', styleClass: 'font-sans font-medium tracking-wide' },
];

const optimizeImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function CreateStoryModal({
  isOpen,
  onClose,
  currentUser,
  onStoryCreated,
  showToast,
}: CreateStoryModalProps) {
  const [tab, setTab] = useState<'image' | 'video' | 'text'>('image');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [textColor, setTextColor] = useState<'light' | 'dark'>('dark');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setImagePreview(null);
    setVideoPreview(null);
    setVideoDuration(null);
    setAttachedFile(null);
    setCaption('');
    setTextContent('');
    setSelectedGradient(GRADIENTS[0]);
    setSelectedFont(FONTS[0]);
    setTextColor('dark');
    setFitMode('contain');
    setTab('image');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast?.('Please choose an image file (PNG, JPG, WebP, GIF)', 'error');
      return;
    }

    try {
      setAttachedFile(file);
      const dataUrl = await optimizeImageFile(file);
      setImagePreview(dataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast?.('Failed to process image. Try a smaller file.', 'error');
    }
  };

  const handleVideoProcess = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      showToast?.('Please choose a valid video file (MP4, WebM, MOV)', 'error');
      return;
    }

    try {
      setAttachedFile(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objUrl = URL.createObjectURL(file);
      video.src = objUrl;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objUrl);
        const duration = video.duration;
        if (duration > 60.5) {
          showToast?.(
            `Video duration is ${Math.round(duration)}s. Stories can only be within 1 minute (60s).`,
            'error'
          );
          setAttachedFile(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setVideoPreview(reader.result as string);
          setVideoDuration(duration);
          showToast?.(`Video ready (${Math.round(duration)}s)`, 'success');
        };
        reader.onerror = () => {
          showToast?.('Could not read video file', 'error');
        };
        reader.readAsDataURL(file);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objUrl);
        showToast?.('Could not read video metadata. Unsupported format.', 'error');
      };
    } catch (err) {
      console.error('Failed to process video:', err);
      showToast?.('Failed to process video.', 'error');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoProcess(file);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (tab === 'image' && !imagePreview) {
      showToast?.('Please upload a photo for your story.', 'error');
      return;
    }

    if (tab === 'video' && !videoPreview) {
      showToast?.('Please upload a video for your story.', 'error');
      return;
    }

    if (tab === 'text' && !textContent.trim()) {
      showToast?.('Please enter some text for your status.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMediaUrl: string | undefined = undefined;
      if (tab === 'image' || tab === 'video') {
        if (attachedFile) {
          try {
            const uploadRes = await uploadService.uploadFile(attachedFile, 'stories');
            finalMediaUrl = uploadRes.url;
          } catch {
            finalMediaUrl = tab === 'image' ? (imagePreview || undefined) : (videoPreview || undefined);
          }
        } else {
          finalMediaUrl = tab === 'image' ? (imagePreview || undefined) : (videoPreview || undefined);
        }
      }

      const res = await storyService.createStory({
        mediaType: tab,
        mediaUrl: finalMediaUrl,
        duration:
          tab === 'video' && videoDuration
            ? Math.min(60, Math.round(videoDuration))
            : undefined,
        content: tab === 'text' ? textContent.trim() : caption.trim(),
        backgroundColor: tab === 'text' ? selectedGradient.css : undefined,
        fontStyle: tab === 'text' ? selectedFont.id : fitMode,
      });

      showToast?.('Story posted! Disappears in 24 hours.', 'success');
      onStoryCreated(res.story);
      handleClose();
    } catch (err: any) {
      console.error('Failed to post story:', err);
      showToast?.(err.response?.data?.message || 'Could not post story. Try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      backdropVariant="blur"
      icon={<HiOutlineSparkles className="w-5 h-5 text-purple-600 stroke-[2.2]" />}
      title={
        <div className="flex items-center gap-2">
          <span>Create Story</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            24h Status
          </span>
        </div>
      }
      description="Share a moment or thought with friends • Automatically disappears in 24 hours"
      showCloseButton={!isSubmitting}
      closeButtonPosition="inside"
    >
      <div className="w-full space-y-5">
        {/* Tab switch */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setTab('image')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              tab === 'image'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HiOutlinePhoto className="w-4 h-4 text-purple-600" />
            <span>Photo Story</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('video')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              tab === 'video'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HiOutlineVideoCamera className="w-4 h-4 text-purple-600" />
            <span>Video Story</span>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full">
              ≤ 60s
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              tab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
            <span>Text Status</span>
          </button>
        </div>

        {/* 2-Column Studio Layout on md+ screens */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Live Phone Mockup Preview */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[240px] sm:max-w-[260px] aspect-[9/16] rounded-3xl overflow-hidden border-4 border-slate-900/10 shadow-xl relative bg-black flex flex-col justify-between p-3 select-none transition-all">
              {/* Phone speaker notch simulation */}
              <div className="absolute top-2 inset-x-0 flex justify-center z-20 pointer-events-none">
                <div className="w-16 h-1.5 bg-slate-400/40 rounded-full" />
              </div>

              {/* Story Canvas */}
              {tab === 'image' ? (
                imagePreview ? (
                  <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Story preview"
                      className={`w-full h-full select-none transition-all duration-200 ${
                        fitMode === 'cover' ? 'object-cover' : 'object-contain'
                      }`}
                    />
                    {caption && (
                      <div className="absolute bottom-4 inset-x-3 bg-black/75 backdrop-blur-md rounded-xl p-2 text-center text-xs font-semibold text-white border border-white/15 shadow-md">
                        {caption}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
                      className="absolute bottom-3 left-3 z-30 px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      title={fitMode === 'contain' ? 'Switch to Vertical Crop' : 'Switch to Center Fit (Black Space)'}
                    >
                      {fitMode === 'contain' ? (
                        <>
                          <HiOutlineArrowsPointingOut className="w-2.5 h-2.5 text-purple-300" />
                          <span>Crop Fill</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineArrowsPointingIn className="w-2.5 h-2.5 text-purple-300" />
                          <span>Center Fit</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-50">
                    <HiOutlinePhoto className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">No photo selected</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Upload a photo to see preview</p>
                  </div>
                )
              ) : tab === 'video' ? (
                videoPreview ? (
                  <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
                    <video
                      src={videoPreview}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className={`w-full h-full select-none transition-all duration-200 ${
                        fitMode === 'cover' ? 'object-cover' : 'object-contain'
                      }`}
                    />
                    <div className="absolute top-8 right-3 z-20 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <HiOutlineVideoCamera className="w-3 h-3 text-purple-400" />
                      <span>{Math.round(videoDuration || 0)}s</span>
                    </div>
                    {caption && (
                      <div className="absolute bottom-4 inset-x-3 bg-black/75 backdrop-blur-md rounded-xl p-2 text-center text-xs font-semibold text-white border border-white/15 shadow-md">
                        {caption}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
                      className="absolute bottom-3 left-3 z-30 px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      title={fitMode === 'contain' ? 'Switch to Vertical Crop' : 'Switch to Center Fit (Black Space)'}
                    >
                      {fitMode === 'contain' ? (
                        <>
                          <HiOutlineArrowsPointingOut className="w-2.5 h-2.5 text-purple-300" />
                          <span>Crop Fill</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineArrowsPointingIn className="w-2.5 h-2.5 text-purple-300" />
                          <span>Center Fit</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-50">
                    <HiOutlineVideoCamera className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">No video selected</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Max duration: 60 seconds</p>
                  </div>
                )
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center p-5 text-center transition-all duration-300"
                  style={{ background: selectedGradient.css }}
                >
                  <p
                    className={`text-base sm:text-lg font-bold drop-shadow-xs break-words max-h-[80%] overflow-y-auto scrollbar-none ${selectedFont.styleClass} ${
                      textColor === 'light' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {textContent.trim() || 'Your story text will look like this...'}
                  </p>
                </div>
              )}

              {/* Author badge preview (top) */}
              <div className="relative z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full shadow-2xs border border-white/40 w-fit">
                <div className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[8px] flex items-center justify-center overflow-hidden">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.fullName?.[0] || 'U'
                  )}
                </div>
                <span className="text-[9px] font-bold text-slate-800">
                  {currentUser?.username || 'you'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium mt-2 flex items-center gap-1">
              <HiOutlineEye className="w-3.5 h-3.5 text-purple-600" />
              Live viewer preview
            </p>
          </div>

          {/* Right Column: Customization & Inputs */}
          <div className="md:col-span-7 space-y-4">
            {tab === 'image' ? (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {!imagePreview ? (
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
                      if (file) handleFileProcess(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                      isDragging
                        ? 'border-purple-500 bg-purple-50 scale-[0.99]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-purple-400 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2.5 shadow-2xs">
                      <HiOutlinePhoto className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      Click to choose or drag & drop photo
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, WebP, GIF supported
                    </p>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full mt-3">
                      Browse Files
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={imagePreview}
                        alt="Selected"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Photo attached</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Ready to share</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <HiOutlineArrowPath className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                        title="Remove photo"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {imagePreview && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Media Display</p>
                      <p className="text-[10px] text-slate-500">
                        {fitMode === 'contain' ? 'Centered with black space outside' : 'Cropped to fill full screen'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFitMode('contain')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          fitMode === 'contain'
                            ? 'bg-white text-purple-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HiOutlineArrowsPointingIn className="w-3.5 h-3.5" />
                        <span>Center Fit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFitMode('cover')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          fitMode === 'cover'
                            ? 'bg-white text-purple-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                        <span>Vertical Crop</span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Caption (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {caption.length}/150
                    </span>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a thought or caption to your photo..."
                    maxLength={150}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>
            ) : tab === 'video' ? (
              <div className="space-y-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                  className="hidden"
                  onChange={handleVideoSelect}
                />

                {!videoPreview ? (
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
                      if (file) handleVideoProcess(file);
                    }}
                    onClick={() => videoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                      isDragging
                        ? 'border-purple-500 bg-purple-50 scale-[0.99]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-purple-400 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2.5 shadow-2xs">
                      <HiOutlineVideoCamera className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      Click to choose or drag & drop video
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      MP4, WebM, MOV supported • Max 60 seconds (1 minute)
                    </p>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full mt-3">
                      Browse Video
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-200 shadow-2xs flex items-center justify-center">
                        <video
                          src={videoPreview}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <HiOutlineVideoCamera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">Video attached</p>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.2 rounded-full">
                            {Math.round(videoDuration || 0)}s
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Ready to share (within 1 min)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <HiOutlineArrowPath className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoPreview(null);
                          setVideoDuration(null);
                        }}
                        className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                        title="Remove video"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {videoPreview && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Media Display</p>
                      <p className="text-[10px] text-slate-500">
                        {fitMode === 'contain' ? 'Centered with black space outside' : 'Cropped to fill full screen'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFitMode('contain')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          fitMode === 'contain'
                            ? 'bg-white text-purple-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HiOutlineArrowsPointingIn className="w-3.5 h-3.5" />
                        <span>Center Fit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFitMode('cover')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          fitMode === 'cover'
                            ? 'bg-white text-purple-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HiOutlineArrowsPointingOut className="w-3.5 h-3.5" />
                        <span>Vertical Crop</span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Caption (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {caption.length}/150
                    </span>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a thought or caption to your video..."
                    maxLength={150}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Status Text <span className="text-purple-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {textContent.length}/300
                    </span>
                  </div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="What's happening? Type your status story here..."
                    maxLength={300}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all resize-none shadow-2xs"
                  />
                </div>

                {/* Gradient Presets */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Gradient Background
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {GRADIENTS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGradient(g);
                          setTextColor(g.defaultTextColor as 'light' | 'dark');
                        }}
                        title={g.name}
                        className={`h-9 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shadow-2xs ${
                          selectedGradient.id === g.id
                            ? 'ring-2 ring-purple-600 scale-105 shadow-md ring-offset-2'
                            : 'hover:scale-105 opacity-90 hover:opacity-100'
                        }`}
                        style={{ background: g.css }}
                      >
                        {selectedGradient.id === g.id && (
                          <HiCheck className={`w-4 h-4 stroke-[3] ${g.defaultTextColor === 'light' ? 'text-white' : 'text-slate-900'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography & Text Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                      Typography
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONTS.map((font) => (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => setSelectedFont(font)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            selectedFont.id === font.id
                              ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                          }`}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTextColor('dark')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          textColor === 'dark'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span>Dark Slate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextColor('light')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          textColor === 'light'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span>Pure White</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="You"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-400"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.fullName?.[0] || 'U'}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">
                @{currentUser?.username || 'you'}
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <HiOutlineClock className="w-3 h-3 text-purple-600" />
                <span>Visible for 24h</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (tab === 'image' && !imagePreview) ||
                (tab === 'text' && !textContent.trim())
              }
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sharing Story...</span>
                </>
              ) : (
                <>
                  <HiOutlinePaperAirplane className="w-4 h-4" />
                  <span>Share Story</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
