import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Briefcase,
  GitFork,
  HelpCircle,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Data Ingestion', to: '/ingestion', icon: UploadCloud },
  { label: 'Transactions', to: '/transactions', icon: FileSpreadsheet },
  { label: 'Alert Queue', to: '/alerts', icon: AlertTriangle },
  { label: 'Case Management', to: '/cases', icon: Briefcase },
  { label: 'Workspace', to: '/workspace', icon: GitFork },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      <div className="py-6 px-3">
        <div className="px-3 mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Investigation Modules
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Core Principle Banner */}
      <div className="p-4 m-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Core Principle</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          AI assists investigation. Humans make accountable decisions.
        </p>
      </div>
    </aside>
  );
};
