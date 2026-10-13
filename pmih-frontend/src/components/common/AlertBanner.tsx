import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ApiError } from '../../api/client';

interface AlertBannerProps {
  error?: ApiError | Error | null;
  warnings?: string[] | null;
  onClear?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ error, warnings, onClear }) => {
  if (!error && (!warnings || warnings.length === 0)) return null;

  return (
    <div className="space-y-3 mb-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{error instanceof ApiError ? `Error: ${error.code}` : 'An error occurred'}</p>
            <p className="mt-1">{error.message}</p>
            {error instanceof ApiError && error.details && (
              <div className="mt-2 text-xs text-red-700 bg-red-100/50 p-2 rounded">
                <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(error.details, null, 2)}</pre>
              </div>
            )}
          </div>
          {onClear && (
            <button onClick={onClear} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Notice / Warnings</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
          {onClear && (
            <button onClick={onClear} className="text-amber-500 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};