import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
  UserCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  fetchCases,
  fetchCaseStats,
  createCase,
  updateCaseStatus,
  type CaseStatsResponse,
} from '../api/cases';
import type { CaseRecord, CaseStatus, CasePriority } from '../types';
import { formatCurrency, formatDate, getRiskBadgeClasses } from '../utils/formatters';

const PRESET_ACCOUNTS = [
  { id: 'ACC-HUB-CENTRAL', title: 'Operation Blue Cyclone: Fan-In Smurfing Ring' },
  { id: 'ACC-MULE-ALPHA', title: 'Layering Mule Pass-Through Network' },
  { id: 'ACC-RING-A', title: 'Circular Wash-Trading Syndicate' },
  { id: 'ACC-SMURF-01', title: 'Structured Micro-Deposit Feeder' },
];

export const CaseListPage: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [stats, setStats] = useState<CaseStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAccountId, setNewAccountId] = useState('ACC-HUB-CENTRAL');
  const [newPriority, setNewPriority] = useState<CasePriority>('HIGH');
  const [newInvestigator, setNewInvestigator] = useState('Sarah Jenkins (Lead FinCrime Analyst)');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Load cases and stats
  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetchCases({
          status: statusFilter,
          priority: priorityFilter,
          search: search.trim() || undefined,
          page,
          limit: 15,
        }),
        fetchCaseStats().catch(() => null),
      ]);

      setCases(casesRes.cases);
      setTotalPages(casesRes.pagination.totalPages);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountId.trim() || !newTitle.trim()) return;

    setCreating(true);
    try {
      const created = await createCase({
        title: newTitle.trim(),
        primaryAccountId: newAccountId.trim(),
        priority: newPriority,
        assignedInvestigatorName: newInvestigator,
        initialNotes: newNotes.trim() || undefined,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      loadData();
      navigate(`/workspace?caseId=${created.caseId}&account=${created.primaryAccountId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (caseId: string, newStatus: CaseStatus) => {
    try {
      await updateCaseStatus(caseId, newStatus, `Transitioned via Case Management interface`);
      setCases((prev) =>
        prev.map((c) => (c.caseId === caseId ? { ...c, status: newStatus } : c))
      );
      fetchCaseStats().then((res) => res && setStats(res));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-400 border border-blue-700/50">
              MODULE 6
            </span>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-400" />
              <span>Formal Case Management</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain immutable evidence freeze snapshots, investigator audit trails, and regulatory disposition tracking
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* KPI Counters Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Total Cases</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {stats?.totalCases || cases.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active investigative files</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Critical Priority</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">
            {stats?.priorities?.CRITICAL || cases.filter((c) => c.priority === 'CRITICAL').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">High-impact syndicates</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Escalated to SAR</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {stats?.statuses?.ESCALATED || cases.filter((c) => c.status === 'ESCALATED').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Regulatory filing queue</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Under Review</div>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {stats?.statuses?.UNDER_REVIEW || cases.filter((c) => c.status === 'UNDER_REVIEW').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Analyst triage in progress</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Closed / Resolved</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {stats?.statuses?.CLOSED || cases.filter((c) => c.status === 'CLOSED').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Completed dispositions</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'All Cases' },
            { id: 'OPEN', label: 'Open' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'ESCALATED', label: 'Escalated SAR' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs transition ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Priorities</option>
              <option value="CRITICAL" className="bg-slate-900">Critical</option>
              <option value="HIGH" className="bg-slate-900">High</option>
              <option value="MEDIUM" className="bg-slate-900">Medium</option>
              <option value="LOW" className="bg-slate-900">Low</option>
            </select>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Case ID or Account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 font-mono w-56"
            />
          </form>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-xs">Loading investigation cases...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-400">No Investigation Cases Found</h3>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              Create a new case using the button above or escalate an alert from the Alert Queue to freeze an immutable evidence snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Title & Investigation Target</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Frozen Evidence Snapshot</th>
                  <th className="py-3 px-4">Assigned Investigator</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => navigate(`/workspace?caseId=${c.caseId}&account=${c.primaryAccountId}`)}
                  >
                    {/* Case ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {c.caseId}
                    </td>

                    {/* Title & Target */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{c.title}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>Target:</span>
                        <span className="text-blue-300 font-bold">{c.primaryAccountId}</span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClasses(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>

                    {/* Status with Quick Dropdown */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.caseId, e.target.value as CaseStatus)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded outline-none border cursor-pointer ${
                          c.status === 'ESCALATED'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : c.status === 'UNDER_REVIEW'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                            : c.status === 'CLOSED'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        <option value="OPEN" className="bg-slate-900 text-slate-200">OPEN</option>
                        <option value="UNDER_REVIEW" className="bg-slate-900 text-slate-200">UNDER REVIEW</option>
                        <option value="ESCALATED" className="bg-slate-900 text-slate-200">ESCALATED SAR</option>
                        <option value="CLOSED" className="bg-slate-900 text-slate-200">CLOSED</option>
                      </select>
                    </td>

                    {/* Frozen Evidence Snapshot */}
                    <td className="py-3.5 px-4">
                      {c.evidenceSnapshot ? (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-mono text-slate-300">
                            {c.evidenceSnapshot.transactionCount} txs • {formatCurrency(c.evidenceSnapshot.totalAmountFlagged || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Live Snapshot</span>
                      )}
                    </td>

                    {/* Assigned Investigator */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.assignedInvestigatorName || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDate(c.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace?caseId=${c.caseId}&account=${c.primaryAccountId}`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer"
                      >
                        <span>Open Dossier</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-400">
              <span>
                Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{Math.max(1, totalPages)}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE CASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-slate-100">Open Formal Investigation Case</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-4 text-xs">
              {/* Case Title */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Case Title</label>
                <input
                  type="text"
                  placeholder="e.g. Operation Blue Cyclone: Mule Smurfing Ring"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              {/* Target Account ID */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Target Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. ACC-HUB-CENTRAL"
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-slate-200 outline-none focus:border-blue-500"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {PRESET_ACCOUNTS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setNewAccountId(p.id);
                        if (!newTitle) setNewTitle(p.title);
                      }}
                      className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Investigator */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as CasePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Assigned Investigator</label>
                  <select
                    value={newInvestigator}
                    onChange={(e) => setNewInvestigator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="Sarah Jenkins (Lead FinCrime Analyst)">Sarah Jenkins (Lead)</option>
                    <option value="Michael Chang (Senior Investigator)">Michael Chang (Senior)</option>
                    <option value="Elena Rostova (Compliance Officer)">Elena Rostova (Compliance)</option>
                  </select>
                </div>
              </div>

              {/* Initial Investigative Notes */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Initial Case Notes</label>
                <textarea
                  rows={3}
                  placeholder="Document initial investigative suspicion, triggered BSA thresholds, or referral source..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-xl flex items-start gap-2 text-[11px] text-blue-300">
                <Lock className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  Creating this case will automatically capture an <strong>immutable evidence freeze snapshot</strong> of all current transactions, relationship graph metrics, and triggered rules.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Freeze Evidence & Open Case</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
