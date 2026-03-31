/**
 * ============================================================================
 * ARCHFORGE — VALIDATION ENGINE v1 (AUTO-FIX)
 * ============================================================================
 *
 * Final checkpoint before architecture is returned. Catches violations that
 * could have slipped through the pipeline and AUTO-FIXES them.
 *
 * CHECKS:
 *   1. Invalid edges (canConnect violation)
 *   2. Missing async for heavy workloads (queue-less event-driven systems)
 *   3. Missing dependencies (services without DB, gateways without services)
 *   4. Isolated/orphan nodes
 *   5. Wrong flows (UI→DB, Worker→UI, etc.)
 *   6. Missing ingress (no gateway for multi-service systems)
 *   7. Self-loops
 *
 * STRATEGY: ❌ NOT just report → ✅ AUTO-FIX violations where possible
 * ============================================================================
 */

const { canConnect, getRole, validateArchitectureGraph } = require('./connectionValidator');

/**
 * Validates and auto-fixes the architecture.
 *
 * @param {object} graph - { nodes, edges }
 * @param {Array} flows - Flow array from flow engine
 * @param {object} components - Categorized components { interaction, processing, data, integration }
 * @returns {{ valid: boolean, violations: Array, fixes: Array, fixedFlows: Array, fixedComponents: object }}
 */
