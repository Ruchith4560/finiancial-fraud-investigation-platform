import React from 'react';
import type { IRuleTrigger } from '../../types';
import { ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

interface WhyFlaggedCardProps {
  ruleTriggers: IRuleTrigger[];
  mlScore: number;
  riskScore: number;
  riskLevel: string;
}

export const WhyFlaggedCard: React.FC<WhyFlaggedCardProps> = ({
  ruleTriggers,
  mlScore,
  riskScore,
  riskLevel,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Why Flagged: Contributing Intelligence Signals</h3>
        </div>
        <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800">
          Zero-Unexplained Risk Matrix
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        FraudLens AI enforces defensible financial crime investigations. Every risk score is strictly decomposed into verifiable Bank Secrecy Act (BSA) deterministic rules and unsupervised multi-dimensional feature anomaly distance.
      </p>

      {/* Summary Score Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Composite Risk Score</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {riskScore.toFixed(0)} <span className="text-xs text-slate-500 font-sans">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">{riskLevel} TIER</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ML Anomaly Outlier</span>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {mlScore.toFixed(2)} <span className="text-xs text-slate-500 font-sans">P(anomaly)</span>
          </div>
          <span className="text-[10px] text-slate-400">Isolation Forest (100 Trees)</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Rule Triggers</span>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">{ruleTriggers.length}</div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Transparent
          </span>
        </div>
      </div>

      {/* Rule List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Triggered Regulatory Rules</h4>

        {ruleTriggers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs text-center">
            No deterministic rule thresholds breached for this account.
          </div>
        ) : (
          <div className="space-y-2.5">
            {ruleTriggers.map((rule, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{rule.ruleName}</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                      {rule.ruleId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{rule.description}</p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/50 font-mono font-bold text-xs">
                    +{rule.scoreContribution} pts
                  </span>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">
                    {rule.severity || 'HIGH'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ML Outlier Model Card */}
      <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-purple-300">Unsupervised Isolation Forest Outlier Analysis</span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Evaluates multi-dimensional outlier distance across log-transformed amount, time of transfer, weekend periodicity, hourly transfer velocity, and transaction type. Anomaly score contribution is capped at 20 points to preserve deterministic explainability.
          </p>
        </div>
      </div>
    </div>
  );
};
