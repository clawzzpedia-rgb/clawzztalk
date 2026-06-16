import React, { useEffect, useState } from 'react';
import useStore from '../store';
import { Shield, Users, Server, Activity, Microscope, X, Ban, Trash2, Crown, Play, Square, Mic } from 'lucide-react';

const API_BASE = '/api/admin';

async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
    ...opts
  });
  return res.json();
}

export default function AdminPanel() {
  const { user, setShowAdmin, socket, currentServer, currentChannel, recordingChannels, setRecordingChannels, setAdminUsers, setAdminServers, setAdminLogs, setAdminRecordings, adminUsers, adminServers, adminLogs, adminRecordings } = useStore();
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (!user?.is_admin) return;
    api(`${API_BASE}/users`).then(setAdminUsers);
    api(`${API_BASE}/servers`).then(setAdminServers);
    api(`${API_BASE}/logs`).then(setAdminLogs);
    api(`${API_BASE}/recordings`).then(setAdminRecordings);
  }, []);

  const toggleBan = async (id) => {
    const res = await api(`${API_BASE}/users/${id}/toggle-ban`, { method: 'POST' });
    if (res.banned !== undefined) {
      api(`${API_BASE}/users`).then(setAdminUsers);
    }
  };

  const toggleAdmin = async (id) => {
    const res = await api(`${API_BASE}/users/${id}/toggle-admin`, { method: 'POST' });
    if (res.is_admin !== undefined) {
      api(`${API_BASE}/users`).then(setAdminUsers);
    }
  };

  const deleteServer = async (id) => {
    if (!confirm('Delete this server permanently?')) return;
    await api(`${API_BASE}/servers/${id}`, { method: 'DELETE' });
    api(`${API_BASE}/servers`).then(setAdminServers);
  };

  const startRecording = async () => {
    if (!currentChannel) return alert('Select a channel first');
    const res = await api(`${API_BASE}/recordings`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: currentChannel.id, server_id: currentChannel.server_id }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.id) {
      socket?.emit('admin:recording-start', { channel_id: currentChannel.id, recording_id: res.id, started_by: user?.username });
      api(`${API_BASE}/recordings`).then(setAdminRecordings);
    }
  };

  const stopRecording = async (id, channelId) => {
    await api(`${API_BASE}/recordings/${id}/stop`, { method: 'POST' });
    socket?.emit('admin:recording-stop', { channel_id: channelId });
    api(`${API_BASE}/recordings`).then(setAdminRecordings);
  };

  const isRecording = recordingChannels.some(r => r.channel_id === currentChannel?.id);

  if (!user?.is_admin) return null;

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'logs', label: 'Activity', icon: Activity },
    { id: 'recordings', label: 'Recordings', icon: Mic }
  ];

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="w-72 bg-[#111214] border-r border-[#1e1f22] flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#1e1f22]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#5865f2]" />
            <span className="text-white font-bold text-sm">Admin Panel</span>
          </div>
          <button onClick={() => setShowAdmin(false)} className="text-[#6d6f78] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                tab === t.id ? 'bg-[#2b2d31] text-white border-l-2 border-[#5865f2]' : 'text-[#6d6f78] hover:bg-[#1e1f22] hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        {currentChannel && (
          <div className="p-3 border-t border-[#1e1f22]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#6d6f78] text-xs font-semibold uppercase tracking-wide">Channel Recorder</span>
              {isRecording && <span className="flex items-center gap-1 text-red-400 text-xs"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />REC</span>}
            </div>
            <p className="text-white text-xs mb-2 truncate">#{currentChannel?.name}</p>
            {!isRecording ? (
              <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded font-semibold transition">
                <Mic className="w-3.5 h-3.5" /> Start Recording
              </button>
            ) : (
              <button onClick={() => {
                const rec = recordingChannels.find(r => r.channel_id === currentChannel.id);
                if (rec) stopRecording(rec.recording_id, rec.channel_id);
              }} className="w-full flex items-center justify-center gap-2 bg-[#383a40] hover:bg-[#4e5058] text-white text-xs py-2 rounded font-semibold transition">
                <Square className="w-3.5 h-3.5" /> Stop Recording
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#1a1a1e] overflow-y-auto">
        {tab === 'users' && (
          <div className="p-6">
            <h2 className="text-white text-lg font-bold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6d6f78] text-xs uppercase tracking-wide border-b border-[#2b2d31]">
                    <th className="text-left py-3 px-2">Username</th>
                    <th className="text-left py-3 px-2">Email</th>
                    <th className="text-center py-3 px-2">Admin</th>
                    <th className="text-center py-3 px-2">Banned</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[#2b2d31] hover:bg-[#2b2d31]/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold">{u.username[0]?.toUpperCase()}</div>
                          <span className="text-white">{u.username}</span>
                          {u.is_admin ? <Shield className="w-3.5 h-3.5 text-[#5865f2]" /> : null}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#6d6f78]">{u.email}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.is_admin ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'text-[#6d6f78]'}`}>
                          {u.is_admin ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.banned ? 'bg-red-500/20 text-red-400' : 'text-[#6d6f78]'}`}>
                          {u.banned ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => toggleBan(u.id)} className={`p-1.5 rounded hover:bg-[#383a40] ${u.banned ? 'text-green-400' : 'text-red-400'}`} title={u.banned ? 'Unban' : 'Ban'}>
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleAdmin(u.id)} className={`p-1.5 rounded hover:bg-[#383a40] ${u.is_admin ? 'text-yellow-400' : 'text-[#6d6f78]'}`} title={u.is_admin ? 'Remove admin' : 'Make admin'}>
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'servers' && (
          <div className="p-6">
            <h2 className="text-white text-lg font-bold mb-4">Server Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6d6f78] text-xs uppercase tracking-wide border-b border-[#2b2d31]">
                    <th className="text-left py-3 px-2">Name</th>
                    <th className="text-left py-3 px-2">Owner</th>
                    <th className="text-center py-3 px-2">Members</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminServers.map((s) => (
                    <tr key={s.id} className="border-b border-[#2b2d31] hover:bg-[#2b2d31]/50">
                      <td className="py-3 px-2 text-white">{s.name}</td>
                      <td className="py-3 px-2 text-[#6d6f78]">{s.owner_name}</td>
                      <td className="py-3 px-2 text-center text-[#6d6f78]">{s.member_count}</td>
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => deleteServer(s.id)} className="p-1.5 rounded hover:bg-[#383a40] text-red-400" title="Delete server">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="p-6">
            <h2 className="text-white text-lg font-bold mb-4">Activity Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6d6f78] text-xs uppercase tracking-wide border-b border-[#2b2d31]">
                    <th className="text-left py-3 px-2">User</th>
                    <th className="text-left py-3 px-2">Action</th>
                    <th className="text-left py-3 px-2">IP</th>
                    <th className="text-right py-3 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#2b2d31] hover:bg-[#2b2d31]/50">
                      <td className="py-3 px-2 text-white">{log.username}</td>
                      <td className="py-3 px-2">
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{log.action}</span>
                      </td>
                      <td className="py-3 px-2 text-[#6d6f78] font-mono text-xs">{log.ip || '-'}</td>
                      <td className="py-3 px-2 text-right text-[#6d6f78] text-xs">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'recordings' && (
          <div className="p-6">
            <h2 className="text-white text-lg font-bold mb-4">Voice Recordings</h2>
            {adminRecordings.length === 0 ? (
              <p className="text-[#6d6f78] text-sm">No recordings yet. Select a channel in the admin sidebar and click "Start Recording".</p>
            ) : (
              <div className="space-y-2">
                {adminRecordings.map((r) => (
                  <div key={r.id} className="bg-[#2b2d31] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Recording #{r.id.slice(0, 8)}</p>
                      <p className="text-[#6d6f78] text-xs">Started by {r.started_by_name} — {new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'active' ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-[#383a40] text-[#6d6f78]'}`}>
                      {r.status === 'active' ? '● LIVE' : 'STOPPED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
