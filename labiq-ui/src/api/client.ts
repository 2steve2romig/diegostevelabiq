import type {
  AuditEventRecord,
  CatalogUploadResult,
  CreateLabRequest,
  CreateLocationRequest,
  LabDetail,
  LabSummary,
  TestCodeHistory,
  TestCodeSummary,
  TransitionRequest,
} from './types';

const ACTOR_ID = 'demo-user';

// In dev the Vite proxy forwards /api → localhost:5000.
// In production (Vercel) VITE_API_URL points at the Railway service.
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'X-User-Id': ACTOR_ID,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  labs: {
    list: () => request<LabSummary[]>('/api/labs'),
    get: (id: number) => request<LabDetail>(`/api/labs/${id}`),
    create: (body: CreateLabRequest) =>
      request<{ labId: number; labCompanyCode: string; legalName: string }>('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    addLocation: (labId: number, body: CreateLocationRequest) =>
      request<{ locationId: number; labLocationCode: string; status: string }>(
        `/api/labs/${labId}/locations`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      ),
    transition: (labId: number, locationId: number, body: TransitionRequest) =>
      request<{ locationId: number; status: string }>(
        `/api/labs/${labId}/locations/${locationId}/lifecycle`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      ),
    audit: (labId: number) => request<AuditEventRecord[]>(`/api/labs/${labId}/audit`),
  },
  catalog: {
    list: (labId: number) => request<TestCodeSummary[]>(`/api/labs/${labId}/catalog`),
    testHistory: (labId: number, code: string) =>
      request<TestCodeHistory>(`/api/labs/${labId}/catalog/tests/${code}/history`),
    paramHistory: (labId: number, code: string) =>
      request<TestCodeHistory>(`/api/labs/${labId}/catalog/parameters/${code}/history`),
    upload: async (labId: number, file: File): Promise<CatalogUploadResult> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/api/labs/${labId}/catalog/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': ACTOR_ID },
        body: form,
      });
      const data = await res.json();
      if (!res.ok && res.status !== 422) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data;
    },
  },
};
