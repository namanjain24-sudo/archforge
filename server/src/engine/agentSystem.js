/**
 * ============================================================================
 * ARCHFORGE — AGENTIC AI SYSTEM v1
 * ============================================================================
 *
 * 4-agent self-correcting loop that reviews and refines architecture:
 *
 *   🧠 Planner Agent  — Detects patterns, pipelines, domain
 *   🏗 Builder Agent  — Enhances components and flows
 *   🔍 Critic Agent   — Finds flaws (wrong connections, missing parts, scaling)
 *   🔧 Fixer Agent    — Auto-fixes all critic-identified issues
 *
 * SELF-CORRECTION LOOP:
 *   Run Critic → Fixer for up to 2 iterations.
 *   Stop early if architecture is valid (zero flaws).
 *
 * DESIGN:
 *   - Fully deterministic (no LLM calls here)
 *   - Agents are domain-expert functions, not prompt-based
 *   - Each agent returns structured analysis/mutations
 * ============================================================================
 */

const { canConnect, getRole } = require('./connectionValidator');

// ═══════════════════════════════════════════════════════════════
// TIER CLASSIFICATION — Protects critical infra from pruning
// ═══════════════════════════════════════════════════════════════
const AGENT_TIER_1_CAPS = new Set([
  'api-gateway', 'authentication', 'payment-processing', 'e-commerce',
  'order-management', 'inventory-management', 'caching', 'persistence',
  'persistent-storage', 'security', 'real-time-streaming', 'cdn-delivery',
  'async-processing', 'horizontal-scaling', 'bidirectional-messaging'
]);
const AGENT_TIER_1_NAMES = [
  'gateway', 'cdn', 'auth', 'cache', 'redis', 'kafka', 'rabbit',
  'saga', 'orchestrator', 'vault', 'secrets', 'load balancer',
  'queue', 'event broker', 'payment', 'order', 'cart', 'inventory', 'websocket'
];

function isAgentTier1(node) {
  if (!node) return false;
  const type = node.type;
  if (['database', 'cache', 'queue', 'ui'].includes(type)) return true;
  const cap = (node.capability || '').toLowerCase();
  if (AGENT_TIER_1_CAPS.has(cap)) return true;
  const name = (node.name || '').toLowerCase();
  return AGENT_TIER_1_NAMES.some(t => name.includes(t));
}

// ═══════════════════════════════════════════════════════════════
// PLANNER AGENT — Detects architecture context
// ═══════════════════════════════════════════════════════════════

function plannerAgent(components, input) {
  const allComps = Object.values(components).flat();
  const capSet = new Set(allComps.map(c => c.capability).filter(Boolean));
  const inputLower = (input || '').toLowerCase();

  const analysis = {
    domain: detectDomain(inputLower, capSet),
    patterns: detectPatterns(capSet),
    pipelines: detectRequiredPipelines(allComps, capSet),
    scale: estimateScale(allComps),
    risks: []
  };

  // Risk identification
  if (allComps.filter(c => c.type === 'service').length >= 6 && !capSet.has('service-discovery')) {
    analysis.risks.push('Many services without service discovery — consider adding service registry');
  }
  if (capSet.has('payment-processing') && !capSet.has('audit-logging')) {
    analysis.risks.push('Payment processing without audit logging — compliance risk');
  }
  if (capSet.has('real-time-streaming') && !allComps.some(c => c.type === 'queue')) {
    analysis.risks.push('Real-time streaming without message queue — throughput bottleneck risk');
  }

  return analysis;
}

