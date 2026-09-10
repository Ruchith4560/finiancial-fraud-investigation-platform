import React, { useState } from 'react';
import type { TimelineEvent } from '../../types/investigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  ShieldAlert,
  Smartphone,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ForensicTimelineProps {
  timeline: TimelineEvent[];
  onFocusAccount: (accountId: string) => void;
}

export const ForensicTimeline: React.FC<ForensicTimelineProps> = ({ timeline, onFocusAccount }) => {
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [searchCounterparty, setSearchCounterparty] = useState('');

  const filteredEvents = timeline.filter((event) => {
    if (filterDirection !== 'ALL' && event.direction !== filterDirection) {
      return false;
    }
    if (
      searchCounterparty.trim() &&
      !event.counterparty.toLowerCase().includes(searchCounterparty.toLowerCase()) &&
      !event.transactionId.toLowerCase().includes(searchCounterparty.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by counterparty or TX ID..."
              value={searchCounterparty}
              onChange={(e) => setSearchCounterparty(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 font-mono w-64"
            />
          </div>
        </div>

        {/* Direction Filter */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
          {(['ALL', 'INCOMING', 'OUTGOING'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                filterDirection === dir
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {dir === 'ALL' ? 'All Flows' : dir === 'INCOMING' ? 'Inflows Only' : 'Outflows Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No transactions match current filters.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
          {filteredEvents.map((tx) => {
            const isIncoming = tx.direction === 'INCOMING';

            return (
              <div
                key={tx.transactionId}
                className="bg-slate-950/70 border border-slate-800/70 hover:border-slate-700 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
              >
                {/* Left: Direction + Counterparty */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isIncoming
                        ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                        : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {isIncoming ? 'Received From:' : 'Transferred To:'}
                      </span>
                      <button
                        onClick={() => onFocusAccount(tx.counterparty)}
                        className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                        title="Focus on this account"
                      >
                        <span>{tx.counterparty}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>{tx.transactionId}</span>
                      <span>•</span>
                      <span>{formatDate(tx.timestamp)}</span>
                      {tx.deviceId && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-400">
                            <Smartphone className="w-3 h-3" />
                            {tx.deviceId.substring(0, 12)}
                          </span>
                        </>
                      )}
                      {tx.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Globe className="w-3 h-3" />
                            {tx.ipAddress}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Flags */}
                <div className="flex items-center gap-4 justify-between md:justify-end">
                  {tx.isFlagged && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800">
                      <ShieldAlert className="w-3 h-3" />
                      {tx.amount >= 10000 ? 'CTR THRESHOLD' : 'STRUCTURING'}
                    </span>
                  )}

                  <div className="text-right font-mono">
                    <div
                      className={`text-sm font-bold ${
                        isIncoming ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncoming ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </div>
                    <div className="text-[10px] text-slate-500">{tx.transactionType}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
