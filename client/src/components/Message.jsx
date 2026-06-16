import React from 'react';
import useStore from '../store';
import { Trash2, FileText } from 'lucide-react';

export default function Message({ message }) {
  const { user, socket, setProfileUser } = useStore();
  const isOwn = message.user_id === user?.id;
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleDelete = () => {
    if (!confirm('Delete this message?')) return;
    socket?.emit('message:delete', { message_id: message.id, channel_id: message.channel_id });
  };

  const isImage = message.file_type?.startsWith('image/');
  const isVideo = message.file_type?.startsWith('video/');

  return (
    <div className={`flex gap-3 px-4 py-1.5 hover:bg-[#2e3035] group message-fade-in ${isOwn ? '' : ''}`}>
      <div onClick={() => setProfileUser({ id: message.user_id, username: message.username, avatar: message.avatar, status: message.status || 'offline' })} className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition">
        {message.username?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white hover:underline cursor-pointer">
            {message.username}
          </span>
          <span className="text-xs text-[#6d6f78]">{time}</span>
          {isOwn && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-[#6d6f78] hover:text-red-400 transition ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {message.content && <p className="text-[#dbdee1] text-sm mt-0.5 whitespace-pre-wrap break-words">{message.content}</p>}
        {message.file_url && (
          <div className="mt-1 max-w-md">
            {isImage ? (
              <img
                src={message.file_url}
                alt="Shared image"
                className="max-h-80 rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(message.file_url, '_blank')}
              />
            ) : isVideo ? (
              <video controls className="max-h-80 rounded-lg" src={message.file_url} />
            ) : (
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#2b2d31] px-3 py-2 rounded-lg hover:bg-[#35373c] transition text-sm text-[#dbdee1]"
              >
                <FileText className="w-4 h-4 text-[#5865f2]" />
                <span>Download file</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
