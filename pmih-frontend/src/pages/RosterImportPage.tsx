import React, { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { RosterHeadersResponse, RosterImportResponse } from '../types/api';
import { AlertBanner } from '../components/common/AlertBanner';
import { Upload, CheckCircle2} from 'lucide-react';

const REQUIRED_FIELDS = ['fullName', 'email', 'role', 'department'];

export const RosterImportPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headerInfo, setHeaderInfo] = useState<RosterHeadersResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<RosterImportResponse | null>(null);
  const [commitResult, setCommitResult] = useState<RosterImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.csv')) {
      alert('Only .csv files are supported');
      return;
    }
    setFile(selected);
    setLoading(true);
    setError(null);
    try {
      const res = await api.rosterImport.inspectHeaders(selected);
      setHeaderInfo(res);
      setMapping(res.suggestedMapping || {});
      setStep(2);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.rosterImport.dryRun(file, mapping);
      setPreview(res);
      setStep(3);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.rosterImport.commit(file, mapping);
      setCommitResult(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Resource Roster Import</h1>
        <p className="text-sm text-slate-500">Bulk create and update resources via CSV</p>
      </div>

      <AlertBanner error={error} onClear={() => setError(null)} />

      {step === 1 && (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-white">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">Select a Roster CSV file</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">Maximum file size: 5MB. Must include header row.</p>
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            className="hidden"
            onChange={handleFileUpload}
            disabled={loading}
          />
          <label
            htmlFor="csv-file-input"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
          >
            {loading ? 'Analyzing...' : 'Browse CSV'}
          </label>
        </div>
      )}

      {step === 2 && headerInfo && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Map CSV Columns</h2>
          <div className="space-y-4 max-w-xl">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{field} *</span>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white w-64"
                >
                  <option value="">Select Header...</option>
                  {headerInfo.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">weeklyCapacityHours (Optional)</span>
              <select
                value={mapping.weeklyCapacityHours || ''}
                onChange={(e) => setMapping({ ...mapping, weeklyCapacityHours: e.target.value })}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white w-64"
              >
                <option value="">Omit</option>
                {headerInfo.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleDryRun}
              disabled={loading || REQUIRED_FIELDS.some((rf) => !mapping[rf])}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Running Dry Run...' : 'Review Dry Run'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && preview && !commitResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dry Run Summary</h2>
            <div className="grid grid-cols-5 gap-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border text-center">
                <div className="text-xs text-slate-500 uppercase">Total</div>
                <div className="text-xl font-bold">{preview.summary.totalRows}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                <div className="text-xs text-emerald-600 uppercase">Creates</div>
                <div className="text-xl font-bold text-emerald-700">{preview.summary.created ?? 0}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <div className="text-xs text-blue-600 uppercase">Updates</div>
                <div className="text-xl font-bold text-blue-700">{preview.summary.updated ?? 0}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                <div className="text-xs text-amber-600 uppercase">Duplicates</div>
                <div className="text-xl font-bold text-amber-700">{preview.summary.duplicate ?? 0}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                <div className="text-xs text-red-600 uppercase">Rejects</div>
                <div className="text-xl font-bold text-red-700">{preview.summary.rejected ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 font-medium">Row Action</th>
                  <th className="px-4 py-2 font-medium">Warnings / Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 font-bold uppercase">{row.action}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {[...(row.reasons || []), ...(row.warnings || [])].join(', ') || 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Modify Mapping
            </button>
            <button
              onClick={handleCommit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? 'Committing...' : 'Commit Changes'}
            </button>
          </div>
        </div>
      )}

      {commitResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Roster Import Complete</h2>
          <p className="text-slate-600 mt-1 mb-6">
            Applied changes: <strong>{commitResult.result?.created}</strong> created,{' '}
            <strong>{commitResult.result?.updated}</strong> updated.
          </p>
          <button
            onClick={() => {
              setStep(1);
              setFile(null);
              setPreview(null);
              setCommitResult(null);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            Import Another CSV
          </button>
        </div>
      )}
    </div>
  );
};