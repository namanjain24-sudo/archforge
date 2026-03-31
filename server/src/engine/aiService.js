/**
 * ============================================================================
 * ARCHFORGE — AI SERVICE v3 (PRODUCTION-GRADE MULTI-LLM ROUTER)
 * ============================================================================
 *
 * Multi-LLM failover with retry, backoff, health checks, and structured logging:
 *
 *   1. OpenAI   (primary)   — retry w/ exponential backoff for 429s, 3s timeout
 *   2. Gemini   (fallback)  — corrected endpoint + model, 5s timeout
 *   3. Ollama   (local)     — health check before call, 3s timeout
 *   4. null     (graceful)  — system continues with deterministic rule engine
 *
 * ANTI-HALLUCINATION SYSTEM PROMPT enforced on ALL LLM calls.
 * Every call validates output JSON structure before returning.
 * ============================================================================
 */

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════

const LOG_PREFIX = '[LLM Router]';

function logInfo(provider, message) {
  console.log(`\x1b[36m${LOG_PREFIX} [${provider}] ${message}\x1b[0m`);
}

function logSuccess(provider, message) {
  console.log(`\x1b[32m${LOG_PREFIX} ✅ [${provider}] ${message}\x1b[0m`);
}

function logWarn(provider, message) {
  console.log(`\x1b[33m${LOG_PREFIX} ⚠️  [${provider}] ${message}\x1b[0m`);
}

function logError(provider, message) {
  console.log(`\x1b[31m${LOG_PREFIX} ❌ [${provider}] ${message}\x1b[0m`);
}

function logFallback(from, to) {
  console.log(`\x1b[33m${LOG_PREFIX} 🔄 Falling back: ${from} → ${to}\x1b[0m`);
}

// ═══════════════════════════════════════════════════════════════
// HARDENED SYSTEM PROMPT (Anti-Hallucination)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a Senior Distributed Systems Architect.

STRICT RULES:
- You MUST ONLY enhance the given architecture
- Do NOT invent unrealistic components
- Do NOT modify valid existing structure
- ONLY add missing production-grade components like queues, caches, gateways, observability, and resilience infrastructure
- No UI → DB direct connections are allowed
- No UI → Queue direct connections are allowed
- Prefer async (queues + workers) for heavy write workloads
- Every component MUST have: id, name, type, layer
- Valid types: service, database, cache, queue, worker, external, ui
- Valid layers: interaction, processing, data, integration
- Output MUST be strict JSON only — no markdown, no explanations

