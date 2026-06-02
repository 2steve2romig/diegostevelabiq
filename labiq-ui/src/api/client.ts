import type {
  AuditEventRecord, CatalogUploadResult, CreateLabRequest, CreateLocationRequest,
  DashboardStats, LabDetail, LabSummary, MasterAnalyte, MasterTest,
  OfferingRow, TestCodeHistory, TestCodeSummary, TransitionRequest,
} from './types';

const ACTOR_ID = 'demo-user';
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-User-Id': ACTOR_ID, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  dashboard: {
    stats: () => request<DashboardStats>('/api/dashboard'),
  },
  labs: {
    list: () => request<LabSummary[]>('/api/labs'),
    get: (id: number) => request<LabDetail>(`/api/labs/${id}`),
    create: (body: CreateLabRequest) =>
      request<{ labId: number }>('/api/labs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    addLocation: (labId: number, body: CreateLocationRequest) =>
      request<{ locationId: number }>(`/api/labs/${labId}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    transition: (labId: number, locationId: number, body: TransitionRequest) =>
      request<{ status: string }>(`/api/labs/${labId}/locations/${locationId}/lifecycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    audit: (labId: number) => request<AuditEventRecord[]>(`/api/labs/${labId}/audit`),
  },
  catalog: {
    list: (labId: number) => request<TestCodeSummary[]>(`/api/labs/${labId}/catalog`),
    testHistory: (labId: number, code: string) => request<TestCodeHistory>(`/api/labs/${labId}/catalog/tests/${code}/history`),
    paramHistory: (labId: number, code: string) => request<TestCodeHistory>(`/api/labs/${labId}/catalog/parameters/${code}/history`),
    upload: async (labId: number, file: File): Promise<CatalogUploadResult> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/api/labs/${labId}/catalog/upload`, { method: 'POST', headers: { 'X-User-Id': ACTOR_ID }, body: form });
      const data = await res.json();
      if (!res.ok && res.status !== 422) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
  },
  tests: {
    list: (labId?: number, search?: string, filter?: string) => {
      const params = new URLSearchParams();
      if (labId) params.set('labId', String(labId));
      if (search) params.set('search', search);
      if (filter) params.set('filter', filter);
      return request<MasterTest[]>(`/api/tests?${params}`);
    },
    create: (body: { labId: number; code: string; description: string }) =>
      request<{ testCodeId: number }>('/api/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    update: (id: number, body: { description: string; reason: string }) =>
      request<void>(`/api/tests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/api/tests/${id}`, { method: 'DELETE' }),
    linkAnalyte: (testId: number, parameterCodeId: number) =>
      request<void>(`/api/tests/${testId}/analytes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parameterCodeId }) }),
    unlinkAnalyte: (testId: number, paramId: number) =>
      request<void>(`/api/tests/${testId}/analytes/${paramId}`, { method: 'DELETE' }),
  },
  analytes: {
    list: (labId?: number, search?: string) => {
      const params = new URLSearchParams();
      if (labId) params.set('labId', String(labId));
      if (search) params.set('search', search);
      return request<MasterAnalyte[]>(`/api/analytes?${params}`);
    },
    create: (body: { labId: number; code: string; description: string; methodCode?: string; defaultUnit?: string; defaultResultType?: string }) =>
      request<{ parameterCodeId: number }>('/api/analytes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    update: (id: number, body: { description: string; reason: string }) =>
      request<void>(`/api/analytes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/api/analytes/${id}`, { method: 'DELETE' }),
  },
  offerings: {
    list: (labId: number, locationId: number) => request<OfferingRow[]>(`/api/labs/${labId}/locations/${locationId}/offerings`),
    add: (labId: number, locationId: number, testCodeId: number) =>
      request<void>(`/api/labs/${labId}/locations/${locationId}/offerings/${testCodeId}`, { method: 'POST' }),
    remove: (labId: number, locationId: number, testCodeId: number) =>
      request<void>(`/api/labs/${labId}/locations/${locationId}/offerings/${testCodeId}`, { method: 'DELETE' }),
  },
};