function detectDomain(input, capSet) {
  const domains = [];
  if (input.includes('ecommerce') || input.includes('e-commerce') || input.includes('shop') || input.includes('store') || capSet.has('e-commerce')) domains.push('ecommerce');
  if (input.includes('chat') || input.includes('messag') || capSet.has('bidirectional-messaging')) domains.push('chat');
  if (input.includes('analytic') || input.includes('dashboard') || capSet.has('analytics')) domains.push('analytics');
  if (input.includes('video') || input.includes('stream') || capSet.has('video-communication')) domains.push('video');
  if (input.includes('payment') || input.includes('fintech') || capSet.has('payment-processing')) domains.push('payment');
  if (input.includes('social') || input.includes('feed') || capSet.has('content-distribution')) domains.push('social');
  if (input.includes('geo') || input.includes('location') || input.includes('map') || capSet.has('geolocation')) domains.push('geo');
  if (input.includes('ai') || input.includes('ml') || input.includes('machine learn') || capSet.has('ml-pipeline')) domains.push('ai');
  if (domains.length === 0) domains.push('general');
  return domains;
}

function detectPatterns(capSet) {
  const patterns = [];
  if (capSet.has('real-time-streaming') || capSet.has('event-streaming') || capSet.has('bidirectional-messaging') || capSet.has('async-processing'))
    patterns.push('Event-Driven Microservices');
  if (capSet.has('analytics') || capSet.has('ml-pipeline') || capSet.has('recommendation-system'))
    patterns.push('Data Pipeline Architecture');
  if (capSet.has('e-commerce') || capSet.has('payment-processing') || capSet.size >= 6)
    patterns.push('Distributed Microservices');
  if (capSet.has('service-discovery') || capSet.has('service-mesh') || capSet.has('config-management'))
    patterns.push('Cloud-Native Architecture');
  if (patterns.length === 0) patterns.push('Layered Architecture');
  return patterns;
}

function detectRequiredPipelines(allComps, capSet) {
  const pipelines = ['ingress', 'service-routing', 'data-access'];
  if (allComps.some(c => c.type === 'queue') || capSet.has('async-processing') || capSet.has('event-streaming'))
    pipelines.push('async-pipeline');
  if (allComps.some(c => c.type === 'external'))
    pipelines.push('external-integration');
  if (allComps.filter(c => c.type === 'service').length >= 4)
    pipelines.push('observability');
  pipelines.push('feedback');
  return pipelines;
}

function estimateScale(allComps) {
  const total = allComps.length;
  if (total >= 15) return 'large';
  if (total >= 8) return 'medium';
  return 'small';
}

// ═══════════════════════════════════════════════════════════════
// BUILDER AGENT — Enhances architecture structure
// ═══════════════════════════════════════════════════════════════

/**
 * Builder doesn't add components (that's aiEnhancer's job).
 * It enriches existing components with missing metadata.
 */
function builderAgent(components, plan) {
  const enriched = {};

  for (const layer in components) {
    enriched[layer] = components[layer].map(comp => {
      const enrichedComp = { ...comp };

      // Ensure priority is set
      if (!enrichedComp.priority) {
        enrichedComp.priority = inferPriority(enrichedComp, plan);
      }

      // Ensure description exists
      if (!enrichedComp.description && enrichedComp.capability) {
        enrichedComp.description = generateDescription(enrichedComp);
      }

      return enrichedComp;
    });
  }

  return enriched;
}

function inferPriority(comp, plan) {
  const cap = (comp.capability || '').toLowerCase();
  const type = comp.type;

  if (cap === 'api-gateway' || cap === 'authentication' || cap === 'payment-processing') return 'high';
  if (cap === 'real-time-streaming' || cap === 'horizontal-scaling') return 'high';
  if (type === 'database' || type === 'queue') return 'high';
  if (type === 'cache') return 'medium';
  if (type === 'ui') return 'medium';
  if (cap.includes('monitoring') || cap.includes('logging') || cap.includes('tracing')) return 'medium';
  return 'low';
}

