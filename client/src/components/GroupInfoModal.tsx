import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineArrowRightOnRectangle,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineEllipsisVertical,
} from 'react-icons/hi2';
import Modal from './Modal';
import groupService, {
  type GroupDetails,
  type GroupItem,
} from '../services/groupService';
import userService, { type UserProfileResponse } from '../services/userService';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentUserId?: string;
  onGroupUpdated?: (updatedGroup: GroupItem) => void;
  onLeaveGroup?: (groupId: string) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  onGroupUpdated,
  onLeaveGroup,
}) => {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Group state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Member state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<UserProfileResponse[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<UserProfileResponse[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // Leave Confirmation state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Member Action Menu state
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState('');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDetails = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await groupService.getGroupDetails(groupId);
      setGroup(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditAvatarUrl(data.avatarUrl || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      fetchDetails();
      setIsEditing(false);
      setIsAddingMember(false);
      setShowLeaveConfirm(false);
      setOpenMemberMenuId(null);
      setSelectedToAdd([]);
    }
  }, [isOpen, groupId]);

  // Debounced search for adding new members
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const q = addSearchQuery.trim();
    if (!q || !isAddingMember) {
      setAddSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    setSearchingUsers(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const users = await userService.searchUsers(q);
        const existingMemberIds = new Set(group?.members.map((m) => m.userId) || []);
        // Exclude users already in the group
        const filtered = users.filter((u) => !existingMemberIds.has(u.id));
        setAddSearchResults(filtered);
      } catch {
        setAddSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [addSearchQuery, isAddingMember, group?.members]);

  const isAdmin = group?.currentUserRole === 'admin';

  const handleSaveEdit = async () => {
    if (!editName.trim() || !group) return;
    setSavingEdit(true);
    try {
      const updated = await groupService.updateGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
      });
      setGroup((prev) => (prev ? { ...prev, name: updated.name, description: updated.description, avatarUrl: updated.avatarUrl } : null));
      setIsEditing(false);
      onGroupUpdated?.(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update group');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedToAdd.length === 0 || !group) return;
    setAddingMembers(true);
    try {
      await groupService.addMembers(
        group.id,
        selectedToAdd.map((u) => u.id)
      );
      setSelectedToAdd([]);
      setIsAddingMember(false);
      setAddSearchQuery('');
      await fetchDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!group) return;
    try {
      await groupService.removeMember(group.id, userId);
      setOpenMemberMenuId(null);
      await fetchDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (userId: string, role: 'admin' | 'member') => {
    if (!group) return;
    try {
      await groupService.changeMemberRole(group.id, userId, role);
      setOpenMemberMenuId(null);
      await fetchDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to change role');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    setLeaving(true);
    try {
      await groupService.leaveGroup(group.id);
      onLeaveGroup?.(group.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to leave group');
      setLeaving(false);
    }
  };

  const filteredMembers = (group?.members || []).filter((m) => {
    if (!memberFilter.trim()) return true;
    const q = memberFilter.toLowerCase();
    return (
      m.user?.fullName?.toLowerCase().includes(q) ||
      m.user?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdropVariant="dark"
      title={
        <div className="flex items-center gap-2">
          <HiOutlineUserGroup className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-slate-900 text-lg">Group Info</span>
        </div>
      }
    >
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading group details...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      ) : group ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-150 flex flex-col items-center text-center">
            {/* Group Avatar */}
            <div className="relative mb-3">
              {group.avatarUrl ? (
                <img
                  src={group.avatarUrl}
                  alt={group.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-sm border-2 border-white ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white font-bold text-2xl flex items-center justify-center uppercase shadow-sm border-2 border-white ring-1 ring-slate-200">
                  {group.name[0]}
                </div>
              )}
              {isAdmin && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-transform hover:scale-110"
                  title="Edit Group Info"
                >
                  <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Editing mode or display mode */}
            {isEditing ? (
              <div className="w-full space-y-3 mt-2 text-left">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editName.trim()}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-lg font-bold text-slate-900">{group.name}</h4>
                {group.description && (
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">{group.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-medium">
                  <span>{group.members.length} members</span>
                  <span>•</span>
                  <span>
                    Created {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiOutlineUsers className="w-4 h-4 text-slate-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Members ({group.members.length})
                </h5>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                >
                  <HiOutlineUserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingMember ? 'Close Add' : 'Add Members'}</span>
                </button>
              )}
            </div>

            {/* Add Member Panel */}
            {isAddingMember && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-800">Add people to this group</p>
                {selectedToAdd.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {selectedToAdd.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs"
                      >
                        <span>{u.fullName || u.username}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedToAdd((prev) => prev.filter((x) => x.id !== u.id))}
                          className="hover:text-rose-600"
                        >
                          <HiOutlineXMark className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search people to add..."
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <HiOutlineMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {searchingUsers ? (
                  <div className="py-3 text-center text-xs text-slate-400">Searching...</div>
                ) : addSearchResults.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
                    {addSearchResults.map((user) => {
                      const isSel = selectedToAdd.some((x) => x.id === user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedToAdd((prev) => prev.filter((x) => x.id !== user.id));
                            } else {
                              setSelectedToAdd((prev) => [...prev, user]);
                            }
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 text-xs ${
                            isSel ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                                {(user.fullName?.[0] || user.username[0]).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">
                                {user.fullName || user.username}
                              </p>
                              <p className="text-[10px] text-slate-400">@{user.username}</p>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            <HiOutlineCheck className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {selectedToAdd.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddMembersSubmit}
                      disabled={addingMembers}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                    >
                      {addingMembers ? 'Adding...' : `Add Selected (${selectedToAdd.length})`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Member search filter */}
            {group.members.length > 5 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none"
                />
                <HiOutlineMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            )}

            {/* Member list items */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredMembers.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isMemberAdmin = member.role === 'admin';
                const isMenuOpen = openMemberMenuId === member.userId;

                return (
                  <div
                    key={member.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {member.user?.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.username}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white text-xs font-bold flex items-center justify-center">
                            {(member.user?.fullName?.[0] || member.user?.username?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                        {member.user?.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {member.user?.fullName || member.user?.username || 'Unknown'}
                          </p>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">@{member.user?.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                          <HiOutlineShieldCheck className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Member</span>
                      )}

                      {/* Admin actions for other members */}
                      {isAdmin && !isSelf && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMemberMenuId(isMenuOpen ? null : member.userId)
                            }
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <HiOutlineEllipsisVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-lg py-1 z-30 divide-y divide-slate-100 animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() =>
                                  handleChangeRole(member.userId, isMemberAdmin ? 'member' : 'admin')
                                }
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <HiOutlineShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{isMemberAdmin ? 'Dismiss as Admin' : 'Make Admin'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.userId)}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                              >
                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                <span>Remove from Group</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t border-slate-100">
            {showLeaveConfirm ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <p className="text-xs font-semibold text-rose-800">
                  Are you sure you want to leave &ldquo;{group.name}&rdquo;?
                </p>
                <p className="text-[11px] text-rose-600">
                  You won&apos;t receive any more messages from this group unless an admin re-invites you.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    disabled={leaving}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm disabled:opacity-50"
                  >
                    {leaving ? 'Leaving...' : 'Yes, Leave'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                <span>Exit / Leave Group</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default GroupInfoModal;
