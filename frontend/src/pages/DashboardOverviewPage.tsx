import React, { useState } from 'react';
import {
  AlertTriangle,
  FileCheck2,
  Share2,
  TrendingUp,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';

export const DashboardOverviewPage: React.FC = () => {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/transactions/demo-seed');
      if (res.data.success) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Demo seed error:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Financial Crime Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-hop risk intelligence, pattern graph analytics, and accountable case disposition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'Generating Mule Syndicate...' : 'Load Enterprise Demo Dataset'}</span>
          </button>
        </div>
      </div>

      {seedSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Enterprise Demo Dataset successfully seeded! 500+ transactions with 5 verified fraud typologies, risk scores, and graph patterns are ready for investigation.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Flagged Volume */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>High Risk Transactions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">124</div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
            <span>Critical risk triggers detected</span>
          </div>
        </div>

        {/* Card 2: Open Cases */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Active Case Files</span>
            <FileCheck2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">12</div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2">
            <span>4 pending supervisory review</span>
          </div>
        </div>

        {/* Card 3: Graph Patterns */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Active Typologies</span>
            <Share2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">5 Patterns</div>
          <div className="flex items-center gap-1.5 text-xs text-purple-400 mt-2">
            <span>Mule rings & circular layering</span>
          </div>
        </div>

        {/* Card 4: Avg Disposition Speed */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Case Resolution Time</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">-68%</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
            <span>Accelerated with AI synthesis</span>
          </div>
        </div>
      </div>

      {/* Investigation Workflow Guide */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-100 mb-2">Investigation Lifecycle Architecture</h2>
        <p className="text-xs text-slate-400 mb-6">
          Every alert follows an accountable, evidence-first audit workflow before human disposition.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-blue-400 uppercase">Step 1</span>
            <h3 className="text-sm font-semibold text-slate-200 mt-1">Data Ingestion</h3>
            <p className="text-xs text-slate-400 mt-1">
              CSV validation, duplicate checks, schema normalization, and batch error reporting.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-amber-400 uppercase">Step 2</span>
            <h3 className="text-sm font-semibold text-slate-200 mt-1">Layered Risk Scoring</h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic rules + Isolation Forest anomaly detection with zero unexplained scores.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-purple-400 uppercase">Step 3</span>
            <h3 className="text-sm font-semibold text-slate-200 mt-1">Graph Topology</h3>
            <p className="text-xs text-slate-400 mt-1">
              NetworkX mining of Fan-In, Fan-Out, Circular Transfers, Rapid Movement, and Shared IDs.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 4</span>
            <h3 className="text-sm font-semibold text-slate-200 mt-1">Unified Workspace</h3>
            <p className="text-xs text-slate-400 mt-1">
              Interactive relationship graph, chronological evidence timeline, and investigator notes.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Step 5</span>
            <h3 className="text-sm font-semibold text-slate-200 mt-1">Case & Disposition</h3>
            <p className="text-xs text-slate-400 mt-1">
              Immutable evidence snapshot freeze, AI grounded summary, and defensible human sign-off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
