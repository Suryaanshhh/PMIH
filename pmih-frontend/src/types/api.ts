export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | Record<string, string[]>>;
  };
}

export interface KeyContact {
  name: string;
  email?: string;
  role?: string;
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  keyContacts: KeyContact[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    programs?: number;
    projects?: number;
    tasks?: number;
    commitments?: number;
    sourceRecords?: number;
  };
}

export type ProjectStatus = 'PROPOSED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  phase?: string | null;
  status: ProjectStatus;
  programId?: string | null;
  healthStatus?: string; // read-only
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  client?: { id: string; name: string };
  program?: { id: string; name: string } | null;
  _count?: {
    tasks?: number;
    milestones?: number;
    allocations?: number;
  };
}

export interface ResourceAvailability {
  weeklyCapacityHours?: number;
  timezone?: string;
  maxSimultaneousProjects?: number;
}

export interface ResourceSkill {
  name: string;
  proficiency: string;
}

export interface Resource {
  id: string;
  fullName: string;
  email: string;
  role: string;
  primaryDepartment: string;
  availability?: ResourceAvailability | null;
  skills?: ResourceSkill[];
  _count?: {
    allocations?: number;
    tasksOwned?: number;
  };
}

export interface Allocation {
  id: string;
  resourceId: string;
  projectId: string;
  allocatedPercentage: number;
  startDate: string;
  endDate: string;
  plannedEffortHours?: number;
  resource?: { id: string; fullName: string; email: string };
  project?: {
    id: string;
    name: string;
    client?: { id: string; name: string };
  };
}

export interface AllocationSaveResponse {
  allocation: Allocation;
  warnings?: string[];
  plannedEffortHoursCalculated?: boolean;
}

export interface RosterHeadersResponse {
  headers: string[];
  rowCount: number;
  suggestedMapping: Record<string, string>;
  missingRequired: string[];
}

export interface RosterImportResponse {
  committed: boolean;
  mapping: Record<string, string>;
  summary: {
    totalRows: number;
    created?: number;
    updated?: number;
    unchanged?: number;
    duplicate?: number;
    rejected?: number;
  };
  result?: {
    syncJobId: string;
    created: number;
    updated: number;
  };
  rows: Array<{
    action: 'create' | 'update' | 'unchanged' | 'duplicate' | 'reject';
    reasons?: string[];
    warnings?: string[];
    changes?: Record<string, { old: unknown; new: unknown }>;
  }>;
}