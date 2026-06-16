import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { serverAPI, userAPI, channelAPI } from '../api';
import { Hash, Plus, ChevronDown, ChevronRight, MessageCircle, Phone, Video, Search, UserPlus, LogOut } from 'lucide-react';

export default function ChannelList() {
  const { currentServer, setCurrentChannel, currentChannel, dms, setCurrentDM, currentDM, setDMs, user, setCurrentServer, servers, setServers, socket, onlineUsers, logout } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [chanName, setChanName] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState([]);

  useEffect(() => {
    userAPI.getDM().then((res) => setDMs(res.data));
  }, []);

  const createChannel = async () => {
    if (!chanName.trim() || !currentServer) return;
    const res = await channelAPI.create({ server_id: currentServer.id, name: chanName });
    const updated = await serverAPI.get(currentServer.id);
    setCurrentServer(updated.data);
    setShowCreate(false);
    setChanName('');
  };

  const searchUsers = async (q) => {
    setFriendQuery(q);
    if (q.length < 1) { setFriendResults([]); return; }
    const res = await userAPI.search(q);
    setFriendResults(res.data);
  };

  const startDM = async (userId) => {
    const res = await userAPI.startDM(userId);
    const exists = dms.find(d => d.user_id === userId);
    if (!exists) {
      setDMs([...dms, { dm_id: res.data.dm_id, ...res.data.user }]);
    }
    setCurrentDM({ dm_id: res.data.dm_id, ...res.data.user });
    setShowAddFriend(false);
    setFriendQuery('');
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col flex-shrink-0">
      {currentServer ? (
        <>
          <div className="h-12 flex items-center px-4 border-b border-[#1f2023] cursor-pointer hover:bg-[#35373c] transition group">
            <h2 className="font-bold text-white text-sm flex-1 truncate">{currentServer.name}</h2>
            <ChevronDown className="w-4 h-4 text-[#6d6f78]" />
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            <div className="flex items-center justify-between px-2 mb-1 group cursor-pointer" onClick={() => setShowCreate(!showCreate)}>
              <div className="flex items-center gap-1 text-[#6d6f78] group-hover:text-white transition">
                <ChevronDown className="w-3 h-3" />
                <span className="text-xs font-semibold uppercase tracking-wide">Text Channels</span>
              </div>
              <Plus className="w-4 h-4 text-[#6d6f78] group-hover:text-white" />
            </div>

            {currentServer.channels?.map((ch) => (
              <div
                key={ch.id}
                onClick={() => setCurrentChannel(ch)}
                className={`flex items-center px-2 py-1 rounded cursor-pointer group mb-0.5 ${
                  currentChannel?.id === ch.id ? 'bg-[#383a40] text-white' : 'text-[#6d6f78] hover:bg-[#35373c] hover:text-[#dbdee1]'
                }`}
              >
                <Hash className="w-4 h-4 mr-1.5 flex-shrink-0" />
                <span className="text-sm truncate">{ch.name}</span>
              </div>
            ))}

            {showCreate && (
              <div className="px-2 mt-1">
                <input
                  autoFocus
                  value={chanName}
                  onChange={(e) => setChanName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                  onBlur={() => { setTimeout(() => setShowCreate(false), 200); }}
                  className="w-full bg-[#1e1f22] text-white text-sm px-2 py-1 rounded border border-[#5865f2] focus:outline-none"
                  placeholder="new-channel"
                />
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-[#232428] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
              <p className="text-[#6d6f78] text-xs">Online</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowAddFriend(true)} className="p-1.5 hover:bg-[#35373c] rounded text-[#6d6f78] hover:text-[#dbdee1] transition" title="Add Friend">
                <UserPlus className="w-4 h-4" />
              </button>
              <button onClick={logout} className="p-1.5 hover:bg-[#35373c] rounded text-[#6d6f78] hover:text-red-400 transition" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="h-12 flex items-center px-4 border-b border-[#1f2023]">
            <h2 className="font-bold text-white text-sm">Direct Messages</h2>
          </div>

          <button
            onClick={() => setShowAddFriend(true)}
            className="mx-2 mt-2 flex items-center gap-2 px-2 py-1.5 rounded text-[#6d6f78] hover:bg-[#35373c] hover:text-[#dbdee1] transition text-sm mb-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>

          <div className="flex-1 overflow-y-auto px-2">
            {dms.map((dm) => (
              <div
                key={dm.dm_id}
                onClick={() => setCurrentDM(dm)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mb-0.5 ${
                  currentDM?.dm_id === dm.dm_id ? 'bg-[#383a40] text-white' : 'text-[#6d6f78] hover:bg-[#35373c] hover:text-[#dbdee1]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">
                    {dm.username?.[0]?.toUpperCase()}
                  </div>
                  {(dm.status === 'online' || isOnline(dm.user_id)) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#2b2d31]" />
                  )}
                </div>
                <span className="text-sm truncate">{dm.username}</span>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 bg-[#232428] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
              <p className="text-[#6d6f78] text-xs">Online</p>
            </div>
            <button onClick={logout} className="p-1.5 hover:bg-[#35373c] rounded text-[#6d6f78] hover:text-red-400 transition" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {showAddFriend && (
        <div className="absolute inset-0 bg-black/60 flex items-start justify-center pt-20 z-50" onClick={() => setShowAddFriend(false)}>
          <div className="bg-[#2b2d31] rounded-lg p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold mb-3">Add Friend</h2>
            <input
              autoFocus
              value={friendQuery}
              onChange={(e) => searchUsers(e.target.value)}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded mb-2 text-sm border border-transparent focus:border-[#5865f2] focus:outline-none"
              placeholder="Search by username..."
            />
            <div className="max-h-60 overflow-y-auto">
              {friendResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#383a40] rounded cursor-pointer" onClick={() => startDM(u.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="text-white text-sm">{u.username}</span>
                  </div>
                  <button className="text-xs bg-[#5865f2] text-white px-2 py-1 rounded hover:bg-[#4752c4]">Message</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
