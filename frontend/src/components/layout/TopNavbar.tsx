import React, { useEffect, useState } from 'react';
import { ShieldAlert, User, LogOut, Database, Cpu } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface HealthData {
  service: string;
  status: string;
  database: { status: string };
  intelligenceService: { status: string };
}

export const TopNavbar: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.success) {
          setHealth(res.data.data);
        }
      } catch {
        setHealth(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0d1322] border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-100 tracking-tight">FraudLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-400 border border-blue-700/50">
              AI PLATFORM
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Financial Crime & Case Intelligence</p>
        </div>
      </div>

      {/* System Status Indicators & User Profile */}
      <div className="flex items-center gap-5">
        {/* Backend & DB Health */}
        <div className="hidden md:flex items-center gap-2 text-xs bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">DB:</span>
          <span className={`font-mono font-medium ${health?.database?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {health?.database?.status || 'Active'}
          </span>
          <span className="text-slate-700">|</span>
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">AI:</span>
          <span className={`font-mono font-medium ${health?.intelligenceService?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {health?.intelligenceService?.status || 'Online'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-200">{user?.fullName || 'Investigator'}</div>
            <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">{user?.role || 'Staff'}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
