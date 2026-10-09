import {
  HiPlus,
  HiOutlinePhoto,
  HiOutlineSparkles,
  HiOutlineCamera,
  HiOutlineChatBubbleBottomCenterText,
} from 'react-icons/hi2';
import type { User } from '../services/authService';

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
}

export default function Stories({
  currentUser,
  stories = [],
  onAddStory,
  showToast,
}: StoriesProps) {
  const handleStoryClick = () => {
    if (onAddStory) {
      onAddStory();
    } else if (showToast) {
      showToast('Stories feature coming soon!', 'info');
    }
  };

  const userInitial = currentUser?.fullName?.[0] || currentUser?.username?.[0] || 'U';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 select-none transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Stories
          </h3>
          <button
            type="button"
            onClick={handleStoryClick}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-900 hover:border-purple-600 bg-white hover:bg-purple-50 text-slate-900 hover:text-purple-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group"
            title="Create story"
            aria-label="Create story"
          >
            <HiPlus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div
          onClick={handleStoryClick}
          className="relative h-[152px] sm:h-[164px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group bg-slate-950 flex flex-col justify-between p-2.5"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt="You"
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-60 transition-all duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-black opacity-90 group-hover:scale-105 transition-transform duration-300" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md p-0.5 ring-1 ring-white/60">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {userInitial}
                </div>
              )}
            </div>
            <span className="text-[9px] font-semibold text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
              You
            </span>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white/90 group-hover:scale-110 group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300">
              <HiPlus className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <div className="relative z-10 text-center">
            <p className="text-[11px] font-bold text-white tracking-tight truncate drop-shadow-sm">
              Add Story
            </p>
          </div>
        </div>

        {stories[0] ? (
          <div
            onClick={handleStoryClick}
            className="relative h-[152px] sm:h-[164px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between p-2.5 bg-slate-900"
          >
            {stories[0].mediaUrl ? (
              <img
                src={stories[0].mediaUrl}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-white text-[10px] font-medium italic opacity-90 line-clamp-3">
                "{stories[0].content}"
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-7 h-7 rounded-full ring-2 ring-purple-400 overflow-hidden bg-slate-900">
                {stories[0].authorAvatar ? (
                  <img
                    src={stories[0].authorAvatar}
                    alt={stories[0].authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {stories[0].authorName[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-[11px] font-bold text-white truncate drop-shadow-sm">
                {stories[0].authorName}
              </p>
              <p className="text-[9px] text-white/70 truncate">
                {stories[0].timestamp || 'Recent'}
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={handleStoryClick}
            className="relative h-[152px] sm:h-[164px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between p-2.5 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md p-1 ring-1 ring-white/20 flex items-center justify-center text-amber-300 group-hover:bg-white/20 transition-colors">
                <HiOutlineSparkles className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-semibold text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                Echo
              </span>
            </div>

            <div className="relative z-10 my-auto text-center">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white/80 mx-auto flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <HiOutlineChatBubbleBottomCenterText className="w-4 h-4" />
              </div>
            </div>

            <div className="relative z-10 text-center">
              <p className="text-[11px] font-bold text-white tracking-tight truncate drop-shadow-sm group-hover:text-purple-200 transition-colors">
                Daily Echo
              </p>
              <p className="text-[9px] text-white/60 truncate mt-0.5">
                Share status
              </p>
            </div>
          </div>
        )}

        {stories[1] ? (
          <div
            onClick={handleStoryClick}
            className="relative h-[152px] sm:h-[164px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between p-2.5 bg-slate-900"
          >
            {stories[1].mediaUrl ? (
              <img
                src={stories[1].mediaUrl}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-white text-[10px] font-medium italic opacity-90 line-clamp-3">
                "{stories[1].content}"
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-7 h-7 rounded-full ring-2 ring-purple-400 overflow-hidden bg-slate-900">
                {stories[1].authorAvatar ? (
                  <img
                    src={stories[1].authorAvatar}
                    alt={stories[1].authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {stories[1].authorName[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-[11px] font-bold text-white truncate drop-shadow-sm">
                {stories[1].authorName}
              </p>
              <p className="text-[9px] text-white/70 truncate">
                {stories[1].timestamp || 'Recent'}
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={handleStoryClick}
            className="relative h-[152px] sm:h-[164px] rounded-2xl overflow-hidden cursor-pointer border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between p-2.5 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md p-1 ring-1 ring-white/20 flex items-center justify-center text-purple-300 group-hover:bg-white/20 transition-colors">
                <HiOutlineCamera className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-semibold text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                Photo
              </span>
            </div>

            <div className="relative z-10 my-auto text-center">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white/80 mx-auto flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <HiOutlinePhoto className="w-4 h-4" />
              </div>
            </div>

            <div className="relative z-10 text-center">
              <p className="text-[11px] font-bold text-white tracking-tight truncate drop-shadow-sm group-hover:text-purple-200 transition-colors">
                Photo Story
              </p>
              <p className="text-[9px] text-white/60 truncate mt-0.5">
                Snap & post
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
