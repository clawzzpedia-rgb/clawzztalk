import React, { useEffect } from 'react';
import useStore from './store';
import { authAPI } from './api';
import Auth from './components/Auth';
import MainApp from './components/MainApp';

export default function App() {
  const { user, token, setUser, connectSocket } = useStore();

  useEffect(() => {
    if (token && !user) {
      authAPI.me()
        .then((res) => {
          setUser(res.data);
          connectSocket();
        })
        .catch(() => useStore.getState().logout());
    }
  }, []);

  if (!user) return <Auth />;
  return <MainApp />;
}
