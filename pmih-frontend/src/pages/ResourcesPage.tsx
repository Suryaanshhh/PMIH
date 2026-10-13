import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Resource, ResourceAvailability, PaginatedResponse } from '../types/api';
import { AlertBanner } from '../components/common/AlertBanner';
import { Pagination } from '../components/common/Pagination';
import { Plus, Trash2, Edit2, Eye, X} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<Resource>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Detail & Edit Modals
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [primaryDepartment, setPrimaryDepartment] = useState('');
  const [weeklyCapacityHours, setWeeklyCapacityHours] = useState<number | ''>(40);
  const [timezone, setTimezone] = useState('UTC');
  const [maxSimultaneousProjects, setMaxSimultaneousProjects] = useState<number | ''>(3);

  const fetchResources = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.resources.list({
        page,
        search: search.trim() || undefined,
        department: department.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    api.resources.list({ page: 1 })
      .then((res) => {
        if (!ignore) {
          setData(res);
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
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedResource(null);
    setFullName('');
    setEmail('');
    setRole('');
    setPrimaryDepartment('');
    setWeeklyCapacityHours(40);
    setTimezone('UTC');
    setMaxSimultaneousProjects(3);
    setShowModal(true);
  };

  const openEditModal = (r: Resource) => {
    setIsEditing(true);
    setSelectedResource(r);
    setFullName(r.fullName);
    setEmail(r.email);
    setRole(r.role);
    setPrimaryDepartment(r.primaryDepartment);
    setWeeklyCapacityHours(r.availability?.weeklyCapacityHours ?? '');
    setTimezone(r.availability?.timezone ?? 'UTC');
    setMaxSimultaneousProjects(r.availability?.maxSimultaneousProjects ?? '');
    setShowModal(true);
  };

  const viewDetails = async (id: string) => {
    setError(null);
    try {
      const full = await api.resources.get(id);
      setSelectedResource(full);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const availabilityPayload: ResourceAvailability = {};
    if (weeklyCapacityHours !== '') availabilityPayload.weeklyCapacityHours = Number(weeklyCapacityHours);
    if (timezone) availabilityPayload.timezone = timezone;
    if (maxSimultaneousProjects !== '') availabilityPayload.maxSimultaneousProjects = Number(maxSimultaneousProjects);

    try {
      if (isEditing && selectedResource) {
        await api.resources.update(selectedResource.id, {
          fullName: fullName.trim(),
          email: email.trim(),
          role: role.trim(),
          primaryDepartment: primaryDepartment.trim(),
          availability: Object.keys(availabilityPayload).length ? availabilityPayload : undefined,
        });
      } else {
        await api.resources.create({
          fullName: fullName.trim(),
          email: email.trim(),
          role: role.trim(),
          primaryDepartment: primaryDepartment.trim(),
          availability: Object.keys(availabilityPayload).length ? availabilityPayload : undefined,
        });
      }
      setShowModal(false);
      fetchResources(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    setError(null);
    try {
      await api.resources.delete(id);
      if (selectedResource?.id === id) setSelectedResource(null);
      fetchResources(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resources</h1>
          <p className="text-sm text-slate-500">Manage staffing, departmental roles, and weekly capacities</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      <AlertBanner error={error} onClear={() => setError(null)} />

      {/* Filter Controls */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-72"
        />
        <input
          type="text"
          placeholder="Filter by Department..."
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-56"
        />
        <button
          onClick={() => fetchResources(1)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Name & Email</th>
              <th className="px-6 py-3 font-semibold">Role</th>
              <th className="px-6 py-3 font-semibold">Department</th>
              <th className="px-6 py-3 font-semibold">Weekly Capacity</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading resources...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No resources found</td></tr>
            ) : (
              data.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{r.fullName}</div>
                    <div className="text-xs text-slate-400">{r.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.role}</td>
                  <td className="px-6 py-4 text-slate-700">{r.primaryDepartment}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {r.availability?.weeklyCapacityHours ? `${r.availability.weeklyCapacityHours} hrs/wk` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => viewDetails(r.id)} className="text-slate-400 hover:text-slate-600 p-1" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(r)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-600 p-1" title="Delete">
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
          onPageChange={(p) => fetchResources(p)}
        />
      </div>

      {/* Details Slide-Over */}
      {selectedResource && !showModal && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 p-6 z-40 overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b">
            <h2 className="text-lg font-bold text-slate-900">Resource Details</h2>
            <button onClick={() => setSelectedResource(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Full Name</span>
              <p className="font-semibold text-slate-800 text-base">{selectedResource.fullName}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Email</span>
              <p className="text-slate-700">{selectedResource.email}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Role & Department</span>
              <p className="text-slate-700">{selectedResource.role} • {selectedResource.primaryDepartment}</p>
            </div>
            <div className="border-t pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Availability Config</span>
              <div className="mt-1 bg-slate-50 p-3 rounded text-xs space-y-1 text-slate-600">
                <p>Capacity: {selectedResource.availability?.weeklyCapacityHours ?? 40} hrs/week</p>
                <p>Timezone: {selectedResource.availability?.timezone ?? 'Not set'}</p>
                <p>Max Projects: {selectedResource.availability?.maxSimultaneousProjects ?? 'Not set'}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Skills</span>
              {selectedResource.skills && selectedResource.skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedResource.skills.map((s, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                      {s.name} ({s.proficiency})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">No skills registered</p>
              )}
            </div>
            <div className="border-t pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Related Work</span>
              <div className="mt-1 text-xs text-slate-600 space-y-1">
                <p>Active Allocations: {selectedResource._count?.allocations ?? 0}</p>
                <p>Tasks Owned: {selectedResource._count?.tasksOwned ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">
              {isEditing ? 'Edit Resource' : 'Add New Resource'}
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Full Name *</label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Email *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Role *</label>
                  <input
                    required
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Department *</label>
                  <input
                    required
                    type="text"
                    value={primaryDepartment}
                    onChange={(e) => setPrimaryDepartment(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <span className="text-xs font-bold text-slate-600 block mb-2">Availability (Optional)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600">Hours/Wk (1-80)</label>
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={weeklyCapacityHours}
                      onChange={(e) => setWeeklyCapacityHours(e.target.value ? Number(e.target.value) : '')}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">Max Projects (1-20)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxSimultaneousProjects}
                      onChange={(e) => setMaxSimultaneousProjects(e.target.value ? Number(e.target.value) : '')}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] text-slate-600">IANA Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  {isEditing ? 'Save Changes' : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};