import React, { useState, useRef, useEffect } from 'react';
import {
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineDocumentText,
  HiOutlineChartBar,
} from 'react-icons/hi2';

interface ChatAttachmentMenuProps {
  onSelectMedia: (file: File, type: 'image' | 'video') => void;
  onSelectDocument: (file: File) => void;
  onOpenPollModal?: () => void;
  showPoll?: boolean;
  disabled?: boolean;
}

export const ChatAttachmentMenu: React.FC<ChatAttachmentMenuProps> = ({
  onSelectMedia,
  onSelectDocument,
  onOpenPollModal,
  showPoll = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    onSelectMedia(file, type);
    e.target.value = '';
    setIsOpen(false);
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSelectDocument(file);
    e.target.value = '';
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-purple-100 text-purple-700'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title="Attach media, document, or poll"
      >
        <HiOutlinePaperClip className="w-5 h-5 rotate-45" />
      </button>

      {/* Hidden file inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/*,text/*"
        className="hidden"
        onChange={handleDocChange}
      />

      {isOpen && (
        <div className="absolute bottom-14 left-0 z-50 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              mediaInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <HiOutlinePhoto className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">Photos & Videos</div>
              <div className="text-[10px] text-slate-400 font-normal">Share media files</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              docInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineDocumentText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">Document</div>
              <div className="text-[10px] text-slate-400 font-normal">PDF, Word, Zip, etc.</div>
            </div>
          </button>

          {showPoll && onOpenPollModal && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPollModal();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition-colors text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <HiOutlineChartBar className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold">Poll</div>
                <div className="text-[10px] text-slate-400 font-normal">Ask a question</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatAttachmentMenu;
