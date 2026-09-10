import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Network,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Search,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { CytoscapeGraph } from '../components/graph/CytoscapeGraph';
import { GraphInspectorDrawer } from '../components/graph/GraphInspectorDrawer';
import { ForensicTimeline } from '../components/investigation/ForensicTimeline';
import { WhyFlaggedCard } from '../components/investigation/WhyFlaggedCard';
import { InvestigatorNotes } from '../components/investigation/InvestigatorNotes';
import { AISummaryCard } from '../components/investigation/AISummaryCard';
import { fetchInvestigationDossier } from '../api/investigation';
import type { InvestigationDossier } from '../types/investigation';
import type { GraphNodeData, GraphEdgeData } from '../types/graph';
import { formatCurrency, getRiskBadgeClasses } from '../utils/formatters';

const PRESET_ACCOUNTS = [
  { id: 'ACC-HUB-CENTRAL', label: 'ACC-HUB-CENTRAL (Fan-In Smurfing & Fan-Out Hub)' },
  { id: 'ACC-MULE-ALPHA', label: 'ACC-MULE-ALPHA (Rapid Layering Mule)' },
  { id: 'ACC-RING-A', label: 'ACC-RING-A (Circular Wash-Trading Ring)' },
  { id: 'ACC-SMURF-01', label: 'ACC-SMURF-01 (Feeder Smurf Account)' },
];

