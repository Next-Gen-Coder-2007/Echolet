import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlineChartBar,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineExclamationCircle,
  HiOutlineClock,
} from 'react-icons/hi2';
import Modal from './Modal';

export const CHAT_POLL_TIMER_DURATIONS = [
  { value: 'none', label: 'No timer (Never ends)' },
  { value: '5m', label: '5 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
];

interface CreateChatPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (question: string, options: string[], timer?: string | null) => void;
}

export const CreateChatPollModal: React.FC<CreateChatPollModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [pollTimer, setPollTimer] = useState<string>('none');
  const [error, setError] = useState<string | null>(null);
  const optionInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setOptions(['', '']);
      setPollTimer('none');
      setError(null);
    }
  }, [isOpen]);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, '']);
    setTimeout(() => {
      const nextIdx = options.length;
      optionInputsRef.current[nextIdx]?.focus();
    }, 50);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    if (error) setError(null);
  };

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
    if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < options.length - 1) {
        optionInputsRef.current[index + 1]?.focus();
      } else if (options.length < 6) {
        handleAddOption();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please provide a question for the poll.');
      return;
    }

    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (trimmedOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    // Check for duplicate options
    const uniqueOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size < trimmedOptions.length) {
      setError('All poll options must be unique.');
      return;
    }

    setError(null);
    onSubmit(trimmedQuestion, trimmedOptions, pollTimer !== 'none' ? pollTimer : null);
    onClose();
  };

  const filledCount = options.filter((o) => o.trim().length > 0).length;
  const canSubmit = question.trim().length > 0 && filledCount >= 2;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdropVariant="blur"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
            <HiOutlineChartBar className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Create a Poll</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Ask a question and let everyone vote
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Error notification */}
        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <HiOutlineExclamationCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Question Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Question <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {question.length}/200
            </span>
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Which team will win tomorrow's match?"
            maxLength={200}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
            autoFocus
          />
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Options <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              {filledCount} of {options.length} filled (max 6)
            </span>
          </div>

          <div className="space-y-2">
            {options.map((option, idx) => (
              <div
                key={idx}
                className="group flex items-center gap-2.5 p-1.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/10 focus-within:bg-white"
              >
                {/* Badge (A, B, C...) */}
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs group-focus-within:bg-purple-50 group-focus-within:text-purple-600 group-focus-within:border-purple-200 transition-colors">
                  {String.fromCharCode(65 + idx)}
                </div>

                {/* Text input */}
                <input
                  ref={(el) => {
                    optionInputsRef.current[idx] = el;
                  }}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 bg-transparent px-1 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />

                {/* Remove button */}
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                    title="Remove option"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Option button */}
          {options.length < 6 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50/40 text-slate-600 hover:text-purple-600 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group mt-2"
            >
              <div className="w-4 h-4 rounded-full bg-slate-200 group-hover:bg-purple-200 flex items-center justify-center transition-colors">
                <HiOutlinePlus className="w-3 h-3 text-slate-600 group-hover:text-purple-700" />
              </div>
              <span>Add Option ({options.length}/6)</span>
            </button>
          )}
        </div>

        {/* Poll Duration / Timer Setting */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HiOutlineClock className="w-4 h-4 text-purple-600" />
              Poll Timer
            </span>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-md">
              {CHAT_POLL_TIMER_DURATIONS.find((d) => d.value === pollTimer)?.label || 'No timer'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CHAT_POLL_TIMER_DURATIONS.map((d) => {
              const isSelected = pollTimer === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setPollTimer(d.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                      : 'bg-white hover:bg-purple-50/80 text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {d.value === 'none' ? 'No timer' : d.label.split(' ')[0] + (d.label.split(' ')[1] ? ' ' + d.label.split(' ')[1] : '')}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            {pollTimer === 'none'
              ? 'Voting remains open permanently until deleted.'
              : `Voting automatically closes after ${CHAT_POLL_TIMER_DURATIONS.find((d) => d.value === pollTimer)?.label}. The message remains in the chat.`}
          </p>
        </div>

        {/* Tip banner */}
        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100/80 flex items-start gap-2.5 text-xs text-purple-900">
          <span className="text-sm select-none">💡</span>
          <span className="text-purple-800 text-[11px] leading-relaxed">
            Members can cast one vote each, and results update in real-time as responses are received.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <HiOutlineChartBar className="w-4 h-4 stroke-[2.2]" />
            <span>Create Poll</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateChatPollModal;
