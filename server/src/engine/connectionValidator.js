/**
 * ============================================================================
 * ARCHFORGE — CONNECTION VALIDATOR (STRICT SYSTEM DESIGN RULES)
 * ============================================================================
 *
 * Every edge in the system MUST pass canConnect() before being added.
 * This is the single source of truth for what connections are structurally
 * legal in a production system architecture.
 *
 * DESIGN PHILOSOPHY:
 *   A principal architect would NEVER allow UI → DB direct access.
 *   A principal architect would NEVER allow Queue → DB without a Worker.
 *   This validator encodes that expertise as deterministic rules.
 *
 * RULES MATRIX:
 *   UI       → Gateway, Service (ingress), CDN, LB, WAF
 *   Gateway  → Service, Cache
 *   Service  → Service, Cache, DB, Queue, External, Worker, Observability
 *   Queue    → Worker, Service (event-trigger), Queue (DLQ)
 *   Worker   → DB, External, Queue (ack/publish)
 *   Cache    → Service (cache-hit response)
 *   DB       → (no forward writes except analytics worker reads)
 *   External → Service (webhooks/callbacks)
 *
 * HARD BLOCKS:
 *   UI → DB, UI → Queue, UI → Worker
 *   DB → UI, DB → Queue, DB → External, DB → Cache
 *   Worker → UI, Worker → Gateway
 *   Cache → DB, Cache → Queue, Cache → External
 *   Queue → DB (must go through Worker)
 *   Queue → UI, Queue → Gateway, Queue → Cache
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════
// ROLE DETECTION HELPERS (lightweight, no circular dependency)
// ═══════════════════════════════════════════════════════════════

function getRole(comp) {
  if (!comp) return 'unknown';

  const type = (comp.type || '').toLowerCase();
  const name = (comp.name || '').toLowerCase();
  const cap  = (comp.capability || '').toLowerCase();

  // Primary type-based roles
  if (type === 'ui') return 'ui';
  if (type === 'database') return 'database';
  if (type === 'cache') return 'cache';
  if (type === 'queue') return 'queue';
  if (type === 'worker') return 'worker';
  if (type === 'external') return 'external';

  // Service sub-roles
  if (type === 'service') {
    // ★ Saga orchestrator (MUST be detected before generic service) ★
    if (name.includes('saga') || name.includes('orchestrator') || name.includes('temporal') || name.includes('step function'))
      return 'saga';
    // ★ Stream processor (Flink / Kafka Streams) ★
    if (name.includes('flink') || name.includes('stream process') || name.includes('kafka streams'))
      return 'stream-processor';
    if (cap.includes('gateway') || cap === 'api-gateway' || name.includes('gateway') || name.includes('ingress'))
      return 'gateway';
    if (cap === 'horizontal-scaling' || cap.includes('load-balanc') || name.includes('balancer') || name.includes('load'))
      return 'load-balancer';
    if (cap === 'rate-limiting' || name.includes('rate') || name.includes('throttl'))
      return 'rate-limiter';
    if (cap === 'circuit-breaker' || name.includes('circuit') || name.includes('resilience'))
      return 'circuit-breaker';
    if (name.includes('waf') || name.includes('firewall'))
      return 'waf';
    if (cap.includes('cdn') || name.includes('cdn'))
      return 'cdn';
    if (cap.includes('monitoring') || cap.includes('observability') || cap.includes('tracing') ||
        cap.includes('logging') || cap.includes('telemetry') || cap.includes('health-check') ||
        name.includes('prometheus') || name.includes('grafana') || name.includes('jaeger') ||
        name.includes('zipkin') || name.includes('loki') || name.includes('fluentd') ||
        name.includes('logstash') || name.includes('collector') || name.includes('monitor') ||
        name.includes('observability') || name.includes('telemetry'))
      return 'observability';
    if (cap === 'service-discovery' || name.includes('registry') || name.includes('consul') || name.includes('eureka'))
      return 'registry';
    if (cap === 'config-management' || name.includes('config server') || name.includes('config-server'))
      return 'config-server';
    if (cap === 'service-mesh' || name.includes('istio') || name.includes('linkerd') || name.includes('mesh'))
      return 'mesh';

    return 'service'; // core business service
  }

  // Worker sub-roles
  if (type === 'worker') {
    if (name.includes('spark') || name.includes('batch'))
      return 'batch-processor';
    return 'worker';
  }

  // Database sub-roles
  if (type === 'database') {
    if (name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
        name.includes('redshift') || name.includes('snowflake'))
      return 'warehouse';
    return 'database';
  }

  return type || 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// ALLOWED CONNECTIONS MATRIX
// ═══════════════════════════════════════════════════════════════

/**
 * Defines which source roles can connect to which target roles.
 * If a pair is NOT in this map, it's ILLEGAL.
 */
