import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store';
import SimplePeer from 'simple-peer';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from 'lucide-react';

export default function VideoCall() {
  const { callState, setCallState, socket, incomingCall, setIncomingCall } = useStore();
  const peerRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
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

  const flushIce = useCallback(() => {
    while (iceQueue.current.length && peerRef.current) {
      peerRef.current.signal(iceQueue.current.shift());
    }
  }, []);

  useEffect(() => {
    const isInitiator = callState?.direction === 'outgoing';
    const targetId = callState?.targetId || incomingCall?.from;

    navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } })
      .then((s) => {
        setStream(s);
        if (localRef.current) localRef.current.srcObject = s;

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

        peer.on('connect', () => {
          setConnecting(false);
          setError('');
        });

        peer.on('stream', (remoteStream) => {
          if (remoteRef.current) {
            remoteRef.current.srcObject = remoteStream;
            remoteRef.current.play().catch(() => {});
          }
        });

        peer.on('close', () => cleanup());
        peer.on('error', (e) => { setError('Connection lost: ' + e.message); });

        peerRef.current = peer;
        flushIce();
      })
      .catch((e) => {
        setError('Camera/mic access denied: ' + e.message);
        setTimeout(() => cleanup(), 3000);
      });

    const handleSignal = (prefix, extract) => (data) => {
      if (data.from === targetId) {
        if (peerRef.current) {
          peerRef.current.signal(extract(data));
        } else {
          iceQueue.current.push(extract(data));
        }
      }
    };

    socket?.on('call:offer', handleSignal('offer', (d) => d.offer));
    socket?.on('call:answer', handleSignal('answer', (d) => d.answer));
    socket?.on('call:ice-candidate', handleSignal('ice', (d) => d.candidate));

    return () => {
      socket?.off('call:offer');
      socket?.off('call:answer');
      socket?.off('call:ice-candidate');
    };
  }, []);

  const replaceTrack = (newStream) => {
    if (!peerRef.current || !peerRef.current._pc) return;
    const senders = peerRef.current._pc.getSenders();
    newStream.getVideoTracks().forEach((newTrack) => {
      const sender = senders.find((s) => s.track?.kind === newTrack.kind);
      if (sender) sender.replaceTrack(newTrack);
    });
    if (localRef.current) localRef.current.srcObject = newStream;
    setStream(newStream);
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenShare) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        displayStream.getVideoTracks()[0].onended = () => {
          navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then((s) => { replaceTrack(s); })
            .catch(() => {});
          setScreenShare(false);
        };
        replaceTrack(displayStream);
        setScreenShare(true);
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        replaceTrack(camStream);
        setScreenShare(false);
      }
    } catch (e) {
      setError('Screen share failed: ' + e.message);
    }
  };

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

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => { t.enabled = videoOff; });
      setVideoOff(!videoOff);
    }
  }, [stream, videoOff]);

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center bg-[#1a1a1e]">
        {error ? (
          <div className="text-center p-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
            {connecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1e]/80 z-10">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-3 animate-pulse border-2 border-[#5865f2]">
                    <Video className="w-8 h-8 text-[#5865f2]" />
                  </div>
                  <p className="text-white text-sm">Connecting to <span className="font-semibold">{callState?.targetUsername || incomingCall?.fromUsername || 'user'}</span>...</p>
                  <p className="text-[#6d6f78] text-xs mt-1">Establishing secure peer connection</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-[#35373c] shadow-xl z-20">
              <video ref={localRef} muted autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {videoOff && (
                <div className="absolute inset-0 bg-[#2b2d31] flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-[#6d6f78]" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 py-3 bg-[#1e1f22]">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition ${muted ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#383a40] text-[#6d6f78] hover:text-white hover:bg-[#4e5058]'}`}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition ${videoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#383a40] text-[#6d6f78] hover:text-white hover:bg-[#4e5058]'}`}
          title={videoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition ${screenShare ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[#383a40] text-[#6d6f78] hover:text-white hover:bg-[#4e5058]'}`}
          title={screenShare ? 'Stop sharing' : 'Share screen'}
        >
          {screenShare ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
        <div className="w-px h-8 bg-[#383a40]" />
        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg shadow-red-500/20"
          title="End call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