export const InvestigationWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccount = searchParams.get('account') || searchParams.get('accountId') || 'ACC-HUB-CENTRAL';

  const [rootAccountId, setRootAccountId] = useState<string>(initialAccount);
  const [inputAccount, setInputAccount] = useState<string>(initialAccount);
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'TIMELINE' | 'PATTERNS' | 'WHY_FLAGGED' | 'AI_SUMMARY'>('GRAPH');
  const caseId = searchParams.get('caseId') || undefined;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<InvestigationDossier | null>(null);

  // Graph selection state
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);

  // Investigator Assignment state
  const [assignedInvestigator, setAssignedInvestigator] = useState<string>('Sarah Jenkins (Lead FinCrime Analyst)');
  const [caseStatus, setCaseStatus] = useState<string>('UNDER_INVESTIGATION');

  // Sync with URL query parameter
  useEffect(() => {
    const paramAccount = searchParams.get('account') || searchParams.get('accountId');
    if (paramAccount && paramAccount !== rootAccountId) {
      setRootAccountId(paramAccount);
      setInputAccount(paramAccount);
    }
  }, [searchParams]);

  // Load Dossier on rootAccountId change
  useEffect(() => {
    let isCancelled = false;

    async function loadDossier() {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      setSelectedEdge(null);

      try {
        const data = await fetchInvestigationDossier(rootAccountId);
        if (!isCancelled) {
          setDossier(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to assemble investigation dossier');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadDossier();

    return () => {
      isCancelled = true;
    };
  }, [rootAccountId]);

  // Search & Navigation Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputAccount.trim();
    if (clean) {
      setRootAccountId(clean);
      setSearchParams({ account: clean });
    }
  };

  const handleSelectPreset = (accId: string) => {
    setInputAccount(accId);
    setRootAccountId(accId);
    setSearchParams({ account: accId });
  };

  const handleFocusAccount = (accId: string) => {
    setInputAccount(accId);
    setRootAccountId(accId);
    setSearchParams({ account: accId });
  };

  // Export Complete Case Dossier as JSON
  const handleExportDossierJson = () => {
    if (!dossier) return;
    const jsonBlob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraudlens-dossier-${dossier.targetAccountId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Flagship Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-400 border border-blue-700/50">
              MODULE 5
            </span>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <span>Investigation Workspace:</span>
              <span className="font-mono text-blue-400 font-extrabold">{rootAccountId}</span>
            </h1>
            {dossier && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getRiskBadgeClasses(dossier.summary.riskLevel)}`}>
                {dossier.summary.riskLevel} PRIORITY ({dossier.summary.riskScore}/100)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise case dossier assembling transactional timelines, relationship topology, and explainable AI signals
          </p>
        </div>

        {/* Header Actions & Assignment */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Selector */}
          <select
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="UNDER_INVESTIGATION">Status: Under Active Investigation</option>
            <option value="ESCALATED_SAR">Status: Escalated to SAR Filing</option>
            <option value="RECOMMEND_FREEZE">Status: Account Freeze Recommended</option>
            <option value="CLEARED">Status: Cleared / False Positive</option>
          </select>

          {/* Assigned Investigator */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={assignedInvestigator}
              onChange={(e) => setAssignedInvestigator(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="Sarah Jenkins (Lead FinCrime Analyst)" className="bg-slate-900 text-slate-200">Sarah Jenkins (Lead)</option>
              <option value="Michael Chang (Senior Investigator)" className="bg-slate-900 text-slate-200">Michael Chang (Senior)</option>
              <option value="Elena Rostova (Compliance Officer)" className="bg-slate-900 text-slate-200">Elena Rostova (Compliance)</option>
            </select>
          </div>

          <button
            onClick={() => setActiveTab('AI_SUMMARY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'AI_SUMMARY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI SAR Co-Pilot</span>
          </button>

          <button
            onClick={handleExportDossierJson}
            disabled={!dossier}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Account Switcher & Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Target Account (e.g. ACC-HUB-CENTRAL)..."
              value={inputAccount}
              onChange={(e) => setInputAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Investigate
          </button>
        </form>

        {/* Featured Presets */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Featured Typologies:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_ACCOUNTS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  rootAccountId === preset.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {preset.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Ribbon */}
      {dossier && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Risk Score</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {dossier.summary.riskScore.toFixed(0)} <span className="text-xs text-slate-500 font-sans">/ 100</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">P(ML) = {dossier.summary.mlAnomalyScore.toFixed(2)}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Total Inflow</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              {formatCurrency(dossier.summary.totalInflow)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Aggregated credits</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Total Outflow</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {formatCurrency(dossier.summary.totalOutflow)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Aggregated debits</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Net Turnover</div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                dossier.summary.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(dossier.summary.netFlow)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Account balance delta</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Transactions</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-1">
              {dossier.summary.transactionCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{dossier.summary.alertCount} flagged alerts</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Detected Patterns</div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-1">
              {dossier.patterns.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Multi-hop typologies</div>
          </div>
        </div>
      )}

      {/* Forensic Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('GRAPH')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'GRAPH'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Relationship Graph & Topology</span>
          {dossier && (
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono">
              {dossier.graph.nodes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'TIMELINE'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Forensic Transaction Timeline</span>
          {dossier && (
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono">
              {dossier.timeline.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PATTERNS')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'PATTERNS'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Detected Suspicious Typologies</span>
          {dossier && (
            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">
              {dossier.patterns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('WHY_FLAGGED')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'WHY_FLAGGED'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Why Flagged Matrix & XAI</span>
          {dossier && (
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
              {dossier.whyFlagged.ruleTriggers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('AI_SUMMARY')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'AI_SUMMARY'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>AI Co-Pilot & SAR Narrative</span>
          <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
            FinCEN SAR
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="min-h-[500px] rounded-xl border border-slate-800 bg-[#090d16] flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs">Assembling full forensic investigation dossier for '{rootAccountId}'...</p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] rounded-xl border border-slate-800 bg-red-950/20 p-8 flex flex-col items-center justify-center text-red-400 gap-3">
          <ShieldAlert className="w-8 h-8 text-red-400" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : dossier ? (
        <div className="space-y-6">
          {/* TAB 1: GRAPH & RELATIONSHIPS */}
          {activeTab === 'GRAPH' && (
            <div className="relative flex rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] min-h-[580px]">
              <CytoscapeGraph
                nodes={dossier.graph.nodes}
                edges={dossier.graph.edges}
                rootAccountId={rootAccountId}
                selectedNodeId={selectedNode?.id}
                selectedEdgeId={selectedEdge?.id}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setSelectedEdge(null);
                }}
                onSelectEdge={(edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                }}
                onClearSelection={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className="flex-1"
              />

              <GraphInspectorDrawer
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onClose={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                onFocusAccount={handleFocusAccount}
              />
            </div>
          )}

          {/* TAB 2: FORENSIC TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <ForensicTimeline
              timeline={dossier.timeline}
              onFocusAccount={handleFocusAccount}
            />
          )}

          {/* TAB 3: DETECTED PATTERNS */}
          {activeTab === 'PATTERNS' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Detected Multi-Hop Typology Patterns ({dossier.patterns.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">Temporal Graph Pattern Engine</span>
              </div>

              {dossier.patterns.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No high-confidence multi-hop typologies currently flagged specifically for account '{rootAccountId}'.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossier.patterns.map((pat) => (
                    <div
                      key={pat.patternId}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-500">{pat.patternId}</span>
                          <h4 className="text-sm font-bold text-slate-100 mt-0.5">{pat.title}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            pat.severity === 'CRITICAL'
                              ? 'bg-red-950/80 text-red-400 border border-red-800'
                              : pat.severity === 'HIGH'
                              ? 'bg-orange-950/80 text-orange-400 border border-orange-800'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {pat.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{pat.humanExplanation}</p>

                      {/* Quantitative Metrics */}
                      {pat.metrics && (
                        <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-400">
                          {Object.entries(pat.metrics).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              <span className="font-mono font-semibold text-slate-200">
                                {typeof v === 'number' && v > 100 ? formatCurrency(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Evidence Accounts */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                        <span className="text-slate-500">Confidence: {(pat.confidenceScore * 100).toFixed(0)}%</span>
                        <div className="flex flex-wrap gap-1">
                          {pat.involvedAccounts.slice(0, 3).map((acc) => (
                            <button
                              key={acc}
                              onClick={() => handleFocusAccount(acc)}
                              className="text-[10px] font-mono bg-slate-800 hover:bg-blue-900 text-slate-300 px-1.5 py-0.5 rounded transition"
                            >
                              {acc}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WHY FLAGGED MATRIX & XAI */}
          {activeTab === 'WHY_FLAGGED' && (
            <WhyFlaggedCard
              ruleTriggers={dossier.whyFlagged.ruleTriggers}
              mlScore={dossier.whyFlagged.mlScore}
              riskScore={dossier.whyFlagged.riskScore}
              riskLevel={dossier.whyFlagged.riskLevel}
            />
          )}

          {/* TAB 5: AI REGULATORY CO-PILOT & SAR NARRATIVE */}
          {activeTab === 'AI_SUMMARY' && (
            <AISummaryCard
              targetAccountId={rootAccountId}
              caseId={caseId}
            />
          )}

          {/* Investigator Working Notes */}
          <InvestigatorNotes
            targetAccountId={rootAccountId}
            onExportReport={handleExportDossierJson}
          />
        </div>
      ) : null}
    </div>
  );
};
