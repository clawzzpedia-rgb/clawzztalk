import React from 'react';

export default function EmojiPicker({ emojis, onSelect, onClose }) {
  return (
    <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-2xl w-72">
      <div className="p-2 border-b border-[#1e1f22] flex items-center justify-between">
        <span className="text-white text-xs font-semibold uppercase tracking-wide">Emojis</span>
        <button onClick={onClose} className="text-[#6d6f78] hover:text-white text-xs">Close</button>
      </div>
      <div className="emoji-picker max-h-60 overflow-y-auto">
        {emojis.map((emoji, i) => (
          <button key={i} onClick={() => onSelect(emoji)} className="hover:bg-[#383a40]">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
