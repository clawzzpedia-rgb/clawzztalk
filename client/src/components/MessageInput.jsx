import React, { useState, useRef } from 'react';
import useStore from '../store';
import { messageAPI, uploadAPI } from '../api';
import EmojiPicker from './EmojiPicker';
import { Smile, Plus, Paperclip, X, Image, Video } from 'lucide-react';

const EMOJIS = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','💪','🔥','❤️','💔','💖','💙','💚','💛','💜','🖤','💯','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🎀','🌸','🌺','🌻','🌹','🌷','💐','🍕','🍔','🌮','🍣','🍩','🍪','☕','🍺','🍻','🥂','🎵','🎶','🎤','🎧','📱','💻','⌚️','📸','🎮','🕹️','🎲','🏆','🥇','🥈','🥉','⚽️','🏀','🏈','⚾️','🎾','🚗','🚕','🚙','🚀','✈️','🏠','🌈','☀️','🌙','💡','📚','🔑','🛡️','💎','🧊','🗿','🎭','🎨'];

export default function MessageInput() {
  const { currentChannel, currentDM, socket, user } = useStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState([]);
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
    if (!text.trim() && files.length === 0) return;

    if (currentChannel) {
      const res = await messageAPI.sendChannel(currentChannel.id, { content: text, file_url: null, file_type: null });
      socket?.emit('message:send', { ...res.data, channel_id: currentChannel.id });
    } else if (currentDM) {
      const res = await messageAPI.sendDM(currentDM.dm_id, { content: text, file_url: null, file_type: null });
      socket?.emit('dm:send', { ...res.data, dm_id: currentDM.dm_id });
    }

    setText('');
    setFiles([]);
  };

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    e.target.value = '';

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
        console.error('Upload failed', err);
      }
      setUploading(false);
    }
    setFiles([]);
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
    <div className="px-4 pb-4 pt-1 bg-[#313338]">
      {showEmoji && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker emojis={EMOJIS} onSelect={addEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {files.map((f, i) => (
            <div key={i} className="relative flex-shrink-0">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} className="w-20 h-20 rounded object-cover" />
              ) : (
                <div className="w-20 h-20 rounded bg-[#2b2d31] flex items-center justify-center text-[#6d6f78] text-xs">
                  {f.name.slice(0, 10)}...
                </div>
              )}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1e1f22] rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1 bg-[#383a40] rounded-lg px-3 py-1">
        <button onClick={() => fileRef.current?.click()} className="p-1.5 text-[#6d6f78] hover:text-[#dbdee1] transition" title="Attach file">
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

        <button onClick={() => setShowEmoji(!showEmoji)} className={`p-1.5 transition ${showEmoji ? 'text-[#5865f2]' : 'text-[#6d6f78] hover:text-[#dbdee1]'}`} title="Emoji">
          <Smile className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
