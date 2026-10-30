import React, { useState } from 'react';
import {
  HiOutlineDocumentText,
  HiOutlineArrowDownTray,
  HiOutlineEye,
} from 'react-icons/hi2';
import MediaViewerModal from './MediaViewerModal';

interface ChatMediaAttachmentProps {
  type?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | string | null;
  authorName?: string;
}

const formatFileSize = (bytes?: number | string | null): string => {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (!num || num <= 0 || isNaN(num)) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export const ChatMediaAttachment: React.FC<ChatMediaAttachmentProps> = ({
  type,
  mediaUrl,
  fileName,
  fileSize,
  authorName,
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!mediaUrl) return null;

  const isVideo =
    type === 'video' ||
    mediaUrl.startsWith('data:video/') ||
    /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(mediaUrl);

  const isDoc =
    type === 'document' ||
    mediaUrl.startsWith('data:application/') ||
    mediaUrl.startsWith('data:text/') ||
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|tar|txt|csv)(\?.*)?$/i.test(fileName || mediaUrl);

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden max-w-sm sm:max-w-md bg-black/40 border border-white/10 shadow-sm">
        <video
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-72 object-contain bg-black"
        >
          Your browser does not support the video tag.
        </video>
        {fileName && (
          <div className="px-3 py-1.5 text-xs text-text-muted truncate bg-surface-raised/40 border-t border-white/5">
            {fileName} {fileSize ? `(${formatFileSize(fileSize)})` : ''}
          </div>
        )}
      </div>
    );
  }

  if (isDoc) {
    const handleDownload = (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = fileName || 'document';
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
    };

    return (
      <div className="mt-2 flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-raised/70 hover:bg-surface-raised border border-border/80 transition-colors max-w-xs sm:max-w-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-primary truncate" title={fileName || 'Document'}>
              {fileName || 'Document'}
            </div>
            {fileSize && (
              <div className="text-[11px] text-text-muted">
                {formatFileSize(fileSize)}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="p-2 text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors shrink-0"
          title="Download file"
        >
          <HiOutlineArrowDownTray className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Otherwise assume image
  return (
    <>
      <div className="mt-2 relative group cursor-pointer overflow-hidden rounded-xl border border-border/60 max-w-sm sm:max-w-md shadow-sm">
        <img
          src={mediaUrl}
          alt={fileName || 'Shared media'}
          loading="lazy"
          onClick={() => setIsViewerOpen(true)}
          className="w-full max-h-72 object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div
          onClick={() => setIsViewerOpen(true)}
          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
        >
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium">
            <HiOutlineEye className="w-4 h-4" />
            <span>View</span>
          </div>
        </div>
      </div>

      <MediaViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={[mediaUrl]}
        authorName={authorName}
      />
    </>
  );
};

export default ChatMediaAttachment;