const ALLOWED_CONNECTIONS = {
  'ui': new Set([
    'gateway', 'load-balancer', 'waf', 'cdn', 'rate-limiter',
    'service'  // only ingress-type services
  ]),
  'waf': new Set([
    'gateway', 'load-balancer', 'rate-limiter', 'service'
  ]),
  'cdn': new Set([
    'service', 'external', 'gateway', 'load-balancer'
  ]),
  'load-balancer': new Set([
    'gateway', 'rate-limiter', 'service', 'load-balancer'
  ]),
  'rate-limiter': new Set([
    'gateway', 'service', 'saga'
  ]),
  'gateway': new Set([
    'service', 'cache', 'registry', 'config-server', 'observability', 'rate-limiter',
    'saga' // gateway routes to saga for distributed txn endpoints
    // ★ NO 'database' — gateway MUST NEVER access DB directly ★
  ]),
  'service': new Set([
    'service', 'cache', 'database', 'queue', 'external', 'worker',
    'gateway', 'load-balancer', 'rate-limiter', 'circuit-breaker',
    'registry', 'config-server', 'mesh', 'observability', 'waf', 'cdn',
    'saga', 'stream-processor', 'batch-processor'
    // ★ NO 'warehouse' — services MUST publish to Kafka, not write DW directly ★
  ]),
  // ★ SAGA CORRECTNESS — saga can call services and publish events, NOTHING else ★
  'saga': new Set([
    'service', 'queue'  // saga → service (orchestrate), saga → queue (publish events)
    // ★ NO 'database', NO 'cache' — saga is stateless orchestration only ★
  ]),
  'queue': new Set([
    'worker', 'service', 'queue',  // DLQ routing
    'stream-processor', 'batch-processor'  // Kafka → Flink, Kafka → Spark
  ]),
  'worker': new Set([
    'database', 'warehouse', 'external', 'queue', 'service', 'cache'
  ]),
  // ★ Stream processor (Flink) — reads from Kafka, writes to warehouse/DB ★
  'stream-processor': new Set([
    'database', 'warehouse', 'service', 'queue', 'cache'
  ]),
  // ★ Batch processor (Spark) — reads from Kafka/DW, writes to warehouse ★
  'batch-processor': new Set([
    'database', 'warehouse', 'queue', 'service', 'external'
  ]),
  'cache': new Set([
    'service', 'gateway', 'saga' // cache-hit response path
  ]),
  'database': new Set([
    // DB can only connect to analytics workers/services (very restricted)
    'service', 'worker', 'stream-processor'
  ]),
  // ★ Data Warehouse — even more restricted, only feeds analytics services ★
  'warehouse': new Set([
    'service' // analytics service reads from warehouse
  ]),
  'external': new Set([
    'service', 'gateway' // webhook callbacks
  ]),
  // Infrastructure roles connecting to services
  'circuit-breaker': new Set([
    'service', 'external', 'gateway'
  ]),
  'registry': new Set([
    'service', 'gateway'
  ]),
  'config-server': new Set([
    'service', 'gateway'
  ]),
  'mesh': new Set([
    'service', 'gateway'
  ]),
  'observability': new Set([
    'observability', 'service', 'external' // inter-observability correlation
  ])
};

/**
 * HARD-BLOCKED connection pairs that are NEVER valid under any circumstance.
 * These represent anti-patterns that would fail any system design review.
 */
