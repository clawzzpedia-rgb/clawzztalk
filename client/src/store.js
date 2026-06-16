import { create } from 'zustand';
import { io } from 'socket.io-client';

const useStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  servers: [],
  currentServer: null,
  currentChannel: null,
  currentDM: null,
  dms: [],
  messages: [],
  onlineUsers: [],
  socket: null,
  loading: false,
  callState: null,
  incomingCall: null,
  showAdmin: false,
  recordingChannels: [],
  adminUsers: [],
  adminServers: [],
  adminLogs: [],
  adminRecordings: [],

  setUser: (user) => set({ user }),

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('token');
    if (get().socket) get().socket.disconnect();
    set({ user: null, token: null, servers: [], currentServer: null, currentChannel: null, currentDM: null, dms: [], messages: [], socket: null, showAdmin: false });
  },

  connectSocket: () => {
    const token = get().token;
    if (!token || get().socket?.connected) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('[WS] Connected'));
    socket.on('connect_error', (err) => console.error('[WS] Error:', err.message));

    socket.on('message:new', (msg) => {
      const { currentChannel, messages } = get();
      if (msg.channel_id === currentChannel?.id) set({ messages: [...messages, msg] });
    });

    socket.on('message:removed', (data) => {
      set({ messages: get().messages.filter(m => m.id !== data.message_id) });
    });

    socket.on('dm:new', (msg) => {
      const { currentDM, messages } = get();
      if (msg.dm_id === currentDM?.dm_id) set({ messages: [...messages, msg] });
    });

    socket.on('call:incoming', (data) => set({ incomingCall: data }));
    socket.on('call:ended', () => set({ callState: null, incomingCall: null }));
    socket.on('call:accepted', () => set((s) => ({ callState: { ...s.callState, peerAccepted: true } })));
    socket.on('call:rejected', () => set({ callState: null, incomingCall: null }));
    socket.on('users:online', (users) => set({ onlineUsers: users }));

    socket.on('admin:recording-start', (data) => {
      set((s) => ({ recordingChannels: [...s.recordingChannels.filter(r => r.channel_id !== data.channel_id), data] }));
    });

    socket.on('admin:recording-stop', (data) => {
      set((s) => ({ recordingChannels: s.recordingChannels.filter(r => r.channel_id !== data.channel_id) }));
    });

    socket.on('disconnect', () => console.log('[WS] Disconnected'));
    set({ socket });
  },

  setServers: (servers) => set({ servers }),
  setCurrentServer: (server) => {
    set({ currentServer: server, currentChannel: server?.channels?.[0] || null, currentDM: null, messages: [] });
    if (server) get().socket?.emit('join:server', server.id);
  },
  setCurrentChannel: (channel) => {
    set({ currentChannel: channel, currentDM: null, messages: [] });
    if (channel) get().socket?.emit('join:channel', channel.id);
  },
  setCurrentDM: (dm) => {
    set({ currentDM: dm, currentChannel: null, messages: [] });
    if (dm) get().socket?.emit('join:dm', dm.dm_id);
  },
  setDMs: (dms) => set({ dms }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setLoading: (loading) => set({ loading }),
  setCallState: (callState) => set({ callState }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setShowAdmin: (showAdmin) => set({ showAdmin }),

  setAdminUsers: (adminUsers) => set({ adminUsers }),
  setAdminServers: (adminServers) => set({ adminServers }),
  setAdminLogs: (adminLogs) => set({ adminLogs }),
  setAdminRecordings: (adminRecordings) => set({ adminRecordings }),
  setRecordingChannels: (recordingChannels) => set({ recordingChannels })
}));

export default useStore;
