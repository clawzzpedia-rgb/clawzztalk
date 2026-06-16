import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store';
import SimplePeer from 'simple-peer';
import { PhoneOff, Mic, MicOff } from 'lucide-react';

export default function VoiceCall() {
  const { callState, setCallState, socket, user, incomingCall, setIncomingCall } = useStore();
  const peerRef = useRef(null);
  const localAudioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [stream, setStream] = useState(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    const isInitiator = callState?.direction === 'outgoing';
    const targetId = callState?.targetId || incomingCall?.from;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((s) => {
        setStream(s);
        if (localAudioRef.current) localAudioRef.current.srcObject = s;

        const peer = new SimplePeer({ initiator: isInitiator, trickle: true, stream: s });

        peer.on('signal', (data) => {
          if (data.type === 'offer') {
            socket?.emit('call:offer', { targetId, offer: data });
          } else if (data.type === 'answer') {
            socket?.emit('call:answer', { targetId, answer: data });
          } else if (data.candidate) {
            socket?.emit('call:ice-candidate', { targetId, candidate: data });
          }
        });

        peer.on('connect', () => {
          setConnecting(false);
        });

        peer.on('stream', (remoteStream) => {
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.play();
        });

        peer.on('close', () => {
          cleanup();
        });

        peer.on('error', () => {
          cleanup();
        });

        peerRef.current = peer;
      })
      .catch(() => {
        setCallState(null);
      });

    const handleOffer = (data) => {
      if (data.from === targetId && peerRef.current) {
        peerRef.current.signal(data.offer);
      }
    };
    const handleAnswer = (data) => {
      if (data.from === targetId && peerRef.current) {
        peerRef.current.signal(data.answer);
      }
    };
    const handleIce = (data) => {
      if (data.from === targetId && peerRef.current) {
        peerRef.current.signal(data.candidate);
      }
    };

    socket?.on('call:offer', handleOffer);
    socket?.on('call:answer', handleAnswer);
    socket?.on('call:ice-candidate', handleIce);

    return () => {
      socket?.off('call:offer', handleOffer);
      socket?.off('call:answer', handleAnswer);
      socket?.off('call:ice-candidate', handleIce);
    };
  }, []);

  const cleanup = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (peerRef.current) peerRef.current.destroy();
    setCallState(null);
    setIncomingCall(null);
  };

  const endCall = () => {
    const targetId = callState?.targetId || incomingCall?.from;
    socket?.emit('call:end', { targetId });
    cleanup();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => { t.enabled = muted; });
      setMuted(!muted);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#1e1f22] border-t border-[#35373c]">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm font-semibold">
            {connecting ? 'Connecting...' : 'Connected'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition ${muted ? 'bg-red-500 text-white' : 'bg-[#383a40] text-[#6d6f78] hover:text-white hover:bg-[#4e5058]'}`}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
      <audio ref={localAudioRef} muted autoPlay />
    </div>
  );
}