const HARD_BLOCKS = [
  ['ui', 'database'],
  ['ui', 'warehouse'],
  ['ui', 'queue'],
  ['ui', 'worker'],
  ['ui', 'external'],        // UI should go through gateway, not directly to external
  // ★ Gateway → DB/Warehouse HARD BLOCK — gateway is routing only ★
  ['gateway', 'database'],
  ['gateway', 'warehouse'],
  // ★ SAGA CORRECTNESS — saga is a stateless orchestrator ★
  ['saga', 'database'],      // Saga MUST call services, not DB
  ['saga', 'cache'],         // Saga MUST call services, not cache
  ['saga', 'warehouse'],     // Saga MUST call services, not warehouse
  ['saga', 'external'],      // Saga orchestrates services, not external APIs
  ['saga', 'worker'],        // Saga orchestrates services, not workers
  ['saga', 'ui'],            // Saga doesn't talk to UI
  // ★ Service → Warehouse HARD BLOCK — must go through Kafka ★
  ['service', 'warehouse'],  // Services publish to Kafka, Flink/Spark writes to DW
  // Database hard blocks
  ['database', 'ui'],
  ['database', 'queue'],
  ['database', 'external'],
  ['database', 'cache'],
  ['database', 'gateway'],
  ['database', 'load-balancer'],
  ['database', 'waf'],
  ['database', 'cdn'],
  ['database', 'warehouse'],
  // Warehouse hard blocks (even more restricted than DB)
  ['warehouse', 'ui'],
  ['warehouse', 'queue'],
  ['warehouse', 'external'],
  ['warehouse', 'cache'],
  ['warehouse', 'gateway'],
  ['warehouse', 'database'],
  ['warehouse', 'worker'],
  ['warehouse', 'warehouse'],
  // Worker hard blocks
  ['worker', 'ui'],
  ['worker', 'gateway'],
  ['worker', 'load-balancer'],
  ['worker', 'waf'],
  // Batch processor hard blocks
  ['batch-processor', 'ui'],
  ['batch-processor', 'gateway'],
  ['batch-processor', 'load-balancer'],
  ['batch-processor', 'waf'],
  ['batch-processor', 'cache'],
  // Stream processor hard blocks
  ['stream-processor', 'ui'],
  ['stream-processor', 'gateway'],
  ['stream-processor', 'load-balancer'],
  ['stream-processor', 'waf'],
  // Cache hard blocks
  ['cache', 'database'],
  ['cache', 'queue'],
  ['cache', 'external'],
  ['cache', 'worker'],
  ['cache', 'waf'],
  ['cache', 'cdn'],
  ['cache', 'warehouse'],
  // Queue hard blocks
  ['queue', 'database'],     // Queue → DB MUST go through Worker
  ['queue', 'warehouse'],    // Queue → DW MUST go through Flink/Spark
  ['queue', 'ui'],
  ['queue', 'gateway'],
  ['queue', 'cache'],
  ['queue', 'load-balancer'],
  ['queue', 'waf'],
  ['queue', 'cdn'],
  ['queue', 'external']
];

// Pre-compute hard blocks as a Set for O(1) lookup
const HARD_BLOCK_SET = new Set(HARD_BLOCKS.map(([s, t]) => `${s}→${t}`));

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Determines if a connection between source and target is structurally LEGAL.
 * This is a hard gate — if this returns false, the edge MUST NOT be created.
 *
 * @param {object} source - Source component with { type, name, capability }
 * @param {object} target - Target component with { type, name, capability }
 * @returns {boolean} true if the connection is structurally legal
 */
function canConnect(source, target) {
  if (!source || !target) return false;
  if (source.id === target.id) return false; // no self-loops

  const sourceRole = getRole(source);
  const targetRole = getRole(target);

  // 1. Check hard blocks first (O(1))
  if (HARD_BLOCK_SET.has(`${sourceRole}→${targetRole}`)) {
    return false;
  }

  // 2. Check allowed connections matrix
  const allowed = ALLOWED_CONNECTIONS[sourceRole];
  if (!allowed) return false; // unknown role → block

  return allowed.has(targetRole);
}

/**
 * Determines if a connection is RELEVANT (meaningful, not noise).
 * A connection can be legal but irrelevant (e.g., connecting two unrelated 
 * services that have no business reason to communicate).
 *
 * @param {object} source - Source component
 * @param {object} target - Target component
 * @returns {{ relevant: boolean, reason: string }}
 */
