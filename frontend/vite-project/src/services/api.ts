const API_BASE = import.meta.env.VITE_API_URL || '';

function getHeaders(): HeadersInit {
  const userId = localStorage.getItem('user-id');
  return {
    'Content-Type': 'application/json',
    'X-User-ID': userId || '',
  };
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
  const res = await fetch(`${API_BASE}/api/my`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch schemas: ${res.status}`);
  const data = await res.json();
  return data.schemas;
}

export async function getSchema(schemaId: number): Promise<BackendSchema> {
  const res = await fetch(`${API_BASE}/api/${schemaId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
  const data = await res.json();
  return data.data;
}

export async function saveSchema(payload: unknown[], schemaName: string, schemaId?: number): Promise<void> {
  const body: Record<string, unknown> = { payload, schema_name: schemaName };
  if (schemaId !== undefined) body.schema_id = schemaId;
  const res = await fetch(`${API_BASE}/api/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save schema: ${res.status}`);
}

export async function getSchemaHistory(schemaId: number): Promise<SchemaHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/api/${schemaId}/history`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  const data = await res.json();
  return data.history;
}

export async function getSchemaVersion(schemaId: number, commitSha: string): Promise<BackendSchema> {
  const res = await fetch(`${API_BASE}/api/${schemaId}/version/${commitSha}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch version: ${res.status}`);
  const data = await res.json();
  return data.data;
}
