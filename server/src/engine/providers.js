/**
 * LLM provider abstraction with failover.
 * ---------------------------------------
 * One tiny interface — `complete({ system, user })` → raw string — implemented
 * for Groq (primary, free), Gemini (fallback, free) and Anthropic (optional,
 * paid high-accuracy). The engine never hard-codes a vendor; it asks
 * `availableProviders()` in configured order and uses the first that has a key.
 *
 * Everything is done over `fetch` (Node 18+) so the server stays dependency-light
 * and deploys cleanly to serverless.
 */

const GROQ_MODEL     = process.env.GROQ_MODEL     || 'llama-3.3-70b-versatile';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';
const GEMINI_MODEL   = process.env.GEMINI_MODEL   || 'gemini-flash-latest';
const CLAUDE_MODEL   = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// A terse prompt ("netflix") makes the model design a very large system, and
// 30s was not enough to stream 20+ components back — the request aborted and
// the user saw a failure for a perfectly good prompt. 45s fits comfortably
// inside the 60s serverless ceiling.
const TIMEOUT_MS  = Number(process.env.LLM_TIMEOUT_MS || 45_000);
const MAX_RETRIES = Number(process.env.LLM_RETRIES || 2);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt) => Math.min(2_000, 300 * 2 ** attempt);

/**
 * POST JSON with a hard timeout and transient-error retries. A slow or
 * rate-limited provider must fail fast and predictably so the engine can fail
 * over to the next one instead of hanging the whole request.
 */
async function postJson(url, { headers, body }, { retries = MAX_RETRIES } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal,
      });
      if (res.ok) return await res.json();

      // Retry rate-limits and server errors; surface everything else.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        lastErr = Object.assign(new Error(`HTTP ${res.status} ${res.statusText}`), { status: res.status });
        // Cap the wait so a large provider-supplied retry-after can't hang the
        // request for a minute — better to back off briefly then fail over.
        await sleep(Math.min(retryAfter * 1000 || backoff(attempt), 8_000));
        continue;
      }
      const text = await res.text().catch(() => '');
      throw Object.assign(new Error(`HTTP ${res.status} ${res.statusText} — ${text.slice(0, 300)}`), { status: res.status });
    } catch (e) {
      // An aborted fetch surfaces as "This operation was aborted", which means
      // nothing to a user. Say what actually happened.
      lastErr = e?.name === 'AbortError' || /aborted/i.test(e?.message || '')
        ? Object.assign(new Error(`the provider did not respond within ${Math.round(TIMEOUT_MS / 1000)}s`), { timeout: true })
        : e;
      if (attempt < retries) { await sleep(backoff(attempt)); continue; }
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** A rate-limit / quota rejection — the signal to rotate to a different key. */
const isRateLimited = (e) => e?.status === 429 || /\b429\b/.test(e?.message || '');

/**
 * Try `fn(key)` across all keys, starting at `startIdx`. On a rate-limit (429),
 * rotate to the NEXT key immediately (fail fast, no long backoff) rather than
 * giving up the whole provider — so N keys deliver ~N× the usable budget. A
 * non-rate-limit error surfaces at once (don't burn the other keys on a real bug).
 */
async function withKeyRotation(keys, startIdx, fn) {
  let lastErr;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(startIdx + i) % keys.length];
    try {
      return await fn(key);
    } catch (e) {
      lastErr = e;
      if (!isRateLimited(e)) throw e;
    }
  }
  throw lastErr;
}

/** Groq — OpenAI-compatible chat completions with JSON mode.
 *  Rotates across every configured key (GROQ_API_KEY, GROQ_API_KEY2, …,
 *  GROQ_API_KEYn) round-robin to spread load. NOTE: Groq's daily token budget
 *  is per-ACCOUNT, so many keys from ONE account share the same 100k/day; extra
 *  daily headroom comes only from keys on separate accounts (or another
 *  provider like Cerebras). Multiple keys always help the per-minute rate. */
let groqKeyIdx = 0;
const groqKeys = () =>
  Object.keys(process.env)
    .filter((k) => /^GROQ_API_KEY\d*$/.test(k))
    .sort() // GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3, … (stable order)
    .map((k) => process.env[k])
    .filter(Boolean);
const groq = {
  name: 'groq',
  get enabled() { return groqKeys().length > 0; },
  async complete({ system, user, temperature = 0.4 }) {
    const keys = groqKeys();
    const start = groqKeyIdx++; // rotating start so load spreads across keys
    return withKeyRotation(keys, start, async (key) => {
      const data = await postJson('https://api.groq.com/openai/v1/chat/completions', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: {
          model: GROQ_MODEL,
          temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
      }, { retries: 0 }); // fail fast on 429 → rotate to the next key
      return data.choices?.[0]?.message?.content ?? '';
    });
  },
};

/** Cerebras — OpenAI-compatible chat completions, free tier with a generous
 *  daily token budget (well beyond Groq's) and very fast inference. Serves as
 *  the first fallback so daily-limit exhaustion on the primary self-heals. */
const cerebras = {
  name: 'cerebras',
  get enabled() { return !!process.env.CEREBRAS_API_KEY; },
  async complete({ system, user, temperature = 0.4 }) {
    const data = await postJson('https://api.cerebras.ai/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: {
        model: CEREBRAS_MODEL,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
    });
    return data.choices?.[0]?.message?.content ?? '';
  },
};