function generateDescription(comp) {
  const cap = comp.capability;
  const descriptions = {
    'api-gateway': 'Centralized API entry point handling authentication, routing, and rate limiting',
    'authentication': 'Manages user identity, JWT issuance, and RBAC enforcement',
    'e-commerce': 'Core commerce logic handling product operations',
    'payment-processing': 'PCI-compliant payment processing with transaction integrity',
    'bidirectional-messaging': 'Real-time message delivery with WebSocket connections',
    'real-time-streaming': 'High-throughput event streaming for real-time data flows',
    'analytics': 'Analytics data processing and reporting',
    'caching': 'In-memory data caching for high-speed reads',
    'persistence': 'Durable data storage with ACID guarantees',
    'persistent-storage': 'Durable data storage with ACID guarantees',
    'async-processing': 'Asynchronous task processing with retry logic',
    'monitoring': 'System health monitoring and alerting',
  };
  return descriptions[cap] || `Handles ${cap || comp.type} functionality`;
}

// ═══════════════════════════════════════════════════════════════
// CRITIC AGENT — Finds ALL architectural flaws
// ═══════════════════════════════════════════════════════════════

function criticAgent(graph, flows, components, plan) {
  const flaws = [];
  const allComps = Object.values(components).flat();
  const nodeMap = new Map((graph.nodes || []).map(n => [n.id, n]));

  // 1. Check for illegal connections
  for (const flow of flows) {
    const source = nodeMap.get(flow.source);
    const target = nodeMap.get(flow.target);
    if (source && target && !canConnect(source, target)) {
      flaws.push({
        type: 'ILLEGAL_EDGE',
        severity: 'critical',
        source: source.name,
        target: target.name,
        sourceRole: getRole(source),
        targetRole: getRole(target),
        flowId: `${flow.source}->${flow.target}`,
        fix: 'REMOVE'
      });
    }
  }

  // 2. Check for orphan nodes
  const connected = new Set();
  for (const flow of flows) {
    connected.add(flow.source);
    connected.add(flow.target);
  }
  for (const [id, node] of nodeMap) {
    if (!connected.has(id)) {
      // ★ TIER-AWARE: Tier 1 orphans get connected, not pruned ★
      if (isAgentTier1(node)) {
        flaws.push({
          type: 'ORPHAN_NODE',
          severity: 'medium',
          node: node.name,
          nodeId: id,
          nodeType: node.type,
          fix: 'CONNECT'  // Tier 1 gets connected
        });
      } else {
        flaws.push({
          type: 'ORPHAN_NODE',
          severity: 'low',
          node: node.name,
          nodeId: id,
          nodeType: node.type,
          fix: 'PRUNE_COMPONENT'  // Tier 2/3 orphans get pruned
        });
      }
    }
  }

  // 3. Check missing critical infrastructure
  const hasGateway = allComps.some(c => {
    const name = (c.name || '').toLowerCase();
    const cap = (c.capability || '').toLowerCase();
    return cap === 'api-gateway' || name.includes('gateway');
  });

  if (!hasGateway && allComps.filter(c => c.type === 'service').length >= 3) {
    flaws.push({
      type: 'MISSING_COMPONENT',
      severity: 'high',
      component: 'API Gateway',
      fix: 'INJECT'
    });
  }

  // 4. ★ NEW: Check for OVER-CONNECTED nodes (max 3 outgoing) ★
  const outgoingEdges = {};
  for (const flow of flows) {
    if (!outgoingEdges[flow.source]) outgoingEdges[flow.source] = [];
    outgoingEdges[flow.source].push(flow);
  }
  for (const [nodeId, edges] of Object.entries(outgoingEdges)) {
    if (edges.length > 3) {
      const node = nodeMap.get(nodeId);
      if (node) {
        flaws.push({
          type: 'OVER_CONNECTED',
          severity: 'medium',
          node: node.name,
          nodeId,
          edgeCount: edges.length,
          fix: 'PRUNE_EDGES'
        });
      }
    }
  }

  // 5. ★ NEW: Check for UNNECESSARY INFRA ★
  const serviceCount = allComps.filter(c => c.type === 'service').length;
  for (const comp of allComps) {
    const name = (comp.name || '').toLowerCase();
    const cap = (comp.capability || '').toLowerCase();
    
    // Config Server needs ≥8 services
    if ((cap === 'config-management' || name.includes('config server')) && serviceCount < 8) {
      flaws.push({
        type: 'UNNECESSARY_INFRA',
        severity: 'medium',
        component: comp.name,
        componentId: comp.id,
        reason: `Config Server unnecessary with only ${serviceCount} services (needs ≥8)`,
        fix: 'PRUNE_COMPONENT'
      });
    }
    
    // Service Mesh needs ≥10 services
    if ((cap === 'service-mesh' || name.includes('mesh')) && serviceCount < 10) {
      flaws.push({
        type: 'UNNECESSARY_INFRA',
        severity: 'medium',
        component: comp.name,
        componentId: comp.id,
        reason: `Service Mesh unnecessary with only ${serviceCount} services (needs ≥10)`,
        fix: 'PRUNE_COMPONENT'
      });
    }
  }

  // 6. Check for shared database anti-pattern
  const dbUsers = {};
  for (const flow of flows) {
    const src = nodeMap.get(flow.source);
    const tgt = nodeMap.get(flow.target);
    if (src && tgt && src.type === 'service' && tgt.type === 'database' && !isInfraServiceName(src)) {
      if (!dbUsers[tgt.id]) dbUsers[tgt.id] = [];
      if (!dbUsers[tgt.id].includes(src.name)) dbUsers[tgt.id].push(src.name);
    }
  }
  for (const dbId in dbUsers) {
    if (dbUsers[dbId].length > 1) {
      const dbNode = nodeMap.get(dbId);
      flaws.push({
        type: 'SHARED_DATABASE',
        severity: 'high',
        database: dbNode ? dbNode.name : dbId,
        sharedBy: dbUsers[dbId],
        fix: 'ADVISORY'
      });
    }
  }

  // 7. ★ NEW: Check for DUPLICATE INFRA (2 caches with same capability, etc) ★
  const capTypeCount = {};
  for (const comp of allComps) {
    if (!comp.capability || !comp.type) continue;
    const key = `${comp.capability}:${comp.type}`;
    if (!capTypeCount[key]) capTypeCount[key] = [];
    capTypeCount[key].push(comp);
  }
  for (const [key, comps] of Object.entries(capTypeCount)) {
    if (comps.length > 1) {
      for (let i = 1; i < comps.length; i++) {
        flaws.push({
          type: 'DUPLICATE_INFRA',
          severity: 'medium',
          component: comps[i].name,
          componentId: comps[i].id,
          duplicateOf: comps[0].name,
          fix: 'PRUNE_COMPONENT'
        });
      }
    }
  }

  // Score
  const fixableFlaws = flaws.filter(f => f.fix !== 'ADVISORY' && f.severity !== 'low');
  return {
    flaws,
    score: fixableFlaws.length === 0 ? 100 : Math.max(0, 100 - (fixableFlaws.length * 10)),
    isValid: flaws.filter(f => f.severity === 'critical').length === 0
  };
}

