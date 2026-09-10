import React, { useState, useEffect } from 'react';
import { FileText, Save, Check, Download } from 'lucide-react';

interface InvestigatorNotesProps {
  targetAccountId: string;
  onExportReport: () => void;
}

export const InvestigatorNotes: React.FC<InvestigatorNotesProps> = ({
  targetAccountId,
  onExportReport,
}) => {
  const storageKey = `fraudlens_notes_${targetAccountId}`;
  const [notes, setNotes] = useState<string>('');
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<string>('UNDER_INVESTIGATION');

  // Load notes from localStorage on account change
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setNotes(saved);
      setSavedTime('Loaded from draft');
    } else {
      setNotes(
        `## INVESTIGATION WORKING NOTES: ${targetAccountId}\n\n` +
        `### 1. Preliminary Assessment\n` +
        `- Entity exhibits elevated transactional turnover and structured multi-party flows.\n\n` +
        `### 2. Forensic Findings\n` +
        `- Observed fund aggregation and rapid disbursement behavior consistent with mule layering.\n\n` +
        `### 3. Recommended Action\n` +
        `- Review counterparty KYC records and request source of funds documentation.\n`
      );
      setSavedTime(null);
    }
  }, [targetAccountId]);

  const handleSaveNotes = () => {
    localStorage.setItem(storageKey, notes);
    setSavedTime(new Date().toLocaleTimeString());
  };

  const insertStamp = (text: string) => {
    setNotes((prev) => `${prev}\n\n${text}`);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100">Investigator Working Notes & Disposition</h3>
        </div>

        <div className="flex items-center gap-2">
          {savedTime && (
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              Saved: {savedTime}
            </span>
          )}
          <button
            onClick={handleSaveNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Notes</span>
          </button>
        </div>
      </div>

      {/* Disposition Selector */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold">Investigative Disposition:</span>
        <select
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
        >
          <option value="UNDER_INVESTIGATION">Under Active Investigation</option>
          <option value="ESCALATED_SAR">Escalate to FinCEN SAR Filing</option>
          <option value="RECOMMEND_FREEZE">Recommend Immediate Account Freeze</option>
          <option value="CLEARED_FALSE_POSITIVE">Cleared: Benign / False Positive</option>
        </select>

        <span className="text-slate-500">|</span>

        {/* Quick Stamps */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Quick Stamps:</span>
          <button
            onClick={() => insertStamp(`> [!WARNING]\n> **Structuring Alert**: Transaction velocity exhibits smurfing patterns under CTR $10,000 threshold.`)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
          >
            + Structuring
          </button>
          <button
            onClick={() => insertStamp(`> [!IMPORTANT]\n> **Mule Pass-Through**: Account passed >75% of inflow out within 2 hours. Recommend freezing remaining balance.`)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
          >
            + Mule Warning
          </button>
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          placeholder="Document investigator observations, counterparty relationships, evidence citations, and regulatory findings..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none leading-relaxed resize-y"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-slate-500">
          Notes persist per target account. All changes are tracked in the investigation audit trail.
        </p>

        <button
          onClick={onExportReport}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Complete Case Dossier</span>
        </button>
      </div>
    </div>
  );
};
