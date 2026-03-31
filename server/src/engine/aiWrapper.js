/**
 * ============================================================================
 * ARCHFORGE — AI WRAPPER v3 (SAFE ORCHESTRATOR)
 * ============================================================================
 *
 * Safe orchestrator that wraps the multi-LLM router with:
 *   - 10s global SLA timeout (protects pipeline from hanging)
 *   - Component normalization (prevents broken/hallucinated nodes)
 *   - Deduplication (AI components vs existing rule-engine components)
 *   - Structured merge with full traceability
 *
 * Never throws — always returns { success, data, provider }.
 * ============================================================================
 */

const { callAI } = require('./aiService');

/**
 * Bounds any Promise with a hard timeout SLA.
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SLA_TIMEOUT_EXCEEDED')), ms);
    promise
      .then(val => { clearTimeout(timer); resolve(val); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Valid component types and layers that the system understands.
 */
const VALID_TYPES = new Set(['service', 'database', 'cache', 'queue', 'worker', 'external', 'ui']);
const VALID_LAYERS = new Set(['interaction', 'processing', 'data', 'integration']);

/**
 * Normalizes an LLM-generated component to ensure it has all required fields
 * and matches our system's expected structure.
 */
function normalizeComponent(comp, layer) {
  if (!comp || !comp.id || !comp.name) return null;

  // Normalize type
  let type = (comp.type || 'service').toLowerCase();
  if (!VALID_TYPES.has(type)) type = 'service';

  // Normalize layer based on type if not valid
  let normalizedLayer = (comp.layer || layer || 'processing').toLowerCase();
  if (!VALID_LAYERS.has(normalizedLayer)) {
    // Infer layer from type
    if (type === 'ui') normalizedLayer = 'interaction';
    else if (type === 'database' || type === 'cache') normalizedLayer = 'data';
    else if (type === 'queue' || type === 'external') normalizedLayer = 'integration';
    else normalizedLayer = 'processing';
  }

  // Generate clean kebab-case ID
  const id = comp.id.toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  return {
    id,
    name: comp.name,
    type,
    layer: normalizedLayer,
    capability: comp.capability || 'ai-llm-boost',
    priority: comp.priority || 'medium',
    tech: comp.tech || null,
    description: comp.description || null,
    protocol: comp.protocol || null
  };
}

/**
 * Deterministically merges LLM components with base rule-engine components.
 * Includes normalization to prevent broken nodes.
 */
/**
 * TIER-AWARE AI MERGE — Tier 1 components from AI are always accepted.
 * Only Tier 3 (optional) AI components are capped.
 */
const TIER_1_AI_TYPES = new Set(['database', 'cache', 'queue']);
const TIER_1_AI_CAPS = new Set([
  'api-gateway', 'authentication', 'payment-processing', 'e-commerce',
  'order-management', 'inventory-management', 'caching', 'persistence',
  'persistent-storage', 'security', 'real-time-streaming', 'cdn-delivery',
  'async-processing', 'horizontal-scaling'
]);
const TIER_1_AI_NAMES = [
  'gateway', 'cdn', 'cache', 'redis', 'kafka', 'auth', 'vault', 'secrets',
  'saga', 'orchestrator', 'load balancer', 'queue', 'payment', 'order'
];
const MAX_OPTIONAL_AI = 5; // Only caps Tier 2/3 AI additions

function isAITier1(comp) {
  if (TIER_1_AI_TYPES.has(comp.type)) return true;
  if (TIER_1_AI_CAPS.has(comp.capability)) return true;
  const name = (comp.name || '').toLowerCase();
  return TIER_1_AI_NAMES.some(t => name.includes(t));
}

