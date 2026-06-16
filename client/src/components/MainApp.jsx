import React, { useEffect, useState, useRef } from 'react';
import useStore from '../store';
import { serverAPI, userAPI } from '../api';
import ServerList from './ServerList';
import ChannelList from './ChannelList';
import ChatArea from './ChatArea';
import VoiceCall from './VoiceCall';
import VideoCall from './VideoCall';
import IncomingCall from './IncomingCall';
import { Search, Plus, Users, Hash, LogOut } from 'lucide-react';

export default function MainApp() {
  const { user, servers, setServers, setCurrentServer, currentServer, currentChannel, currentDM, dms, setDMs, callState, incomingCall, socket, logout, setCurrentDM } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [serverName, setServerName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [showDM, setShowDM] = useState(false);

  useEffect(() => {
    serverAPI.list().then((res) => setServers(res.data));
    userAPI.getDM().then((res) => setDMs(res.data));
  }, []);

  const createServer = async () => {
    if (!serverName.trim()) return;
    const res = await serverAPI.create({ name: serverName });
    setServers([...servers, res.data]);
    setShowCreate(false);
    setServerName('');
  };

  const searchServers = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) { setSearchResults([]); return; }
    const res = await serverAPI.search(q);
    setSearchResults(res.data);
  };

  const joinServer = async (id) => {
    await serverAPI.join(id);
    const res = await serverAPI.list();
    setServers(res.data);
    setShowSearch(false);
    setSearchQuery('');
  };

  const searchUsers = async (q) => {
    setUserQuery(q);
    if (q.length < 1) { setUserResults([]); return; }
    const res = await userAPI.search(q);
    setUserResults(res.data);
  };

  const startDM = async (userId) => {
    const res = await userAPI.startDM(userId);
    setDMs([...dms, { dm_id: res.data.dm_id, ...res.data.user }]);
    setCurrentDM({ dm_id: res.data.dm_id, ...res.data.user });
    setShowUserSearch(false);
    setUserQuery('');
    setShowDM(true);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-full w-full flex bg-[#313338]">
      <ServerList />
      <ChannelList />
      <div className="flex-1 flex flex-col">
        {currentServer && !currentDM && (
          <div className="h-12 flex items-center px-4 border-b border-[#1f2023] bg-[#313338] shadow-sm">
            <Hash className="w-5 h-5 text-[#6d6f78] mr-2" />
            <span className="font-semibold text-white text-sm">{currentChannel?.name || 'general'}</span>
          </div>
        )}
        {currentDM && (
          <div className="h-12 flex items-center px-4 border-b border-[#1f2023] bg-[#313338] shadow-sm">
            <div className="w-7 h-7 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold mr-2">
              {currentDM.username?.[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-white text-sm">{currentDM.username}</span>
            {currentDM.status === 'online' && <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />}
          </div>
        )}
        <ChatArea />
      </div>

      {callState?.type === 'audio' && <VoiceCall />}
      {callState?.type === 'video' && <VideoCall />}
      {incomingCall && <IncomingCall />}

      {showCreate && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-[#2b2d31] rounded-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg mb-4">Create Server</h2>
            <input
              autoFocus
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createServer()}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded mb-3 text-sm border border-transparent focus:border-[#5865f2] focus:outline-none"
              placeholder="Server name"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="text-[#b5bac1] text-sm hover:underline">Cancel</button>
              <button onClick={createServer} className="bg-[#5865f2] text-white text-sm px-4 py-1.5 rounded hover:bg-[#4752c4]">Create</button>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="absolute inset-0 bg-black/60 flex items-start justify-center pt-20 z-50" onClick={() => setShowSearch(false)}>
          <div className="bg-[#2b2d31] rounded-lg p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold mb-3">Find Servers</h2>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => searchServers(e.target.value)}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded mb-2 text-sm border border-transparent focus:border-[#5865f2] focus:outline-none"
              placeholder="Search servers..."
            />
            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 hover:bg-[#383a40] rounded cursor-pointer" onClick={() => joinServer(s.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">
                      {s.name[0].toUpperCase()}
                    </div>
                    <span className="text-white text-sm">{s.name}</span>
                  </div>
                  <button className="text-xs bg-[#5865f2] text-white px-2 py-1 rounded hover:bg-[#4752c4]">Join</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showUserSearch && (
        <div className="absolute inset-0 bg-black/60 flex items-start justify-center pt-20 z-50" onClick={() => setShowUserSearch(false)}>
          <div className="bg-[#2b2d31] rounded-lg p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold mb-3">New Message</h2>
            <input
              autoFocus
              value={userQuery}
              onChange={(e) => searchUsers(e.target.value)}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded mb-2 text-sm border border-transparent focus:border-[#5865f2] focus:outline-none"
              placeholder="Search users..."
            />
            <div className="max-h-60 overflow-y-auto">
              {userResults.map((u) => (
                <div key={u.id} className="flex items-center gap-2 p-2 hover:bg-[#383a40] rounded cursor-pointer" onClick={() => startDM(u.id)}>
                  <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold relative">
                    {u.username[0].toUpperCase()}
                    {u.status === 'online' && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#2b2d31]" />}
                  </div>
                  <div>
                    <p className="text-white text-sm">{u.username}</p>
                    <p className="text-[#6d6f78] text-xs capitalize">{u.status || 'offline'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
