import React, { useState } from 'react';
import {
  HiOutlineXMark,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineBookmark,
} from 'react-icons/hi2';
import Modal from './Modal';
import type { BookmarkCollection } from '../services/collectionService';

interface SaveToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: BookmarkCollection[];
  currentCollection?: string | null;
  onSelectCollection: (collectionName: string) => Promise<void>;
  onCreateCollectionInline?: (name: string) => Promise<void>;
  itemTitle?: string;
}

export default function SaveToCollectionModal({
  isOpen,
  onClose,
  collections,
  currentCollection,
  onSelectCollection,
  onCreateCollectionInline,
  itemTitle,
}: SaveToCollectionModalProps) {
  const [selected, setSelected] = useState<string>(currentCollection || 'Default');
  const [loading, setLoading] = useState(false);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState('');

  const handlePick = async (colName: string) => {
    setSelected(colName);
    setLoading(true);
    try {
      await onSelectCollection(colName);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;
    if (cleanName.toLowerCase() === 'all' || cleanName.toLowerCase() === 'default') {
      setCreateError('That name is reserved');
      return;
    }

    setCreateError('');
    setLoading(true);
    try {
      if (onCreateCollectionInline) {
        await onCreateCollectionInline(cleanName);
      } else {
        await onSelectCollection(cleanName);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create folder';
      setCreateError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="p-5 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <HiOutlineBookmark className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Save to Folder
              </h2>
              {itemTitle && (
                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
                  {itemTitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Collections List */}
        <div className="mt-3.5 space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {/* General / Default Option */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handlePick('Default')}
            className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
              selected === 'Default' || !selected
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80'
            }`}
          >
            <div>
              <p className="text-xs font-bold leading-tight">All Saved / General</p>
              <p
                className={`text-[10px] leading-tight ${
                  selected === 'Default' || !selected ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                Default folder
              </p>
            </div>
            {(selected === 'Default' || !selected) && (
              <HiOutlineCheck className="w-4 h-4 text-white stroke-[2.5]" />
            )}
          </button>

          {/* User Custom Collections */}
          {collections.map((col) => {
            const isCurrent = selected === col.name;
            return (
              <button
                key={col.id}
                type="button"
                disabled={loading}
                onClick={() => handlePick(col.name)}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  {col.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  <div>
                    <p className="text-xs font-bold leading-tight truncate max-w-[190px]">
                      {col.name}
                    </p>
                    <p
                      className={`text-[10px] leading-tight ${
                        isCurrent ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {col.totalCount} {col.totalCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                {isCurrent && <HiOutlineCheck className="w-4 h-4 text-white stroke-[2.5]" />}
              </button>
            );
          })}
        </div>

        {/* Inline Create Folder Form */}
        {isCreatingInline ? (
          <form onSubmit={handleCreateSubmit} className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
            {createError && (
              <p className="text-[11px] font-semibold text-rose-600">{createError}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                maxLength={60}
                autoFocus
                required
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-medium"
              />
              <button
                type="submit"
                disabled={loading || !newFolderName.trim()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingInline(false);
                  setNewFolderName('');
                  setCreateError('');
                }}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Footer Actions */
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsCreatingInline(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <HiOutlinePlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Folder</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
