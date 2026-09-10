import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  AlertOctagon,
  Database,
  X,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import type { IngestionBatch } from '../types';
import { formatDate } from '../utils/formatters';

export const IngestionPage: React.FC = () => {
  const [batches, setBatches] = useState<IngestionBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<IngestionBatch | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions/batches');
      if (res.data.success) {
        setBatches(res.data.data.batches);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setUploadSuccess(`Batch '${res.data.data.batchId}' processed: ${res.data.data.validCount} valid, ${res.data.data.invalidCount} rejected.`);
        fetchBatches();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'CSV upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setUploadSuccess(null);
    try {
      const res = await api.post('/transactions/demo-seed');
      if (res.data.success) {
        setUploadSuccess(`Enterprise Demo Dataset loaded: ${res.data.data.validCount} transactions ingested with 5 verified fraud typologies.`);
        fetchBatches();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Demo seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Data Ingestion Pipeline</h1>
          <p className="text-sm text-slate-400 mt-1">
            Validate, normalize, and ingest batch transaction feeds with schema enforcement and error logging.
          </p>
        </div>

        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Database className="w-4 h-4" />
          <span>{seeding ? 'Generating Mule Syndicate...' : 'Load Enterprise Demo Dataset'}</span>
        </button>
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Upload Zone & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dropzone (2 cols) */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="lg:col-span-2 border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-2xl p-10 text-center bg-slate-900/30 hover:bg-slate-900/50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {uploading ? 'Processing & Validating Records...' : 'Upload Financial Transaction Feed (CSV)'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Drag and drop your batch file here, or click to select from your filesystem.
          </p>
          <span className="mt-3 text-[11px] font-mono text-slate-500">Max file size: 25MB • Standard CSV format</span>
        </div>

        {/* Ingestion Pipeline Specs (1 col) */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>Required Schema Fields</span>
          </h3>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">transaction_id</code>: Unique identifier
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">sender_account_id</code>: Originating account
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">receiver_account_id</code>: Destination account
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">amount</code>: Positive decimal number
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">timestamp</code>: ISO 8601 UTC string
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <code className="text-slate-300 font-mono">transaction_type</code>: TRANSFER | PAYMENT
            </li>
          </ul>
        </div>
      </div>

      {/* Batch History Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Ingested Batch Feeds</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical ingestion runs, valid yields, and error logs.</p>
          </div>
          <button
            onClick={fetchBatches}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading batch records...</div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No ingestion batches found. Click 'Load Enterprise Demo Dataset' or upload a CSV to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Total Records</th>
                  <th className="py-3 px-4">Valid Ingested</th>
                  <th className="py-3 px-4">Errors / Rejected</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ingestion Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {batches.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-blue-400 font-semibold">{batch.batchId}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{batch.filename}</td>
                    <td className="py-3 px-4">{batch.totalRecords.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {batch.validRecords.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {batch.invalidRecords > 0 ? (
                        <span className="text-red-400 font-semibold">{batch.invalidRecords} rejected</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          batch.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-red-950 text-red-400 border border-red-800/60'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{formatDate(batch.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      {batch.validationErrors && batch.validationErrors.length > 0 ? (
                        <button
                          onClick={() => setSelectedBatch(batch)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer"
                        >
                          View Errors ({batch.validationErrors.length})
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validation Errors Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Validation Error Report: {selectedBatch.batchId}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Showing rejected rows and specific rule violations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Row #</th>
                    <th className="py-2.5 px-3">Column</th>
                    <th className="py-2.5 px-3">Violation Reason</th>
                    <th className="py-2.5 px-3">Raw Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {selectedBatch.validationErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">{err.row}</td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">{err.column}</td>
                      <td className="py-2.5 px-3 text-red-300 font-sans">{err.message}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">
                        {err.value !== undefined ? String(err.value) : '<empty>'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
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
