import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store';
import SimplePeer from 'simple-peer';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export default function VideoCall() {
  const { callState, setCallState, socket, incomingCall, setIncomingCall } = useStore();
  const peerRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [stream, setStream] = useState(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    const isInitiator = callState?.direction === 'outgoing';
    const targetId = callState?.targetId || incomingCall?.from;

    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then((s) => {
        setStream(s);
        if (localRef.current) localRef.current.srcObject = s;

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

        peer.on('connect', () => setConnecting(false));

        peer.on('stream', (remoteStream) => {
          if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
        });

        peer.on('close', () => cleanup());
        peer.on('error', () => cleanup());

        peerRef.current = peer;
      })
      .catch(() => setCallState(null));

    const handleOffer = (data) => {
      if (data.from === targetId && peerRef.current) peerRef.current.signal(data.offer);
    };
    const handleAnswer = (data) => {
      if (data.from === targetId && peerRef.current) peerRef.current.signal(data.answer);
    };
    const handleIce = (data) => {
      if (data.from === targetId && peerRef.current) peerRef.current.signal(data.candidate);
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

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => { t.enabled = videoOff; });
      setVideoOff(!videoOff);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center bg-[#1a1a1e]">
        <video ref={remoteRef} autoPlay playsInline className="max-w-full max-h-full object-contain" />
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Video className="w-8 h-8 text-[#5865f2]" />
              </div>
              <p className="text-white text-sm">Waiting for {callState?.targetUsername || 'user'} to connect...</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 right-4 w-36 h-24 rounded-lg overflow-hidden border-2 border-[#35373c] shadow-lg">
          <video ref={localRef} muted autoPlay playsInline className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 py-4 bg-[#1e1f22]">
        <button onClick={toggleMute} className={`p-3 rounded-full transition ${muted ? 'bg-red-500 text-white' : 'bg-[#383a40] text-[#6d6f78] hover:text-white'}`}>
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={endCall} className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition">
          <PhoneOff className="w-5 h-5" />
        </button>
        <button onClick={toggleVideo} className={`p-3 rounded-full transition ${videoOff ? 'bg-red-500 text-white' : 'bg-[#383a40] text-[#6d6f78] hover:text-white'}`}>
          {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
