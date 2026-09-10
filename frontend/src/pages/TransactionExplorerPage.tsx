import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldAlert,
  X,
  Copy,
  Check,
  Smartphone,
  Globe,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Network,
} from 'lucide-react';
import { api } from '../api/client';
import type { Transaction } from '../types';
import { formatCurrency, formatDate, getRiskBadgeClasses } from '../utils/formatters';

export const TransactionExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('ALL');
  const [isFlagged, setIsFlagged] = useState<boolean | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<string>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Stats state
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    flaggedCount: 0,
    criticalCount: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/transactions/stats');
      if (res.data.success) {
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch transaction stats:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (riskLevel !== 'ALL') params.riskLevel = riskLevel;
      if (isFlagged !== undefined) params.isFlagged = isFlagged;
      if (transactionType !== 'ALL') params.transactionType = transactionType;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;

      const res = await api.get('/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.data.transactions);
        setTotalPages(res.data.data.pagination.totalPages || 1);
        setTotalRecords(res.data.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, limit, riskLevel, isFlagged, transactionType, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetFilters = () => {
    setSearch('');
    setRiskLevel('ALL');
    setIsFlagged(undefined);
    setTransactionType('ALL');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('timestamp');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Transaction Explorer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, and inspect normalized financial transactions across accounts, devices, and risk tiers.
          </p>
        </div>

        {/* Global Stats Pill Group */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-500">Total: </span>
              <span className="text-slate-200 font-mono font-semibold">{stats.totalTransactions.toLocaleString()}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-500">Volume: </span>
              <span className="text-blue-400 font-mono font-semibold">{formatCurrency(stats.totalVolume)}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-500">Flagged: </span>
              <span className="text-amber-400 font-mono font-semibold">{stats.flaggedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID, Sender Account, Receiver Account, Device, or IP..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
          >
            Reset
          </button>
        </form>

        {/* Multi-Dimensional Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          {/* Risk Level */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Type</label>
            <select
              value={transactionType}
              onChange={(e) => { setTransactionType(e.target.value); setPage(1); }}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="PAYMENT">Payment</option>
              <option value="CASH_OUT">Cash Out</option>
              <option value="DEPOSIT">Deposit</option>
            </select>
          </div>

          {/* Flagged Status */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Flagged Only</label>
            <select
              value={isFlagged === undefined ? 'ALL' : isFlagged ? 'TRUE' : 'FALSE'}
              onChange={(e) => {
                const val = e.target.value;
                setIsFlagged(val === 'ALL' ? undefined : val === 'TRUE');
                setPage(1);
              }}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Transactions</option>
              <option value="TRUE">Flagged Only</option>
              <option value="FALSE">Unflagged Only</option>
            </select>
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Min Amount ($)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              onBlur={() => { setPage(1); fetchTransactions(); }}
              placeholder="0"
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Max Amount ($)</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              onBlur={() => { setPage(1); fetchTransactions(); }}
              placeholder="100000"
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortBy(f);
                setSortOrder(o as 'desc' | 'asc');
              }}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="timestamp-desc">Newest First</option>
              <option value="timestamp-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="riskScore-desc">Highest Risk Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Data Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">
            No transactions match your current query filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Sender Account</th>
                  <th className="py-3 px-2 text-center"></th>
                  <th className="py-3 px-4">Receiver Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Device / IP</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <span>{tx.transactionId}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopy(tx.transactionId); }}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                        >
                          {copiedId === tx.transactionId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{formatDate(tx.timestamp)}</td>
                    <td className="py-3 px-4 text-slate-200">{tx.senderAccountId}</td>
                    <td className="py-3 px-2 text-center text-slate-600">
                      <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-slate-200">{tx.receiverAccountId}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-100">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClasses(tx.riskLevel)}`}>
                          {tx.riskScore}
                        </span>
                        {tx.isFlagged && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Flagged for investigation" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans text-[10px] truncate max-w-[120px]">
                      {tx.deviceId || tx.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer font-sans"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-mono font-medium">{transactions.length}</span> of{' '}
            <span className="text-slate-200 font-mono font-medium">{totalRecords.toLocaleString()}</span> records
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Inspection Slide-Over / Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">{selectedTx.transactionId}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClasses(selectedTx.riskLevel)}`}>
                      Score: {selectedTx.riskScore} ({selectedTx.riskLevel})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedTx.timestamp)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Counterparty Flow Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Originating Account</span>
                  <span className="font-mono text-sm font-semibold text-slate-200">{selectedTx.senderAccountId}</span>
                </div>
                <div className="text-center px-4">
                  <div className="text-xs font-semibold text-blue-400">{formatCurrency(selectedTx.amount)}</div>
                  <ArrowRight className="w-4 h-4 text-slate-500 mx-auto mt-1" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Destination Account</span>
                  <span className="font-mono text-sm font-semibold text-slate-200">{selectedTx.receiverAccountId}</span>
                </div>
              </div>

              {/* Hardware & Network Identifiers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-[10px] uppercase">Device Fingerprint</span>
                  </div>
                  <span className="font-mono text-xs text-slate-200">{selectedTx.deviceId || 'Not Recorded'}</span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-[10px] uppercase">Network IP</span>
                  </div>
                  <span className="font-mono text-xs text-slate-200">{selectedTx.ipAddress || 'Not Recorded'}</span>
                </div>
              </div>

              {/* CRITICAL SECTION: Why Flagged (Explainability Matrix) */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Why Flagged: Risk Factor Explainability
                  </h4>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Zero unexplained risk scores: Every contributing signal is deterministically traced to rules and anomalies.
                </p>

                {selectedTx.riskFactors && selectedTx.riskFactors.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedTx.riskFactors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-amber-300">{factor.ruleName}</span>
                            <code className="text-[10px] text-amber-500 font-mono">[{factor.ruleId}]</code>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{factor.description}</p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/50 font-mono font-bold text-[10px]">
                          +{factor.scoreContribution} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-center">
                    No high-risk anomaly factors triggered for this transaction.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  navigate(`/workspace?account=${selectedTx.senderAccountId}`);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Investigate in Network Graph</span>
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