RETURN FORMAT:
{
  "components": {
    "interaction": [{ "id": "...", "name": "...", "type": "service", "layer": "interaction" }],
    "processing": [],
    "data": [],
    "integration": []
  },
  "suggestions": [{ "type": "scaling", "message": "..." }]
}`;

// ═══════════════════════════════════════════════════════════════
// OUTPUT VALIDATION — Prevents hallucinated/broken JSON from
// reaching the pipeline
// ═══════════════════════════════════════════════════════════════

const VALID_TYPES = new Set(['service', 'database', 'cache', 'queue', 'worker', 'external', 'ui']);
const VALID_LAYERS = new Set(['interaction', 'processing', 'data', 'integration']);

/**
 * Validates and sanitizes AI output. Removes invalid nodes,
 * ensures required fields, and prevents hallucinated components.
 * @returns {object|null} Validated output or null if completely invalid
 */
function validateAIOutput(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.components || typeof raw.components !== 'object') return null;

  const validated = { components: {}, suggestions: [] };

  for (const layer of VALID_LAYERS) {
    validated.components[layer] = [];
    const comps = raw.components[layer];
    if (!Array.isArray(comps)) continue;

    for (const comp of comps) {
      // Must have id and name at minimum
      if (!comp || typeof comp !== 'object') continue;
      if (!comp.id || !comp.name) continue;

      // Sanitize type
      const type = VALID_TYPES.has(comp.type) ? comp.type : 'service';

      validated.components[layer].push({
        id: comp.id,
        name: comp.name,
        type,
        layer,
        ...(comp.capability && { capability: comp.capability }),
        ...(comp.priority && { priority: comp.priority }),
        ...(comp.tech && { tech: comp.tech }),
        ...(comp.description && { description: comp.description }),
        ...(comp.protocol && { protocol: comp.protocol })
      });
    }
  }

  // Validate suggestions
  if (Array.isArray(raw.suggestions)) {
    validated.suggestions = raw.suggestions.filter(
      s => s && typeof s === 'object' && s.message && typeof s.message === 'string'
    );
  }

  // Must have at least one component to be useful
  const totalComponents = Object.values(validated.components).reduce((sum, arr) => sum + arr.length, 0);
  if (totalComponents === 0) return null;

  return validated;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY: Promise with hard timeout
// ═══════════════════════════════════════════════════════════════

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT_${ms}ms`)), ms);
    promise
      .then(val => { clearTimeout(timer); resolve(val); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY: Sleep for exponential backoff
// ═══════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// LLM LAYER 1: OPENAI (with retry + exponential backoff)
// ═══════════════════════════════════════════════════════════════

const OPENAI_MAX_RETRIES = 3;
const OPENAI_BASE_DELAY_MS = 500;  // 500ms → 1s → 2s
const OPENAI_TIMEOUT_MS = 3000;

/**
 * Single OpenAI request attempt (no retry logic).
 */
function _callOpenAISingle(input, systemData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `System Design Intent: ${input}\nExisting Rule-Engine Components: ${JSON.stringify(systemData.components)}\nAnalyze and return enhancements. Avoid duplicates.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: OPENAI_TIMEOUT_MS
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 429) {
          // Extract retry-after header if present
          const retryAfter = res.headers['retry-after'];
          const err = new Error('OPENAI_RATE_LIMITED_429');
          err.retryable = true;
          err.retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : null;
          return reject(err);
        }
        if (res.statusCode === 401) {
          return reject(new Error('OPENAI_INVALID_API_KEY'));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`OPENAI_API_ERROR_${res.statusCode}`));
        }
        try {
          const parsed = JSON.parse(data);
          if (!parsed.choices || !parsed.choices[0] || !parsed.choices[0].message) {
            return reject(new Error('OPENAI_MALFORMED_RESPONSE'));
          }
          const aiJson = JSON.parse(parsed.choices[0].message.content);
          resolve(aiJson);
        } catch (err) {
          reject(new Error('OPENAI_INVALID_JSON'));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('OPENAI_SOCKET_TIMEOUT')); });
    req.on('error', (err) => reject(new Error(`OPENAI_NETWORK_ERROR: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

/**
 * OpenAI with retry + exponential backoff for 429 rate limits.
 * Max 3 retries with delays: 500ms → 1000ms → 2000ms
 */
async function callOpenAI(input, systemData) {
  // Validate API key before attempting
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_MISSING');
  }
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY_INVALID_FORMAT');
  }

  for (let attempt = 0; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    try {
      logInfo('OpenAI', `Attempt ${attempt + 1}/${OPENAI_MAX_RETRIES + 1}`);
      const result = await withTimeout(
        _callOpenAISingle(input, systemData),
        OPENAI_TIMEOUT_MS,
        'OPENAI'
      );

      // Validate output structure
      const validated = validateAIOutput(result);
      if (!validated) {
        throw new Error('OPENAI_OUTPUT_VALIDATION_FAILED');
      }

      return validated;
    } catch (err) {
      const isRetryable = err.retryable || err.message.includes('429');
      const isLastAttempt = attempt === OPENAI_MAX_RETRIES;

      if (isRetryable && !isLastAttempt) {
        const delay = err.retryAfterMs || (OPENAI_BASE_DELAY_MS * Math.pow(2, attempt));
        logWarn('OpenAI', `Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${OPENAI_MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// LLM LAYER 2: GEMINI (fixed endpoint + model)
// ═══════════════════════════════════════════════════════════════

const GEMINI_TIMEOUT_MS = 5000;

function callGemini(input, systemData) {
  return new Promise((resolve, reject) => {
    if (!process.env.GEMINI_API_KEY) {
      return reject(new Error('GEMINI_API_KEY_MISSING'));
    }

    const payload = JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nSystem Design Intent: ${input}\nExisting Rule-Engine Components: ${JSON.stringify(systemData.components)}\nAnalyze and return enhancements. Avoid duplicates.`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 800
      }
    });

    // ★ FIXED: Use stable v1beta endpoint with gemini-2.0-flash (latest stable model)
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiKey = process.env.GEMINI_API_KEY;

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: GEMINI_TIMEOUT_MS
    };

    logInfo('Gemini', `Calling model: ${model}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 400) {
          let errorDetail = '';
          try { errorDetail = JSON.parse(data).error?.message || ''; } catch {}
          return reject(new Error(`GEMINI_BAD_REQUEST: ${errorDetail}`));
        }
        if (res.statusCode === 403) {
          return reject(new Error('GEMINI_API_KEY_INVALID_OR_RESTRICTED'));
        }
        if (res.statusCode === 404) {
          return reject(new Error(`GEMINI_MODEL_NOT_FOUND: ${model} — check model name`));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`GEMINI_API_ERROR_${res.statusCode}`));
        }

        try {
          const parsed = JSON.parse(data);

          // Handle Gemini safety blocks
          if (parsed.candidates?.[0]?.finishReason === 'SAFETY') {
            return reject(new Error('GEMINI_SAFETY_BLOCK'));
          }

          let rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            return reject(new Error('GEMINI_EMPTY_RESPONSE'));
          }

          // Strip markdown code fences if present
          rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          const aiJson = JSON.parse(rawText);

          // Validate output structure
          const validated = validateAIOutput(aiJson);
          if (!validated) {
            return reject(new Error('GEMINI_OUTPUT_VALIDATION_FAILED'));
          }

          resolve(validated);
        } catch (err) {
          reject(new Error(`GEMINI_JSON_PARSE_ERROR: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('GEMINI_SOCKET_TIMEOUT')); });
    req.on('error', (err) => reject(new Error(`GEMINI_NETWORK_ERROR: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// LLM LAYER 3: OLLAMA LOCAL (with health check)
// ═══════════════════════════════════════════════════════════════

const OLLAMA_TIMEOUT_MS = 15000;
const OLLAMA_HEALTH_TIMEOUT_MS = 1000;

/**
 * Checks if Ollama server is running and reachable.
 * GET http://localhost:11434/ returns "Ollama is running" when healthy.
 */
function checkOllamaHealth() {
  return new Promise((resolve) => {
    const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
    const ollamaPort = parseInt(process.env.OLLAMA_PORT || '11434', 10);

    const req = http.get({
      hostname: ollamaHost,
      port: ollamaPort,
      path: '/',
      timeout: OLLAMA_HEALTH_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    });

    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

/**
 * Calls Ollama local LLM with health check gate.
 */
async function callOllama(input, systemData) {
  const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || '11434', 10);
  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

  // Pre-flight health check — fail fast if server is down
  logInfo('Ollama', `Health check: ${ollamaHost}:${ollamaPort}`);
  const healthy = await checkOllamaHealth();
  if (!healthy) {
    throw new Error('OLLAMA_SERVER_NOT_RUNNING');
  }
  logInfo('Ollama', `Server healthy. Using model: ${model}`);

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `System Design Intent: ${input}\nExisting Rule-Engine Components: ${JSON.stringify(systemData.components)}\nReturn JSON enhancements only.`
        }
      ],
      stream: false,
      format: 'json'
    });

    const options = {
      hostname: ollamaHost,
      port: ollamaPort,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: OLLAMA_TIMEOUT_MS
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        clearTimeout(hardKillTimer);
        if (res.statusCode >= 400) {
          return reject(new Error(`OLLAMA_API_ERROR_${res.statusCode}`));
        }
        try {
          const parsed = JSON.parse(data);
          if (!parsed.message || !parsed.message.content) {
            return reject(new Error('OLLAMA_EMPTY_RESPONSE'));
          }
          const aiJson = JSON.parse(parsed.message.content);

          // Validate output structure
          const validated = validateAIOutput(aiJson);
          if (!validated) {
            return reject(new Error('OLLAMA_OUTPUT_VALIDATION_FAILED'));
          }

          resolve(validated);
        } catch (err) {
          reject(new Error(`OLLAMA_JSON_PARSE_ERROR: ${err.message}`));
        }
      });
    });

    // Hard kill timer — covers DNS + connection + response
    const hardKillTimer = setTimeout(() => { req.destroy(); reject(new Error('OLLAMA_HARD_TIMEOUT')); }, OLLAMA_TIMEOUT_MS);
    req.on('timeout', () => { clearTimeout(hardKillTimer); req.destroy(); reject(new Error('OLLAMA_SOCKET_TIMEOUT')); });
    req.on('error', (err) => { clearTimeout(hardKillTimer); reject(new Error(`OLLAMA_NETWORK_ERROR: ${err.message}`)); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// LLM LAYER 0: GROQ (Ultra-fast inference — OpenAI-compatible API)
// ═══════════════════════════════════════════════════════════════

const GROQ_TIMEOUT_MS = 5000;

/**
 * Calls Groq's OpenAI-compatible chat completions API.
 * Groq provides sub-second inference on open-source models.
 */
function callGroq(input, systemData) {
  return new Promise((resolve, reject) => {
    if (!process.env.GROQ_API_KEY) {
      return reject(new Error('GROQ_API_KEY_MISSING'));
    }

    const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `System Design Intent: ${input}\nExisting Rule-Engine Components: ${JSON.stringify(systemData.components)}\nAnalyze and return enhancements. Avoid duplicates.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: GROQ_TIMEOUT_MS
    };

    logInfo('Groq', `Calling model: ${model}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 429) {
          const retryAfter = res.headers['retry-after'];
          const err = new Error('GROQ_RATE_LIMITED_429');
          err.retryable = true;
          err.retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : null;
          return reject(err);
        }
        if (res.statusCode === 401) {
          return reject(new Error('GROQ_INVALID_API_KEY'));
        }
        if (res.statusCode >= 400) {
          let errorDetail = '';
          try { errorDetail = JSON.parse(data).error?.message || ''; } catch {}
          return reject(new Error(`GROQ_API_ERROR_${res.statusCode}: ${errorDetail}`));
        }
        try {
          const parsed = JSON.parse(data);
          if (!parsed.choices || !parsed.choices[0] || !parsed.choices[0].message) {
            return reject(new Error('GROQ_MALFORMED_RESPONSE'));
          }
          const aiJson = JSON.parse(parsed.choices[0].message.content);

          // Validate output structure
          const validated = validateAIOutput(aiJson);
          if (!validated) {
            return reject(new Error('GROQ_OUTPUT_VALIDATION_FAILED'));
          }

          resolve(validated);
        } catch (err) {
          reject(new Error(`GROQ_JSON_PARSE_ERROR: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('GROQ_SOCKET_TIMEOUT')); });
    req.on('error', (err) => reject(new Error(`GROQ_NETWORK_ERROR: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// CENTRALIZED AI ROUTER — 4-LAYER FAILOVER + STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════

/**
 * callAI(input, systemData)
 *
 * Attempts LLM providers in priority order:
 *   0. Groq     (primary)   — ultra-fast inference, OpenAI-compatible
 *   1. OpenAI   (fallback)  — with retry + exponential backoff
 *   2. Gemini   (fallback)  — corrected endpoint
 *   3. Ollama   (local)     — with health check
 *   4. Returns null          — rule engine takes over
 *
 * NEVER throws. Always returns { provider, data } or null.
 */
async function callAI(input, systemData) {
  const startTime = Date.now();

  // ── LAYER 0: Groq (Ultra-Fast) ──
  try {
    const result = await withTimeout(callGroq(input, systemData), GROQ_TIMEOUT_MS, 'GROQ');
    logSuccess('Groq', `Response received in ${Date.now() - startTime}ms`);
    return { provider: 'groq', data: result };
  } catch (err) {
    logError('Groq', `Failed: ${err.message}`);
    logFallback('Groq', 'OpenAI');
  }

  // ── LAYER 1: OpenAI ──
  try {
    const result = await callOpenAI(input, systemData);
    logSuccess('OpenAI', `Response received in ${Date.now() - startTime}ms`);
    return { provider: 'openai', data: result };
  } catch (err) {
    logError('OpenAI', `Failed: ${err.message}`);
    logFallback('OpenAI', 'Gemini');
  }

  // ── LAYER 2: Gemini ──
  try {
    const result = await callGemini(input, systemData);
    logSuccess('Gemini', `Response received in ${Date.now() - startTime}ms`);
    return { provider: 'gemini', data: result };
  } catch (err) {
    logError('Gemini', `Failed: ${err.message}`);
    logFallback('Gemini', 'Ollama');
  }

  // ── LAYER 3: Ollama Local ──
  try {
    const result = await callOllama(input, systemData);
    logSuccess('Ollama', `Response received in ${Date.now() - startTime}ms`);
    return { provider: 'ollama', data: result };
  } catch (err) {
    logError('Ollama', `Failed: ${err.message}`);
  }

  // ── All LLMs unavailable — return null (rule engine takes over) ──
  logWarn('Router', `All 4 LLM providers failed. Elapsed: ${Date.now() - startTime}ms. Falling back to deterministic rule engine.`);
  return null;
}

/**
 * Legacy-compatible wrapper — keeps the same interface as the old callLLM.
 * Existing code that calls callLLM() will continue to work.
 */
async function callLLM(input, systemData) {
  const result = await callAI(input, systemData);
  if (result === null) {
    throw new Error('ALL_LLMS_UNAVAILABLE');
  }
  return result.data;
}

module.exports = { callLLM, callAI, validateAIOutput };
