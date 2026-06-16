import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store';
import { messageAPI } from '../api';
import Message from './Message';
import MessageInput from './MessageInput';
import { Phone, Video, Users, Mic } from 'lucide-react';

export default function ChatArea() {
  const { currentChannel, currentDM, messages, setMessages, socket, user, currentServer, onlineUsers, recordingChannels } = useStore();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef(null);
  const [typing, setTyping] = useState([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    if (currentChannel) {
      setLoading(true);
      messageAPI.getChannel(currentChannel.id).then((res) => {
        setMessages(res.data);
        setLoading(false);
      });
    } else if (currentDM) {
      setLoading(true);
      messageAPI.getDM(currentDM.dm_id).then((res) => {
        setMessages(res.data);
        setLoading(false);
      });
    }
  }, [currentChannel?.id, currentDM?.dm_id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.channel_id === currentChannel?.id) {
        if (data.typing) {
          setTyping((prev) => [...new Set([...prev, data.user])]);
        } else {
          setTyping((prev) => prev.filter((u) => u !== data.user));
        }
      }
    };
    socket.on('typing:update', handler);

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
    socket.on('admin:recording-start', recStart);
    socket.on('admin:recording-stop', recStop);

    return () => {
      socket.off('typing:update', handler);
      socket.off('admin:recording-start', recStart);
      socket.off('admin:recording-stop', recStop);
    };
  }, [socket, currentChannel?.id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (msg.channel_id === currentChannel?.id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    const handlerDM = (msg) => {
      if (msg.dm_id === currentDM?.dm_id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('message:new', handler);
    socket.on('dm:new', handlerDM);
    return () => {
      socket.off('message:new', handler);
      socket.off('dm:new', handlerDM);
    };
  }, [socket, currentChannel?.id, currentDM?.dm_id]);

  const startCall = (type) => {
    if (!currentDM || !socket) return;
    const targetId = currentDM.user_id;
    useStore.getState().setCallState({ type, targetId, active: false, peerAccepted: false, direction: 'outgoing' });
    socket.emit('call:start', { targetId, type });
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

        {messages.length === 0 && !loading && (
          <div className="text-center text-[#6d6f78] text-sm py-8">
            {currentChannel ? `#${currentChannel.name}` : currentDM?.username} — No messages yet
          </div>
        )}

        {messages.map((msg) => (
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
          <button
            onClick={() => startCall('audio')}
            className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-green-400 transition"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => startCall('video')}
            className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-green-400 transition"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      )}

      {currentServer && (
        <div className="absolute top-12 right-4 z-10">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-full text-[#6d6f78] hover:text-white transition"
            title="Show Members"
          >
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
                <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">
                  {m.username[0].toUpperCase()}
                </div>
                {(m.status === 'online' || isOnline(m.id)) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#2b2d31]" />
                )}
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
