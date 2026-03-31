/**
 * ============================================================================
 * ARCHFORGE — AI ENHANCEMENT MULTI-PATTERN ENGINE v4 (ENTERPRISE)
 * ============================================================================
 * 
 * Enriches base deterministic architectures into production-grade enterprise
 * models. v4 fixes:
 *  - GLOBAL deduplication across all injection layers (domain boosts, smart
 *    injections, universal injections) preventing duplicate DBs/services
 *  - Smarter pattern gating: simple apps don't get service mesh/config server
 *  - Domain boost dedup uses capability:type keys, not just IDs
 * ============================================================================
 */

const { AI_RULES } = require('../config/aiRules');

/**
 * Deterministic weighted selection bounded by active capability context.
 * ★ NO RANDOMNESS ★ — Same input always produces the same output.
 * Picks the highest-scoring valid option. Ties broken by array order (stable).
 */
function pickSmart(options, capSet) {
  const validOptions = options.filter(opt => !opt.condition || opt.condition(capSet));
  if (validOptions.length === 0) return options[0].name;

  // Sort by weight descending (stable: first in array wins ties)
  const sorted = [...validOptions].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  return sorted[0].name;
}

function assignWeights(capabilities) {
  return capabilities.map(cap => {
    const importance = AI_RULES.capabilityImportance[cap.type || cap.capability] || AI_RULES.capabilityImportance['default'];
    return {
      ...cap,
      weight: parseFloat(((cap.confidence || 0.8) + importance).toFixed(2))
    };
  });
}

function processPriorities(components) {
  const evaluatePriority = (comp) => {
    if (comp.capability === 'real-time-streaming') return 'high';
    if (comp.capability === 'payment-processing') return 'high';
    if (comp.capability === 'authentication') return 'high';
    if (comp.capability === 'api-gateway') return 'high';
    if (comp.type === 'database') return 'high';
    if (comp.type === 'queue') return 'high';
    if (comp.type === 'cache') return 'medium';
    if (comp.type === 'ui') return 'medium';
    return comp.priority || 'low';
  };

  const prioritized = {};
  for (const layer in components) {
    prioritized[layer] = components[layer].map(comp => ({
      ...comp,
      priority: evaluatePriority(comp)
    }));
  }
  return prioritized;
}

/**
 * Derives Multi-Pattern Architecture Archetypes
 */
function detectMultiPattern(capSet) {
  const detected = [];
  for (const pattern of AI_RULES.patterns) {
    if (pattern.condition(capSet)) {
      detected.push(pattern.name);
    }
  }
  
  if (detected.length === 0) detected.push('Layered Architecture');
  return detected;
}

/**
 * Global dedup tracker — shared across all injection phases to prevent
 * the same component (by ID or by capability:type) from being added twice.
 */
function buildGlobalDedup(components) {
  const existingIds = new Set();
  const existingCapTypes = new Set();
  
  for (const layer in components) {
    for (const comp of components[layer]) {
      existingIds.add(comp.id);
      // Track capability:type combos to prevent duplicate databases/caches for same capability
      if (comp.capability && comp.type) {
        existingCapTypes.add(`${comp.capability}:${comp.type}`);
      }
    }
  }
  
  return { existingIds, existingCapTypes };
}

/**
 * Tries to add a component, returns true if added (not a duplicate).
 */
function tryAddComponent(refined, comp, dedup) {
  const tgt = comp.layer;
  if (!refined[tgt]) refined[tgt] = [];
  
  const id = comp.id;
  const capTypeKey = (comp.capability && comp.type) ? `${comp.capability}:${comp.type}` : null;
  
  // Check both ID and capability:type for duplicates
  if (dedup.existingIds.has(id)) return false;
  if (capTypeKey && dedup.existingCapTypes.has(capTypeKey)) return false;
  
  dedup.existingIds.add(id);
  if (capTypeKey) dedup.existingCapTypes.add(capTypeKey);
  
  refined[tgt].push(comp);
  return true;
}

/**
 * Domain-Aware structural boosts with global dedup.
 */
function applyDomainBoosts(capSet, refinedComponents, dedup) {
  for (const [domain, boosts] of Object.entries(AI_RULES.domainBoosts)) {
    // Check if ANY capability in the set relates to this domain
    const domainActive = capSet.has(domain) || 
      Array.from(capSet).some(c => c && c.includes(domain));
    
    if (domainActive) {
      for (const comp of boosts) {
        tryAddComponent(refinedComponents, { 
          ...comp, 
          capability: comp.capability || `${domain}-boost`
        }, dedup);
      }
    }
  }
  return refinedComponents;
}

function inferCapabilities(existingCapabilities) {
  const enhancedList = [];
  const existingSet = new Set(existingCapabilities.map(c => c.type || c.capability));

  for (const rule of AI_RULES.inferences) {
    if (existingSet.has(rule.sourceId) && !existingSet.has(rule.infer)) {
      existingSet.add(rule.infer);
      enhancedList.push({
        capability: rule.infer,
        reason: rule.reason,
        source: "inferred"
      });
    }
  }
  return enhancedList;
}