function isRelevant(source, target) {
  if (!canConnect(source, target)) {
    return { relevant: false, reason: 'Connection violates structural rules' };
  }

  const sourceRole = getRole(source);
  const targetRole = getRole(target);
  const sCap = (source.capability || '').toLowerCase();
  const tCap = (target.capability || '').toLowerCase();

  // DB → Service: only relevant if the service actually uses that DB
  if (sourceRole === 'database' && targetRole === 'service') {
    const sameCapability = sCap && tCap && (sCap === tCap || sCap.includes(tCap) || tCap.includes(sCap));
    if (!sameCapability) {
      return { relevant: false, reason: 'Database response path only relevant for services that use this database' };
    }
  }

  // Inter-service: check capability relevance
  if (sourceRole === 'service' && targetRole === 'service') {
    // Infrastructure services are always relevant (gateway, LB, etc.)
    // Core-to-core service connections need capability affinity
    const sourceIsInfra = ['gateway', 'load-balancer', 'rate-limiter', 'circuit-breaker',
                           'registry', 'config-server', 'mesh', 'observability'].includes(getRole(source));
    const targetIsInfra = ['gateway', 'load-balancer', 'rate-limiter', 'circuit-breaker',
                           'registry', 'config-server', 'mesh', 'observability'].includes(getRole(target));

    if (!sourceIsInfra && !targetIsInfra) {
      // Both are core services — need to verify domain relevance
      // This is a soft check; the flow engine's capRelations handles specifics
      return { relevant: true, reason: 'Cross-service communication for business logic coordination' };
    }
  }

  return { relevant: true, reason: 'Valid architectural connection' };
}

/**
 * Returns the role classification for a component.
 * Exposed for use by other modules (flow engine, validation engine).
 */
function classifyRole(comp) {
  return getRole(comp);
}

/**
 * Validates an entire edge set against the connection rules.
 * Returns violations for reporting.
 *
 * @param {Array} edges - Array of { source, target } edge objects
 * @param {Array} nodes - Array of component objects with IDs
 * @returns {{ valid: boolean, violations: Array }}
 */