// ═══════════════════════════════════════════════════════════════
// FIXER AGENT — Auto-fixes critic-identified flaws
// ═══════════════════════════════════════════════════════════════

function fixerAgent(graph, flows, components, critique) {
  let fixedFlows = [...flows];
  const fixActions = [];
  const nodeMap = new Map((graph.nodes || []).map(n => [n.id, n]));
  const prunedComponentIds = new Set();

  for (const flaw of critique.flaws) {
    switch (flaw.fix) {
      case 'REMOVE': {
        const before = fixedFlows.length;
        fixedFlows = fixedFlows.filter(f => `${f.source}->${f.target}` !== flaw.flowId);
        if (fixedFlows.length < before) {
          fixActions.push({ action: 'REMOVED_ILLEGAL_EDGE', flaw: flaw.type, detail: `${flaw.source} → ${flaw.target}` });
        }
        break;
      }

      case 'PRUNE_COMPONENT': {
        // ★ TIER-AWARE: Never prune Tier 1 critical infra ★
        const targetId = flaw.componentId || flaw.nodeId;
        const targetNode = targetId ? nodeMap.get(targetId) : null;
        
        if (targetNode && isAgentTier1(targetNode)) {
          fixActions.push({ action: 'SKIPPED_TIER1', detail: `${flaw.component || flaw.node} is Tier 1 — protected from pruning` });
          break;
        }
        
        if (flaw.componentId) {
          prunedComponentIds.add(flaw.componentId);
          fixedFlows = fixedFlows.filter(f => f.source !== flaw.componentId && f.target !== flaw.componentId);
          fixActions.push({ action: 'PRUNED_COMPONENT', detail: `${flaw.component || flaw.node} removed (${flaw.reason || flaw.type})` });
        } else if (flaw.nodeId) {
          prunedComponentIds.add(flaw.nodeId);
          fixedFlows = fixedFlows.filter(f => f.source !== flaw.nodeId && f.target !== flaw.nodeId);
          fixActions.push({ action: 'PRUNED_ORPHAN', detail: `${flaw.node} removed (orphan)` });
        }
        break;
      }

      case 'CONNECT': {
        // ★ Connect Tier 1 orphans to appropriate targets ★
        const orphanNode = nodeMap.get(flaw.nodeId);
        if (!orphanNode) break;
        const allNodes = Array.from(nodeMap.values());
        const connFlow = findBestConnection(orphanNode, allNodes, fixedFlows);
        if (connFlow) {
          fixedFlows.push(connFlow);
          fixActions.push({ action: 'CONNECTED_TIER1_ORPHAN', detail: `${orphanNode.name} connected (Tier 1 protected)` });
        }
        break;
      }

      case 'PRUNE_EDGES': {
        // ★ Keep top 3 outgoing edges by weight, drop the rest ★
        if (flaw.nodeId) {
          const nodeEdges = fixedFlows.filter(f => f.source === flaw.nodeId);
          const otherEdges = fixedFlows.filter(f => f.source !== flaw.nodeId);
          nodeEdges.sort((a, b) => (b.weight || 0) - (a.weight || 0));
          const kept = nodeEdges.slice(0, 3);
          const dropped = nodeEdges.length - kept.length;
          fixedFlows = [...otherEdges, ...kept];
          if (dropped > 0) {
            fixActions.push({ action: 'PRUNED_EDGES', detail: `${flaw.node}: dropped ${dropped} excess outgoing edges` });
          }
        }
        break;
      }
    }
  }

  // Re-assign step numbers
  fixedFlows.forEach((flow, i) => { flow.step = i + 1; });

  return {
    fixedFlows,
    fixActions,
    fixCount: fixActions.length,
    prunedComponentIds: Array.from(prunedComponentIds)
  };
}