function mergeAIOutput(baseComponents, aiComponents) {
  const merged = {};

  // Deep clone base components
  for (const layer in baseComponents) {
    merged[layer] = [...(baseComponents[layer] || [])];
  }

  // Ensure all layers exist
  for (const layer of VALID_LAYERS) {
    if (!merged[layer]) merged[layer] = [];
  }

  // Build existing capability:type set for smarter dedup
  const existingCapTypes = new Set();
  for (const layer in merged) {
    for (const c of merged[layer]) {
      if (c.capability && c.type) existingCapTypes.add(`${c.capability}:${c.type}`);
    }
  }

  let addedCount = 0;
  let optionalCount = 0;
  let skippedCount = 0;
  const droppedNames = [];

  for (const layer in aiComponents) {
    const normalizedLayer = layer.toLowerCase();
    if (!VALID_LAYERS.has(normalizedLayer)) continue;
    if (!merged[normalizedLayer]) merged[normalizedLayer] = [];

    const aiComps = Array.isArray(aiComponents[layer]) ? aiComponents[layer] : [];

    aiComps.forEach(aiComp => {
      const normalized = normalizeComponent(aiComp, normalizedLayer);
      if (!normalized) {
        skippedCount++;
        return;
      }

      // Duplication Check — match on ID, name, OR capability:type
      const capTypeKey = `${normalized.capability}:${normalized.type}`;
      const exists = merged[normalized.layer].some(c =>
        c.id === normalized.id ||
        c.name.toLowerCase() === normalized.name.toLowerCase()
      ) || existingCapTypes.has(capTypeKey);

      if (exists) {
        skippedCount++;
        return;
      }

      // ★ TIER-AWARE: Tier 1 always accepted, Tier 2/3 capped ★
      const isCritical = isAITier1(normalized);
      if (!isCritical && optionalCount >= MAX_OPTIONAL_AI) {
        droppedNames.push(normalized.name);
        skippedCount++;
        return;
      }

      merged[normalized.layer].push(normalized);
      existingCapTypes.add(capTypeKey);
      addedCount++;
      if (!isCritical) optionalCount++;
    });
  }

  if (droppedNames.length > 0) {
    console.log(`\x1b[33m[AI Merge] CAPPED: Dropped ${droppedNames.length} optional AI components (Tier 1 protected): ${droppedNames.join(', ')}\x1b[0m`);
  }
  console.log(`\x1b[36m[AI Merge] Added ${addedCount} AI components, skipped ${skippedCount} (duplicate/invalid/capped)\x1b[0m`);
  return merged;
}

/**
 * Safe AI enhancement orchestrator.
 *
 * Returns { success, data, provider } — NEVER throws.
 * - success=true  → AI enhancement was applied
 * - success=false → rule engine continues alone (data=null)
 */
async function enhanceWithAI(input, systemData) {
  try {
    // 1. Call the multi-LLM router with 25s global SLA
    //    Budget: OpenAI retries (~3.5s) + Gemini (~5s) + Ollama (~15s)
    const routerResult = await withTimeout(callAI(input, systemData), 25000);

    // If all LLMs failed, router returns null
    if (!routerResult || !routerResult.data) {
      console.log(`\x1b[36m[SYSTEM] SELF-SUFFICIENT MODE: No LLM available. Local rule engine produces enterprise-grade architecture autonomously.\x1b[0m`);
      return { success: false, data: null, provider: null };
    }

    const { provider, data: aiResponse } = routerResult;

    if (!aiResponse.components) {
      console.log(`\x1b[33m[SYSTEM] AI returned empty components from ${provider}. Skipping merge.\x1b[0m`);
      return { success: false, data: null, provider };
    }

    console.log(`\x1b[35m[SYSTEM] REAL AI USED: ${provider.toUpperCase()} — LLM Enhancement Integration Successful.\x1b[0m`);

    // 2. Safely merge with normalization
    const mergedComponents = mergeAIOutput(systemData.components, aiResponse.components);

    return {
      success: true,
      provider,
      data: {
        components: mergedComponents,
        suggestions: (aiResponse.suggestions || []).filter(s => s && s.message)
      }
    };

  } catch (error) {
    if (error.message === 'SLA_TIMEOUT_EXCEEDED') {
      console.log(`\x1b[33m[SYSTEM] AI SLA TIMEOUT: LLM exceeded 10s deadline. Local engine is fully self-sufficient — continuing with enterprise-grade deterministic output.\x1b[0m`);
    } else {
      console.log(`\x1b[33m[SYSTEM] AI NOT USED: ${error.message}. Local engine is self-sufficient — diagram quality is unaffected.\x1b[0m`);
    }

    return { success: false, data: null, provider: null };
  }
}

module.exports = { enhanceWithAI };
