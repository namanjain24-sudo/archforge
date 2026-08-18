/** Thin API client. Vite proxies /api → the server on :8799 in dev. */

const KEY_STORE = 'archforge-api-key';

/** The user's own API key (Bring-Your-Own-Key), if they saved one. */
export function getApiKey() {
  try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
}
export function setApiKey(key) {
  try { key ? localStorage.setItem(KEY_STORE, key.trim()) : localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
}

/** Guess the provider from a key prefix — same rules as the server. */
export function detectProvider(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  if (/^gsk_/.test(k)) return 'Groq';
  if (/^csk[-_]/.test(k)) return 'Cerebras';
  if (/^sk-ant-/.test(k)) return 'Anthropic';
  if (/^AIza/.test(k) || /^AQ\./.test(k)) return 'Gemini';
  return null;
}

/** Merge the user's saved key into a request body when present. */
function withKey(body) {
  const apiKey = getApiKey();
  return apiKey ? { ...body, apiKey } : body;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function generate(prompt, signal) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withKey({ prompt })),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** Re-verify + re-lay-out an edited architecture (no model call). */
export async function reassess(architecture, prompt) {
  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ architecture, prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Re-verify failed (${res.status})`);
  return data;
}

/** Evolve an existing architecture with an instruction, then re-verify. */
export async function refine(architecture, instruction, prompt) {
  const res = await fetch(`${API_BASE}/api/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withKey({ architecture, instruction, prompt })),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Refine failed (${res.status})`);
  return data;
}

export async function fetchExamples() {
  try {
    const res = await fetch(`${API_BASE}/api/examples`);
    const data = await res.json();
    return data.examples || [];
  } catch {
    return [];
  }
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return await res.json();
  } catch {
    return { ok: false, providers: [] };
  }
}