function injectSmartComponents(patterns, capSet, currentComponents, dedup) {
  let refined = currentComponents;

  for (const injection of AI_RULES.injections) {
    if (patterns.includes(injection.pattern)) {
      const componentName = pickSmart(injection.options, capSet);
      const generatedId = componentName.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
      
      tryAddComponent(refined, {
        id: generatedId,
        name: componentName,
        type: injection.type,
        capability: injection.capability,
        priority: injection.priority,
        layer: injection.layer
      }, dedup);
    }
  }

  return refined;
}

/**
 * Applies universal injection rules.
 */
function applyUniversalInjections(capSet, refinedComponents, dedup) {
  if (!AI_RULES.universalInjections) return refinedComponents;

  let totalComponents = 0;
  for (const layer in refinedComponents) {
    totalComponents += refinedComponents[layer].length;
  }

  for (const rule of AI_RULES.universalInjections) {
    if (rule.condition(capSet, totalComponents)) {
      for (const comp of rule.components) {
        tryAddComponent(refinedComponents, { ...comp }, dedup);
      }
    }
  }

  return refinedComponents;
}

function generateSuggestions(patterns, enhancedCapabilities) {
  const suggestions = [];

  if (patterns.includes('Event-Driven Microservices')) {
    suggestions.push({ type: "scaling", message: "Event-driven architecture detected. High-throughput message brokers injected with dead letter queues for guaranteed delivery and failure isolation." });
  }
  if (patterns.includes('Distributed Microservices')) {
    suggestions.push({ type: "performance", message: "Distributed microservices detected. API Gateway, Load Balancer, Rate Limiter, Circuit Breaker, and Service Registry auto-injected for enterprise resilience." });
  }
  if (patterns.includes('Cloud-Native Architecture')) {
    suggestions.push({ type: "infrastructure", message: "Cloud-native pattern detected. Service mesh, distributed tracing, and centralized logging infrastructure auto-injected for full observability." });
  }
  if (patterns.includes('Data Pipeline Architecture')) {
    suggestions.push({ type: "data", message: "Data pipeline architecture detected. Kafka data pipeline, batch/stream processors, and analytics warehouse auto-injected." });
  }

  if (enhancedCapabilities.some(c => c.capability === 'presence-tracking')) {
    suggestions.push({ type: "security", message: "Real-time presence tracking detected. JWT auth gates synchronized with WebSocket proxies for secure session binding." });
  }
  if (enhancedCapabilities.some(c => c.capability === 'audit-logging')) {
    suggestions.push({ type: "compliance", message: "Audit logging inferred for compliance. Immutable event log with tamper detection ensures regulatory adherence." });
  }
  if (enhancedCapabilities.some(c => c.capability === 'session-management')) {
    suggestions.push({ type: "scaling", message: "Distributed session management inferred. Redis session store enables stateless service scaling without sticky sessions." });
  }

  return suggestions;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * COMPONENT TIER CLASSIFICATION
 * ═══════════════════════════════════════════════════════════════
 * Tier 1: CRITICAL — NEVER remove. Required for production correctness.
 * Tier 2: IMPORTANT — Keep if possible. Remove only as last resort.
 * Tier 3: OPTIONAL — Can be pruned to reduce diagram complexity.
 */
const TIER_1_CAPABILITIES = new Set([
  'api-gateway', 'backend-logic', 'authentication', 'e-commerce',
  'payment-processing', 'order-management', 'inventory-management',
  'persistence', 'persistent-storage', 'caching', 'security',
  'real-time-streaming', 'event-streaming', 'async-processing',
  'bidirectional-messaging', 'cdn-delivery', 'horizontal-scaling'
]);

const TIER_1_NAMES = [
  'gateway', 'cdn', 'auth', 'cache', 'redis', 'kafka', 'rabbit',
  'saga', 'orchestrator', 'temporal', 'vault', 'secrets', 'kms',
  'load balancer', 'queue', 'event broker', 'payment', 'order',
  'cart', 'inventory', 'websocket'
];

const TIER_2_CAPABILITIES = new Set([
  'monitoring', 'distributed-tracing', 'centralized-logging',
  'rate-limiting', 'circuit-breaker', 'service-discovery',
  'config-management', 'service-mesh', 'health-checks',
  'presence-tracking', 'analytics', 'admin-dashboard'
]);

function getComponentTier(comp) {
  const cap = (comp.capability || '').toLowerCase();
  const name = (comp.name || '').toLowerCase();
  const type = comp.type;

  // Tier 1: Critical types
  if (['database', 'cache', 'queue', 'ui'].includes(type)) return 1;
  if (TIER_1_CAPABILITIES.has(cap)) return 1;
  if (TIER_1_NAMES.some(t => name.includes(t))) return 1;

  // Tier 2: Important infra
  if (TIER_2_CAPABILITIES.has(cap)) return 2;

  // Tier 3: Everything else (extra workers, duplicate services, etc.)
  return 3;
}

/**
 * TIER-AWARE PRUNING — Replaces blind hard-cap pruning.
 * 
 * Rules:
 *   1. Tier 1 is NEVER removed (regardless of count)
 *   2. Tier 3 is pruned first
 *   3. Tier 2 is pruned only if still significantly over soft target
 *   4. Soft target is 25 — overflow is ALLOWED for critical infra
 */
function pruneToLimit(components, capCount) {
  // Soft targets (not hard caps — Tier 1 always survives)
  let softTarget;
  if (capCount <= 3) softTarget = 10;
  else if (capCount <= 6) softTarget = 18;
  else softTarget = 25;

  let total = 0;
  for (const layer in components) total += components[layer].length;

  if (total <= softTarget) return { pruned: components, removed: [] };

  // Classify all components by tier
  const all = [];
  for (const layer in components) {
    for (const comp of components[layer]) {
      all.push({ ...comp, _layer: layer, _tier: getComponentTier(comp) });
    }
  }

  const tier1 = all.filter(c => c._tier === 1);
  const tier2 = all.filter(c => c._tier === 2);
  const tier3 = all.filter(c => c._tier === 3);

  // Start with all Tier 1 (always kept)
  let kept = [...tier1];
  const removed = [];

  // Add Tier 2 if budget allows
  const budgetAfterTier1 = Math.max(0, softTarget - tier1.length);
  if (tier2.length <= budgetAfterTier1) {
    kept.push(...tier2);
  } else {
    // Keep highest priority Tier 2, prune rest
    const sorted = [...tier2].sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    });
    kept.push(...sorted.slice(0, budgetAfterTier1));
    removed.push(...sorted.slice(budgetAfterTier1));
  }

  // Add Tier 3 if budget still allows
  const budgetAfterTier2 = Math.max(0, softTarget - kept.length);
  if (tier3.length <= budgetAfterTier2) {
    kept.push(...tier3);
  } else {
    const sorted = [...tier3].sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    });
    kept.push(...sorted.slice(0, budgetAfterTier2));
    removed.push(...sorted.slice(budgetAfterTier2));
  }

  // Rebuild component structure
  const result = { interaction: [], processing: [], data: [], integration: [] };
  for (const comp of kept) {
    const layer = comp._layer;
    delete comp._layer;
    delete comp._tier;
    if (result[layer]) result[layer].push(comp);
  }

  if (removed.length > 0) {
    console.log(`\x1b[33m[PRUNER] Removed ${removed.length} Tier 2/3 components (Tier 1 protected): ${removed.map(c => c.name).join(', ')}\x1b[0m`);
  }

  return { pruned: result, removed: removed.map(c => ({ name: c.name, type: c.type, tier: c._tier, reason: `Tier ${c._tier} pruned — over soft target (${softTarget})` })) };
}

