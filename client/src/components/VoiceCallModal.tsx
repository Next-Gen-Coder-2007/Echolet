import React from 'react';
import { useVoiceCall } from '../context/CallContext';
import {
  HiOutlinePhone,
  HiOutlinePhoneXMark,
  HiOutlineMicrophone,
  HiOutlineSpeakerWave,
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
} from 'react-icons/hi2';

export const VoiceCallModal: React.FC = () => {
  const {
    callState,
    activePeer,
    isCaller,
    isMuted,
    callDuration,
    callStatusText,
    isMinimized,
    localVolume,
    remoteVolume,
    setIsMinimized,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useVoiceCall();

  if (callState === 'idle' || !activePeer) {
    return null;
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  };

  const peerName = activePeer.fullName || activePeer.username || 'User';
  const peerInitials = (peerName[0] || 'U').toUpperCase();

  // =========================================================================
  // 1. MINIMIZED FLOATING PILL (Docked bottom-right during active or ringing call)
  // =========================================================================
  if (isMinimized && callState !== 'incoming') {
    return (
      <aside
        id="voice-call-minimized-pill"
        aria-label="Active voice call bar"
        className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-3 flex items-center gap-3.5 animate-in slide-in-from-bottom-4 duration-200 select-none"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            {activePeer.avatarUrl ? (
              <img
                src={activePeer.avatarUrl}
                alt={peerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 text-sm bg-gradient-to-tr from-indigo-100 to-purple-100">
                {peerInitials}
              </div>
            )}
          </div>
          {callState === 'connected' && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
              title="Connected"
            />
          )}
        </div>

        <div className="min-w-0 pr-1">
          <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
            {peerName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {callState === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-600 font-mono">
                  {formatTime(callDuration)}
                </span>
                {/* Micro mini dancing bars */}
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <span
                    className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, (remoteVolume / 100) * 12)}px` }}
                  />
                  <span
                    className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, (localVolume / 100) * 12)}px` }}
                  />
                  <span
                    className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, (remoteVolume / 100) * 12)}px` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 truncate">
                {callStatusText || (isCaller ? 'Calling...' : 'Connecting...')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
          <button
            id="voice-call-minimized-mute-btn"
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-colors ${
              isMuted
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <HiOutlineMicrophone className="w-4 h-4" />
          </button>

          <button
            id="voice-call-minimized-expand-btn"
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Expand call window"
          >
            <HiOutlineArrowsPointingOut className="w-4 h-4" />
          </button>

          <button
            id="voice-call-minimized-hangup-btn"
            type="button"
            onClick={endCall}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95"
            title="End Call"
          >
            <HiOutlinePhoneXMark className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // 2. INCOMING CALL MODAL (Ringing Alert)
  // =========================================================================
  if (callState === 'incoming') {
    return (
      <div
        id="incoming-voice-call-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      >
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Subtle luminous glow background */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-50 via-teal-50/40 to-transparent pointer-events-none" />

          {/* Caller Avatar with expanding pulse rings */}
          <div className="relative mx-auto w-28 h-28 my-4 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping duration-1000" />
            <span className="absolute -inset-2 rounded-full border border-emerald-400/30 animate-pulse duration-700" />

            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-xl relative z-10">
              {activePeer.avatarUrl ? (
                <img
                  src={activePeer.avatarUrl}
                  alt={peerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-emerald-800 bg-gradient-to-tr from-emerald-100 via-teal-100 to-indigo-100">
                  {peerInitials}
                </div>
              )}
            </div>

            <span className="absolute bottom-1 right-2 z-20 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
              <HiOutlinePhone className="w-4 h-4" />
            </span>
          </div>

          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-3">
            {peerName}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            @{activePeer.username || 'user'}
          </p>

          <div className="mt-3 mb-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Incoming Voice Call...</span>
          </div>

          {/* Actions: Decline / Accept */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-1.5">
              <button
                id="voice-call-decline-btn"
                type="button"
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Decline Call"
              >
                <HiOutlinePhoneXMark className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                id="voice-call-accept-btn"
                type="button"
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                title="Accept Call"
              >
                <HiOutlinePhone className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. FULL CALL STUDIO DIALOG (Calling, Connected, Ended)
  // =========================================================================
  return (
    <div
      id="voice-call-studio-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Controls: Minimize button */}
        <div className="absolute top-5 right-5 z-20">
          <button
            id="voice-call-minimize-btn"
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Minimize to floating widget"
          >
            <HiOutlineArrowsPointingIn className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle luminous ambient background */}
        <div
          className={`absolute top-0 inset-x-0 h-44 transition-colors duration-500 pointer-events-none ${
            callState === 'connected'
              ? 'bg-gradient-to-b from-indigo-50/80 via-emerald-50/40 to-transparent'
              : 'bg-gradient-to-b from-slate-100/80 via-slate-50/40 to-transparent'
          }`}
        />

        {/* Peer Avatar & Live Sound Rings */}
        <div className="relative mt-4 mb-4 flex items-center justify-center w-36 h-36">
          {callState === 'calling' && (
            <>
              <span className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping duration-1000" />
              <span className="absolute -inset-3 rounded-full border border-indigo-400/30 animate-pulse duration-700" />
            </>
          )}

          {callState === 'connected' && (
            <>
              <span
                className="absolute rounded-full bg-emerald-400/15 transition-all duration-100"
                style={{
                  inset: `-${Math.max(4, (remoteVolume / 100) * 22)}px`,
                }}
              />
              <span
                className="absolute rounded-full border border-emerald-500/25 transition-all duration-100"
                style={{
                  inset: `-${Math.max(8, (localVolume / 100) * 32)}px`,
                }}
              />
            </>
          )}

          <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-xl relative z-10">
            {activePeer.avatarUrl ? (
              <img
                src={activePeer.avatarUrl}
                alt={peerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl text-slate-700 bg-gradient-to-tr from-slate-100 via-indigo-50 to-purple-100">
                {peerInitials}
              </div>
            )}
          </div>

          {callState === 'connected' && (
            <span
              className="absolute bottom-2 right-4 z-20 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"
              title="Encrypted P2P Audio"
            />
          )}
        </div>

        {/* Peer Info */}
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
          {peerName}
        </h2>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">
          @{activePeer.username || 'user'}
        </p>

        {/* Status & Duration */}
        <div className="mt-3 mb-6">
          {callState === 'connected' ? (
            <div className="flex flex-col items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-mono text-sm font-bold tracking-wider inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {formatTime(callDuration)}
              </span>

              {/* Reactive Live Voice Waveform Visualizer Bars */}
              <div className="flex items-end justify-center gap-1 h-8 mt-2 px-6 py-1 bg-slate-50 border border-slate-100 rounded-2xl">
                {[12, 24, 38, 18, 30, 44, 20, 36, 16, 28, 42, 22].map((base, idx) => {
                  const vol = idx % 2 === 0 ? remoteVolume : localVolume;
                  const barHeight = Math.max(
                    4,
                    Math.min(26, Math.round((base * (vol + 15)) / 100))
                  );
                  return (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        vol > 15 ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Voice Call · End-to-End Encrypted P2P
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              {callState === 'calling' && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
              <span>{callStatusText || (isCaller ? 'Calling...' : 'Connecting...')}</span>
            </div>
          )}
        </div>

        {/* Control Buttons Bar */}
        <div className="flex items-center justify-center gap-6 mt-2 pt-4 border-t border-slate-100 w-full">
          {/* Mute Mic Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="voice-call-toggle-mute-btn"
              type="button"
              disabled={callState !== 'connected'}
              onClick={toggleMute}
              className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              <HiOutlineMicrophone className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold text-slate-500">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="voice-call-end-btn"
              type="button"
              onClick={endCall}
              className="w-15 h-15 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="End Voice Call"
            >
              <HiOutlinePhoneXMark className="w-7 h-7" />
            </button>
            <span className="text-[10px] font-bold text-slate-500">End</span>
          </div>

          {/* Speaker / P2P Info Indicator */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center"
              title="Speaker active"
            >
              <HiOutlineSpeakerWave className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-500">Speaker</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallModal;
