import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  HiOutlineCamera,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineUser,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { useMessage } from '../../context/MessageContext';
import userService from '../../services/userService';
import type { User } from '../../services/authService';

interface OutletContextType {
  user?: User | null;
  onUserUpdated?: (user: User) => void;
}

/**
 * Resizes and compresses an image File to a lightweight dataURL JPEG.
 */
const optimizeImageFile = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.88
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { user: currentUser, onUserUpdated } = useOutletContext<OutletContextType>();
  const { showSuccess, showError } = useMessage();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(currentUser?.bannerUrl || null);

  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatarUrl || null);
      setBannerUrl(currentUser.bannerUrl || null);
    }
  }, [currentUser]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image size should be under 10MB');
      return;
    }

    try {
      setIsProcessingAvatar(true);
      const optimized = await optimizeImageFile(file, 600, 600, 0.9);
      setAvatarUrl(optimized);
    } catch {
      showError('Failed to process avatar image');
    } finally {
      setIsProcessingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showError('Banner image size should be under 15MB');
      return;
    }

    try {
      setIsProcessingBanner(true);
      const optimized = await optimizeImageFile(file, 1600, 650, 0.88);
      setBannerUrl(optimized);
    } catch {
      showError('Failed to process banner image');
    } finally {
      setIsProcessingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const handleRemoveBanner = () => {
    setBannerUrl('');
  };

  const handleCancel = () => {
    if (currentUser?.username) {
      navigate(`/profile/${currentUser.username}`);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showError('Full name cannot be blank');
      return;
    }

    setIsSaving(true);
    try {
      const response = await userService.updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl === null ? undefined : avatarUrl,
        bannerUrl: bannerUrl === null ? undefined : bannerUrl,
      });

      if (response.user) {
        onUserUpdated?.(response.user as User);
        showSuccess('Profile updated successfully!', 'Saved');
        // Navigate back to user profile page
        navigate(`/profile/${response.user.username || currentUser?.username || ''}`);
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="w-full pb-8 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Edit Profile
          </h1>
          <p className="text-xs text-slate-400">
            Customize your profile banner, photo, and details showcase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isProcessingAvatar || isProcessingBanner}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <HiOutlineCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visual Showcase Card: Banner & Avatar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Banner Container with file upload button */}
          <div className="h-44 sm:h-56 w-full relative group overflow-hidden bg-slate-900">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Profile Banner"
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] flex items-center justify-center opacity-90" />
            )}

            {/* Banner controls overlay */}
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isProcessingBanner}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/95 text-slate-900 hover:bg-white shadow-lg cursor-pointer transition-transform active:scale-95"
              >
                <HiOutlinePhoto className="w-4 h-4 text-purple-600" />
                <span>{bannerUrl ? 'Change Banner' : 'Upload Banner'}</span>
              </button>

              {bannerUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="p-2 rounded-xl bg-black/60 hover:bg-red-600/90 text-white backdrop-blur-sm cursor-pointer transition-colors"
                  title="Remove custom banner"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Hidden file input for Banner */}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerFileChange}
              className="hidden"
            />

            {/* Badge Indicator in top right */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-black/40 text-white backdrop-blur-md border border-white/20">
                <HiOutlineSparkles className="w-3 h-3 text-purple-300" />
                Profile Banner
              </span>
            </div>

            {isProcessingBanner && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-xs font-semibold">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing banner image...
              </div>
            )}
          </div>

          {/* Profile Avatar section overlapping banner */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              {/* Avatar circle */}
              <div className="relative group/avatar">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-white shadow-xl">
                  <div className="w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-[#00b4d8] via-[#7928ca] to-[#ff0080]">
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                          {userInitials}
                        </span>
                      )}

                      {/* Avatar hover overlay */}
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isProcessingAvatar}
                        className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                        title="Upload avatar image"
                      >
                        <HiOutlineCamera className="w-6 h-6 mb-0.5 text-white" />
                        <span className="text-[10px] font-bold">Change</span>
                      </button>

                      {isProcessingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hidden file input for Avatar */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                {/* Upload Action Pill */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 sm:right-1 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-md border-2 border-white cursor-pointer transition-transform active:scale-95"
                  title="Choose profile photo"
                >
                  <HiOutlineCamera className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar button controls on the right */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer transition-colors"
                >
                  <HiOutlineCamera className="w-4 h-4 text-purple-600" />
                  <span>Upload Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors cursor-pointer"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              Tip: Upload a square photo for the best avatar result and a widescreen photo for your profile banner.
            </p>
          </div>
        </div>

        {/* Form Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <HiOutlineUser className="w-4 h-4 text-purple-600" />
              <span>Personal Details</span>
            </h3>
            <p className="text-xs text-slate-400">
              Information showcased on your public Echolet profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                maxLength={60}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                  @
                </span>
                <input
                  type="text"
                  value={currentUser?.username || ''}
                  disabled
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Username is fixed to your unique handle.</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bio
              </label>
              <span
                className={`text-[11px] font-semibold ${
                  bio.length > 220 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {bio.length} / 250
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the Echolet community about yourself, your interests, or what you build..."
              maxLength={250}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-none leading-relaxed"
            />
          </div>

          {currentUser?.email && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Account Email</span>
              <span className="font-semibold text-slate-700">{currentUser.email}</span>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isProcessingAvatar || isProcessingBanner}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <HiOutlineCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
