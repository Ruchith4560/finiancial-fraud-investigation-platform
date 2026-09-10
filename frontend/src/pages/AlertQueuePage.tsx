import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  X,
  Briefcase,
  ChevronRight,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Alert } from '../types';
import { formatCurrency, formatDate, getRiskBadgeClasses, getStatusBadgeClasses } from '../utils/formatters';

export const AlertQueuePage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchAccount, setSearchAccount] = useState('');

  const [stats, setStats] = useState({
    totalAlerts: 0,
    severities: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    statuses: { NEW: 0, IN_REVIEW: 0, CASE_CREATED: 0, DISMISSED: 0 },
  });

  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await api.get('/alerts/stats');
      if (res.data.success) {
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch alert stats:', err);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        sortBy: 'riskScore',
        sortOrder: 'desc',
        limit: 50,
      };

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (searchAccount.trim()) params.accountId = searchAccount.trim();

      const res = await api.get('/alerts', { params });
      if (res.data.success) {
        setAlerts(res.data.data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleSyncAlerts = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/alerts/sync');
      if (res.data.success) {
        fetchStats();
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to sync alerts:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusUpdate = async (alertId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/alerts/${alertId}/status`, { status: newStatus });
      if (res.data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a.alertId === alertId ? { ...a, status: newStatus as any } : a))
        );
        if (selectedAlert && selectedAlert.alertId === alertId) {
          setSelectedAlert((prev: any) => ({ ...prev, status: newStatus }));
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleEscalateToCase = (alert: Alert) => {
    navigate(`/workspace?seedAlertId=${alert.alertId}&accountId=${alert.primaryAccountId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Suspicious Alert Triage Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            Prioritized alert queue ranked by composite risk scores, deterministic rule factors, and anomaly probabilities.
          </p>
        </div>

        <button
          onClick={handleSyncAlerts}
          disabled={syncing}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{syncing ? 'Re-Scoring Intelligence...' : 'Re-Score Alerts'}</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Total Alerts</div>
          <div className="text-xl font-bold text-slate-100 mt-1">{stats.totalAlerts}</div>
          <div className="text-[11px] text-slate-400 mt-1">{stats.statuses.NEW} pending triage</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Critical Severity</div>
          <div className="text-xl font-bold text-red-400 mt-1">{stats.severities.CRITICAL}</div>
          <div className="text-[11px] text-red-400/80 mt-1">Immediate review required</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase font-semibold text-slate-500">High Severity</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.severities.HIGH}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Multi-rule violations</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase font-semibold text-slate-500">In Active Review</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{stats.statuses.IN_REVIEW}</div>
          <div className="text-[11px] text-blue-400/80 mt-1">Investigator assigned</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          {['ALL', 'NEW', 'IN_REVIEW', 'CASE_CREATED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Severity Dropdown & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
              placeholder="Filter by Account ID..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Alert Queue Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading prioritized alert queue...</div>
        ) : alerts.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p>No alerts found matching current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Alert ID</th>
                  <th className="py-3 px-4">Primary Account</th>
                  <th className="py-3 px-4">Linked Tx</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Triggered Intelligence Rules</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {alerts.map((alt) => (
                  <tr
                    key={alt._id}
                    onClick={() => setSelectedAlert(alt)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-blue-400 font-bold">{alt.alertId}</td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">{alt.primaryAccountId}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{alt.transactionId}</div>
                      {(alt as any).transaction?.amount && (
                        <div className="text-slate-300 font-sans text-[10px]">
                          {formatCurrency((alt as any).transaction.amount)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClasses(alt.severity)}`}>
                        {alt.riskScore} • {alt.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {alt.ruleTriggers && alt.ruleTriggers.length > 0 ? (
                          alt.ruleTriggers.map((rt, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[10px]"
                            >
                              {rt.ruleName}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[10px]">ML Anomaly Outlier</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeClasses(alt.status)}`}>
                        {alt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEscalateToCase(alt);
                          }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs transition-colors cursor-pointer"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAlert(alt);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Inspection Drawer Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">{selectedAlert.alertId}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClasses(selectedAlert.severity)}`}>
                      Score: {selectedAlert.riskScore} ({selectedAlert.severity})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Primary Target: {selectedAlert.primaryAccountId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Status Update Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400 text-xs">Current Triage Status:</span>
                <div className="flex gap-1.5">
                  {['NEW', 'IN_REVIEW', 'DISMISSED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusUpdate(selectedAlert.alertId, st)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        selectedAlert.status === st
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Context */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Transaction Evidence</div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="text-slate-200">{selectedAlert.transactionId}</span>
                </div>
                {(selectedAlert as any).transaction?.amount && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-400">Amount:</span>
                    <span className="text-blue-400 font-bold">
                      {formatCurrency((selectedAlert as any).transaction.amount)}
                    </span>
                  </div>
                )}
                {(selectedAlert as any).transaction?.timestamp && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-300">
                      {formatDate((selectedAlert as any).transaction.timestamp)}
                    </span>
                  </div>
                )}
              </div>

              {/* Explainability Matrix: Why Flagged */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Why Flagged: Contributing Intelligence Signals
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Defensible regulatory signals: Layer 1 Deterministic Rules and Layer 2 Anomaly Probability.
                </p>

                <div className="space-y-2">
                  {selectedAlert.ruleTriggers.map((rt, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-950/20 border border-amber-800/50 rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-300 font-sans">{rt.ruleName}</span>
                          <code className="text-[10px] text-amber-500 font-mono">[{rt.ruleId}]</code>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{rt.description}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/50 font-mono font-bold text-[10px]">
                        +{rt.scoreContribution} pts
                      </span>
                    </div>
                  ))}

                  {/* ML Score Breakdown */}
                  <div className="bg-purple-950/20 border border-purple-800/50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="font-semibold text-purple-300">Isolation Forest Outlier Model</span>
                        <p className="text-[11px] text-slate-400">Multidimensional feature distance score</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 font-mono font-bold text-[10px]">
                      P(anomaly) = {selectedAlert.mlScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer font-medium"
              >
                Close
              </button>

              <button
                onClick={() => handleEscalateToCase(selectedAlert)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open in Unified Investigation Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
