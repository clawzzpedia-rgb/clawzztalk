import React, { useState } from 'react';
import { authAPI } from '../api';
import useStore from '../store';
import { MessageCircle, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser, setToken, connectSocket } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = isLogin ? authAPI.login : authAPI.register;
      const data = isLogin ? { email, password } : { username, email, password };
      const res = await fn(data);
      setToken(res.data.token);
      setUser(res.data.user);
      connectSocket();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#313338]">
      <div className="w-full max-w-md mx-4">
        <div className="bg-[#2b2d31] rounded-lg p-8 shadow-xl border border-[#1e1f22]">
          <div className="text-center mb-6">
            <MessageCircle className="w-12 h-12 text-[#5865f2] mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">ClawzzTalk</h1>
            <p className="text-[#b5bac1] text-sm mt-1">
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide">Username</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6d6f78]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white pl-10 pr-4 py-2.5 rounded-md border border-transparent focus:border-[#5865f2] focus:outline-none text-sm"
                    placeholder="Enter username"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6d6f78]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white pl-10 pr-4 py-2.5 rounded-md border border-transparent focus:border-[#5865f2] focus:outline-none text-sm"
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6d6f78]" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white pl-10 pr-10 py-2.5 rounded-md border border-transparent focus:border-[#5865f2] focus:outline-none text-sm"
                  placeholder="Enter password"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d6f78] hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 rounded-md transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#b5bac1] mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-[#00a8fc] hover:underline">
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
