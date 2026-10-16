import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import getSocket from '../services/socket';
import type { User } from '../services/authService';

export interface CallPeer {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface CallContextType {
  callState: CallState;
  activePeer: CallPeer | null;
  isCaller: boolean;
  isMuted: boolean;
  callDuration: number;
  callStatusText: string;
  isMinimized: boolean;
  localVolume: number;
  remoteVolume: number;
  setIsMinimized: (val: boolean | ((prev: boolean) => boolean)) => void;
  startVoiceCall: (targetUser: CallPeer) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Web Audio synthesizer for pleasant ringtones without external mp3 dependencies
class ToneGenerator {
  private ctx: AudioContext | null = null;
  private ringInterval: any = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Outgoing gentle dual-tone ringback (440Hz + 480Hz)
  playOutgoingRingback() {
    this.stop();
    const tick = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.setValueAtTime(0.04, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      } catch {
        // ignore audio policy restrictions
      }
    };

    tick();
    this.ringInterval = setInterval(tick, 3000);
  }

  // Incoming melodic chime
  playIncomingRingtone() {
    this.stop();
    const tick = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + i * 0.18;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.4);
        });
      } catch {
        // ignore
      }
    };

    tick();
    this.ringInterval = setInterval(tick, 2200);
  }

  // Soft call termination tone
  playEndChime() {
    this.stop();
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // ignore
    }
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

const toneGen = new ToneGenerator();

