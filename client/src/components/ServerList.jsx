import React, { useEffect } from 'react';
import useStore from '../store';
import { serverAPI } from '../api';
import { MessageCircle, Plus, Search, Compass, LogOut } from 'lucide-react';

export default function ServerList({ onShowCreate, onShowSearch }) {
  const { servers, setServers, setCurrentServer, currentServer, dms, setCurrentDM, currentDM, setDMs, user, logout } = useStore();

  useEffect(() => {
    serverAPI.list().then((res) => setServers(res.data));
  }, []);

  const handleDmClick = () => {
    setCurrentServer(null);
    setCurrentDM(null);
  };

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0">
      <div
        onClick={handleDmClick}
        className={`w-12 h-12 rounded-2xl hover:rounded-xl bg-[#5865f2] flex items-center justify-center cursor-pointer transition-all duration-200 group relative ${!currentServer && !currentDM ? 'rounded-xl' : ''}`}
        title="Direct Messages"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {!currentServer && !currentDM && <div className="absolute -left-3 w-1 h-8 bg-white rounded-r" />}
      </div>

      <div className="w-8 h-0.5 bg-[#35373c] rounded" />

      {servers.map((s) => (
        <div
          key={s.id}
          onClick={() => setCurrentServer(s)}
          className={`w-12 h-12 rounded-2xl hover:rounded-xl bg-[#35373c] flex items-center justify-center cursor-pointer transition-all duration-200 relative group ${currentServer?.id === s.id ? 'rounded-xl' : ''}`}
          title={s.name}
        >
          <span className="text-white font-semibold text-lg">{s.name[0]?.toUpperCase()}</span>
          {currentServer?.id === s.id && <div className="absolute -left-3 w-1 h-8 bg-white rounded-r" />}
        </div>
      ))}

      <div
        onClick={() => document.querySelector('[data-create-server]')?.click() || useStore.getState().setCurrentServer({ id: '__create' })}
        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-[#35373c] hover:bg-green-600 flex items-center justify-center cursor-pointer transition-all duration-200 group"
        title="Add Server"
        data-create-btn
      >
        <Plus className="w-6 h-6 text-green-500 group-hover:text-white transition" />
      </div>

      <div
        onClick={() => document.querySelector('[data-search-server]')?.click()}
        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-[#35373c] hover:bg-[#5865f2] flex items-center justify-center cursor-pointer transition-all duration-200 group"
        title="Explore Servers"
        data-search-btn
      >
        <Compass className="w-6 h-6 text-[#5865f2] group-hover:text-white transition" />
      </div>

      <div className="flex-1" />

      <div className="w-12 h-12 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-bold text-sm relative group cursor-default">
        {user?.username?.[0]?.toUpperCase()}
      </div>

      <button
        onClick={logout}
        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-[#35373c] hover:bg-red-600 flex items-center justify-center cursor-pointer transition-all duration-200 group"
        title="Logout"
      >
        <LogOut className="w-5 h-5 text-red-400 group-hover:text-white transition" />
      </button>
    </div>
  );
}
