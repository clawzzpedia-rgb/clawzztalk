import React from 'react';
import useStore from '../store';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCall() {
  const { incomingCall, setIncomingCall, setCallState, socket, user } = useStore();

  const accept = (type) => {
    setCallState({ type: type || incomingCall?.type || 'audio', targetId: incomingCall.from, active: false, peerAccepted: false, direction: 'incoming' });
    socket?.emit('call:accept', { targetId: incomingCall.from });
    setIncomingCall(null);
  };

  const reject = () => {
    socket?.emit('call:reject', { targetId: incomingCall.from });
    setIncomingCall(null);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-[#2b2d31] rounded-xl p-8 shadow-2xl text-center w-80 border border-[#1e1f22]">
        <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 animate-pulse">
          {incomingCall?.fromUsername?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 className="text-white text-lg font-bold mb-1">{incomingCall?.fromUsername || 'Someone'}</h2>
        <p className="text-[#6d6f78] text-sm mb-6">
          Incoming {incomingCall?.type === 'video' ? 'video' : 'voice'} call
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reject}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <button
            onClick={() => accept(incomingCall?.type)}
            className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition shadow-lg"
          >
            {incomingCall?.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