function enhanceArchitecture(parserData, componentsData) {
  const baselineCaps = assignWeights(parserData.capabilities || []);
  
  // 1. Capability Inferences
  const enhancedCapabilities = inferCapabilities(baselineCaps);
  const totalCaps = [...baselineCaps, ...enhancedCapabilities];
  const capSet = new Set(totalCaps.map(c => c.type || c.capability));
  
  // 2. Multi-Pattern Detection
  const architecturePatterns = detectMultiPattern(capSet);
  
  // 3. Prioritize base components
  let prioritizedComponents = processPriorities(componentsData.components);

  // Copy into mutable structure
  let refinedComponents = {
    interaction: [...(prioritizedComponents.interaction || [])],
    processing: [...(prioritizedComponents.processing || [])],
    data: [...(prioritizedComponents.data || [])],
    integration: [...(prioritizedComponents.integration || [])]
  };
  
  // 4. Build GLOBAL dedup tracker (shared across ALL injection phases)
  const dedup = buildGlobalDedup(refinedComponents);
  
  // 5. Smart pattern-based injections (with global dedup)
  refinedComponents = injectSmartComponents(architecturePatterns, capSet, refinedComponents, dedup);
  
  // 6. Domain-specific boosts (with global dedup)
  refinedComponents = applyDomainBoosts(capSet, refinedComponents, dedup);
  
  // 7. Universal enterprise injections (with global dedup)
  refinedComponents = applyUniversalInjections(capSet, refinedComponents, dedup);
  
  // ★ 8. TOTAL COMPONENT CAP — Prune over-engineered output ★
  const { pruned, removed } = pruneToLimit(refinedComponents, capSet.size);
  refinedComponents = pruned;

  // 9. Suggestions
  const suggestions = generateSuggestions(architecturePatterns, enhancedCapabilities);

  return {
    enhancedCapabilities,
    architecturePattern: architecturePatterns.join(" + "),
    architecturePatternsList: architecturePatterns,
    refinedComponents,
    suggestions,
    removedComponents: removed
  };
}

module.exports = { enhanceArchitecture };
