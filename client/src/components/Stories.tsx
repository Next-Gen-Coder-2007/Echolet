import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiPlus,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineSparkles,
  HiOutlineVideoCamera,
} from 'react-icons/hi2';
import type { User } from '../services/authService';
import storyService, {
  type StoryItem as ApiStoryItem,
  type UserStoryGroup,
} from '../services/storyService';
import getSocket from '../services/socket';
import CreateStoryModal from './CreateStoryModal';
import StoryViewerModal from './StoryViewerModal';

export interface StoryItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  mediaUrl?: string;
  content?: string;
  timestamp?: string;
}

interface StoriesProps {
  currentUser?: User | null;
  stories?: StoryItem[];
  onAddStory?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  variant?: 'sidebar' | 'feed';
}

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return 'Recent';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export default function Stories({
  currentUser,
  showToast,
  variant = 'sidebar',
}: StoriesProps) {
  const [userStoryGroups, setUserStoryGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    userIndex: number;
    storyIndex: number;
  }>({
    isOpen: false,
    userIndex: 0,
    storyIndex: 0,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch stories from API
  const fetchStories = useCallback(async () => {
    try {
      const res = await storyService.getStories();
      setUserStoryGroups(res.userStoryGroups || []);
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewStory = (newStory: ApiStoryItem) => {
      setUserStoryGroups((prev) => {
        const existingGroupIndex = prev.findIndex((g) => g.userId === newStory.userId);

        if (existingGroupIndex >= 0) {
          const updated = [...prev];
          const group = { ...updated[existingGroupIndex] };
          if (!group.stories.some((s) => s.id === newStory.id)) {
            group.stories = [...group.stories, newStory];
            group.lastStoryTimestamp = newStory.createdAt;
            if (newStory.userId !== currentUser?.id) {
              group.hasUnviewed = true;
            }
          }
          updated[existingGroupIndex] = group;
          return updated;
        } else {
          const newGroup: UserStoryGroup = {
            userId: newStory.userId,
            user: newStory.user,
            hasUnviewed: newStory.userId !== currentUser?.id,
            lastStoryTimestamp: newStory.createdAt,
            stories: [newStory],
          };
          if (newStory.userId === currentUser?.id) {
            return [newGroup, ...prev];
          }
          if (prev.length > 0 && prev[0]?.userId === currentUser?.id) {
            return [prev[0], newGroup, ...prev.slice(1)];
          }
          return [newGroup, ...prev];
        }
      });
    };

    const handleStoryDeleted = (data: { storyId: string; userId: string }) => {
      setUserStoryGroups((prev) =>
        prev
          .map((g) => {
            if (g.userId !== data.userId) return g;
            return {
              ...g,
              stories: g.stories.filter((s) => s.id !== data.storyId),
            };
          })
          .filter((g) => g.stories.length > 0)
      );
    };

    const handleStoryViewed = (data: {
      storyId: string;
      viewer: any;
      viewsCount: number;
    }) => {
      setUserStoryGroups((prev) =>
        prev.map((g) => ({
          ...g,
          stories: g.stories.map((s) =>
            s.id === data.storyId
              ? {
                  ...s,
                  viewsCount: data.viewsCount,
                  viewers: s.viewers ? [...s.viewers, data.viewer] : [data.viewer],
                  isViewed: s.userId === currentUser?.id ? s.isViewed : true,
                }
              : s
          ),
          hasUnviewed: g.stories.some((s) => s.id !== data.storyId && !s.isViewed),
        }))
      );
    };

    const handleFollowUpdated = () => {
      fetchStories();
    };

    socket.on('new_story', handleNewStory);
    socket.on('story_deleted', handleStoryDeleted);
    socket.on('story_viewed', handleStoryViewed);
    socket.on('follow_updated', handleFollowUpdated);
    window.addEventListener('follow_updated', handleFollowUpdated);

    return () => {
      socket.off('new_story', handleNewStory);
      socket.off('story_deleted', handleStoryDeleted);
      socket.off('story_viewed', handleStoryViewed);
      socket.off('follow_updated', handleFollowUpdated);
      window.removeEventListener('follow_updated', handleFollowUpdated);
    };
  }, [currentUser?.id, fetchStories]);

  const handleStoryCreated = (newStory: ApiStoryItem) => {
    setUserStoryGroups((prev) => {
      const myGroupIndex = prev.findIndex((g) => g.userId === currentUser?.id);
      if (myGroupIndex >= 0) {
        const updated = [...prev];
        const myGroup = { ...updated[myGroupIndex] };
        myGroup.stories = [
          ...myGroup.stories.filter((s) => s.id !== newStory.id),
          newStory,
        ];
        myGroup.lastStoryTimestamp = newStory.createdAt;
        updated[myGroupIndex] = myGroup;
        return updated;
      } else {
        const myGroup: UserStoryGroup = {
          userId: currentUser?.id || newStory.userId,
          user: {
            id: currentUser?.id || newStory.userId,
            fullName: currentUser?.fullName || newStory.user?.fullName || 'You',
            username: currentUser?.username || newStory.user?.username || 'you',
            avatarUrl: currentUser?.avatarUrl || newStory.user?.avatarUrl,
          },
          hasUnviewed: false,
          lastStoryTimestamp: newStory.createdAt,
          stories: [newStory],
        };
        return [myGroup, ...prev];
      }
    });
  };

  const handleStoryDeleted = (storyId: string) => {
    setUserStoryGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          stories: g.stories.filter((s) => s.id !== storyId),
        }))
        .filter((g) => g.stories.length > 0)
    );
  };

  const handleStoryViewed = (storyId: string) => {
    setUserStoryGroups((prev) =>
      prev.map((g) => {
        const hasMatchingStory = g.stories.some((s) => s.id === storyId);
        if (!hasMatchingStory) return g;

        const updatedStories = g.stories.map((s) =>
          s.id === storyId ? { ...s, isViewed: true } : s
        );
        const stillHasUnviewed = updatedStories.some(
          (s) => !s.isViewed && s.userId !== currentUser?.id
        );
        return {
          ...g,
          stories: updatedStories,
          hasUnviewed: stillHasUnviewed,
        };
      })
    );
  };

  const openViewerForUser = (userId?: string, storyIndex = 0) => {
    if (!userId) return;
    const targetIdx = userStoryGroups.findIndex((g) => g.userId === userId);
    if (targetIdx !== -1) {
      setViewerState({
        isOpen: true,
        userIndex: targetIdx,
        storyIndex: Math.min(storyIndex, Math.max(0, userStoryGroups[targetIdx].stories.length - 1)),
      });
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const distance = direction === 'left' ? -220 : 220;
    scrollContainerRef.current.scrollBy({ left: distance, behavior: 'smooth' });
  };

  const userInitial = currentUser?.fullName?.[0] || currentUser?.username?.[0] || 'U';

  const myGroupIndex = userStoryGroups.findIndex((g) => g.userId === currentUser?.id);
  const myGroup = myGroupIndex >= 0 ? userStoryGroups[myGroupIndex] : undefined;
  const otherGroups = userStoryGroups.filter((g) => g.userId !== currentUser?.id);

  if (loading && userStoryGroups.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 animate-pulse select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-24 bg-slate-100 rounded-lg" />
          <div className="w-8 h-8 rounded-full bg-slate-100" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          <div className="w-[120px] h-[160px] rounded-2xl bg-slate-100 shrink-0" />
          <div className="w-[120px] h-[160px] rounded-2xl bg-slate-100 shrink-0" />
          <div className="w-[120px] h-[160px] rounded-2xl bg-slate-100 shrink-0" />
        </div>
      </div>
    );
  }

  // Feed mode (Compact horizontal tray for mobile/tablets)
  if (variant === 'feed') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 mb-5 select-none transition-all">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Stories</span>
              {otherGroups.some((g) => g.hasUnviewed) && (
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              )}
            </h3>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              24h
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full transition-all cursor-pointer"
          >
            <HiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Story</span>
          </button>
        </div>

        {/* Horizontal avatar tray */}
        <div className="flex items-center gap-3.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Add Story / Your Story */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <div
              onClick={() => {
                if (myGroup && myGroup.stories.length > 0) {
                  openViewerForUser(currentUser?.id, 0);
                } else {
                  setIsCreateOpen(true);
                }
              }}
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 group-hover:scale-105 transition-transform"
            >
              <div
                className={`w-full h-full rounded-full p-0.5 ${
                  myGroup && myGroup.stories.length > 0
                    ? 'bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600'
                    : 'border-2 border-dashed border-slate-300 bg-slate-50'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt="You"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                      {userInitial}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateOpen(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-sm border-2 border-white group-hover:scale-110 transition-transform cursor-pointer"
                title="Add Story"
              >
                <HiPlus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
            <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[64px]">
              {myGroup ? 'Your Story' : 'Add Story'}
            </span>
          </div>

          {/* Friends' stories only */}
          {otherGroups.map((group) => {
            return (
              <div
                key={group.userId}
                onClick={() => openViewerForUser(group.userId, 0)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 group-hover:scale-105 transition-transform ${
                    group.hasUnviewed
                      ? 'bg-gradient-to-tr from-purple-600 to-pink-500 shadow-2xs'
                      : 'bg-slate-200'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                    {group.user.avatarUrl ? (
                      <img
                        src={group.user.avatarUrl}
                        alt={group.user.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                        {group.user.fullName?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-700 truncate max-w-[64px]">
                  {group.user.fullName.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Modals */}
        <CreateStoryModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          currentUser={currentUser}
          onStoryCreated={handleStoryCreated}
          showToast={showToast}
        />

        {viewerState.isOpen && (
          <StoryViewerModal
            key={`feed-${viewerState.userIndex}-${viewerState.storyIndex}`}
            isOpen={viewerState.isOpen}
            onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
            userStoryGroups={userStoryGroups}
            initialUserIndex={viewerState.userIndex}
            initialStoryIndex={viewerState.storyIndex}
            currentUser={currentUser}
            onStoryDeleted={handleStoryDeleted}
            onStoryViewed={handleStoryViewed}
            showToast={showToast}
          />
        )}
      </div>
    );
  }

  // Sidebar Story Cards (Clean Light Theme, No repetitive dummy blocks!)
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 select-none transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Stories
          </h3>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 hover:border-purple-600 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group"
            title="Create story"
            aria-label="Create story"
          >
            <HiPlus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {otherGroups.length > 2 && (
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Scroll left"
              >
                <HiOutlineChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Scroll right"
              >
                <HiOutlineChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {userStoryGroups.length > 0 && (
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              {userStoryGroups.reduce((acc, g) => acc + g.stories.length, 0)} active
            </span>
          )}
        </div>
      </div>

      {/* Stories list: User Card + Real Friends' Story Cards with generous top padding to prevent hover clipping */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto pt-3 pb-2.5 -mt-2 -mx-1 px-1 scrollbar-none scroll-smooth"
      >
        {/* 1. Add Story / Your Story Card */}
        {myGroup && myGroup.stories.length > 0 ? (
          <div
            onClick={() => openViewerForUser(currentUser?.id, 0)}
            className="relative w-[114px] sm:w-[124px] h-[156px] sm:h-[168px] rounded-2xl overflow-hidden cursor-pointer border-2 border-purple-500 shadow-2xs hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 ease-out hover:-translate-y-1 group bg-slate-50 flex flex-col justify-between p-2.5 shrink-0"
          >
            {myGroup.stories[0].mediaType === 'video' && myGroup.stories[0].mediaUrl ? (
              <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
                <video
                  src={myGroup.stories[0].mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-sm">
                  <HiOutlineVideoCamera className="w-3 h-3 text-purple-300" />
                </div>
              </div>
            ) : myGroup.stories[0].mediaUrl ? (
              <img
                src={myGroup.stories[0].mediaUrl}
                alt="Your story"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center p-2 text-center text-slate-900 text-[10px] font-semibold opacity-90 line-clamp-3"
                style={{
                  background:
                    myGroup.stories[0].backgroundColor ||
                    'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                }}
              >
                "{myGroup.stories[0].content}"
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="w-7 h-7 rounded-full bg-white p-0.5 ring-2 ring-purple-600 shadow-sm">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt="You"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center rounded-full">
                    {userInitial}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold text-white bg-purple-600/90 px-1.5 py-0.5 rounded-full backdrop-blur-xs shadow-2xs">
                You
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-white">
              <span className="text-[10px] font-bold drop-shadow-sm truncate">
                {myGroup.stories.length} {myGroup.stories.length === 1 ? 'story' : 'stories'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateOpen(true);
                }}
                className="w-5 h-5 rounded-full bg-white text-purple-700 hover:bg-purple-50 flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Add another story"
              >
                <HiPlus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsCreateOpen(true)}
            className="relative w-[114px] sm:w-[124px] h-[156px] sm:h-[168px] rounded-2xl overflow-hidden cursor-pointer border border-dashed border-slate-300 hover:border-purple-400 shadow-2xs hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 ease-out hover:-translate-y-1 group bg-slate-50/80 hover:bg-purple-50/30 flex flex-col justify-between p-2.5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-full bg-white p-0.5 ring-1 ring-slate-300 shadow-2xs">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center rounded-full">
                    {userInitial}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                You
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-auto">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-purple-700 transition-all duration-200">
                <HiPlus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-800 tracking-tight truncate group-hover:text-purple-700 transition-colors">
                Add Story
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                Disappears in 24h
              </p>
            </div>
          </div>
        )}

        {/* 2. Friends' Active Stories */}
        {otherGroups.map((group) => {
          const firstStory = group.stories[0];
          return (
            <div
              key={group.userId}
              onClick={() => openViewerForUser(group.userId, 0)}
              className="relative w-[114px] sm:w-[124px] h-[156px] sm:h-[168px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 hover:border-purple-300 shadow-2xs hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 ease-out hover:-translate-y-1 group flex flex-col justify-between p-2.5 bg-slate-50 shrink-0"
            >
              {firstStory?.mediaType === 'video' && firstStory.mediaUrl ? (
                <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
                  <video
                    src={firstStory.mediaUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-sm">
                    <HiOutlineVideoCamera className="w-3 h-3 text-purple-300" />
                  </div>
                </div>
              ) : firstStory?.mediaUrl ? (
                <img
                  src={firstStory.mediaUrl}
                  alt={group.user.fullName}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center p-2 text-center text-slate-900 text-[10px] font-semibold opacity-95 line-clamp-3"
                  style={{
                    background:
                      firstStory?.backgroundColor ||
                      'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                  }}
                >
                  "{firstStory?.content}"
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25 pointer-events-none" />

              <div className="relative z-10">
                <div
                  className={`w-7 h-7 rounded-full overflow-hidden bg-white p-0.5 ${
                    group.hasUnviewed
                      ? 'ring-2 ring-purple-600 shadow-xs'
                      : 'ring-1 ring-slate-300'
                  }`}
                >
                  {group.user.avatarUrl ? (
                    <img
                      src={group.user.avatarUrl}
                      alt={group.user.fullName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center rounded-full">
                      {group.user.fullName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 text-white">
                <p className="text-[11px] font-bold truncate drop-shadow-sm">
                  {group.user.fullName}
                </p>
                <p className="text-[9px] text-white/80 truncate">
                  {formatRelativeTime(group.lastStoryTimestamp)}
                </p>
              </div>
            </div>
          );
        })}

        {/* 3. If no friends have stories yet: Clean subtle placeholder (NO repetitive fake blocks!) */}
        {otherGroups.length === 0 && (
          <div
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 min-w-[140px] h-[156px] sm:h-[168px] rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-purple-50/30 hover:border-purple-200 transition-all p-3 flex flex-col items-center justify-center text-center cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HiOutlineSparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              No stories yet
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[130px] leading-tight">
              Friends' 24h stories will appear here
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        onStoryCreated={handleStoryCreated}
        showToast={showToast}
      />

      {viewerState.isOpen && (
        <StoryViewerModal
          key={`sidebar-${viewerState.userIndex}-${viewerState.storyIndex}`}
          isOpen={viewerState.isOpen}
          onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
          userStoryGroups={userStoryGroups}
          initialUserIndex={viewerState.userIndex}
          initialStoryIndex={viewerState.storyIndex}
          currentUser={currentUser}
          onStoryDeleted={handleStoryDeleted}
          onStoryViewed={handleStoryViewed}
          showToast={showToast}
        />
      )}
    </div>
  );
}
