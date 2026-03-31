/**
 * ============================================================================
 * ARCHFORGE — INTELLIGENCE ENGINE (v2 — CONTEXT-AWARE)
 * ============================================================================
 * 
 * Reviews the final architectural state and generates accurate, context-aware
 * insights based on actual component analysis rather than simple counts.
 * 
 * v2 IMPROVEMENTS:
 *  - Removed arbitrary inputDepth gate — insights now scale with architecture
 *  - Classification scoring is proportional and multi-factor
 *  - Insight text is tied to actual components found in the architecture
 *  - Duplicate/redundant suggestions eliminated
 *  - Confidence scores reflect actual architectural analysis
 * ============================================================================
 */

const { INTELLIGENCE_RULES } = require('../config/intelligenceRules');

class ArchitectureContext {
  constructor(graph, components, layers, input) {
    this.graph = graph;
    this.layers = layers;
    this.input = input || "";
    this.intent = classifyIntent(this.input);

    // Flatten all component categories into a unified list
    this.allComponents = [];
    for (const group in components) {
      this.allComponents = this.allComponents.concat(components[group]);
    }

    // Mathematical metrics caching
    this.serviceCount = this.allComponents.filter(c => c.type === 'service').length;
    this.dbCount = this.allComponents.filter(c => c.type === 'database').length;
    this.queueCount = this.allComponents.filter(c => c.type === 'queue').length;
    this.uiCount = this.allComponents.filter(c => c.type === 'ui').length;
    this.cacheCount = this.allComponents.filter(c => c.type === 'cache').length;
    this.workerCount = this.allComponents.filter(c => c.type === 'worker').length;
    this.externalCount = this.allComponents.filter(c => c.type === 'external').length;
    this.totalComponents = this.allComponents.length;
    
    // Aggregate distinct active capabilities tracked 
    const capabilitiesSet = new Set(this.allComponents.map(c => c.capability).filter(Boolean));
    this.capabilities = Array.from(capabilitiesSet);
    
    // Named component lookups for contextual suggestions
    this.componentNames = this.allComponents.map(c => c.name).filter(Boolean);
    this.serviceNames = this.allComponents.filter(c => c.type === 'service').map(c => c.name).filter(Boolean);
    this.dbNames = this.allComponents.filter(c => c.type === 'database').map(c => c.name).filter(Boolean);
    
    // Graph topology analysis
    this.edgeCount = graph?.edges?.length || 0;
    this.nodeCount = graph?.nodes?.length || 0;
    
    // Helper boundary evaluations
    this.hasGateway = this.allComponents.some(c => 
      c.capability === 'api-gateway' || c.capability === 'horizontal-scaling' ||
      (c.name && (c.name.toLowerCase().includes('gateway') || c.name.toLowerCase().includes('balancer') || c.name.toLowerCase().includes('ingress')))
    );
    this.hasCache = this.cacheCount > 0;
    this.hasQueue = this.queueCount > 0;
    this.hasAuth = this.hasCapability('authentication');
    this.hasMonitoring = this.hasCapability('monitoring') || this.hasCapability('analytics') || this.hasCapability('distributed-tracing');
    this.hasRateLimiter = this.allComponents.some(c => c.capability === 'rate-limiting' || (c.name && c.name.toLowerCase().includes('rate')));
    this.hasDLQ = this.allComponents.some(c => (c.name || '').toLowerCase().includes('dead') || (c.name || '').toLowerCase().includes('dlq'));
    this.hasServiceMesh = this.allComponents.some(c => c.capability === 'service-mesh');
    this.hasServiceDiscovery = this.allComponents.some(c => c.capability === 'service-discovery');
    this.hasCircuitBreaker = this.allComponents.some(c => c.capability === 'circuit-breaker' || (c.name || '').toLowerCase().includes('circuit'));
  }

  hasCapability(capabilityId) {
    return this.capabilities.includes(capabilityId);
  }

  /**
   * Get list of service names for contextual suggestion text
   */
  getServiceList(max = 3) {
    return this.serviceNames.slice(0, max).join(', ');
  }
}

function classifyIntent(input) {
  if (!input) return "general";
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes("prototype") || lowerInput.includes("mvp") || lowerInput.includes("proof of concept")) return "prototype";
  if (lowerInput.includes("production") || lowerInput.includes("scalable") || lowerInput.includes("enterprise")) return "production";
  if (lowerInput.includes("internal") || lowerInput.includes("tool")) return "internal";
  return "general";
}

/**
 * Analyzes constructed models, scoring configurations against architecture heuristics.
 * 
 * @param {object} systemData - { graph, components, layers, input } from previous stages
 * @returns {object} { insights } object containing generated suggestions
 */
function analyzeSystem(systemData) {
  const { graph, components, layers, input } = systemData;
  const ctx = new ArchitectureContext(graph, components, layers, input);

  const insights = {
    scaling: [],
    missing: [],
    risks: [],
    classification: {
      primaryArchetype: 'Unknown',
      traits: []
    }
  };

  const getCertainty = (confidence) => {
    if (confidence > 0.85) return 'high';
    if (confidence > 0.70) return 'medium';
    return 'low';
  };

  // Track seen suggestion IDs to prevent duplicates
  const seenIds = new Set();

  // 1. Evaluate Scaling Rules — only applies if there's actual architecture to analyze
  if (ctx.totalComponents >= 2) {
    for (const rule of INTELLIGENCE_RULES.scaling) {
      if (rule.condition(ctx) && !seenIds.has(rule.id)) {
        seenIds.add(rule.id);
        // Generate context-aware suggestion text
        const suggestion = typeof rule.suggestion === 'function' ? rule.suggestion(ctx) : rule.suggestion;
        insights.scaling.push({
          suggestion,
          confidence: rule.confidence,
          certainty: getCertainty(rule.confidence)
        });
      }
    }
  }

  // 2. Evaluate Missing Dependencies
  if (ctx.totalComponents >= 2) {
    for (const rule of INTELLIGENCE_RULES.missing) {
      if (rule.condition(ctx) && !seenIds.has(rule.id)) {
        seenIds.add(rule.id);
        const suggestion = typeof rule.suggestion === 'function' ? rule.suggestion(ctx) : rule.suggestion;
        insights.missing.push({
          suggestion,
          confidence: rule.confidence,
          certainty: getCertainty(rule.confidence)
        });
      }
    }
  }

  // 3. Evaluate Risks — only for non-trivial architectures
  if (ctx.totalComponents >= 3) {
    for (const rule of INTELLIGENCE_RULES.risks) {
      if (rule.condition(ctx) && !seenIds.has(rule.id)) {
        seenIds.add(rule.id);
        const suggestion = typeof rule.suggestion === 'function' ? rule.suggestion(ctx) : rule.suggestion;
        insights.risks.push({
          suggestion,
          severity: rule.severity,
          confidence: rule.confidence,
          certainty: getCertainty(rule.confidence)
        });
      }
    }
  }

  // 4. Determine Classification — multi-factor proportional scoring
  // Require minimum score of 2 to avoid weak single-signal classifications
  const scoredClassifications = [];
  for (const rule of INTELLIGENCE_RULES.classification) {
    const score = rule.condition(ctx);
    if (score >= 2) {
      scoredClassifications.push({
        type: rule.type,
        score: score
      });
    }
  }

  if (scoredClassifications.length > 0) {
    scoredClassifications.sort((a, b) => b.score - a.score);
    insights.classification.primaryArchetype = scoredClassifications[0].type;
    insights.classification.traits = scoredClassifications.map(c => c.type);
  }

  return { insights };
}

module.exports = { analyzeSystem };