function findBestConnection(orphan, allNodes, existingFlows) {
  const targets = {
    'service': () => allNodes.find(n => (n.name || '').toLowerCase().includes('gateway')) || allNodes.find(n => n.type === 'database'),
    'database': () => allNodes.find(n => n.type === 'service' && !isInfraServiceName(n)),
    'cache': () => allNodes.find(n => n.type === 'service' && !isInfraServiceName(n)),
    'queue': () => allNodes.find(n => n.type === 'service' && !isInfraServiceName(n)),
    'worker': () => allNodes.find(n => n.type === 'queue') || allNodes.find(n => n.type === 'service'),
    'external': () => allNodes.find(n => n.type === 'service' && !isInfraServiceName(n)),
    'ui': () => allNodes.find(n => (n.name || '').toLowerCase().includes('gateway')) || allNodes.find(n => n.type === 'service')
  };

  const findTarget = targets[orphan.type];
  if (!findTarget) return null;
  const target = findTarget();
  if (!target) return null;

  // Determine direction
  const isSource = ['ui', 'service', 'queue'].includes(orphan.type);
  const src = isSource ? orphan : target;
  const tgt = isSource ? target : orphan;

  if (!canConnect(src, tgt)) return null;

  const exists = existingFlows.some(f => f.source === src.id && f.target === tgt.id);
  if (exists) return null;

  return {
    source: src.id,
    target: tgt.id,
    type: 'request',
    label: 'Connects',
    protocol: 'HTTPS',
    reason: `[AUTO-FIX] Fixer agent connected orphan ${orphan.name}`,
    pipelineId: 'infra-wiring',
    weight: 2,
    step: 0,
    autoFixed: true
  };
}