function validateArchitecture(graph, flows, components) {
  const violations = [];
  const fixes = [];
  const nodeMap = new Map((graph.nodes || []).map(n => [n.id, n]));
  const nodeIds = new Set(nodeMap.keys());

  // Build mutable copies for auto-fixing
  let fixedFlows = [...flows];
  let fixedComponents = {};
  for (const layer in components) {
    fixedComponents[layer] = [...(components[layer] || [])];
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 1: INVALID EDGES (canConnect violations)
  // ══════════════════════════════════════════════════════════════

  const validFlows = [];
  for (const flow of fixedFlows) {
    const source = nodeMap.get(flow.source);
    const target = nodeMap.get(flow.target);

    if (!source || !target) {
      violations.push({
        type: 'DANGLING_EDGE',
        severity: 'high',
        message: `Edge references non-existent node: ${!source ? flow.source : flow.target}`,
        flow
      });
      fixes.push({ action: 'REMOVE_EDGE', flow, reason: 'Dangling reference' });
      continue; // Remove this flow
    }

    if (flow.source === flow.target) {
      violations.push({
        type: 'SELF_LOOP',
        severity: 'medium',
        message: `Self-loop detected: ${source.name} → ${source.name}`,
        flow
      });
      fixes.push({ action: 'REMOVE_EDGE', flow, reason: 'Self-loop' });
      continue;
    }

    if (!canConnect(source, target)) {
      const sourceRole = getRole(source);
      const targetRole = getRole(target);
      violations.push({
        type: 'ILLEGAL_CONNECTION',
        severity: 'critical',
        message: `Illegal: ${source.name} (${sourceRole}) → ${target.name} (${targetRole})`,
        flow
      });
      fixes.push({ action: 'REMOVE_EDGE', flow, reason: `${sourceRole} → ${targetRole} violates system design rules` });
      continue; // Remove this flow
    }

    validFlows.push(flow);
  }
  fixedFlows = validFlows;

  // ══════════════════════════════════════════════════════════════
  // CHECK 2: ORPHAN NODES (nodes with zero connections)
  // ══════════════════════════════════════════════════════════════

  const connectedNodes = new Set();
  for (const flow of fixedFlows) {
    connectedNodes.add(flow.source);
    connectedNodes.add(flow.target);
  }

  for (const [id, node] of nodeMap) {
    if (!connectedNodes.has(id)) {
      violations.push({
        type: 'ORPHAN_NODE',
        severity: 'medium',
        message: `Orphan node: ${node.name} (${node.type}) has no connections`,
        nodeId: id
      });
      // Auto-fix: connect to most logical neighbor
      const fix = autoConnectOrphan(node, nodeMap, fixedFlows);
      if (fix) {
        fixedFlows.push(fix);
        fixes.push({ action: 'ADD_EDGE', flow: fix, reason: `Connected orphan ${node.name}` });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 3: MISSING ASYNC FOR HEAVY WORKLOADS
  // ══════════════════════════════════════════════════════════════

  const allComps = Object.values(fixedComponents).flat();
  const hasQueue = allComps.some(c => c.type === 'queue');
  const hasWorker = allComps.some(c => c.type === 'worker');
  const coreServices = allComps.filter(c => c.type === 'service' && !isInfraName(c.name));
  const hasEventDrivenCaps = allComps.some(c => {
    const cap = (c.capability || '').toLowerCase();
    return cap.includes('streaming') || cap.includes('event') || cap.includes('async') || cap.includes('analytics');
  });

  if (hasEventDrivenCaps && !hasQueue && coreServices.length >= 3) {
    violations.push({
      type: 'MISSING_ASYNC',
      severity: 'high',
      message: 'Event-driven capabilities detected but no message queue found. Heavy workloads will bottleneck without async decoupling.'
    });
    // Note: auto-injection is handled by aiEnhancer, not here
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 4: MISSING INGRESS FOR MULTI-SERVICE SYSTEMS
  // ══════════════════════════════════════════════════════════════

  const hasGateway = allComps.some(c => {
    const name = (c.name || '').toLowerCase();
    const cap = (c.capability || '').toLowerCase();
    return cap.includes('gateway') || name.includes('gateway') || name.includes('ingress');
  });

  if (!hasGateway && coreServices.length >= 3) {
    violations.push({
      type: 'MISSING_INGRESS',
      severity: 'high',
      message: `${coreServices.length} services detected but no API Gateway. Clients would need to know individual service addresses.`
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 5: SERVICES WITHOUT DATA STORE
  // ══════════════════════════════════════════════════════════════

  const hasDB = allComps.some(c => c.type === 'database');
  if (!hasDB && coreServices.length >= 2) {
    violations.push({
      type: 'MISSING_DATA_STORE',
      severity: 'medium',
      message: 'No database found. Stateful services require persistent storage.'
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHECK 6: QUEUE WITHOUT WORKER (dead messages)
  // ══════════════════════════════════════════════════════════════

  if (hasQueue && !hasWorker) {
    // Check if any service is consuming from the queue
    const queueHasConsumer = fixedFlows.some(f => {
      const src = nodeMap.get(f.source);
      return src && src.type === 'queue' && f.target;
    });
    if (!queueHasConsumer) {
      violations.push({
        type: 'QUEUE_NO_CONSUMER',
        severity: 'high',
        message: 'Queue(s) detected but no worker or service consumes from them. Messages will accumulate indefinitely.'
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ★ FINAL VALIDATION LAYER (Triple Pass) ★
  // Pass 1: Connection re-validation (ensure no bypasses)
  // Pass 2: Flow/pipeline completeness
  // Pass 3: Invariant validation (saga, gateway, UI correctness)
  // ══════════════════════════════════════════════════════════════

  const finalValidation = validateArchitectureGraph(
    fixedFlows,
    Array.from(nodeMap.values()),
    [] // domains will be passed from index.js if available
  );

  if (!finalValidation.valid) {
    // Auto-fix any remaining critical violations found in final pass
    const criticalViolations = finalValidation.violations.filter(v => v.severity === 'critical');
    for (const v of criticalViolations) {
      if (v.type === 'ILLEGAL_CONNECTION') {
        // Remove the illegal edge
        const beforeLen = fixedFlows.length;
        fixedFlows = fixedFlows.filter(f => {
          const src = nodeMap.get(f.source);
          const tgt = nodeMap.get(f.target);
          if (!src || !tgt) return true;
          return canConnect(src, tgt);
        });
        if (fixedFlows.length < beforeLen) {
          fixes.push({
            action: 'FINAL_PASS_REMOVE_ILLEGAL',
            reason: v.message,
            count: beforeLen - fixedFlows.length
          });
        }
      }
      violations.push({
        ...v,
        type: `FINAL_${v.type}`,
        severity: v.severity
      });
    }

    console.log(`\x1b[31m[FINAL VALIDATION] ${criticalViolations.length} critical violations found and auto-fixed\x1b[0m`);
  } else {
    console.log(`\x1b[32m[FINAL VALIDATION] Triple pass — CLEAN (connection ✓ flow ✓ invariant ✓)\x1b[0m`);
  }

  // Re-assign step numbers after fixes
  fixedFlows.forEach((flow, i) => { flow.step = i + 1; });

  return {
    valid: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    fixes,
    fixedFlows,
    fixedComponents,
    finalValidation: {
      passResults: finalValidation.passResults,
      pipelineCompleteness: finalValidation.pipelineCompleteness
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// AUTO-FIX HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Attempts to connect an orphan node to the most logical neighbor.
 */
function autoConnectOrphan(orphan, nodeMap, flows) {
  const nodes = Array.from(nodeMap.values());

  // Strategy depends on node type
  if (orphan.type === 'service') {
    // Connect from gateway or LB
    const gateway = nodes.find(n => {
      const name = (n.name || '').toLowerCase();
      return name.includes('gateway') || name.includes('ingress');
    });
    if (gateway && canConnect(gateway, orphan)) {
      return createFixFlow(gateway, orphan, 'service-routing');
    }
    // Connect to a DB
    const db = nodes.find(n => n.type === 'database');
    if (db && canConnect(orphan, db)) {
      return createFixFlow(orphan, db, 'data-access');
    }
  }

  if (orphan.type === 'database') {
    // Connect from first core service
    const svc = nodes.find(n => n.type === 'service' && !isInfraName(n.name));
    if (svc && canConnect(svc, orphan)) {
      return createFixFlow(svc, orphan, 'data-access');
    }
  }

  if (orphan.type === 'cache') {
    const svc = nodes.find(n => n.type === 'service' && !isInfraName(n.name));
    if (svc && canConnect(svc, orphan)) {
      return createFixFlow(svc, orphan, 'data-access');
    }
  }

  if (orphan.type === 'queue') {
    const svc = nodes.find(n => n.type === 'service' && !isInfraName(n.name));
    if (svc && canConnect(svc, orphan)) {
      return createFixFlow(svc, orphan, 'async-pipeline');
    }
  }

  if (orphan.type === 'worker') {
    const queue = nodes.find(n => n.type === 'queue');
    if (queue && canConnect(queue, orphan)) {
      return createFixFlow(queue, orphan, 'async-pipeline');
    }
    const svc = nodes.find(n => n.type === 'service' && !isInfraName(n.name));
    if (svc && canConnect(svc, orphan)) {
      return createFixFlow(svc, orphan, 'async-pipeline');
    }
  }

  if (orphan.type === 'external') {
    const svc = nodes.find(n => n.type === 'service' && !isInfraName(n.name));
    if (svc && canConnect(svc, orphan)) {
      return createFixFlow(svc, orphan, 'external-integration');
    }
  }

  if (orphan.type === 'ui') {
    const gateway = nodes.find(n => {
      const name = (n.name || '').toLowerCase();
      return name.includes('gateway') || name.includes('ingress');
    });
    if (gateway && canConnect(orphan, gateway)) {
      return createFixFlow(orphan, gateway, 'ingress');
    }
    const svc = nodes.find(n => n.type === 'service');
    if (svc && canConnect(orphan, svc)) {
      return createFixFlow(orphan, svc, 'ingress');
    }
  }

  return null;
}

function createFixFlow(source, target, pipelineId) {
  return {
    source: source.id,
    target: target.id,
    type: 'request',
    label: 'Connects',
    protocol: 'HTTPS',
    reason: `[AUTO-FIX] Connected orphan node to restore architectural integrity`,
    pipelineId,
    weight: 2,
    step: 0,
    autoFixed: true
  };
}

function isInfraName(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('gateway') || lower.includes('balancer') || lower.includes('waf') ||
         lower.includes('cdn') || lower.includes('rate') || lower.includes('circuit') ||
         lower.includes('registry') || lower.includes('consul') || lower.includes('mesh') ||
         lower.includes('istio') || lower.includes('config server') || lower.includes('monitor') ||
         lower.includes('jaeger') || lower.includes('prometheus') || lower.includes('loki') ||
         lower.includes('grafana') || lower.includes('collector') || lower.includes('observability');
}

module.exports = { validateArchitecture };
