import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Project, ProjectStatus, Client, PaginatedResponse } from '../types/api';
import { AlertBanner } from '../components/common/AlertBanner';
import { Pagination } from '../components/common/Pagination';
import { Plus, Trash2, Edit2, Eye, X } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<Project>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Detail & Edit Modals
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PROPOSED');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');

  const fetchProjects = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.list({ page, status: statusFilter || undefined });
      setData(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.projects.list({ page: 1, status: statusFilter || undefined }),
      api.clients.list({ pageSize: 100 }),
    ])
      .then(([projRes, clientRes]) => {
        if (!ignore) {
          setData(projRes);
          setClients(clientRes.items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err as ApiError);
          setLoading(false);
        }
      });
    return () => { ignore = true; };
  }, [statusFilter]);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedProject(null);
    setClientId(clients[0]?.id || '');
    setName('');
    setDescription('');
    setPhase('');
    setStatus('PROPOSED');
    setStartDate('');
    setTargetEndDate('');
    setActualEndDate('');
    setShowModal(true);
  };

  const openEditModal = (p: Project) => {
    setIsEditing(true);
    setSelectedProject(p);
    setClientId(p.clientId);
    setName(p.name);
    setDescription(p.description || '');
    setPhase(p.phase || '');
    setStatus(p.status);
    setStartDate(p.startDate ? p.startDate.slice(0, 10) : '');
    setTargetEndDate(p.targetEndDate ? p.targetEndDate.slice(0, 10) : '');
    setActualEndDate(p.actualEndDate ? p.actualEndDate.slice(0, 10) : '');
    setShowModal(true);
  };

  const viewDetails = async (id: string) => {
    setError(null);
    try {
      const full = await api.projects.get(id);
      setSelectedProject(full);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing && selectedProject) {
        // clientId and healthStatus are omitted per API spec
        await api.projects.update(selectedProject.id, {
          name: name.trim(),
          description: description.trim() || null,
          phase: phase.trim() || null,
          status,
          startDate: startDate || null,
          targetEndDate: targetEndDate || null,
          actualEndDate: actualEndDate || null,
        });
      } else {
        await api.projects.create({
          clientId,
          name: name.trim(),
          description: description.trim() || undefined,
          phase: phase.trim() || undefined,
          status,
          startDate: startDate || undefined,
          targetEndDate: targetEndDate || undefined,
          actualEndDate: actualEndDate || undefined,
        });
      }
      setShowModal(false);
      fetchProjects(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    setError(null);
    try {
      await api.projects.delete(id);
      if (selectedProject?.id === id) setSelectedProject(null);
      fetchProjects(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Track client deliverables, schedules, and status</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      <AlertBanner error={error} onClear={() => setError(null)} />

      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="PROPOSED">PROPOSED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_HOLD">ON_HOLD</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Project Name</th>
              <th className="px-6 py-3 font-semibold">Client</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Health (Read-Only)</th>
              <th className="px-6 py-3 font-semibold">Timeline</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No projects found</td></tr>
            ) : (
              data.items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600">{p.client?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-800 border">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.healthStatus || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {p.startDate ? p.startDate.slice(0, 10) : '—'} → {p.targetEndDate ? p.targetEndDate.slice(0, 10) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => viewDetails(p.id)} className="text-slate-400 hover:text-slate-600 p-1" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-1" title="Delete">
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
          onPageChange={(p) => fetchProjects(p)}
        />
      </div>

      {/* Details Drawer */}
      {selectedProject && !showModal && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 p-6 z-40 overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b">
            <h2 className="text-lg font-bold text-slate-900">Project Details</h2>
            <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Project Name</span>
              <p className="font-bold text-slate-900 text-lg">{selectedProject.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Client</span>
              <p className="text-slate-700">{selectedProject.client?.name || '—'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Description</span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded text-xs mt-1">
                {selectedProject.description || 'No description provided.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold text-slate-400 uppercase">Phase</span>
                <p className="font-medium text-slate-800">{selectedProject.phase || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase">Health (System)</span>
                <p className="font-medium text-emerald-600">{selectedProject.healthStatus || 'N/A'}</p>
              </div>
            </div>
            <div className="border-t pt-4 text-xs space-y-1">
              <span className="font-semibold text-slate-400 uppercase">Milestones & Tasks</span>
              <p className="text-slate-600">Tasks: {selectedProject._count?.tasks ?? 0}</p>
              <p className="text-slate-600">Milestones: {selectedProject._count?.milestones ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create & Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">
              {isEditing ? 'Edit Project' : 'Add New Project'}
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Client *</label>
                <select
                  required
                  disabled={isEditing} // clientId is not writable on PATCH
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Project Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Phase</label>
                  <input
                    type="text"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                  >
                    <option value="PROPOSED">PROPOSED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Target End</label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Actual End</label>
                  <input
                    type="date"
                    value={actualEndDate}
                    onChange={(e) => setActualEndDate(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
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
                  {isEditing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};