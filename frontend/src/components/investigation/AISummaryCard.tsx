import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertTriangle,
  Layers,
  Scale,
  Lock,
} from 'lucide-react';
import {
  generateAISummary,
  attachAISummaryToCase,
  type AISummaryResponse,
  type ObservedFact,
  type SystemInference,
} from '../../api/ai';

interface AISummaryCardProps {
  targetAccountId: string;
  caseId?: string;
  investigatorNotes?: string;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({
  targetAccountId,
  caseId,
  investigatorNotes,
}) => {
  const [summary, setSummary] = useState<AISummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'FACTS_INFERENCES' | 'SAR_NARRATIVE' | 'ACTIONS'>('FACTS_INFERENCES');
  const [copied, setCopied] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [attaching, setAttaching] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    setAttachSuccess(false);
    try {
      const res = await generateAISummary({
        targetAccountId,
        caseId,
        investigatorNotes,
      });
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize AI investigation summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [targetAccountId, caseId]);

  const handleCopySAR = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.sarNarrative.fullNarrativeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSAR = () => {
    if (!summary) return;
    const blob = new Blob([summary.sarNarrative.fullNarrativeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAR-Narrative-${targetAccountId}-${new Date().toISOString().substring(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAttachToCase = async () => {
    if (!caseId || !summary) return;
    setAttaching(true);
    try {
      await attachAISummaryToCase(caseId, summary);
      setAttachSuccess(true);
      setTimeout(() => setAttachSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to attach AI summary to case');
    } finally {
      setAttaching(false);
    }
  };

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading && !summary) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4">
        <div className="p-3 bg-blue-900/30 rounded-full border border-blue-700/50 animate-pulse">
          <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h4 className="text-sm font-bold text-slate-100">Synthesizing Forensic Intelligence Dossier</h4>
          <p className="text-xs text-slate-400 max-w-md">
            Aggregating transactional timelines, isolating observed facts, checking BSA structuring thresholds, and drafting 4-part FinCEN SAR narrative...
          </p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-slate-900/60 border border-red-900/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h4 className="text-sm font-bold">Failed to Generate AI Summary</h4>
        </div>
        <p className="text-xs text-slate-300">{error}</p>
        <button
          onClick={fetchSummary}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Generation</span>
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-950/80 text-blue-400 border border-blue-800/80 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI REGULATORY CO-PILOT</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Zero-Hallucination Guardrails: Active</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {summary.modelUsed}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Defensible regulatory synthesis strictly bifurcating verified mathematical facts from algorithm-derived typologies.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {caseId && (
            <button
              onClick={handleAttachToCase}
              disabled={attaching || attachSuccess}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                attachSuccess
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {attachSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bound to Case {caseId}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{attaching ? 'Freezing...' : 'Save to Case Record'}</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerate Summary</span>
          </button>
        </div>
      </div>

      {/* Executive Briefing Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Forensic Executive Briefing</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Generated {new Date(summary.generatedAt).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {summary.executiveSummary}
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('FACTS_INFERENCES')}
          className={`pb-2 px-3 font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'FACTS_INFERENCES'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Fact vs. Inference Matrix</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {summary.observedFacts.length + summary.systemInferences.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SAR_NARRATIVE')}
          className={`pb-2 px-3 font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SAR_NARRATIVE'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>FinCEN 4-Part SAR Narrative</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            31 CFR 1020.320
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIONS')}
          className={`pb-2 px-3 font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ACTIONS'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Actionable Regulatory Steps</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {summary.recommendedActions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: FACTS VS. INFERENCES MATRIX */}
      {activeTab === 'FACTS_INFERENCES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 1: Observed Facts (Emerald Green) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-emerald-900/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Strictly Observed Facts ({summary.observedFacts.length})
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">Verifiable Data Points</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Directly verifiable transaction records, mathematical sums, device IDs, and explicit timestamps.
            </p>

            <div className="space-y-2.5">
              {summary.observedFacts.map((fact: ObservedFact) => (
                <div
                  key={fact.factId}
                  className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                      {fact.factId}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
                      {fact.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {fact.statement}
                  </p>

                  {fact.evidenceReferences.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-emerald-900/30">
                      <span className="text-[9px] text-emerald-400 font-mono">Citations:</span>
                      {fact.evidenceReferences.slice(0, 4).map((ref, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono px-1 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-800/50"
                        >
                          {ref}
                        </span>
                      ))}
                      {fact.evidenceReferences.length > 4 && (
                        <span className="text-[9px] text-slate-500 font-mono">
                          +{fact.evidenceReferences.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: System Inferences (Purple/Indigo) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-purple-900/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  System Inferences ({summary.systemInferences.length})
                </h4>
              </div>
              <span className="text-[10px] text-purple-400/80 font-mono">Algorithm-Derived Typologies</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Graph algorithmic typologies, Isolation Forest feature distance scores, and triggered rules with explicit confidence metrics.
            </p>

            <div className="space-y-2.5">
              {summary.systemInferences.map((inf: SystemInference) => (
                <div
                  key={inf.inferenceId}
                  className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50">
                      {inf.inferenceId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-purple-400">
                        {inf.typology.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-purple-900/80 text-purple-200 rounded border border-purple-600/60">
                        {Math.round(inf.confidenceScore * 100)}% Conf
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {inf.statement}
                  </p>

                  <div className="pt-1 border-t border-purple-900/30 text-[10px] text-purple-300 font-mono flex items-center gap-1">
                    <span className="text-purple-400 font-semibold">Regulatory Reference:</span>
                    <span>{inf.regulatoryBasis}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINCEN 4-PART SAR NARRATIVE */}
      {activeTab === 'SAR_NARRATIVE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200">
                FinCEN Form 111 E-Filing Narrative Draft
              </span>
              <p className="text-[11px] text-slate-400">
                Meets FinCEN Advisory narrative guidance (Part I: Subject, Part II: Summary, Part III: Chronological, Part IV: Disposition).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySAR}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copied ? 'Copied Narrative' : 'Copy Narrative'}</span>
              </button>

              <button
                onClick={handleDownloadSAR}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export TXT</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Part I */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-blue-400 font-bold tracking-wider text-[11px]">
                PART I: SUBJECT & ACCOUNT IDENTIFICATION
              </div>
              <pre className="text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {summary.sarNarrative.subjectInformation.replace('PART I: SUBJECT & ACCOUNT IDENTIFICATION\n', '')}
              </pre>
            </div>

            {/* Part II */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-blue-400 font-bold tracking-wider text-[11px]">
                PART II: SUMMARY OF SUSPICIOUS ACTIVITY
              </div>
              <p className="text-slate-300 font-sans leading-relaxed text-xs">
                {summary.sarNarrative.summaryOfSuspiciousActivity.replace('PART II: SUMMARY OF SUSPICIOUS ACTIVITY\n', '')}
              </p>
            </div>

            {/* Part III */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-blue-400 font-bold tracking-wider text-[11px]">
                PART III: CHRONOLOGICAL BREAKDOWN OF SUSPICIOUS TRANSACTIONS
              </div>
              <pre className="text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {summary.sarNarrative.chronologicalNarrative.replace('PART III: CHRONOLOGICAL BREAKDOWN OF SUSPICIOUS TRANSACTIONS\n', '')}
              </pre>
            </div>

            {/* Part IV */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-blue-400 font-bold tracking-wider text-[11px]">
                PART IV: DISPOSITION & RECOMMENDED ACTION
              </div>
              <pre className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed text-xs">
                {summary.sarNarrative.dispositionAndRecommendations.replace('PART IV: DISPOSITION & RECOMMENDED ACTION\n', '')}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIONABLE RECOMMENDATIONS CHECKLIST */}
      {activeTab === 'ACTIONS' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Compliance protocol checklist customized for the detected risk factors and regulatory filing windows.
          </p>

          <div className="space-y-2">
            {summary.recommendedActions.map((action: string, idx: number) => {
              const isChecked = !!checkedActions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(idx)}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    isChecked
                      ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-300'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition ${
                      isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-600 bg-slate-900'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`text-xs font-medium leading-relaxed ${isChecked ? 'line-through text-slate-400' : ''}`}>
                      {action}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Action Item #{idx + 1} • Compliance Protocol
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
