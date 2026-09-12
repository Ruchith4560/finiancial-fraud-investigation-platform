import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, User, ShieldCheck, CheckCircle2, Settings, Globe, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, getApiBaseUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface StoredAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  password?: string;
  role: 'investigator' | 'admin';
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'usr_inv_001',
    fullName: 'Sarah Chen, CAMS',
    username: 'investigator',
    email: 'investigator@fraudlens.internal',
    password: 'investigator123',
    role: 'investigator',
  },
  {
    id: 'usr_adm_001',
    fullName: 'Marcus Vance',
    username: 'admin',
    email: 'admin@fraudlens.internal',
    password: 'admin123',
    role: 'admin',
  },
];

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [email, setEmail] = useState('investigator@fraudlens.internal');
  const [password, setPassword] = useState('investigator123');
  
  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'investigator' | 'admin'>('investigator');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // API configuration modal state
  const [showConfig, setShowConfig] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  // Check API health on mount
  useEffect(() => {
    checkHealth();
    setCustomApiUrl(getApiBaseUrl());
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.get('/health', { timeout: 4000 });
      setApiOnline(res.status === 200);
    } catch {
      setApiOnline(false);
    }
  };

  const saveCustomApiUrl = (url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem('fraudlens_api_url', cleanUrl);
    } else {
      localStorage.removeItem('fraudlens_api_url');
    }
    setCustomApiUrl(cleanUrl);
    setShowConfig(false);
    checkHealth();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const normEmail = email.trim().toLowerCase();

    // 1. Try remote API first
    try {
      const res = await api.post('/auth/login', { email: normEmail, password });
      if (res.data.success && res.data.data?.token) {
        login(res.data.data.token, res.data.data.user);
        navigate(from, { replace: true });
        return;
      }
    } catch (err: any) {
      // If server explicitly rejected password with 401
      if (err.response && err.response.status === 401) {
        setError(err.response.data?.error?.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      // If server is unreachable or offline, try local accounts store
      const localUsers: StoredAccount[] = JSON.parse(localStorage.getItem('fraudlens_local_users') || '[]');
      const allAccounts = [...localUsers, ...DEFAULT_ACCOUNTS];
      const matched = allAccounts.find(
        (a) => a.email.toLowerCase() === normEmail && a.password === password
      );

      if (matched) {
        const fallbackToken = `fl_fallback_${Date.now()}_${matched.id}`;
        const fallbackUser = {
          id: matched.id,
          username: matched.username,
          email: matched.email,
          fullName: matched.fullName,
          role: matched.role,
          createdAt: new Date().toISOString(),
        };
        setSuccessMsg('Authenticated (Standalone Mode). Opening workbench...');
        setTimeout(() => {
          login(fallbackToken, fallbackUser);
          navigate(from, { replace: true });
        }, 500);
        return;
      }

      setError(
        err.response?.data?.error?.message ||
        'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setLoading(true);
    const normEmail = regEmail.trim().toLowerCase();
    const normUsername = regUsername.trim().toLowerCase().replace(/\s+/g, '');

    // 1. Try remote API first
    try {
      const res = await api.post('/auth/register', {
        fullName: regFullName.trim(),
        username: normUsername,
        email: normEmail,
        password: regPassword,
        role: regRole,
      });

      if (res.data.success && res.data.data?.token) {
        setSuccessMsg(`Account created successfully as ${regRole.toUpperCase()}! Signing you in...`);
        setTimeout(() => {
          login(res.data.data.token, res.data.data.user);
          navigate(from, { replace: true });
        }, 600);
        return;
      }
    } catch (err: any) {
      // If server returned a business validation error (e.g., 409 duplicate email)
      if (err.response && (err.response.status === 409 || err.response.status === 400)) {
        setError(err.response.data?.error?.message || 'Email or username already in use.');
        setLoading(false);
        return;
      }

      // If server is unreachable or offline, save account to local users store
      const localUsers: StoredAccount[] = JSON.parse(localStorage.getItem('fraudlens_local_users') || '[]');
      
      // Check local duplicates
      const duplicate = localUsers.find(
        (u) => u.email.toLowerCase() === normEmail || u.username.toLowerCase() === normUsername
      );
      if (duplicate) {
        setError('An account with this email or username already exists.');
        setLoading(false);
        return;
      }

      const newAccount: StoredAccount = {
        id: `usr_local_${Date.now()}`,
        fullName: regFullName.trim(),
        username: normUsername,
        email: normEmail,
        password: regPassword,
        role: regRole,
      };

      localUsers.push(newAccount);
      localStorage.setItem('fraudlens_local_users', JSON.stringify(localUsers));

      const fallbackToken = `fl_fallback_${Date.now()}_${newAccount.id}`;
      const fallbackUser = {
        id: newAccount.id,
        username: newAccount.username,
        email: newAccount.email,
        fullName: newAccount.fullName,
        role: newAccount.role,
        createdAt: new Date().toISOString(),
      };

      setSuccessMsg(`Account registered successfully as ${regRole.toUpperCase()}! Opening workbench...`);
      setTimeout(() => {
        login(fallbackToken, fallbackUser);
        navigate(from, { replace: true });
      }, 600);
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
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center shadow-xl shadow-blue-500/20 mb-3">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">FraudLens AI</h1>
          <p className="text-xs text-slate-400 mt-1">Financial Crime & Case Intelligence Platform</p>
        </div>

        {/* Card Box */}
        <div className="bg-[#0e1424] border border-slate-800/80 rounded-2xl p-7 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register / Sign Up
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-200 mb-1">
              {mode === 'login' ? 'Sign in to Workbench' : 'Create an Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Enter your credentials to access case dossiers & graph explorer.'
                : 'Register as an Investigator or System Administrator.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* ================= SIGN IN FORM ================= */
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
                    placeholder="investigator@fraudlens.internal"
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

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
                >
                  Register here
                </button>
              </div>

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
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('investigator')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      regRole === 'investigator'
                        ? 'bg-blue-600/15 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-slate-200">Investigator</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Case triage, graph visualizer & SAR reports
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('admin')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      regRole === 'admin'
                        ? 'bg-purple-600/15 border-purple-500 text-purple-300 shadow-sm shadow-purple-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-200">Admin</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Full security governance, audits & config
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Sarah Connor"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <span className="text-slate-500 font-mono text-sm absolute left-3.5 top-2">@</span>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    required
                    minLength={3}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                    placeholder="sconnor"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="sconnor@fraudlens.internal"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      placeholder="Min 8 chars"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <span>{loading ? 'Creating Account...' : `Register as ${regRole === 'admin' ? 'Admin' : 'Investigator'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Backend Connection Status Footer */}
        <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                apiOnline === true
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : apiOnline === false
                  ? 'bg-amber-500'
                  : 'bg-slate-600'
              }`}
            />
            <span>
              {apiOnline === true
                ? 'Backend: Connected'
                : apiOnline === false
                ? 'Backend: Standalone Fallback'
                : 'Checking backend...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>API Settings</span>
          </button>
        </div>

        {/* Expandable API Config Modal */}
        {showConfig && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Backend API Endpoint
              </span>
              <button
                type="button"
                onClick={checkHealth}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Test
              </button>
            </div>
            <input
              type="text"
              value={customApiUrl}
              onChange={(e) => setCustomApiUrl(e.target.value)}
              placeholder="e.g. https://finiancial-fraud-investigation-platform08.onrender.com"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 mb-2 font-mono"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => saveCustomApiUrl('')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] cursor-pointer"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => saveCustomApiUrl(customApiUrl)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
