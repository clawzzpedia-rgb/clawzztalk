import React, { useEffect, useState, useCallback } from 'react';
import useStore from '../store';
import { friendAPI, userAPI } from '../api';
import { X, UserPlus, UserCheck, Clock, MessageCircle, UserMinus } from 'lucide-react';

export default function UserProfile() {
  const { profileUser, setProfileUser, user, setDMs, dms, setCurrentDM } = useStore();
  const [friendStatus, setFriendStatus] = useState('none');
  const [actionUserId, setActionUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!profileUser || profileUser.id === user?.id) return;
    try {
      const res = await friendAPI.status(profileUser.id);
      setFriendStatus(res.data.status);
      setActionUserId(res.data.action_user_id);
    } catch (_) { setFriendStatus('none'); setActionUserId(null); }
  }, [profileUser, user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const sendRequest = async () => {
    setLoading(true);
    try { await friendAPI.request(profileUser.id); setFriendStatus('pending'); }
    catch (_) {}
    setLoading(false);
  };

  const acceptRequest = async () => {
    setLoading(true);
    try { await friendAPI.accept(profileUser.id); setFriendStatus('accepted'); }
    catch (_) {}
    setLoading(false);
  };

  const rejectRequest = async () => {
    setLoading(true);
    try { await friendAPI.reject(profileUser.id); setFriendStatus('none'); }
    catch (_) {}
    setLoading(false);
  };

  const removeFriend = async () => {
    setLoading(true);
    try { await friendAPI.remove(profileUser.id); setFriendStatus('none'); }
    catch (_) {}
    setLoading(false);
  };

  const startDM = async () => {
    try {
      const exists = dms.find(d => d.user_id === profileUser.id);
      if (exists) { setCurrentDM(exists); setProfileUser(null); return; }
      const res = await userAPI.startDM(profileUser.id);
      const u = res.data.user;
      const dm = { dm_id: res.data.dm_id, user_id: profileUser.id, username: profileUser.username, avatar: profileUser.avatar, status: profileUser.status };
      setDMs([...dms, dm]);
      setCurrentDM(dm);
      setProfileUser(null);
    } catch (_) {}
  };

  const iSent = actionUserId === user?.id;

  if (!profileUser) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setProfileUser(null)}>
      <div className="bg-[#2b2d31] rounded-xl p-6 w-80 shadow-2xl border border-[#1e1f22]" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setProfileUser(null)} className="float-right p-1 text-[#6d6f78] hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {profileUser.username?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-white text-lg font-bold">{profileUser.username}</h2>
          <p className="text-[#6d6f78] text-xs capitalize">{profileUser.status || 'offline'}</p>
        </div>

        <div className="flex flex-col gap-2">
          {profileUser.id === user?.id ? (
            <p className="text-[#6d6f78] text-xs text-center">This is you</p>
          ) : friendStatus === 'none' ? (
            <button onClick={sendRequest} disabled={loading} className="flex items-center justify-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm px-4 py-2 rounded font-semibold transition disabled:opacity-50">
              <UserPlus className="w-4 h-4" /> Add Friend
            </button>
          ) : friendStatus === 'pending' && iSent ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm py-2">
                <Clock className="w-4 h-4" /> Friend Request Sent
              </div>
              <button onClick={removeFriend} disabled={loading} className="flex items-center justify-center gap-2 bg-[#383a40] hover:bg-[#4e5058] text-white text-sm px-4 py-2 rounded font-semibold transition disabled:opacity-50">
                <UserMinus className="w-4 h-4" /> Cancel Request
              </button>
            </div>
          ) : friendStatus === 'pending' && !iSent ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm py-2">
                <Clock className="w-4 h-4" /> Wants to be your friend
              </div>
              <div className="flex gap-2">
                <button onClick={acceptRequest} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm px-4 py-2 rounded font-semibold transition disabled:opacity-50">
                  <UserCheck className="w-4 h-4" /> Accept
                </button>
                <button onClick={rejectRequest} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-[#383a40] hover:bg-[#4e5058] text-white text-sm px-4 py-2 rounded font-semibold transition disabled:opacity-50">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ) : friendStatus === 'accepted' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-1">
                <UserCheck className="w-4 h-4" /> Friends
              </div>
              <button onClick={startDM} className="flex items-center justify-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm px-4 py-2 rounded font-semibold transition">
                <MessageCircle className="w-4 h-4" /> Message
              </button>
              <button onClick={removeFriend} disabled={loading} className="flex items-center justify-center gap-2 bg-[#383a40] hover:bg-[#4e5058] text-[#6d6f78] hover:text-red-400 text-sm px-4 py-2 rounded font-semibold transition disabled:opacity-50">
                <UserMinus className="w-4 h-4" /> Remove Friend
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