function validateEdges(edges, nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const violations = [];

  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) {
      violations.push({
        type: 'DANGLING_EDGE',
        edge,
        message: `Edge references non-existent node: ${!source ? edge.source : edge.target}`
      });
      continue;
    }

    if (!canConnect(source, target)) {
      const sourceRole = getRole(source);
      const targetRole = getRole(target);
      violations.push({
        type: 'ILLEGAL_CONNECTION',
        edge,
        sourceRole,
        targetRole,
        message: `Illegal: ${source.name} (${sourceRole}) → ${target.name} (${targetRole})`
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * COMPREHENSIVE POST-BUILD ARCHITECTURE GRAPH VALIDATOR
 *
 * Runs 3 validation passes in a single call:
 *   1. Connection validation — all edges pass canConnect()
 *   2. Flow validation — domain pipeline completeness
 *   3. Invariant validation — saga correctness, no invalid patterns
 *
 * @param {Array} edges - Array of { source, target } edge objects
 * @param {Array} nodes - Array of component objects with IDs
 * @param {string[]} detectedDomains - Detected domains from domain flow engine
 * @returns {{ valid: boolean, violations: Array, pipelineCompleteness: object }}
 */
function validateArchitectureGraph(edges, nodes, detectedDomains = []) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const violations = [];

  // ── PASS 1: Connection Validation ──
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) {
      violations.push({
        pass: 'connection',
        type: 'DANGLING_EDGE',
        severity: 'high',
        message: `Edge references non-existent node: ${!source ? edge.source : edge.target}`
      });
      continue;
    }

    if (!canConnect(source, target)) {
      violations.push({
        pass: 'connection',
        type: 'ILLEGAL_CONNECTION',
        severity: 'critical',
        sourceRole: getRole(source),
        targetRole: getRole(target),
        message: `Illegal: ${source.name} (${getRole(source)}) → ${target.name} (${getRole(target)})`
      });
    }
  }

  // ── PASS 2: Flow / Pipeline Completeness ──
  const pipelineIds = new Set(edges.map(e => e.pipelineId).filter(Boolean));
  const pipelineCompleteness = {};

  // Core pipelines (always expected)
  for (const p of ['ingress', 'service-routing', 'data-access']) {
    pipelineCompleteness[p] = pipelineIds.has(p);
    if (!pipelineIds.has(p)) {
      violations.push({
        pass: 'flow',
        type: 'MISSING_CORE_PIPELINE',
        severity: 'medium',
        message: `Core pipeline "${p}" has no edges`
      });
    }
  }

  // Domain-specific pipeline completeness
  for (const domain of detectedDomains) {
    const domainPipelineId = `domain-${domain}`;
    pipelineCompleteness[domainPipelineId] = pipelineIds.has(domainPipelineId);
    if (!pipelineIds.has(domainPipelineId)) {
      violations.push({
        pass: 'flow',
        type: 'MISSING_DOMAIN_PIPELINE',
        severity: 'low',
        message: `Domain pipeline "${domainPipelineId}" expected but has no edges — domain components may be missing`
      });
    }
  }

  // ── PASS 3: Invariant Validation ──

  // 3a. Saga correctness — saga must NEVER connect to DB, cache, or warehouse
  const sagaNodes = nodes.filter(n => getRole(n) === 'saga');
  for (const saga of sagaNodes) {
    const sagaEdges = edges.filter(e => e.source === saga.id);
    for (const edge of sagaEdges) {
      const target = nodeMap.get(edge.target);
      if (!target) continue;
      const tRole = getRole(target);
      if (['database', 'cache', 'warehouse'].includes(tRole)) {
        violations.push({
          pass: 'invariant',
          type: 'SAGA_CORRECTNESS_VIOLATION',
          severity: 'critical',
          message: `Saga "${saga.name}" directly accesses ${target.name} (${tRole}) — saga must only call services and publish events`
        });
      }
    }
  }

  // 3b. Gateway must never access DB directly
  const gatewayNodes = nodes.filter(n => getRole(n) === 'gateway');
  for (const gw of gatewayNodes) {
    const gwEdges = edges.filter(e => e.source === gw.id);
    for (const edge of gwEdges) {
      const target = nodeMap.get(edge.target);
      if (!target) continue;
      const tRole = getRole(target);
      if (['database', 'warehouse'].includes(tRole)) {
        violations.push({
          pass: 'invariant',
          type: 'GATEWAY_DB_VIOLATION',
          severity: 'critical',
          message: `Gateway "${gw.name}" directly accesses ${target.name} (${tRole}) — gateway is routing only`
        });
      }
    }
  }

  // 3c. No UI → DB direct access
  const uiNodes = nodes.filter(n => n.type === 'ui');
  for (const ui of uiNodes) {
    const uiEdges = edges.filter(e => e.source === ui.id);
    for (const edge of uiEdges) {
      const target = nodeMap.get(edge.target);
      if (!target) continue;
      if (target.type === 'database' || target.type === 'queue' || target.type === 'worker') {
        violations.push({
          pass: 'invariant',
          type: 'UI_DIRECT_ACCESS_VIOLATION',
          severity: 'critical',
          message: `UI "${ui.name}" directly accesses ${target.name} (${target.type}) — must go through gateway/service`
        });
      }
    }
  }

  // 3d. Service → Warehouse direct access check
  const coreServiceNodes = nodes.filter(n => {
    const role = getRole(n);
    return role === 'service'; // core service only
  });
  for (const svc of coreServiceNodes) {
    const svcEdges = edges.filter(e => e.source === svc.id);
    for (const edge of svcEdges) {
      const target = nodeMap.get(edge.target);
      if (!target) continue;
      if (getRole(target) === 'warehouse') {
        violations.push({
          pass: 'invariant',
          type: 'SERVICE_WAREHOUSE_VIOLATION',
          severity: 'high',
          message: `Service "${svc.name}" writes directly to warehouse "${target.name}" — must go through Kafka → Flink/Spark`
        });
      }
    }
  }

  return {
    valid: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    pipelineCompleteness,
    passResults: {
      connection: violations.filter(v => v.pass === 'connection').length === 0,
      flow: violations.filter(v => v.pass === 'flow').length === 0,
      invariant: violations.filter(v => v.pass === 'invariant').length === 0
    }
  };
}

module.exports = { canConnect, isRelevant, classifyRole, validateEdges, getRole, validateArchitectureGraph };