/** Gemini — generateContent with JSON response MIME type. Rotates across
 *  GEMINI_API_KEY, GEMINI_API_KEY2, … round-robin, like Groq. */
let geminiKeyIdx = 0;
const geminiKeys = () =>
  Object.keys(process.env)
    .filter((k) => /^GEMINI_API_KEY\d*$/.test(k))
    .sort()
    .map((k) => process.env[k])
    .filter(Boolean);
const gemini = {
  name: 'gemini',
  get enabled() { return geminiKeys().length > 0; },
  async complete({ system, user, temperature = 0.4 }) {
    const keys = geminiKeys();
    const start = geminiKeyIdx++;
    return withKeyRotation(keys, start, async (key) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      const data = await postJson(url, {
        headers: { 'Content-Type': 'application/json' },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
        },
      }, { retries: 0 }); // fail fast on 429 → rotate to the next key
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    });
  },
};

/** Anthropic Claude — Messages API (optional high-accuracy mode). */
const anthropic = {
  name: 'anthropic',
  get enabled() { return !!process.env.ANTHROPIC_API_KEY; },
  async complete({ system, user, temperature = 0.4 }) {
    const data = await postJson('https://api.anthropic.com/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        temperature,
        system: `${system}\n\nRespond with ONLY the JSON object, no prose, no code fences.`,
        messages: [{ role: 'user', content: user }],
      },
    });
    return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') ?? '';
  },
};

/**
 * Offline deterministic provider for tests.
 *   ARCHFORGE_MOCK      → returns this string for every call
 *   ARCHFORGE_MOCK_SEQ  → JSON array of strings, returned one per call (last repeats)
 */
let mockIndex = 0;
export function resetMock() { mockIndex = 0; }
const mock = {
  name: 'mock',
  get enabled() { return !!(process.env.ARCHFORGE_MOCK || process.env.ARCHFORGE_MOCK_SEQ); },
  async complete() {
    if (process.env.ARCHFORGE_MOCK_SEQ) {
      const seq = JSON.parse(process.env.ARCHFORGE_MOCK_SEQ);
      const out = seq[Math.min(mockIndex, seq.length - 1)];
      mockIndex++;
      return out;
    }
    return process.env.ARCHFORGE_MOCK;
  },
};

/**
 * Guess the provider from an API key's prefix, so a user pasting a single key
 * doesn't have to also pick the vendor. Groq → gsk_, Cerebras → csk-,
 * Anthropic → sk-ant-, Gemini/Google → AIza… or AQ.…
 */
export function detectProviderFromKey(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  if (/^gsk_/.test(k)) return 'groq';
  if (/^csk[-_]/.test(k)) return 'cerebras';
  if (/^sk-ant-/.test(k)) return 'anthropic';
  if (/^AIza/.test(k) || /^AQ\./.test(k)) return 'gemini';
  return null;
}

/**
 * Build a one-off provider from a user-supplied key (Bring-Your-Own-Key). Lets
 * a deployed instance keep working after the shared free keys are spent — any
 * visitor can paste their own free key and generate. Returns null if the vendor
 * is unknown or the key is empty.
 */
export function makeProvider(provider, key) {
  const n = String(provider || '').toLowerCase().trim();
  if (!key || !n) return null;
  const openaiLike = (url, model, label) => ({
    name: label, enabled: true,
    async complete({ system, user, temperature = 0.4 }) {
      const data = await postJson(url, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: {
          model, temperature, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        },
      });
      return data.choices?.[0]?.message?.content ?? '';
    },
  });
  if (n === 'groq') return openaiLike('https://api.groq.com/openai/v1/chat/completions', GROQ_MODEL, 'groq(byok)');
  if (n === 'cerebras') return openaiLike('https://api.cerebras.ai/v1/chat/completions', CEREBRAS_MODEL, 'cerebras(byok)');
  if (n === 'gemini') return {
    name: 'gemini(byok)', enabled: true,
    async complete({ system, user, temperature = 0.4 }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      const data = await postJson(url, {
        headers: { 'Content-Type': 'application/json' },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
        },
      });
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    },
  };
  if (n === 'anthropic') return {
    name: 'anthropic(byok)', enabled: true,
    async complete({ system, user, temperature = 0.4 }) {
      const data = await postJson('https://api.anthropic.com/v1/messages', {
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: {
          model: CLAUDE_MODEL, max_tokens: 8000, temperature,
          system: `${system}\n\nRespond with ONLY the JSON object, no prose, no code fences.`,
          messages: [{ role: 'user', content: user }],
        },
      });
      return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') ?? '';
    },
  };
  return null;
}

/** A BYO provider from a raw key (auto-detecting the vendor), or null. */
export function byoProviderFromKey(key, providerHint) {
  const provider = providerHint || detectProviderFromKey(key);
  return provider ? makeProvider(provider, key) : null;
}

const ALL = { groq, cerebras, gemini, anthropic, mock };

/** Providers that have credentials, in configured order. */
export function availableProviders() {
  if (mock.enabled) return [mock];
  const order = (process.env.PROVIDER_ORDER || 'groq,cerebras,gemini,anthropic')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return order.map((n) => ALL[n]).filter((p) => p && p.enabled);
}

export { groq, cerebras, gemini, anthropic, mock, withKeyRotation, isRateLimited };
