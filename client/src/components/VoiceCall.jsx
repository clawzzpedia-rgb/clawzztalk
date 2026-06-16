import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store';
import SimplePeer from 'simple-peer';
import { PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceCall() {
  const { callState, setCallState, socket, incomingCall, setIncomingCall } = useStore();
  const peerRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [stream, setStream] = useState(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const iceQueue = useRef([]);

  const cleanup = useCallback(() => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    iceQueue.current = [];
    setCallState(null);
    setIncomingCall(null);
  }, [stream, setCallState, setIncomingCall]);

  useEffect(() => {
    const isInitiator = callState?.direction === 'outgoing';
    const targetId = callState?.targetId || incomingCall?.from;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((s) => {
        setStream(s);
        if (localAudioRef.current) localAudioRef.current.srcObject = s;

        const peer = new SimplePeer({
          initiator: isInitiator,
          trickle: true,
          stream: s,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              {
                urls: 'turn:relay.metered.ca:80',
                username: '72c7338866a8534bc36219b4',
                credential: 'HXbTw5w/hJ9AANks'
              }
            ]
          }
        });

        peer.on('signal', (data) => {
          const channel = data.type === 'offer' ? 'call:offer' :
                          data.type === 'answer' ? 'call:answer' : 'call:ice-candidate';
          const emitData = data.type === 'ice-candidate'
            ? { targetId, candidate: data }
            : { targetId, [channel === 'call:offer' ? 'offer' : 'answer']: data };
          socket?.emit(channel, emitData);
        });

        peer.on('connect', () => { setConnecting(false); setError(''); });

        peer.on('stream', (remoteStream) => {
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
        });

        peer.on('close', () => cleanup());
        peer.on('error', (e) => { setError('Connection lost'); });

        peerRef.current = peer;
        while (iceQueue.current.length && peerRef.current) {
          peerRef.current.signal(iceQueue.current.shift());
        }
      })
      .catch(() => {
        setError('Microphone access denied');
        setTimeout(() => cleanup(), 2000);
      });

    const handleSignal = (extract) => (data) => {
      if (data.from === targetId) {
        if (peerRef.current) peerRef.current.signal(extract(data));
        else iceQueue.current.push(extract(data));
      }
    };

    socket?.on('call:offer', handleSignal((d) => d.offer));
    socket?.on('call:answer', handleSignal((d) => d.answer));
    socket?.on('call:ice-candidate', handleSignal((d) => d.candidate));

    return () => {
      socket?.off('call:offer');
      socket?.off('call:answer');
      socket?.off('call:ice-candidate');
    };
  }, []);

  const endCall = useCallback(() => {
    const targetId = callState?.targetId || incomingCall?.from;
    socket?.emit('call:end', { targetId });
    cleanup();
  }, [callState, incomingCall, socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => { t.enabled = muted; });
      setMuted(!muted);
    }
  }, [stream, muted]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#1e1f22] border-t border-[#35373c] call-overlay">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connecting ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
          <div>
            <span className="text-white text-sm font-semibold">
              {error ? error : connecting ? 'Connecting...' : 'Connected'}
            </span>
            {!connecting && !error && (
              <span className="text-[#6d6f78] text-xs ml-2 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Voice call active
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition ${muted ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#383a40] text-[#6d6f78] hover:text-white hover:bg-[#4e5058]'}`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg shadow-red-500/20"
            title="End call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
      <audio ref={localAudioRef} muted autoPlay />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}
