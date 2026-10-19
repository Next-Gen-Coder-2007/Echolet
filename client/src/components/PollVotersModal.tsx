import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Modal from './Modal';
import { HiXMark, HiOutlineChartBar, HiOutlineArrowPath } from 'react-icons/hi2';
import type { PollVotersData } from '../services/postService';

interface PollVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: string;
  loadVoters: () => Promise<PollVotersData>;
}

export const PollVotersModal: React.FC<PollVotersModalProps> = ({
  isOpen,
  onClose,
  question: initialQuestion,
  loadVoters,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PollVotersData | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    loadVoters()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
          if (res.options && res.options.length > 0) {
            setSelectedOptionIndex('all');
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load poll voters:', err);
          setError(
            err.response?.data?.message ||
              'Only the poll creator can view who voted, or an error occurred.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, loadVoters]);

  const totalVotes = data?.totalVotes || 0;
  const pollQuestion = data?.pollQuestion || initialQuestion;

  const activeOptions =
    selectedOptionIndex === 'all'
      ? data?.options || []
      : data?.options
      ? [data.options[selectedOptionIndex]]
      : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdropVariant="dark"
      showCloseButton={false}
      card={false}
      contentClassName="p-0 overflow-hidden"
    >
      <div className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <HiOutlineChartBar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                Poll Votes
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Question display */}
        {pollQuestion && (
          <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
              {pollQuestion}
            </p>
          </div>
        )}

        {/* Options Filter Tabs */}
        {!loading && !error && data?.options && data.options.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 overflow-x-auto scrollbar-none bg-white">
            <button
              type="button"
              onClick={() => setSelectedOptionIndex('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedOptionIndex === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({totalVotes})
            </button>

            {data.options.map((opt, idx) => {
              const isSelected = selectedOptionIndex === idx;
              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => setSelectedOptionIndex(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer max-w-[170px] ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="truncate">{opt.optionText}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.votesCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading voter details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-xs text-red-500 font-medium mb-3">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  loadVoters()
                    .then((res) => {
                      setData(res);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.response?.data?.message || 'Failed to load voters');
                      setLoading(false);
                    });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
              >
                <HiOutlineArrowPath className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : totalVotes === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <HiOutlineChartBar className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No votes yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nobody has cast a vote on this poll yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {activeOptions.map((opt, oIdx) => (
                <div key={opt.id || oIdx} className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[240px]">
                      {opt.optionText}
                    </span>
                    <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {opt.votesCount} {opt.votesCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  {opt.voters.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic bg-slate-50/60 rounded-xl">
                      No votes for this choice
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {opt.voters.map((voter) => (
                        <Link
                          key={voter.id}
                          to={`/profile/${voter.username}`}
                          onClick={onClose}
                          className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={voter.avatarUrl || undefined}
                              alt={voter.fullName}
                              name={voter.fullName}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors truncate">
                                {voter.fullName}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                @{voter.username}
                              </p>
                            </div>
                          </div>

                          {voter.votedAt && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                              {new Date(voter.votedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PollVotersModal;
