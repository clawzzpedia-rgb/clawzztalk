import React, { useState, useRef, useCallback } from 'react';
import useStore from '../store';
import { messageAPI, uploadAPI } from '../api';
import EmojiPicker from './EmojiPicker';
import { Smile, Plus } from 'lucide-react';

const EMOJIS = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','💪','🔥','❤️','💔','💖','💙','💚','💛','💜','🖤','💯','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🎀','🌸','🌺','🌻','🌹','🌷','💐','🍕','🍔','🌮','🍣','🍩','🍪','☕','🍺','🍻','🥂','🎵','🎶','🎤','🎧','📱','💻','⌚️','📸','🎮','🕹️','🎲','🏆','🥇','🥈','🥉','⚽️','🏀','🏈','⚾️','🎾','🚗','🚕','🚙','🚀','✈️','🏠','🌈','☀️','🌙','💡','📚','🔑','🛡️','💎','🧊','🗿','🎭','🎨'];

export default function MessageInput() {
  const { currentChannel, currentDM, socket, user } = useStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const typingTimeout = useRef(null);
  const [sending, setSending] = useState(false);

  const handleTyping = useCallback(() => {
    if (!currentChannel || !socket) return;
    socket.emit('typing:start', { channel_id: currentChannel.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { channel_id: currentChannel.id });
    }, 2000);
  }, [currentChannel, socket]);

  const addOptimistic = useCallback((msg) => {
    const store = useStore.getState();
    const { messages } = store;
    if (!Array.isArray(messages)) { store.setMessages([msg]); return; }
    if (messages.some(m => m.id === msg.id)) return;
    store.setMessages([...messages, msg]);
  }, []);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    const content = text;
    setText('');
    setSending(true);

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    if (currentChannel) {
      addOptimistic({
        id: tempId, channel_id: currentChannel.id, user_id: user?.id,
        content, file_url: null, file_type: null, created_at: new Date().toISOString(),
        username: user?.username, avatar: user?.avatar
      });

      try {
        const res = await messageAPI.sendChannel(currentChannel.id, { content });
        socket?.emit('message:send', { ...res.data, channel_id: currentChannel.id });
        const store = useStore.getState();
        store.setMessages((store.messages || []).map(m => m.id === tempId ? res.data : m));
      } catch (e) {
        const store = useStore.getState();
        store.setMessages((store.messages || []).filter(m => m.id !== tempId));
        setText(content);
        console.error('Send failed:', e);
      }
    } else if (currentDM) {
      addOptimistic({
        id: tempId, dm_id: currentDM.dm_id, user_id: user?.id,
        content, file_url: null, file_type: null, created_at: new Date().toISOString(),
        username: user?.username, avatar: user?.avatar
      });

      try {
        const res = await messageAPI.sendDM(currentDM.dm_id, { content });
        socket?.emit('dm:send', { ...res.data, dm_id: currentDM.dm_id });
        const store = useStore.getState();
        store.setMessages((store.messages || []).map(m => m.id === tempId ? res.data : m));
      } catch (e) {
        const store = useStore.getState();
        store.setMessages((store.messages || []).filter(m => m.id !== tempId));
        setText(content);
        console.error('Send failed:', e);
      }
    }
    setSending(false);
  }, [text, sending, currentChannel, currentDM, user, socket, addOptimistic]);

  const handleFileSelect = useCallback(async (e) => {
    const selected = Array.from(e.target.files);
    e.target.value = '';
    if (selected.length === 0) return;

    for (const file of selected) {
      setUploading(true);
      try {
        const uploadRes = await uploadAPI.upload(file);
        if (currentChannel) {
          const msg = await messageAPI.sendChannel(currentChannel.id, { content: '', file_url: uploadRes.data.file_url, file_type: uploadRes.data.file_type });
          socket?.emit('message:send', { ...msg.data, channel_id: currentChannel.id });
        } else if (currentDM) {
          const msg = await messageAPI.sendDM(currentDM.dm_id, { content: '', file_url: uploadRes.data.file_url, file_type: uploadRes.data.file_type });
          socket?.emit('dm:send', { ...msg.data, dm_id: currentDM.dm_id });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  }, [currentChannel, currentDM, socket]);

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-1 bg-[#313338] relative">
      {showEmoji && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker emojis={EMOJIS} onSelect={addEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <div className="flex items-end gap-1 bg-[#383a40] rounded-lg px-3 py-1">
        <button onClick={() => fileRef.current?.click()} className="p-1.5 text-[#6d6f78] hover:text-[#dbdee1] transition flex-shrink-0" title="Attach file">
          <Plus className="w-5 h-5" />
        </button>
        <input type="file" ref={fileRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx,.txt" />

        <div className="flex-1 flex items-end">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={uploading ? 'Uploading...' : `Message ${currentChannel ? '#' + currentChannel.name : currentDM?.username || ''}`}
            className="w-full bg-transparent text-white text-sm py-2 resize-none focus:outline-none max-h-32 placeholder-[#6d6f78]"
            rows={1}
            disabled={uploading || sending}
          />
        </div>

        <button onClick={() => setShowEmoji(!showEmoji)} className={`p-1.5 transition flex-shrink-0 ${showEmoji ? 'text-[#5865f2]' : 'text-[#6d6f78] hover:text-[#dbdee1]'}`} title="Emoji">
          <Smile className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
