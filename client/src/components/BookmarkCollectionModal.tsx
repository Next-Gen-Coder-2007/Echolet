import React, { useState } from 'react';
import {
  HiOutlineXMark,
  HiOutlineFolderPlus,
  HiOutlineTrash,
  HiOutlineCheck,
} from 'react-icons/hi2';
import Modal from './Modal';
import type { BookmarkCollection } from '../services/collectionService';

interface BookmarkCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionToEdit?: BookmarkCollection | null;
  onSave: (data: { name: string; icon: string; color: string }) => Promise<void>;
  onDelete?: (id: string, action: 'move_to_default' | 'delete_bookmarks') => Promise<void>;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
  { name: 'Purple', value: '#8b5cf6', bg: 'bg-purple-500' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
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
    <div className="p-5 sm:p-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {collectionToEdit ? 'Edit Folder' : 'New Folder'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize your saved echoes & reels into clean folders
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {!showDeleteConfirm ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Folder Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design, Inspiration, Tech..."
              maxLength={60}
              autoFocus
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Color Tag
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    c.bg
                  } ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                      : 'hover:scale-105'
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

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {collectionToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span>Delete Folder</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <HiOutlineFolderPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : collectionToEdit ? 'Save Changes' : 'Create Folder'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Delete Confirmation Step */
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <h3 className="text-sm font-bold text-amber-900 mb-1">
              Delete "{collectionToEdit?.name}" folder?
            </h3>
            <p className="text-xs text-amber-800">
              What should happen to the items saved inside this folder?
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  value="move_to_default"
                  checked={deleteAction === 'move_to_default'}
                  onChange={() => setDeleteAction('move_to_default')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold">Keep items in Saved</span>
                  <p className="text-[11px] text-slate-500">
                    Items will remain in your general Saved list.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  value="delete_bookmarks"
                  checked={deleteAction === 'delete_bookmarks'}
                  onChange={() => setDeleteAction('delete_bookmarks')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-rose-700">Remove bookmarks entirely</span>
                  <p className="text-[11px] text-slate-500">
                    Un-bookmark all posts and reels saved in this folder.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false}>
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