function isInfraServiceName(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  return name.includes('gateway') || name.includes('balancer') || name.includes('waf') ||
         name.includes('cdn') || name.includes('rate') || name.includes('circuit') ||
         name.includes('registry') || name.includes('mesh') || name.includes('config server') ||
         name.includes('monitor') || name.includes('jaeger') || name.includes('prometheus') ||
         name.includes('loki') || name.includes('grafana') || name.includes('collector') ||
         name.includes('observability');
}

// ═══════════════════════════════════════════════════════════════
// SELF-CORRECTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Runs the full Planner → Builder → Critic → Fixer loop.
 * Critic → Fixer iterates up to MAX_ITERATIONS or until valid.
 *
 * @param {object} graph - { nodes, edges }
 * @param {Array} flows - Flow array
 * @param {object} components - Categorized components
 * @param {string} input - Original user input
 * @returns {{ plan, critique, fixActions, fixedFlows, iterations }}
 */
function runAgentLoop(graph, flows, components, input) {
  const MAX_ITERATIONS = 2;

  // 1. PLANNER
  const plan = plannerAgent(components, input);
  console.log(`\x1b[36m[AGENT] Planner: domain=${plan.domain.join(',')} patterns=${plan.patterns.join(',')} scale=${plan.scale}\x1b[0m`);

  // 2. BUILDER — enrich component metadata
  let enrichedComponents = builderAgent(components, plan);

  // 3. CRITIC → FIXER LOOP
  let currentFlows = [...flows];
  let totalFixActions = [];
  let allPrunedIds = new Set();
  let finalCritique;
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const critique = criticAgent(graph, currentFlows, enrichedComponents, plan);
    console.log(`\x1b[33m[AGENT] Critic (iteration ${i + 1}): ${critique.flaws.length} flaws, score=${critique.score}\x1b[0m`);

    if (critique.isValid && critique.flaws.filter(f => f.severity !== 'low').length === 0) {
      console.log(`\x1b[32m[AGENT] Architecture VALID — stopping correction loop\x1b[0m`);
      finalCritique = critique;
      break;
    }

    const fixResult = fixerAgent(graph, currentFlows, enrichedComponents, critique);
    console.log(`\x1b[35m[AGENT] Fixer (iteration ${i + 1}): ${fixResult.fixCount} fixes applied\x1b[0m`);

    currentFlows = fixResult.fixedFlows;
    totalFixActions = totalFixActions.concat(fixResult.fixActions);
    finalCritique = critique;

    // ★ Collect pruned component IDs ★
    if (fixResult.prunedComponentIds) {
      for (const id of fixResult.prunedComponentIds) allPrunedIds.add(id);
    }

    // If no fixes could be applied, stop
    if (fixResult.fixCount === 0) break;
  }

  // ★ Remove pruned components from the enriched components ★
  if (allPrunedIds.size > 0) {
    for (const layer in enrichedComponents) {
      enrichedComponents[layer] = enrichedComponents[layer].filter(c => !allPrunedIds.has(c.id));
    }
    console.log(`\x1b[33m[AGENT] Pruned ${allPrunedIds.size} unnecessary components from architecture\x1b[0m`);
  }

  return {
    plan,
    enrichedComponents,
    critique: finalCritique,
    fixActions: totalFixActions,
    fixedFlows: currentFlows,
    prunedComponentIds: Array.from(allPrunedIds),
    iterations
  };
}

module.exports = { runAgentLoop, plannerAgent, builderAgent, criticAgent, fixerAgent };
