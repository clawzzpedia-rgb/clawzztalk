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
  profileUser: null,
  recordingChannels: [],
  unreadCounts: {},
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
    const s = get().socket;
    if (s) { s.removeAllListeners(); s.disconnect(); }
    set({ user: null, token: null, servers: [], currentServer: null, currentChannel: null, currentDM: null, dms: [], messages: [], socket: null, showAdmin: false, callState: null, incomingCall: null, unreadCounts: {} });
  },

  connectSocket: () => {
    const token = get().token;
    if (!token || get().socket?.connected) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => console.log('[WS] Connected'));

    socket.on('call:incoming', (data) => set({ incomingCall: data }));
    socket.on('call:ended', () => { set({ callState: null, incomingCall: null }); });
    socket.on('call:accepted', () => set((s) => ({ callState: s.callState ? { ...s.callState, peerAccepted: true } : null })));
    socket.on('call:rejected', () => set({ callState: null, incomingCall: null }));
    socket.on('users:online', (users) => set({ onlineUsers: users }));

    socket.on('friend:accepted', (data) => {
      const s = get();
      const exists = s.dms.find(d => d.user_id === data.user.id);
      if (!exists) {
        set({ dms: [...s.dms, { dm_id: data.dm_id, user_id: data.user.id, username: data.user.username, avatar: data.user.avatar, status: data.user.status }] });
      }
    });

    const trackUnread = (msg) => {
      if (!msg) return;
      const st = get();
      if (msg.channel_id && msg.channel_id !== st.currentChannel?.id) {
        set({ unreadCounts: { ...st.unreadCounts, [msg.channel_id]: (st.unreadCounts[msg.channel_id] || 0) + 1 } });
      } else if (msg.dm_id && msg.dm_id !== st.currentDM?.dm_id) {
        set({ unreadCounts: { ...st.unreadCounts, [msg.dm_id]: (st.unreadCounts[msg.dm_id] || 0) + 1 } });
      }
    };
    socket.on('message:new', trackUnread);
    socket.on('dm:new', trackUnread);

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
    const firstChan = server?.channels?.[0] || null;
    set((s) => {
      const u = { ...s.unreadCounts };
      if (firstChan) delete u[firstChan.id];
      return { currentServer: server, currentChannel: firstChan, currentDM: null, messages: [], unreadCounts: u };
    });
    if (server) {
      const s = get().socket;
      s?.emit('join:server', server.id);
      if (firstChan) s?.emit('join:channel', firstChan.id);
    }
  },
  setCurrentChannel: (channel) => {
    set((s) => {
      const u = { ...s.unreadCounts };
      if (channel) delete u[channel.id];
      return { currentChannel: channel, currentDM: null, messages: [], unreadCounts: u };
    });
    if (channel) get().socket?.emit('join:channel', channel.id);
  },
  setCurrentDM: (dm) => {
    set((s) => {
      const u = { ...s.unreadCounts };
      if (dm) delete u[dm.dm_id];
      return { currentDM: dm, currentChannel: null, messages: [], unreadCounts: u };
    });
    if (dm) get().socket?.emit('join:dm', dm.dm_id);
  },
  setDMs: (dms) => set({ dms }),
  setMessages: (messages) => set((state) => ({ messages: typeof messages === 'function' ? messages(state.messages) : messages })),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setLoading: (loading) => set({ loading }),
  setCallState: (callState) => set({ callState }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setShowAdmin: (showAdmin) => set({ showAdmin }),
  setProfileUser: (profileUser) => set({ profileUser }),
  setUnreadCounts: (unreadCounts) => set({ unreadCounts }),

  setAdminUsers: (adminUsers) => set({ adminUsers }),
  setAdminServers: (adminServers) => set({ adminServers }),
  setAdminLogs: (adminLogs) => set({ adminLogs }),
  setAdminRecordings: (adminRecordings) => set({ adminRecordings }),
  setRecordingChannels: (recordingChannels) => set({ recordingChannels })
}));

export let pendingStream = null;
export function setPendingStream(s) { pendingStream = s; }
export function takePendingStream() { const s = pendingStream; pendingStream = null; return s; }

export default useStore;
