import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore, { setPendingStream } from '../store';
import { messageAPI } from '../api';
import Message from './Message';
import MessageInput from './MessageInput';
import { Phone, Video, Users, Mic } from 'lucide-react';

function notifyUser(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💬</text></svg>' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

function playRing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
    setTimeout(() => {
      const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
      const osc2 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx2.destination);
      osc2.frequency.value = 660;
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.8);
      osc2.stop(ctx2.currentTime + 0.8);
    }, 200);
  } catch (_) {}
}

function playMsgSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 520;
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

export default function ChatArea() {
  const { currentChannel, currentDM, messages, setMessages, socket, user, currentServer, onlineUsers, recordingChannels } = useStore();
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [typing, setTyping] = useState([]);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    setMessages([]);
    if (currentChannel) {
      setLoading(true);
      messageAPI.getChannel(currentChannel.id)
        .then((res) => { setMessages(Array.isArray(res.data) ? res.data : []); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (currentDM) {
      setLoading(true);
      messageAPI.getDM(currentDM.dm_id)
        .then((res) => { setMessages(Array.isArray(res.data) ? res.data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [currentChannel?.id, currentDM?.dm_id]);

  const handlerRef = useRef(null);

  const safeMsg = useCallback((prev, msg) => {
    if (!Array.isArray(prev)) return [msg];
    if (prev.some(m => m.id === msg.id)) return prev;
    return [...prev, msg];
  }, []);

  useEffect(() => {
    if (!socket) return;
    if (handlerRef.current) { socket.off('message:new', handlerRef.current); socket.off('dm:new', handlerRef.current); }

    handlerRef.current = (msg) => {
      if (!msg) return;
      const isChannel = msg.channel_id && msg.channel_id === currentChannel?.id;
      const isDM = msg.dm_id && msg.dm_id === currentDM?.dm_id;
      if (!isChannel && !isDM) return;

      setMessages((prev) => safeMsg(prev, msg));

      if (msg.user_id !== user?.id) {
        playMsgSound();
        if (msg.content) notifyUser(msg.username || 'Message', msg.content);
      }
    };

    socket.on('message:new', handlerRef.current);
    socket.on('dm:new', handlerRef.current);
    return () => { socket.off('message:new', handlerRef.current); socket.off('dm:new', handlerRef.current); };
  }, [socket, currentChannel?.id, currentDM?.dm_id, user?.id, safeMsg]);

  useEffect(() => {
    if (!socket) return;
    const typingHandler = (data) => {
      if (data.channel_id === currentChannel?.id) {
        if (data.typing) setTyping((prev) => [...new Set([...prev, data.user])]);
        else setTyping((prev) => prev.filter((u) => u !== data.user));
      }
    };
    const recStart = (data) => {
      useStore.getState().setRecordingChannels(
        [...useStore.getState().recordingChannels.filter(r => r.channel_id !== data.channel_id), data]
      );
    };
    const recStop = (data) => {
      useStore.getState().setRecordingChannels(
        useStore.getState().recordingChannels.filter(r => r.channel_id !== data.channel_id)
      );
    };
    socket.on('typing:update', typingHandler);
    socket.on('admin:recording-start', recStart);
    socket.on('admin:recording-stop', recStop);
    return () => {
      socket.off('typing:update', typingHandler);
      socket.off('admin:recording-start', recStart);
      socket.off('admin:recording-stop', recStop);
    };
  }, [socket, currentChannel?.id]);

  useEffect(() => {
    if (!socket) return;
    const callIncoming = () => playRing();
    socket.on('call:incoming', callIncoming);
    return () => socket.off('call:incoming', callIncoming);
  }, [socket]);

  const startCall = async (type) => {
    if (!currentDM || !socket) return;
    const targetId = currentDM.user_id || currentDM.id;
    if (!targetId) return;
    try {
      const constraints = type === 'video' ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPendingStream(stream);
      useStore.getState().setCallState({ type, targetId, active: false, peerAccepted: false, direction: 'outgoing' });
      socket.emit('call:start', { targetId, type });
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'Microphone/camera access denied' : e.name === 'NotFoundError' ? 'No microphone/camera found' : e.message;
      alert('Media error: ' + msg);
    }
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  if (!currentChannel && !currentDM) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#6d6f78]" />
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">Select a conversation</h2>
          <p className="text-[#6d6f78] text-sm">Choose a channel or DM from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading && <div className="text-center text-[#6d6f78] text-sm py-8">Loading messages...</div>}

        {!loading && (!Array.isArray(messages) || messages.length === 0) && (
          <div className="text-center text-[#6d6f78] text-sm py-8">
            {currentChannel ? `#${currentChannel.name}` : currentDM?.username} — No messages yet
          </div>
        )}

        {Array.isArray(messages) && messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {currentChannel && recordingChannels.some(r => r.channel_id === currentChannel.id) && (
        <div className="px-4 py-1.5 bg-red-900/20 border-t border-red-900/30 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-semibold">
            {recordingChannels.find(r => r.channel_id === currentChannel.id)?.started_by || 'Admin'} is recording this channel
          </span>
          <Mic className="w-3 h-3 text-red-400" />
        </div>
      )}

      {typing.length > 0 && (
        <div className="px-4 py-1 text-xs text-[#6d6f78] italic">
          {typing.join(', ')} typing...
        </div>
      )}

      <MessageInput />

      {currentDM && (
        <div className="absolute top-12 right-4 z-10 flex gap-1">
          <button onClick={() => startCall('audio')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-green-400 transition" title="Voice Call">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => startCall('video')} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-green-400 transition" title="Video Call">
            <Video className="w-4 h-4" />
          </button>
        </div>
      )}

      {currentServer && (
        <div className="absolute top-12 right-4 z-10">
          <button onClick={() => setShowMembers(!showMembers)} className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-white transition" title="Show Members">
            <Users className="w-4 h-4" />
          </button>
        </div>
      )}

      {showMembers && currentServer && (
        <div className="absolute top-14 right-2 w-56 bg-[#2b2d31] rounded-lg shadow-xl border border-[#1e1f22] z-20 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-[#1e1f22]">
            <h3 className="text-white text-sm font-semibold">Members — {currentServer.members?.length || 0}</h3>
          </div>
          {currentServer.members?.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#35373c]">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">{m.username[0].toUpperCase()}</div>
                {(m.status === 'online' || isOnline(m.id)) && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#2b2d31]" />}
              </div>
              <div>
                <p className="text-white text-sm">{m.username}</p>
                <p className="text-[#6d6f78] text-xs capitalize">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
