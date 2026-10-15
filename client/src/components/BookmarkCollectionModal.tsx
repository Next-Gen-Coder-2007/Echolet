import React, { useState } from 'react';
import {
  HiOutlineFolderPlus,
  HiOutlineFolder,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import Modal from './Modal';
import type { BookmarkCollection } from '../services/collectionService';

export interface BookmarkCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionToEdit?: BookmarkCollection | null;
  onSave: (data: { name: string; icon: string; color: string }) => Promise<void>;
  onDelete?: (id: string, action: 'move_to_default' | 'delete_bookmarks') => Promise<void>;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Purple', value: '#8b5cf6', bg: 'bg-purple-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Slate', value: '#475569', bg: 'bg-slate-600' },
];

function BookmarkCollectionContent({
  collectionToEdit,
  onClose,
  onSave,
  onDelete,
}: {
  collectionToEdit?: BookmarkCollection | null;
  onClose: () => void;
  onSave: (data: { name: string; icon: string; color: string }) => Promise<void>;
  onDelete?: (id: string, action: 'move_to_default' | 'delete_bookmarks') => Promise<void>;
}) {
  const isEditing = Boolean(collectionToEdit);
  const [name, setName] = useState(collectionToEdit?.name || '');
  const [color, setColor] = useState(collectionToEdit?.color || '#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'move_to_default' | 'delete_bookmarks'>(
    'move_to_default'
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a folder name');
      return;
    }
    if (cleanName.toLowerCase() === 'all' || cleanName.toLowerCase() === 'default') {
      setError('That name is reserved. Please pick another name.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSave({ name: cleanName, icon: '', color });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save folder';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!collectionToEdit || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(collectionToEdit.id, deleteAction);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete folder';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="select-none space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <HiOutlineExclamationCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!showDeleteConfirm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-3.5 transition-all">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 transition-colors duration-200"
              style={{ backgroundColor: color }}
            >
              <HiOutlineFolder className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {name.trim() || 'Folder Name'}
                </p>
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: color }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {collectionToEdit
                  ? `${collectionToEdit.totalCount || 0} saved items`
                  : '0 saved items'}
                {' '}• Visual Preview
              </p>
            </div>
          </div>

          {/* Folder Name Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Folder Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {name.length}/60
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design, Inspiration, Tech..."
              maxLength={60}
              autoFocus
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">
              Color Tag Accent
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                    c.bg
                  } ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                      : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  title={c.name}
                >
                  {color === c.value && (
                    <HiOutlineCheck className="w-4 h-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4 stroke-[2]" />
                <span>Delete Folder</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-black text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <HiOutlineFolderPlus className="w-4 h-4 stroke-[2]" />
                    <span>{isEditing ? 'Save Changes' : 'Create Folder'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Delete Confirmation View */
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-amber-950">
                Delete "{collectionToEdit?.name}" folder?
              </h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed pl-9.5">
              What should happen to the items currently saved inside this folder?
            </p>

            <div className="mt-4 space-y-2.5">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  deleteAction === 'move_to_default'
                    ? 'bg-white border-amber-400 shadow-2xs'
                    : 'bg-amber-100/40 border-amber-200/70 hover:bg-amber-100/70'
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  value="move_to_default"
                  checked={deleteAction === 'move_to_default'}
                  onChange={() => setDeleteAction('move_to_default')}
                  className="mt-0.5 accent-amber-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Keep items in Saved (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Items will be moved to your general "All Saved" collection.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  deleteAction === 'delete_bookmarks'
                    ? 'bg-white border-rose-400 shadow-2xs'
                    : 'bg-rose-50/50 border-rose-200/70 hover:bg-rose-50/80'
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  value="delete_bookmarks"
                  checked={deleteAction === 'delete_bookmarks'}
                  onChange={() => setDeleteAction('delete_bookmarks')}
                  className="mt-0.5 accent-rose-600"
                />
                <div>
                  <span className="text-xs font-bold text-rose-700 block">
                    Remove bookmarks entirely
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Un-bookmark and remove all posts and reels saved in this folder.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <HiOutlineArrowLeft className="w-4 h-4 stroke-[2]" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <HiOutlineTrash className="w-4 h-4 stroke-[2]" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookmarkCollectionModal({
  isOpen,
  onClose,
  collectionToEdit,
  onSave,
  onDelete,
}: BookmarkCollectionModalProps) {
  if (!isOpen) return null;

  const isEditing = Boolean(collectionToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdropVariant="blur"
      icon={
        isEditing ? (
          <HiOutlineFolder className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
        ) : (
          <HiOutlineFolderPlus className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
        )
      }
      iconClassName="bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-xs"
      title={
        <div className="flex items-center gap-2">
          <span>{isEditing ? 'Edit Folder' : 'New Folder'}</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {isEditing ? 'Settings' : 'Collection'}
          </span>
        </div>
      }
      description={
        isEditing
          ? `Update properties or remove "${collectionToEdit?.name}"`
          : 'Organize your saved echoes & reels into clean folders'
      }
      showCloseButton={true}
      closeButtonPosition="inside"
    >
      <BookmarkCollectionContent
        key={`${collectionToEdit?.id || 'new'}-${isOpen}`}
        collectionToEdit={collectionToEdit}
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />
    </Modal>
  );
}
