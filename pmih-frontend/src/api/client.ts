import type { ApiErrorPayload } from '../types/api';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 204) {
    return null as T;
  }

  if (!res.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = await res.json();
    } catch {
      // Fallback if not valid JSON
    }
    throw new ApiError(
      payload?.error?.code || `HTTP_${res.status}`,
      payload?.error?.message || `Request failed with status ${res.status}`,
      payload?.error?.details as Record<string, unknown>
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; database: string }>('/health'),

  clients: {
    list: (params: { search?: string; page?: number; pageSize?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      return request<import('../types/api').PaginatedResponse<import('../types/api').Client>>(`/clients?${q}`);
    },
    get: (id: string) => request<import('../types/api').Client>(`/clients/${id}`),
    create: (data: Partial<import('../types/api').Client>) =>
      request<import('../types/api').Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types/api').Client>) =>
      request<import('../types/api').Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<null>(`/clients/${id}`, { method: 'DELETE' }),
  },

  projects: {
    list: (params: { search?: string; clientId?: string; status?: string; page?: number; pageSize?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.clientId) q.set('clientId', params.clientId);
      if (params.status) q.set('status', params.status);
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      return request<import('../types/api').PaginatedResponse<import('../types/api').Project>>(`/projects?${q}`);
    },
    get: (id: string) => request<import('../types/api').Project>(`/projects/${id}`),
    create: (data: Partial<import('../types/api').Project>) =>
      request<import('../types/api').Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types/api').Project>) =>
      request<import('../types/api').Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<null>(`/projects/${id}`, { method: 'DELETE' }),
  },

  resources: {
    list: (params: { search?: string; department?: string; page?: number; pageSize?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.department) q.set('department', params.department);
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      return request<import('../types/api').PaginatedResponse<import('../types/api').Resource>>(`/resources?${q}`);
    },
    get: (id: string) => request<import('../types/api').Resource>(`/resources/${id}`),
    create: (data: Partial<import('../types/api').Resource>) =>
      request<import('../types/api').Resource>('/resources', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types/api').Resource>) =>
      request<import('../types/api').Resource>(`/resources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<null>(`/resources/${id}`, { method: 'DELETE' }),
  },

  allocations: {
    list: (params: { resourceId?: string; projectId?: string; activeOn?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.resourceId) q.set('resourceId', params.resourceId);
      if (params.projectId) q.set('projectId', params.projectId);
      if (params.activeOn) q.set('activeOn', params.activeOn);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      return request<import('../types/api').PaginatedResponse<import('../types/api').Allocation>>(`/allocations?${q}`);
    },
    get: (id: string) => request<import('../types/api').Allocation>(`/allocations/${id}`),
    create: (data: Partial<import('../types/api').Allocation>) =>
      request<import('../types/api').AllocationSaveResponse>('/allocations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('../types/api').Allocation>) =>
      request<import('../types/api').AllocationSaveResponse>(`/allocations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<null>(`/allocations/${id}`, { method: 'DELETE' }),
  },

  rosterImport: {
    inspectHeaders: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return request<import('../types/api').RosterHeadersResponse>('/imports/roster/headers', {
        method: 'POST',
        body: fd,
      });
    },
    dryRun: (file: File, mapping: Record<string, string>) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      return request<import('../types/api').RosterImportResponse>('/imports/roster', {
        method: 'POST',
        body: fd,
      });
    },
    commit: (file: File, mapping: Record<string, string>) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      return request<import('../types/api').RosterImportResponse>('/imports/roster?commit=true', {
        method: 'POST',
        body: fd,
      });
    },
  },
};