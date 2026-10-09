import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlassPlus,
  HiOutlineMagnifyingGlassMinus,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiXMark,
} from 'react-icons/hi2';
import Modal, { type BackdropVariant } from './Modal';

export interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  authorName?: string;
  backdropVariant?: BackdropVariant;
  customBackdropClassName?: string;
}

export default function MediaViewerModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  authorName,
  backdropVariant = 'glass',
  customBackdropClassName,
}: MediaViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
    setZoomLevel(1);
  }, [initialIndex, images]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === '+' || e.key === '=') setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)));
      else if (e.key === '-') setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      else if (e.key === '0') setZoomLevel(1);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleNext, handlePrev]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `echolet-media-${Date.now()}.jpg`;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  const authorInitial = authorName?.[0] || 'U';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      backdropVariant={backdropVariant}
      backdropClassName={customBackdropClassName || 'bg-black/90 backdrop-blur-2xl'}
      showCloseButton={false}
      preventScroll={true}
    >
      <div
        className="fixed inset-0 w-screen h-screen flex flex-col justify-between overflow-hidden select-none pointer-events-auto"
        onClick={onClose}
      >
        <header
          onClick={(e) => e.stopPropagation()}
          className="fixed top-0 inset-x-0 h-16 sm:h-20 z-50 flex items-center justify-between px-4 sm:px-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-xs text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-md">
              {authorInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight drop-shadow-sm truncate max-w-[160px] sm:max-w-xs">
                  {authorName ? `Photo by ${authorName}` : 'Photo preview'}
                </span>
                {images.length > 1 && (
                  <span className="text-[11px] font-semibold text-white/80 bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full ring-1 ring-white/10">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/60">Press Esc to close</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-xl px-2 sm:px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <HiOutlineMagnifyingGlassPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <HiOutlineMagnifyingGlassMinus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1 text-purple-300 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer text-xs font-semibold flex items-center gap-1"
                title="Reset Zoom (0)"
              >
                <HiOutlineArrowPath className="w-3.5 h-3.5" />
                <span>{Math.round(zoomLevel * 100)}%</span>
              </button>
            )}

            <div className="w-[1px] h-5 bg-white/15 mx-0.5" />

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
              title="Download Image"
              aria-label="Download image"
            >
              <HiOutlineArrowDownTray className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 bg-white/10 rounded-xl transition-all cursor-pointer ml-1"
              title="Close (Esc)"
              aria-label="Close"
            >
              <HiXMark className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        </header>

        <main
          className="relative flex-1 w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden cursor-zoom-out"
          onClick={onClose}
        >
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 active:scale-95 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-2xl flex items-center justify-center hover:scale-105"
              title="Previous photo (ArrowLeft)"
              aria-label="Previous photo"
            >
              <HiOutlineChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex items-center justify-center max-w-[92vw] max-h-[82vh] transition-transform duration-200 ease-out cursor-default"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={currentImage}
              alt={authorName ? `Photo by ${authorName}` : 'Photo view'}
              className="max-h-[82vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-2xl shadow-2xl select-none ring-1 ring-white/10"
              draggable={false}
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 active:scale-95 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all cursor-pointer shadow-2xl flex items-center justify-center hover:scale-105"
              title="Next photo (ArrowRight)"
              aria-label="Next photo"
            >
              <HiOutlineChevronRight className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}
        </main>

        {images.length > 1 && (
          <footer
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-2xl px-3 py-2 rounded-2xl border border-white/15 shadow-2xl max-w-[90vw] overflow-x-auto"
          >
            {images.map((img, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoomLevel(1);
                  }}
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? 'ring-2 ring-purple-500 scale-105 opacity-100 shadow-md'
                      : 'opacity-40 hover:opacity-80 scale-95 hover:scale-100'
                  }`}
                  title={`View photo ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </footer>
        )}
      </div>
    </Modal>
  );
}
