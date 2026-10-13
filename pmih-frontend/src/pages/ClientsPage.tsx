import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Client, KeyContact, PaginatedResponse } from '../types/api';
import { AlertBanner } from '../components/common/AlertBanner';
import { Pagination } from '../components/common/Pagination';
import { Plus, Trash2, Edit2, Eye, X, Users } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<Client>>({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Detail & Edit Modals
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contacts, setContacts] = useState<KeyContact[]>([]);

  const fetchClients = async (page = 1, searchQuery = search) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.clients.list({ page, search: searchQuery });
      setData(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    api.clients.list({ page: 1 })
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
    setSelectedClient(null);
    setName('');
    setIndustry('');
    setContacts([]);
    setShowModal(true);
  };

  const openEditModal = (c: Client) => {
    setIsEditing(true);
    setSelectedClient(c);
    setName(c.name);
    setIndustry(c.industry || '');
    setContacts(c.keyContacts || []);
    setShowModal(true);
  };

  const viewDetails = async (id: string) => {
    setError(null);
    try {
      const full = await api.clients.get(id);
      setSelectedClient(full);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing && selectedClient) {
        await api.clients.update(selectedClient.id, {
          name: name.trim(),
          industry: industry.trim() || undefined,
          keyContacts: contacts,
        });
      } else {
        await api.clients.create({
          name: name.trim(),
          industry: industry.trim() || undefined,
          keyContacts: contacts,
        });
      }
      setShowModal(false);
      fetchClients(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    setError(null);
    try {
      await api.clients.delete(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      fetchClients(data.page);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const addContact = () => setContacts([...contacts, { name: '', email: '', role: '' }]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Manage client organizations and key contacts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <AlertBanner error={error} onClear={() => setError(null)} />

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-80"
        />
        <button
          onClick={() => fetchClients(1, search)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Filter
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Industry</th>
              <th className="px-6 py-3 font-semibold">Key Contacts</th>
              <th className="px-6 py-3 font-semibold">Programs / Projects</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No clients found</td></tr>
            ) : (
              data.items.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                  <td className="px-6 py-4 text-slate-600">{client.industry || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {client.keyContacts?.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                        <Users className="w-3 h-3" /> {client.keyContacts.length} contacts
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 space-x-2">
                    <span>Projects: {client._count?.projects ?? 0}</span>
                    <span>Programs: {client._count?.programs ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => viewDetails(client.id)} className="text-slate-400 hover:text-slate-600 p-1" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(client)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-600 p-1" title="Delete">
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
          onPageChange={(p) => fetchClients(p)}
        />
      </div>

      {/* Details Side-Drawer */}
      {selectedClient && !showModal && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 p-6 z-40 overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b">
            <h2 className="text-lg font-bold text-slate-900">Client Info</h2>
            <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Client Name</span>
              <p className="font-bold text-slate-800 text-lg">{selectedClient.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Industry</span>
              <p className="text-slate-700">{selectedClient.industry || 'Not specified'}</p>
            </div>
            <div className="border-t pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Counts & Associations</span>
              <div className="mt-1 bg-slate-50 p-3 rounded text-xs space-y-1 text-slate-600">
                <p>Projects: {selectedClient._count?.projects ?? 0}</p>
                <p>Programs: {selectedClient._count?.programs ?? 0}</p>
                <p>Tasks: {selectedClient._count?.tasks ?? 0}</p>
                <p>Commitments: {selectedClient._count?.commitments ?? 0}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Contacts</span>
              <div className="mt-2 space-y-2">
                {selectedClient.keyContacts?.map((c, idx) => (
                  <div key={idx} className="bg-slate-50 border p-2 rounded text-xs">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-slate-500">{c.role || 'No role'} • {c.email || 'No email'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create & Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">
              {isEditing ? 'Edit Client' : 'Add New Client'}
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Client Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase">Key Contacts</span>
                  <button type="button" onClick={addContact} className="text-xs text-indigo-600 font-semibold hover:underline">
                    + Add Contact
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        placeholder="Name *"
                        required
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[i].name = e.target.value;
                          setContacts(updated);
                        }}
                        className="w-1/3 border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        placeholder="Email"
                        type="email"
                        value={c.email || ''}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[i].email = e.target.value;
                          setContacts(updated);
                        }}
                        className="w-1/3 border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        placeholder="Role"
                        value={c.role || ''}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[i].role = e.target.value;
                          setContacts(updated);
                        }}
                        className="w-1/3 border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  ))}
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
                  {isEditing ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};