export const CallProvider: React.FC<{
  currentUser: User | null;
  children: React.ReactNode;
}> = ({ currentUser, children }) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [activePeer, setActivePeer] = useState<CallPeer | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusText, setCallStatusText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [remoteVolume, setRemoteVolume] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const activePeerRef = useRef<CallPeer | null>(null);
  const callStateRef = useRef<CallState>('idle');

  // Keep refs in sync for callbacks
  useEffect(() => {
    activePeerRef.current = activePeer;
    callStateRef.current = callState;
  }, [activePeer, callState]);

  // Hidden audio element for remote stream playback
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    remoteAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  }, []);

  // Duration Timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Cleanup helper
  const cleanupCall = useCallback((playChime = true) => {
    if (playChime) toneGen.playEndChime();
    else toneGen.stop();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    setLocalVolume(0);
    setRemoteVolume(0);
    setIsMuted(false);
  }, []);

  // Volume Analyser hookup
  const attachVolumeVisualizers = (localStream: MediaStream, remoteStream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      const localSource = ctx.createMediaStreamSource(localStream);
      const localAnalyser = ctx.createAnalyser();
      localAnalyser.fftSize = 64;
      localSource.connect(localAnalyser);

      const remoteSource = ctx.createMediaStreamSource(remoteStream);
      const remoteAnalyser = ctx.createAnalyser();
      remoteAnalyser.fftSize = 64;
      remoteSource.connect(remoteAnalyser);

      const localData = new Uint8Array(localAnalyser.frequencyBinCount);
      const remoteData = new Uint8Array(remoteAnalyser.frequencyBinCount);

      const updateMeter = () => {
        localAnalyser.getByteFrequencyData(localData);
        remoteAnalyser.getByteFrequencyData(remoteData);

        const avgLocal = localData.reduce((a, b) => a + b, 0) / localData.length;
        const avgRemote = remoteData.reduce((a, b) => a + b, 0) / remoteData.length;

        setLocalVolume(Math.min(100, Math.round((avgLocal / 128) * 100)));
        setRemoteVolume(Math.min(100, Math.round((avgRemote / 128) * 100)));

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Create RTCPeerConnection instance
  const initPeerConnection = (targetUserId: string): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (localStreamRef.current && remoteStream) {
        attachVolumeVisualizers(localStreamRef.current, remoteStream);
      }
    };

    // Forward ICE candidate to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit('call:signal', {
          toUserId: targetUserId,
          signal: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed'
      ) {
        if (callStateRef.current === 'connected') {
          setCallStatusText('Connection lost');
          setTimeout(() => {
            endCall();
          }, 1500);
        }
      }
    };

    return pc;
  };

  // START OUTGOING CALL
  const startVoiceCall = async (targetUser: CallPeer) => {
    if (!currentUser || callState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setActivePeer(targetUser);
      setIsCaller(true);
      setCallState('calling');
      setCallStatusText('Calling...');
      setIsMinimized(false);

      toneGen.playOutgoingRingback();

      // Emit call initiate to server
      getSocket().emit('call:initiate', {
        toUserId: targetUser.id,
        caller: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
        },
      });
    } catch (err: any) {
      console.error('Microphone error:', err);
      alert('Unable to access microphone. Please enable microphone permissions in your browser.');
    }
  };

  // ACCEPT INCOMING CALL
  const acceptCall = async () => {
    const peer = activePeerRef.current;
    if (!peer || callStateRef.current !== 'incoming') return;

    toneGen.stop();
    setCallStatusText('Connecting...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      initPeerConnection(peer.id);

      getSocket().emit('call:accept', { toUserId: peer.id });
      setCallState('connected');
      setCallStatusText('Connected');
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access is required to answer the voice call.');
      rejectCall();
    }
  };

  // REJECT INCOMING CALL
  const rejectCall = () => {
    const peer = activePeerRef.current;
    toneGen.stop();
    if (peer) {
      getSocket().emit('call:reject', { toUserId: peer.id, reason: 'declined' });
    }
    setCallState('idle');
    setActivePeer(null);
    setCallStatusText('');
    cleanupCall(false);
  };

  // HANG UP / END CALL
  const endCall = () => {
    const peer = activePeerRef.current;
    if (peer) {
      getSocket().emit('call:end', { toUserId: peer.id });
    }
    setCallStatusText('Call ended');
    setCallState('ended');
    cleanupCall(true);

    setTimeout(() => {
      setCallState('idle');
      setActivePeer(null);
      setCallStatusText('');
      setIsMinimized(false);
    }, 1200);
  };

  // TOGGLE MUTE
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // SOCKET EVENT LISTENERS
  useEffect(() => {
    const socket = getSocket();

    // 1. Incoming Call Event
    const handleIncoming = (data: { caller: CallPeer; fromUserId: string }) => {
      // If already in a call, reject as busy
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', {
          toUserId: data.fromUserId,
          reason: 'busy',
        });
        return;
      }

      setActivePeer(data.caller);
      setIsCaller(false);
      setCallState('incoming');
      setCallStatusText('Incoming Voice Call');
      setIsMinimized(false);
      toneGen.playIncomingRingtone();
    };

    // 2. Caller receives Accepted event from Callee
    const handleAccepted = async ({ fromUserId }: { fromUserId: string }) => {
      toneGen.stop();
      setCallStatusText('Connecting...');
      setCallState('connected');

      try {
        const pc = initPeerConnection(fromUserId);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        socket.emit('call:signal', {
          toUserId: fromUserId,
          signal: { sdp: pc.localDescription },
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
        endCall();
      }
    };

    // 3. User Rejected or Busy
    const handleRejected = ({ reason }: { reason: string }) => {
      toneGen.stop();
      setCallStatusText(reason === 'busy' ? 'User is busy' : 'Call declined');
      setCallState('ended');
      cleanupCall(true);

      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
        setCallStatusText('');
      }, 2000);
    };

    // 4. Target User Offline
    const handleUserOffline = () => {
      toneGen.stop();
      setCallStatusText('User is offline');
      setCallState('ended');
      cleanupCall(true);

      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
        setCallStatusText('');
      }, 2000);
    };

    // 5. Target User Busy
    const handleUserBusy = () => {
      toneGen.stop();
      setCallStatusText('User is on another call');
      setCallState('ended');
      cleanupCall(true);

      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
        setCallStatusText('');
      }, 2000);
    };

    // 6. WebRTC Signaling (SDP Offer / Answer & ICE Candidates)
    const handleSignal = async ({
      fromUserId,
      signal,
    }: {
      fromUserId: string;
      signal: any;
    }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // If receiving an offer, create and send back the answer
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call:signal', {
              toUserId: fromUserId,
              signal: { sdp: pc.localDescription },
            });
          }

          // Process queued ICE candidates
          while (iceCandidateQueueRef.current.length > 0) {
            const cand = iceCandidateQueueRef.current.shift();
            if (cand) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            iceCandidateQueueRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('WebRTC signal handling error:', err);
      }
    };

    // 7. Call Ended by Peer
    const handleEnded = () => {
      toneGen.stop();
      setCallStatusText('Call ended');
      setCallState('ended');
      cleanupCall(true);

      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
        setCallStatusText('');
        setIsMinimized(false);
      }, 1500);
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:user_offline', handleUserOffline);
    socket.on('call:busy', handleUserBusy);
    socket.on('call:signal', handleSignal);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:user_offline', handleUserOffline);
      socket.off('call:busy', handleUserBusy);
      socket.off('call:signal', handleSignal);
      socket.off('call:ended', handleEnded);
    };
  }, [cleanupCall]);

  return (
    <CallContext.Provider
      value={{
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
        startVoiceCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useVoiceCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within CallProvider');
  }
  return context;
};
