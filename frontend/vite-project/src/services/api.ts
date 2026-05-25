const API_BASE = import.meta.env.VITE_API_URL || '';
const PI_MODE = import.meta.env.VITE_PI_MODE === 'true';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access-token');
  const userId = localStorage.getItem('user-id') || '1';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-ID': PI_MODE ? '1' : (userId || '1'),
  };
  if (!PI_MODE && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) } });

  if (res.status === 401 && !PI_MODE) {
    const refreshRes = await fetch(`${API_BASE}/api/v1/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem('access-token', data.access);
      res = await fetch(url, {
        ...options,
        headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
      });
    }
  }

  return res;
}

export interface BackendSchema {
  schema_id: number;
  schema_name: string;
  user_id: number;
  payload: unknown[];
}

export interface SchemaHistoryEntry {
  commit_sha: string;
  date: string;
}

export async function getMySchemas(): Promise<BackendSchema[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/my`);
  if (!res.ok) throw new Error(`Failed to fetch schemas: ${res.status}`);
  const data = await res.json();
  return data.schemas;
}

export async function getSchema(schemaId: number): Promise<BackendSchema> {
  const res = await fetchWithAuth(`${API_BASE}/api/${schemaId}`);
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function saveSchema(payload: unknown[], schemaName: string, schemaId?: number): Promise<void> {
  const body: Record<string, unknown> = { payload, schema_name: schemaName };
  if (schemaId !== undefined) body.schema_id = schemaId;
  const res = await fetchWithAuth(`${API_BASE}/api/save`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save schema: ${res.status}`);
}

export async function deleteSchema(schemaId: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/${schemaId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete schema: ${res.status}`);
}

export async function getSchemaHistory(schemaId: number): Promise<SchemaHistoryEntry[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/${schemaId}/history`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  const data = await res.json();
  return data.history;
}

export async function getSchemaVersion(schemaId: number, commitSha: string): Promise<BackendSchema> {
  const res = await fetchWithAuth(`${API_BASE}/api/${schemaId}/version/${commitSha}`);
  if (!res.ok) throw new Error(`Failed to fetch version: ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function uploadImage(file: File, schemaId: string | number): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const userId = PI_MODE ? '1' : (localStorage.getItem('user-id') || '1');
  const token = localStorage.getItem('access-token');
  const headers: HeadersInit = { 'X-User-ID': userId };
  if (!PI_MODE && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/upload/${schemaId}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload image: ${res.status}`);
  const data = await res.json();
  return data.file_id;
}
