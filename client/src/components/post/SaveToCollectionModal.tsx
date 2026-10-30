import React, { useState } from 'react';
import {
  HiOutlineBookmark,
  HiOutlineFolder,
  HiOutlineFolderPlus,
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import Modal from '../common/Modal';
import type { BookmarkCollection } from '../../services/collectionService';

export interface SaveToCollectionModalProps {
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
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState('');

  const handlePick = async (colName: string) => {
    setSelected(colName);
    setLoadingTarget(colName);
    try {
      await onSelectCollection(colName);
      onClose();
    } catch {
      setLoadingTarget(null);
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
    setLoadingTarget('__new__');
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
      setLoadingTarget(null);
    }
  };

  if (!isOpen) return null;

  const isLoading = Boolean(loadingTarget);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      backdropVariant="blur"
      icon={<HiOutlineBookmark className="w-5 h-5 text-indigo-600 stroke-[2.2]" />}
      iconClassName="bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-xs"
      title={
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Save to Folder</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            Saved
          </span>
        </div>
      }
      description={
        itemTitle ? (
          <span className="truncate block max-w-[240px] sm:max-w-[280px]">
            Organize: "{itemTitle}"
          </span>
        ) : (
          'Choose a folder to organize your saved item'
        )
      }
      showCloseButton={!isLoading}
      closeButtonPosition="inside"
    >
      <div className="select-none space-y-3.5">
        {createError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <HiOutlineExclamationCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        {/* Collections Scrollable List */}
        <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
          {/* General / Default Option */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handlePick('Default')}
            className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left group ${
              selected === 'Default' || !selected
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selected === 'Default' || !selected
                    ? 'bg-white/15 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                <HiOutlineBookmark className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold leading-tight truncate">
                  All Saved
                </p>
                <p
                  className={`text-[11px] leading-tight mt-0.5 ${
                    selected === 'Default' || !selected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  Default general folder
                </p>
              </div>
            </div>

            <div className="shrink-0 ml-2">
              {loadingTarget === 'Default' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : selected === 'Default' || !selected ? (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <HiOutlineCheck className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              ) : null}
            </div>
          </button>

          {/* User Custom Collections */}
          {collections.map((col) => {
            const isCurrent = selected === col.name;
            const isItemLoading = loadingTarget === col.name;

            return (
              <button
                key={col.id}
                type="button"
                disabled={isLoading}
                onClick={() => handlePick(col.name)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left group ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
                    style={{ backgroundColor: col.color || '#6366f1' }}
                  >
                    <HiOutlineFolder className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold leading-tight truncate">
                      {col.name}
                    </p>
                    <p
                      className={`text-[11px] leading-tight mt-0.5 ${
                        isCurrent ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {col.totalCount} {col.totalCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isItemLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <HiOutlineCheck className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline Create Folder Section */}
        {isCreatingInline ? (
          <form
            onSubmit={handleCreateSubmit}
            className="pt-3 border-t border-slate-100 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                New Folder Name
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingInline(false);
                  setNewFolderName('');
                  setCreateError('');
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                maxLength={60}
                autoFocus
                required
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !newFolderName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
              >
                {loadingTarget === '__new__' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlinePlus className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Save</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsCreatingInline(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition-colors cursor-pointer border border-dashed border-indigo-200 hover:border-indigo-300 w-full justify-center"
            >
              <HiOutlineFolderPlus className="w-4 h-4 stroke-[2.2]" />
              <span>Create New Folder</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
