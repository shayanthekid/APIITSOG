import React, { useState } from 'react';
import axios, { setToken } from './axios';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      console.error('Login error:', err.response);
      if (err.response?.status === 401 || err.response?.status === 422) {
        const errors = err.response.data?.errors;
        const msg = errors
          ? Object.values(errors).flat().join(' ')
          : err.response.data?.message || 'Invalid credentials.';
        setError(msg);
      } else {
        setError(`Error ${err.response?.status || 'unknown'}: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white text-blue-900 rounded-2xl flex items-center justify-center text-sm font-extrabold mx-auto mb-4 shadow-2xl">
            APIIT
          </div>
          <h1 className="text-3xl font-bold text-white">Study Global CRM</h1>
          <p className="text-blue-300 mt-2 text-sm">Sign in to access your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6 border border-red-200 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                id="login-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70 shadow-lg"
              >
                {loading ? (
                  <span className="animate-pulse">Signing in...</span>
                ) : (
                  <><MdLogin size={20} /> Sign In</>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
              APIIT Study Global · Internal CRM Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
