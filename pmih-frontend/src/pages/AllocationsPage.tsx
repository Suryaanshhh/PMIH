import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Allocation, Resource, Project, PaginatedResponse } from '../types/api';
import { AlertBanner } from '../components/common/AlertBanner';
import { Pagination } from '../components/common/Pagination';
import { Plus, Trash2 } from 'lucide-react';

export const AllocationsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<Allocation>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [resourceId, setResourceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [percentage, setPercentage] = useState(50);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
const fetchAllocations = async (page = 1) => {
  setLoading(true);
  setError(null);
  try {
    const res = await api.allocations.list({ page });
    setData(res);
  } catch (err) {
    setError(err as ApiError);
  } finally {
    setLoading(false);
  }
};

// 3. Keep initial effect clean using an async IIFE or Promise chaining
useEffect(() => {
  let ignore = false;

  Promise.all([
    api.allocations.list({ page: 1 }),
    api.resources.list({ pageSize: 100 }),
    api.projects.list({ pageSize: 100 }),
  ])
    .then(([allocRes, resRes, projRes]) => {
      if (!ignore) {
        setData(allocRes);
        setResources(resRes.items);
        setProjects(projRes.items);
        setLoading(false);
      }
    })
    .catch((err) => {
      if (!ignore) {
        setError(err as ApiError);
        setLoading(false);
      }
    });

  return () => {
    ignore = true;
  };
}, []);
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarnings(null);
    try {
      const res = await api.allocations.create({
        resourceId,
        projectId,
        allocatedPercentage: Number(percentage),
        startDate,
        endDate,
      });

      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }
      setShowModal(false);
      fetchAllocations(1);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this allocation?')) return;
    setError(null);
    try {
      await api.allocations.delete(id);
      fetchAllocations(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocations</h1>
          <p className="text-sm text-slate-500">Resource assignments to client projects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Allocation
        </button>
      </div>

      <AlertBanner error={error} warnings={warnings} onClear={() => { setError(null); setWarnings(null); }} />

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Resource</th>
              <th className="px-6 py-3 font-semibold">Project</th>
              <th className="px-6 py-3 font-semibold">Allocation %</th>
              <th className="px-6 py-3 font-semibold">Effort Hours</th>
              <th className="px-6 py-3 font-semibold">Window</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No allocations found</td></tr>
            ) : (
              data.items.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{alloc.resource?.fullName}</td>
                  <td className="px-6 py-4 text-slate-600">{alloc.project?.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-indigo-600">{alloc.allocatedPercentage}%</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{alloc.plannedEffortHours ?? '—'} hrs</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {alloc.startDate.slice(0, 10)} → {alloc.endDate.slice(0, 10)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(alloc.id)} className="text-slate-400 hover:text-red-600 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize}
          onPageChange={(p) => fetchAllocations(p)}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">New Allocation</div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Resource *</label>
                <select
                  required
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Resource...</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Project *</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Allocation Percentage (1-100) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Start Date *</label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">End Date *</label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};