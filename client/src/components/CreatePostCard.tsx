import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlinePhoto,
  HiXMark,
  HiOutlinePaperAirplane,
  HiOutlineGlobeAmericas,
  HiCheckCircle,
  HiPlus,
} from 'react-icons/hi2';
import postService, { type Post } from '../services/postService';
import type { User } from '../services/authService';
import { useMessage } from '../context/MessageContext';

interface CreatePostCardProps {
  currentUser: User | null | undefined;
  onPostCreated: (post: Post) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface SelectedImage {
  id: string;
  url: string;
  name: string;
  sizeText: string;
}

const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB limit per image
const MAX_IMAGES_COUNT = 4; // Maximum 4 images per post

/**
 * Optimize an image file client-side using HTML5 Canvas to keep base64 payload compact & fast.
 * GIFs preserve animation frames.
 */
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
        // Export high-quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function CreatePostCard({
  currentUser,
  onPostCreated,
  showToast,
}: CreatePostCardProps) {
  const { showMessage } = useMessage();
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) {
      showToast(msg, type);
    } else {
      showMessage(msg, type);
    }
  };

  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const userInitial = currentUser?.fullName?.[0] || currentUser?.username?.[0] || 'U';

  /**
   * Process multiple files (up to max remaining count), enforcing 1MB limit on each.
   */
  const processFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (!rawFiles.length) return;

    const availableSlots = MAX_IMAGES_COUNT - images.length;
    if (availableSlots <= 0) {
      notify(`You can only attach up to ${MAX_IMAGES_COUNT} images per post`, 'error');
      return;
    }

    const filesToProcess = rawFiles.slice(0, availableSlots);
    if (rawFiles.length > availableSlots) {
      notify(`Only ${availableSlots} more image(s) could be added (max ${MAX_IMAGES_COUNT})`, 'info');
    }

    setIsProcessing(true);
    const newImages: SelectedImage[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        notify(`"${file.name}" is not an image file (PNG, JPG, WEBP, GIF only)`, 'error');
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        notify(
          `"${file.name}" is ${sizeMB} MB. Each image must be 1 MB or less.`,
          'error'
        );
        continue;
      }

      try {
        const optimizedUrl = await optimizeImageFile(file);
        const kbSize = Math.max(1, Math.round(file.size / 1024));
        newImages.push({
          id: Math.random().toString(36).substring(2, 9),
          url: optimizedUrl,
          name: file.name,
          sizeText: `${kbSize} KB`,
        });
      } catch (err) {
        console.error('Failed to optimize image:', file.name, err);
        notify(`Failed to process "${file.name}". Try another file.`, 'error');
      }
    }

    setIsProcessing(false);

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      notify(
        newImages.length === 1
          ? `Image attached (${newImages[0].sizeText} / 1 MB max)`
          : `${newImages.length} images attached successfully`,
        'success'
      );
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Clipboard paste support for images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = content.trim();
    const hasImages = images.length > 0;

    if (!trimmed && !hasImages) {
      notify('Please write something or attach an image', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const createdPost = await postService.createPost({
        content: trimmed,
        mediaUrls: hasImages ? images.map((img) => img.url) : undefined,
        mediaType: hasImages ? 'image' : 'text',
      });

      onPostCreated(createdPost);
      setContent('');
      setImages([]);
      notify('Echo published successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      notify(
        err.response?.data?.message || 'Failed to create post. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 mb-5 select-none transition-all text-center">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Join the conversation on Echolet
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          Sign in or create an account to share echoes, attach images (up to 1MB each), and reply to creators.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative bg-white rounded-3xl border transition-all duration-200 shadow-sm p-5 sm:p-6 mb-5 select-none ${
        isDragging
          ? 'border-slate-900 ring-4 ring-slate-900/5 bg-slate-50/50'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs rounded-3xl z-30 flex flex-col items-center justify-center text-white pointer-events-none p-6 text-center animate-in fade-in duration-150">
          <HiOutlinePhoto className="w-12 h-12 mb-2 animate-bounce stroke-[1.5]" />
          <p className="font-bold text-base">Drop your images here</p>
          <p className="text-xs text-slate-300 mt-1">Up to 4 images · Max 1 MB each</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header with User Info & Visibility Badge */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {userInitial}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight">
                {currentUser?.fullName || 'You'}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                <HiOutlineGlobeAmericas className="w-3.5 h-3.5 text-slate-400" />
                <span>Anyone can reply</span>
              </div>
            </div>
          </div>

          {content.length > 0 && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                content.length > 450
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {content.length} / 500
            </span>
          )}
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder={`What's on your mind? Share thoughts, links, or drop images (max 1MB each)...`}
            rows={3}
            maxLength={500}
            className="w-full text-slate-900 placeholder-slate-400 bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-2xl p-4 text-sm sm:text-base focus:outline-none border border-slate-200/80 focus:border-slate-400 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 animate-in fade-in">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin shrink-0" />
            <span className="text-xs font-semibold text-slate-700">
              Processing & optimizing images (ensuring ≤ 1 MB each)...
            </span>
          </div>
        )}

        {/* Multi-Image Preview Grid */}
        {images.length > 0 && !isProcessing && (
          <div className="mt-3.5 space-y-2">
            <div
              className={`grid gap-2 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/40 p-2 ${
                images.length === 1
                  ? 'grid-cols-1'
                  : images.length === 2
                  ? 'grid-cols-2'
                  : images.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
              }`}
            >
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-white aspect-4/3 flex items-center justify-center shadow-2xs"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                  />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-full backdrop-blur-xs cursor-pointer shadow-md transition-all active:scale-95"
                    title="Remove image"
                  >
                    <HiXMark className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Image size tag */}
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {img.sizeText}
                  </span>
                </div>
              ))}
            </div>

            {/* Info and Add More bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                {images.length} / {MAX_IMAGES_COUNT} image{images.length > 1 ? 's' : ''} (≤ 1 MB each)
              </span>

              {images.length < MAX_IMAGES_COUNT && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <HiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  Add more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100">
          {/* Media Attach Tools */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={images.length >= MAX_IMAGES_COUNT}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 group"
              title="Upload Images (Max 1MB each, up to 4)"
            >
              <HiOutlinePhoto className="w-5 h-5 text-slate-700 group-hover:text-slate-900" />
              <span className="text-xs font-semibold">Images</span>
              <span className="text-[10px] text-slate-400 font-medium">
                (max 1MB)
              </span>
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || isProcessing || (!content.trim() && images.length === 0)}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Echoing...</span>
              </>
            ) : (
              <>
                <span>Echo</span>
                <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
