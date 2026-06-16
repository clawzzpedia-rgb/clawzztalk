import React, { useState, useRef } from 'react';
import useStore from '../store';
import { messageAPI, uploadAPI } from '../api';
import EmojiPicker from './EmojiPicker';
import { Smile, Plus, X } from 'lucide-react';

const EMOJIS = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','💪','🔥','❤️','💔','💖','💙','💚','💛','💜','🖤','💯','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🎀','🌸','🌺','🌻','🌹','🌷','💐','🍕','🍔','🌮','🍣','🍩','🍪','☕','🍺','🍻','🥂','🎵','🎶','🎤','🎧','📱','💻','⌚️','📸','🎮','🕹️','🎲','🏆','🥇','🥈','🥉','⚽️','🏀','🏈','⚾️','🎾','🚗','🚕','🚙','🚀','✈️','🏠','🌈','☀️','🌙','💡','📚','🔑','🛡️','💎','🧊','🗿','🎭','🎨'];

export default function MessageInput() {
  const { currentChannel, currentDM, socket, user } = useStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const typingTimeout = useRef(null);

  const handleTyping = () => {
    if (!currentChannel || !socket) return;
    socket.emit('typing:start', { channel_id: currentChannel.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { channel_id: currentChannel.id });
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text;
    setText('');

    try {
      if (currentChannel) {
        const res = await messageAPI.sendChannel(currentChannel.id, { content });
        socket?.emit('message:send', { ...res.data, channel_id: currentChannel.id });
      } else if (currentDM) {
        const res = await messageAPI.sendDM(currentDM.dm_id, { content });
        socket?.emit('dm:send', { ...res.data, dm_id: currentDM.dm_id });
      }
    } catch (e) {
      console.error('Send failed:', e);
      setText(content);
    }
  };

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files);
    e.target.value = '';
    if (selected.length === 0) return;

    for (const file of selected) {
      setUploading(true);
      try {
        const res = await uploadAPI.upload(file);
        if (currentChannel) {
          const msg = await messageAPI.sendChannel(currentChannel.id, { content: '', file_url: res.data.file_url, file_type: res.data.file_type });
          socket?.emit('message:send', { ...msg.data, channel_id: currentChannel.id });
        } else if (currentDM) {
          const msg = await messageAPI.sendDM(currentDM.dm_id, { content: '', file_url: res.data.file_url, file_type: res.data.file_type });
          socket?.emit('dm:send', { ...msg.data, dm_id: currentDM.dm_id });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  };

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
            disabled={uploading}
          />
        </div>

        <button onClick={() => setShowEmoji(!showEmoji)} className={`p-1.5 transition flex-shrink-0 ${showEmoji ? 'text-[#5865f2]' : 'text-[#6d6f78] hover:text-[#dbdee1]'}`} title="Emoji">
          <Smile className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
