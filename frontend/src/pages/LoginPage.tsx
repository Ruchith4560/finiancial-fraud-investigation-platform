import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('investigator@fraudlens.internal');
  const [password, setPassword] = useState('investigator123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = (role: 'admin' | 'investigator') => {
    if (role === 'admin') {
      setEmail('admin@fraudlens.internal');
      setPassword('admin123');
    } else {
      setEmail('investigator@fraudlens.internal');
      setPassword('investigator123');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center shadow-xl shadow-blue-500/20 mb-3">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">FraudLens AI</h1>
          <p className="text-xs text-slate-400 mt-1">Financial Crime & Case Intelligence Platform</p>
        </div>

        {/* Login Box */}
        <div className="bg-[#0e1424] border border-slate-800/80 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-base font-semibold text-slate-200 mb-1">Sign in to Workbench</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your credentials to access case dossiers.</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="name@fraudlens.internal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 mb-2">Quick Demo Access</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('investigator')}
                className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
              >
                Investigator Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin')}
                className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
              >
                Admin Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
