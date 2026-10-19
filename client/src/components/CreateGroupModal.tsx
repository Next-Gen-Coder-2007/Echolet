import React, { useState, useEffect } from 'react';
import {
  HiOutlineUserGroup,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlinePhoto,
} from 'react-icons/hi2';
import Modal from './Modal';
import Avatar from './Avatar';
import userService, { type ConnectedUser } from '../services/userService';
import groupService, { type GroupItem } from '../services/groupService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: GroupItem) => void;
  currentUserId?: string;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo1',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo2',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo3',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo4',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo5',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Echo6',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  currentUserId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ConnectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<ConnectedUser[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [searchResults, setSearchResults] = useState<ConnectedUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ONLY people we follow or our followers
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setAvatarUrl('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setConnections([]);
      setError(null);
      setSubmitting(false);
      return;
    }

    let isMounted = true;
    setLoadingConnections(true);
    userService
      .getConnections()
      .then((users) => {
        if (!isMounted) return;
        const filtered = (users || []).filter((u) => u.id !== currentUserId);
        setConnections(filtered);
        setSearchResults(filtered);
      })
      .catch((err) => {
        console.warn('Failed to load connections for group creation:', err);
        if (isMounted) {
          setConnections([]);
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingConnections(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUserId]);

  // Filter ONLY within followed or followers when searching
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults(connections);
      return;
    }

    const filtered = connections.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q))
    );
    setSearchResults(filtered);
  }, [searchQuery, connections]);

  const toggleSelectUser = (user: ConnectedUser) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await groupService.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        memberIds: selectedUsers.map((u) => u.id),
      });

      onGroupCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdropVariant="dark"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <HiOutlineUserGroup className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create New Group</h3>
            <p className="text-xs text-slate-500 font-normal">
              Connect with multiple friends and share together
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleCreate} className="space-y-5">
        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Group Name & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Design Enthusiasts, Weekend Treks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Group Icon / Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Group Icon <span className="text-slate-400 font-normal">(Preset or Custom URL)</span>
            </label>
            <div className="flex items-center gap-2.5 mb-2.5 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all p-0.5 shrink-0 ${
                    avatarUrl === url
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-105'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={url} alt="preset" className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="url"
                placeholder="Or paste an image URL..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              <HiOutlinePhoto className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Selected Members Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Add Members ({selectedUsers.length})
            </label>
            {selectedUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUsers([])}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {selectedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200 mb-3">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                >
                  <Avatar
                    src={u.avatarUrl}
                    name={u.fullName || u.username}
                    size="w-4 h-4"
                    textClassName="text-[8px]"
                  />
                  <span>{u.fullName || u.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(u)}
                    className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <HiOutlineXMark className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {/* Member Search Input */}
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search people you follow or your followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <p className="text-[11px] text-slate-400 mb-2 font-medium">
            Only accounts you follow or who follow you can be added to groups.
          </p>

          {/* Search Results List */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white shadow-2xs">
            {loadingConnections ? (
              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                Loading your connections...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleSelectUser(user)}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={user.avatarUrl}
                        name={user.fullName || user.username}
                        size="w-8 h-8"
                        className="shrink-0"
                      />
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {user.fullName || user.username}
                          </p>
                          {user.isFollowing && user.isFollower ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                              Mutual
                            </span>
                          ) : user.isFollowing ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              Following
                            </span>
                          ) : user.isFollower ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600">
                              Follower
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">@{user.username}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 text-transparent hover:border-slate-400'
                      }`}
                    >
                      <HiOutlineCheck className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No connections found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="py-6 px-4 text-center text-xs text-slate-400">
                No followers or followed accounts found. Only accounts you follow or who follow you can be added.
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Create Group</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
