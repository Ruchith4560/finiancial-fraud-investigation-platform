import React from 'react';
import type { GraphNodeData, GraphEdgeData } from '../../types/graph';
import { X, ShieldAlert, Smartphone, ArrowRight, Focus, AlertOctagon, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface GraphInspectorDrawerProps {
  selectedNode: GraphNodeData | null;
  selectedEdge: GraphEdgeData | null;
  onClose: () => void;
  onFocusAccount: (accountId: string) => void;
}

export const GraphInspectorDrawer: React.FC<GraphInspectorDrawerProps> = ({
  selectedNode,
  selectedEdge,
  onClose,
  onFocusAccount,
}) => {
  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="space-y-5">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {selectedNode ? (selectedNode.type === 'DEVICE' ? 'Device Inspector' : 'Account Inspector') : 'Transaction Link'}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NODE INSPECTOR */}
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {selectedNode.type === 'DEVICE' ? (
                  <Smartphone className="w-5 h-5 text-purple-400" />
                ) : (
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    selectedNode.riskLevel === 'CRITICAL' ? 'bg-red-500' :
                    selectedNode.riskLevel === 'HIGH' ? 'bg-orange-500' :
                    selectedNode.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                )}
                <h3 className="text-base font-bold text-slate-100 font-mono break-all">{selectedNode.label}</h3>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  selectedNode.riskLevel === 'CRITICAL' ? 'bg-red-950/80 text-red-400 border border-red-800' :
                  selectedNode.riskLevel === 'HIGH' ? 'bg-orange-950/80 text-orange-400 border border-orange-800' :
                  selectedNode.riskLevel === 'MEDIUM' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                  'bg-blue-950/80 text-blue-400 border border-blue-800'
                }`}>
                  {selectedNode.riskLevel} RISK ({selectedNode.riskScore.toFixed(0)}/100)
                </span>
                {selectedNode.isRoot && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    EGO ROOT
                  </span>
                )}
              </div>
            </div>

            {/* Account Metrics */}
            {selectedNode.type === 'ACCOUNT' && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Total Inflow:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(selectedNode.inflow)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Total Outflow:</span>
                  <span className="font-mono text-rose-400 font-semibold">{formatCurrency(selectedNode.outflow)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-500">Net Flow:</span>
                  <span className={`font-mono font-bold ${
                    (selectedNode.inflow - selectedNode.outflow) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatCurrency(selectedNode.inflow - selectedNode.outflow)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Network Degree:</span>
                  <span className="font-mono text-slate-300">{selectedNode.transactionCount} transactions</span>
                </div>
              </div>
            )}

            {/* Device Metrics */}
            {selectedNode.type === 'DEVICE' && selectedNode.metadata && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Shared Hardware Fingerprint</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Utilized across {selectedNode.metadata.sharedAccountCount || 0} distinct accounts, indicating device spoofing or an emulator farm.
                </p>
                {selectedNode.metadata.accounts && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Linked Accounts:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedNode.metadata.accounts.map((acc: string) => (
                        <button
                          key={acc}
                          onClick={() => onFocusAccount(acc)}
                          className="text-[10px] font-mono bg-slate-800 hover:bg-blue-900/60 text-slate-300 hover:text-blue-300 px-1.5 py-0.5 rounded border border-slate-700 transition"
                        >
                          {acc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Re-Center Action */}
            {selectedNode.type === 'ACCOUNT' && !selectedNode.isRoot && (
              <button
                onClick={() => onFocusAccount(selectedNode.id)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/20"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>Re-center Graph on this Account</span>
              </button>
            )}
          </div>
        )}

        {/* EDGE INSPECTOR */}
        {selectedEdge && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400">{selectedEdge.id}</span>
              <h3 className="text-base font-bold text-slate-100 mt-1">
                {selectedEdge.type === 'TRANSACTION' ? 'Payment Transfer' : 'Device Association'}
              </h3>
            </div>

            {selectedEdge.type === 'TRANSACTION' ? (
              <div className="space-y-3">
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Source:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedEdge.source}</span>
                  </div>
                  <div className="flex justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Target:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedEdge.target}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Amount:
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {formatCurrency(selectedEdge.amount || 0)}
                    </span>
                  </div>
                  {selectedEdge.timestamp && (
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Timestamp:
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {formatDate(selectedEdge.timestamp)}
                      </span>
                    </div>
                  )}
                </div>

                {selectedEdge.isFlagged && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      This transaction exceeds high-value or potential structuring thresholds and is flagged for compliance review.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-xs text-purple-300">
                Direct association between account <span className="font-mono font-bold">{selectedEdge.source}</span> and hardware device <span className="font-mono font-bold">{selectedEdge.target}</span>.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
