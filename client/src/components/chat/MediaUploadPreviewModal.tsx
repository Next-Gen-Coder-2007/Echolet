import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiXMark,
  HiPaperAirplane,
  HiOutlineFaceSmile,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
  HiOutlineCheck,
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
  onSend: (caption: string, editedDataUrl?: string) => Promise<void> | void;
  isSending?: boolean;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '👍', '✨', '🎉', '😍', '🙌'];

const PALETTE = [
  '#FFFFFF',
  '#000000',
  '#EF4444',
  '#F97316',
  '#FBBF24',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

const BRUSH_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 7 },
  { label: 'Thick', size: 14 },
  { label: 'Bold', size: 24 },
];

interface PaintPoint {
  x: number;
  y: number;
}

interface PaintStroke {
  points: PaintPoint[];
  color: string;
  size: number;
  isEraser: boolean;
}

// Custom SVGs for editing tools
const CropIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
);

const PaintIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18.37 2.63 3 3a1 1 0 0 1 0 1.41l-9.9 9.9a2 2 0 0 1-.88.51l-4.22 1.05a1 1 0 0 1-1.22-1.22l1.05-4.22a2 2 0 0 1 .51-.88l9.9-9.9a1 1 0 0 1 1.41 0z" />
    <path d="M14 6l4 4" />
    <path d="M4 22a8 8 0 0 1 7-4.5" />
  </svg>
);

const RotateIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
);

const UndoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
);

const ResetIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const EraserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

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
  const [activeMode, setActiveMode] = useState<'preview' | 'crop' | 'paint'>('preview');

  // Working image dataUrl
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(previewUrl);
  const [editHistory, setEditHistory] = useState<string[]>([]);

  // Crop state (percentages of displayed image)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [cropRatio, setCropRatio] = useState<'free' | '1:1' | '4:5' | '16:9'>('free');
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    isDragging: boolean;
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startCrop: { x: number; y: number; width: number; height: number };
  }>({
    isDragging: false,
    dragType: 'move',
    startX: 0,
    startY: 0,
    startCrop: { x: 10, y: 10, width: 80, height: 80 },
  });

  // Paint state
  const [brushColor, setBrushColor] = useState<string>('#EF4444');
  const [brushSize, setBrushSize] = useState<number>(7);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [paintStrokes, setPaintStrokes] = useState<PaintStroke[]>([]);
  const [isPainting, setIsPainting] = useState<boolean>(false);

  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setCaption('');
      setShowEmojiPicker(false);
      setActiveMode('preview');
      setCurrentImageUrl(previewUrl);
      setEditHistory([]);
      setPaintStrokes([]);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
      setCropRatio('free');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, previewUrl]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else if (activeMode !== 'preview') {
          setActiveMode('preview');
        } else if (!isSending) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showEmojiPicker, activeMode, isSending, onClose]);

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

  // Redraw paint strokes on canvas whenever paintStrokes change or activeMode is 'paint'
  const redrawPaintCanvas = useCallback(() => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paintStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      const first = stroke.points[0];
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [paintStrokes]);

  useEffect(() => {
    if (activeMode === 'paint') {
      redrawPaintCanvas();
    }
  }, [activeMode, redrawPaintCanvas]);

  if (!isOpen || !previewUrl) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;
    const finalDataUrl = currentImageUrl !== previewUrl ? currentImageUrl : undefined;
    onSend(caption.trim(), finalDataUrl);
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

  // ==================== CROP ACTIONS ====================
  const handleStartCrop = () => {
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setCropRatio('free');
    setActiveMode('crop');
  };

  const handleSetRatio = (ratio: 'free' | '1:1' | '4:5' | '16:9') => {
    setCropRatio(ratio);
    if (ratio === 'free') return;

    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    if (ratio === '4:5') targetRatio = 4 / 5;
    if (ratio === '16:9') targetRatio = 16 / 9;

    setCropBox((prev) => {
      let w = prev.width;
      let h = w / targetRatio;
      if (prev.y + h > 100) {
        h = 100 - prev.y;
        w = h * targetRatio;
      }
      if (prev.x + w > 100) {
        w = 100 - prev.x;
        h = w / targetRatio;
      }
      return { ...prev, width: Math.max(20, w), height: Math.max(20, h) };
    });
  };

  const handleApplyCrop = () => {
    const img = imageElementRef.current;
    if (!img) return;

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    const cropPixelX = (cropBox.x / 100) * naturalWidth;
    const cropPixelY = (cropBox.y / 100) * naturalHeight;
    const cropPixelW = (cropBox.width / 100) * naturalWidth;
    const cropPixelH = (cropBox.height / 100) * naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropPixelW));
    canvas.height = Math.max(1, Math.round(cropPixelH));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropPixelX,
      cropPixelY,
      cropPixelW,
      cropPixelH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL(file?.type || 'image/jpeg', 0.95);
    setEditHistory((prev) => [...prev, currentImageUrl]);
    setCurrentImageUrl(croppedDataUrl);
    setActiveMode('preview');
  };

  const handleRotateImage = () => {
    const img = imageElementRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight || img.height;
    canvas.height = img.naturalWidth || img.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(
      img,
      -(img.naturalWidth || img.width) / 2,
      -(img.naturalHeight || img.height) / 2
    );

    const rotatedDataUrl = canvas.toDataURL(file?.type || 'image/jpeg', 0.95);
    setEditHistory((prev) => [...prev, currentImageUrl]);
    setCurrentImageUrl(rotatedDataUrl);
  };

  // Crop Dragging handlers
  const handleCropMouseDown = (
    e: React.MouseEvent,
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    cropDragRef.current = {
      isDragging: true,
      dragType,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!cropDragRef.current.isDragging || !cropContainerRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaX = ((moveEvent.clientX - cropDragRef.current.startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - cropDragRef.current.startY) / rect.height) * 100;
      const { startCrop, dragType: dt } = cropDragRef.current;

      let nextX = startCrop.x;
      let nextY = startCrop.y;
      let nextW = startCrop.width;
      let nextH = startCrop.height;

      if (dt === 'move') {
        nextX = Math.min(Math.max(0, startCrop.x + deltaX), 100 - startCrop.width);
        nextY = Math.min(Math.max(0, startCrop.y + deltaY), 100 - startCrop.height);
      } else {
        if (dt.includes('w')) {
          const maxLeft = startCrop.x + startCrop.width - 15;
          nextX = Math.min(Math.max(0, startCrop.x + deltaX), maxLeft);
          nextW = startCrop.width - (nextX - startCrop.x);
        }
        if (dt.includes('e')) {
          nextW = Math.min(Math.max(15, startCrop.width + deltaX), 100 - startCrop.x);
        }
        if (dt.includes('n')) {
          const maxTop = startCrop.y + startCrop.height - 15;
          nextY = Math.min(Math.max(0, startCrop.y + deltaY), maxTop);
          nextH = startCrop.height - (nextY - startCrop.y);
        }
        if (dt.includes('s')) {
          nextH = Math.min(Math.max(15, startCrop.height + deltaY), 100 - startCrop.y);
        }
      }

      setCropBox({
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
        width: Math.round(nextW * 10) / 10,
        height: Math.round(nextH * 10) / 10,
      });
    };

    const handleMouseUp = () => {
      cropDragRef.current.isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ==================== PAINT ACTIONS ====================
  const handleStartPaint = () => {
    setActiveMode('paint');
    setPaintStrokes([]);
    setIsEraser(false);
    if (imageElementRef.current && paintCanvasRef.current) {
      const img = imageElementRef.current;
      paintCanvasRef.current.width = img.clientWidth || img.width;
      paintCanvasRef.current.height = img.clientHeight || img.height;
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePaintMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeMode !== 'paint') return;
    const coords = getCanvasCoords(e);
    setIsPainting(true);
    setPaintStrokes((prev) => [
      ...prev,
      {
        points: [coords],
        color: brushColor,
        size: brushSize,
        isEraser,
      },
    ]);
  };

  const handlePaintMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPainting || activeMode !== 'paint') return;
    const coords = getCanvasCoords(e);
    setPaintStrokes((prev) => {
      if (prev.length === 0) return prev;
      const lastIndex = prev.length - 1;
      const lastStroke = prev[lastIndex];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, coords],
      };
      const updated = [...prev];
      updated[lastIndex] = updatedStroke;
      return updated;
    });
  };

  const handlePaintMouseUp = () => {
    setIsPainting(false);
  };

  const handleUndoPaint = () => {
    setPaintStrokes((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClearPaint = () => {
    setPaintStrokes([]);
  };

  const handleApplyPaint = () => {
    const img = imageElementRef.current;
    const paintCanvas = paintCanvasRef.current;
    if (!img || !paintCanvas) return;

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = naturalWidth;
    exportCanvas.height = naturalHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

    // 2. Scale and draw paint strokes
    const scaleX = naturalWidth / paintCanvas.width;
    const scaleY = naturalHeight / paintCanvas.height;

    paintStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size * scaleX;

      if (stroke.isEraser) {
        // Redraw image under stroke area to simulate eraser
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      const first = stroke.points[0];
      ctx.moveTo(first.x * scaleX, first.y * scaleY);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
      }
      ctx.stroke();
      ctx.restore();
    });

    const paintedDataUrl = exportCanvas.toDataURL(file?.type || 'image/jpeg', 0.95);
    setEditHistory((prev) => [...prev, currentImageUrl]);
    setCurrentImageUrl(paintedDataUrl);
    setPaintStrokes([]);
    setActiveMode('preview');
  };

  const handleUndoEdit = () => {
    if (editHistory.length === 0) return;
    const previous = editHistory[editHistory.length - 1];
    setCurrentImageUrl(previous);
    setEditHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleResetToOriginal = () => {
    setCurrentImageUrl(previewUrl);
    setEditHistory([]);
    setPaintStrokes([]);
    setActiveMode('preview');
  };

  const isModified = currentImageUrl !== previewUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Modal Card - Pure White Theme */}
      <div className="w-full max-w-2xl max-h-[94vh] flex flex-col bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            {recipientAvatar ? (
              <img
                src={recipientAvatar}
                alt={recipientName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                {recipientName ? recipientName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
                  {mediaType === 'image' ? 'Send Photo' : 'Send Video'}
                </span>
                <span className="text-slate-300 text-xs">•</span>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {isGroup ? `#${recipientName}` : recipientName}
                </span>
              </div>
              {file && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {file.name} {file.size ? `(${formatFileSize(file.size)})` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {editHistory.length > 0 && activeMode === 'preview' && (
              <button
                type="button"
                onClick={handleUndoEdit}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all flex items-center gap-1 cursor-pointer"
                title="Undo last photo edit"
              >
                <UndoIcon className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}

            {isModified && activeMode === 'preview' && (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1 cursor-pointer"
                title="Revert all modifications to original photo"
              >
                <ResetIcon className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
              title="Discard and close"
            >
              <HiXMark className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Studio Tool Bar for Images */}
        {mediaType === 'image' && (
          <div className="px-4 py-2 bg-white border-b border-slate-100 text-xs shrink-0 select-none">
            {activeMode === 'preview' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartCrop}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200/80 font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Crop or rotate photo"
                >
                  <CropIcon className="w-4 h-4 text-purple-600" />
                  <span>Crop & Rotate</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartPaint}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200/80 font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Draw, paint, or doodle on photo"
                >
                  <PaintIcon className="w-4 h-4 text-pink-600" />
                  <span>Paint & Doodle</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotateImage}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                  title="Rotate 90° Clockwise"
                >
                  <RotateIcon className="w-4 h-4" />
                </button>
              </div>
            ) : activeMode === 'crop' ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Ratio:</span>
                  {(['free', '1:1', '4:5', '16:9'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSetRatio(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        cropRatio === r
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    className="p-1.5 ml-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-all cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveMode('preview')}
                    className="px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="px-3.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <HiOutlineCheck className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Apply Crop</span>
                  </button>
                </div>
              </div>
            ) : (
              // activeMode === 'paint' (Studio-grade 2-tier layout without horizontal overflow or hidden scroll)
              <div className="w-full flex flex-col gap-2 py-0.5">
                {/* Row 1: Tool Selection, Brush Size, Undo/Clear & Actions */}
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Brush & Eraser Toggle */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setIsEraser(false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          !isEraser
                            ? 'bg-white text-purple-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Draw with brush"
                      >
                        <PaintIcon className="w-3.5 h-3.5 text-pink-600" />
                        <span>Brush</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEraser(true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isEraser
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Eraser tool"
                      >
                        <EraserIcon className="w-3.5 h-3.5" />
                        <span>Eraser</span>
                      </button>
                    </div>

                    {/* Brush Size Selector */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                      {BRUSH_SIZES.map((b) => (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => setBrushSize(b.size)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            brushSize === b.size
                              ? 'bg-purple-600 text-white shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title={`${b.label} brush size (${b.size}px)`}
                        >
                          <span
                            className="rounded-full bg-current inline-block"
                            style={{
                              width: `${Math.min(8, Math.max(3, b.size / 3))}px`,
                              height: `${Math.min(8, Math.max(3, b.size / 3))}px`,
                            }}
                          />
                          <span>{b.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Undo Stroke */}
                    <button
                      type="button"
                      onClick={handleUndoPaint}
                      disabled={paintStrokes.length === 0}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 disabled:opacity-30 transition-all cursor-pointer"
                      title="Undo stroke"
                    >
                      <UndoIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Clear Canvas */}
                    <button
                      type="button"
                      onClick={handleClearPaint}
                      disabled={paintStrokes.length === 0}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-semibold disabled:opacity-30 transition-all cursor-pointer"
                      title="Clear all doodles"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Cancel & Apply Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setPaintStrokes([]);
                        setActiveMode('preview');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPaint}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                    >
                      <HiOutlineCheck className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Apply Paint</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Studio Color Palette & Live Brush Preview */}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-2xs min-h-[46px]">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {PALETTE.map((c) => {
                      const isSelected = !isEraser && brushColor === c;
                      const isWhite = c.toUpperCase() === '#FFFFFF';
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setBrushColor(c);
                            setIsEraser(false);
                          }}
                          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-purple-600 ring-offset-2 ring-offset-white shadow-xs'
                              : 'hover:scale-110 active:scale-95'
                          }`}
                          title={`Color: ${c}`}
                        >
                          <span
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform ${
                              isWhite ? 'border border-slate-300' : 'shadow-2xs'
                            }`}
                          >
                            {isSelected && (
                              <span
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                  isWhite ? 'bg-slate-900' : 'bg-white shadow-xs'
                                }`}
                              />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Brush Stroke Preview Indicator */}
                  <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-3">
                    <span className="text-[10px] font-semibold text-slate-400 select-none hidden sm:inline">
                      {isEraser ? 'Eraser' : 'Size'}:
                    </span>
                    <div
                      className="rounded-full shadow-inner border border-slate-300 flex items-center justify-center transition-all bg-white"
                      style={{
                        width: '24px',
                        height: '24px',
                      }}
                      title={`Active: ${isEraser ? 'Eraser' : brushColor} (${brushSize}px)`}
                    >
                      <span
                        className="rounded-full transition-all"
                        style={{
                          backgroundColor: isEraser ? '#F43F5E' : brushColor,
                          width: `${Math.min(18, Math.max(4, brushSize / 1.4))}px`,
                          height: `${Math.min(18, Math.max(4, brushSize / 1.4))}px`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center Preview Area - Clean White Stage */}
        <div className="flex-1 min-h-[250px] max-h-[52vh] flex items-center justify-center p-4 bg-white border-y border-slate-100 overflow-hidden relative select-none">
          {mediaType === 'image' ? (
            <div
              ref={cropContainerRef}
              className="relative max-h-full max-w-full flex items-center justify-center select-none"
            >
              <img
                ref={imageElementRef}
                src={currentImageUrl}
                alt="Upload preview"
                className="max-h-[48vh] max-w-full rounded-2xl object-contain shadow-lg ring-1 ring-slate-900/10 pointer-events-none bg-white"
              />

              {/* Crop Overlay Canvas */}
              {activeMode === 'crop' && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  {/* Dim surrounding mask */}
                  <div
                    className="absolute border-2 border-purple-500 pointer-events-auto cursor-move shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                  >
                    {/* Rule of Thirds Grid Lines */}
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div />
                    </div>

                    {/* Corner Handles */}
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nwse-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nesw-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nesw-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nwse-resize shadow-md"
                    />

                    {/* Edge Handles */}
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'n')}
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white rounded-full cursor-ns-resize shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 's')}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white rounded-full cursor-ns-resize shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'w')}
                      className="absolute -left-1 top-1/2 -translate-y-1/2 h-6 w-2 bg-white rounded-full cursor-ew-resize shadow-xs"
                    />
                    <div
                      onMouseDown={(e) => handleCropMouseDown(e, 'e')}
                      className="absolute -right-1 top-1/2 -translate-y-1/2 h-6 w-2 bg-white rounded-full cursor-ew-resize shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Paint Overlay Canvas */}
              {activeMode === 'paint' && (
                <>
                  <canvas
                    ref={paintCanvasRef}
                    width={imageElementRef.current?.clientWidth || 500}
                    height={imageElementRef.current?.clientHeight || 400}
                    onMouseDown={handlePaintMouseDown}
                    onMouseMove={handlePaintMouseMove}
                    onMouseUp={handlePaintMouseUp}
                    onTouchStart={handlePaintMouseDown}
                    onTouchMove={handlePaintMouseMove}
                    onTouchEnd={handlePaintMouseUp}
                    className="absolute inset-0 w-full h-full cursor-crosshair rounded-2xl touch-none z-10"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-700 text-[10px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-2xs pointer-events-none z-20">
                    <PaintIcon className="w-3.5 h-3.5 text-pink-600" />
                    <span>Draw or doodle on photo</span>
                  </div>
                </>
              )}

              {activeMode === 'preview' && (
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-slate-200/80 shadow-xs pointer-events-none">
                  <HiOutlinePhoto className="w-3.5 h-3.5 text-purple-600" />
                  <span>Image</span>
                  {isModified && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded-md">
                      Edited
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[48vh] max-w-full rounded-2xl shadow-xl ring-1 ring-slate-900/10 bg-black"
              />
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-slate-200/80 shadow-xs">
                <HiOutlineVideoCamera className="w-3.5 h-3.5 text-purple-600" />
                <span>Video</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Reactions Bar */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-white border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Quick emojis:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base p-1.5 hover:bg-slate-100 rounded-xl transition-transform active:scale-90 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Caption Input & Actions Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-white flex flex-col gap-3 relative shrink-0 border-t border-slate-100">
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
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
              className={`p-2.5 rounded-2xl transition-colors cursor-pointer shrink-0 border ${
                showEmojiPicker
                  ? 'bg-purple-50 text-purple-600 border-purple-300'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-slate-200 bg-slate-50'
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
                placeholder="Add a caption / message to this media..."
                maxLength={500}
                disabled={isSending}
                className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {caption.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                  {caption.length}/500
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
