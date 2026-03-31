/**
 * ============================================================================
 * ARCHFORGE — PIPELINE DEEP-FLOW ENGINE v7 (PRODUCTION-GRADE)
 * ============================================================================
 *
 * Generates production-grade data flow edges following strict system design
 * principles. v7 IMPROVEMENTS over v6:
 *
 *  - ALL edges gated by canConnect() from connectionValidator
 *  - pipelineId on EVERY edge (ingress, service-routing, data-access, etc.)
 *  - Edge weight calculation (source.priority + target.priority)
 *  - Expanded feedback loops (DB→Service, Service→Gateway response paths)
 *  - Capability → Flow mapping for domain-specific pipelines
 *  - Zero orphan guarantee maintained
 *
 * PIPELINES:
 *   ingress            — UI → WAF → LB → RateLimiter → Gateway
 *   service-routing    — Gateway → Services
 *   data-access        — Service → Cache → DB
 *   async-pipeline     — Service → Queue → Worker → DB
 *   external-integration — Service → CircuitBreaker → External
 *   inter-service      — Service → Service (domain logic)
 *   infra-wiring       — Services → Registry/Config/Mesh
 *   observability      — Services → Tracing/Logging/Metrics
 *   feedback           — Cache→Service, DB→Service, Service→Gateway (responses)
 * ============================================================================
 */

const { canConnect } = require('./connectionValidator');

// ═══════════════════════════════════════════════════════════════
// PRIORITY WEIGHT MAP (for edge.weight calculation)
// ═══════════════════════════════════════════════════════════════

const PRIORITY_SCORE = { high: 3, medium: 2, low: 1 };

function calcWeight(source, target) {
  return (PRIORITY_SCORE[source.priority] || 1) + (PRIORITY_SCORE[target.priority] || 1);
}

// ═══════════════════════════════════════════════════════════════
// ARCHITECTURAL REASON ENGINE
// ═══════════════════════════════════════════════════════════════

function getArchitecturalReason(source, target) {
  const s = source.type;
  const t = target.type;
  const sName = source.name || 'Source';
  const tName = target.name || 'Target';

  if (s === 'ui' && isWAF(target)) return `${sName} sends all traffic through ${tName} for OWASP attack filtering, bot mitigation, and L7 DDoS protection before reaching backend services`;
  if (s === 'ui' && isLoadBalancer(target)) return `${sName} connects to ${tName} which distributes requests across multiple backend instances using round-robin/least-connections to prevent hotspots`;
  if (s === 'ui' && isRateLimiter(target)) return `${sName} traffic passes through ${tName} to enforce per-user and per-IP rate limits, preventing abuse and ensuring fair resource allocation`;
  if (s === 'ui' && isGateway(target)) return `${sName} sends API requests to ${tName} which handles authentication, request routing, protocol translation, and API versioning`;
  if (s === 'ui' && isCDN(target)) return `${sName} loads static assets (JS, CSS, images) from ${tName} edge nodes for sub-100ms global delivery via geographic proximity`;
  if (s === 'ui' && t === 'service') return `${sName} communicates directly with ${tName} for real-time user interactions`;

  if (isWAF(source) && isLoadBalancer(target)) return `${sName} forwards sanitized traffic to ${tName} after filtering malicious requests, SQL injection, and XSS attempts`;
  if (isLoadBalancer(source) && isRateLimiter(target)) return `${sName} distributes balanced traffic to ${tName} for per-client throttling before reaching application services`;
  if (isLoadBalancer(source) && isGateway(target)) return `${sName} distributes traffic across ${tName} instances using health-check-aware routing for high availability`;
  if (isRateLimiter(source) && isGateway(target)) return `${sName} forwards rate-approved requests to ${tName} for API routing, auth verification, and request transformation`;
  if (isWAF(source) && isRateLimiter(target)) return `${sName} passes clean traffic to ${tName} for throughput enforcement`;
  if (isWAF(source) && isGateway(target)) return `${sName} forwards filtered traffic to ${tName} after security validation`;
  if (isLoadBalancer(source) && isCoreService(target)) return `${sName} routes traffic directly to ${tName} using weighted round-robin across available instances`;
  if (isRateLimiter(source) && isCoreService(target)) return `${sName} forwards approved requests to ${tName} after enforcing rate limits`;

  if (isGateway(source) && isCoreService(target)) return `${sName} routes authenticated requests to ${tName} based on URL path matching, applying request/response transformation and circuit-breaking policies`;

  if (s === 'service' && t === 'cache') return `${sName} implements cache-aside pattern: checks ${tName} first (sub-ms latency) before hitting primary database, reducing DB load by 80-90% for read-heavy workloads`;
  if (s === 'service' && t === 'database') return `${sName} performs CRUD operations on ${tName} for durable state persistence with ACID guarantees and optimistic concurrency control`;

  if (s === 'service' && t === 'queue') {
    if (isDLQ(target)) return `${sName} routes failed/poison messages to ${tName} for manual inspection, replay, and dead letter analysis`;
    return `${sName} publishes domain events to ${tName} for asynchronous processing, decoupling producers from consumers and enabling independent scaling`;
  }

  if (s === 'queue' && t === 'worker') return `${tName} consumes messages from ${sName} with at-least-once delivery, processing tasks asynchronously with automatic retry and backoff`;
  if (s === 'queue' && t === 'service') return `${sName} triggers ${tName} via event-driven invocation for reactive processing`;
  if (s === 'queue' && t === 'queue') return `${sName} routes failed messages to ${tName} after exhausting retry attempts, preserving failed payloads for debugging`;

  if (s === 'worker' && t === 'database') return `${tName} receives batch-processed results from ${sName}, writing aggregated or transformed data for downstream consumption`;
  if (s === 'worker' && t === 'external') return `${sName} sends processed results to ${tName} for external delivery or third-party integration`;
  if (s === 'worker' && t === 'queue') return `${sName} acknowledges completion or publishes derived events back to ${tName} for downstream pipeline stages`;

  if (s === 'service' && t === 'external') return `${sName} integrates with ${tName} for third-party capabilities, using circuit breakers and retry policies to handle external failures gracefully`;
  if (isCircuitBreaker(source) && t === 'external') return `${sName} wraps calls to ${tName} with circuit-breaking logic: opens circuit after consecutive failures, returns fallback response, and auto-recovers`;
  if (s === 'service' && isCircuitBreaker(target)) return `${sName} routes external dependency calls through ${tName} to prevent cascading failures when downstream services are degraded`;

  if (isCoreService(source) && isServiceRegistry(target)) return `${sName} registers its address and health status with ${tName} on startup and sends periodic heartbeats for service discovery`;
  if (isServiceRegistry(source) && isCoreService(target)) return `${sName} pushes service topology updates to ${tName} for dynamic endpoint resolution`;
  if (isGateway(source) && isServiceRegistry(target)) return `${sName} queries ${tName} to resolve service endpoints for dynamic request routing`;

  if (isCoreService(source) && isConfigServer(target)) return `${sName} fetches runtime configuration from ${tName} on startup and subscribes to config change events for hot-reload without restart`;
  if (isGateway(source) && isConfigServer(target)) return `${sName} loads routing rules and rate limit configs from ${tName}`;

  if (isServiceMesh(source) && isCoreService(target)) return `${sName} injects sidecar proxy alongside ${tName} for mTLS encryption, traffic shaping, retries, and observability — without application code changes`;

  if (isCoreService(source) && isObservability(target)) {
    const tLower = (target.name || '').toLowerCase();
    if (tLower.includes('jaeger') || tLower.includes('zipkin') || tLower.includes('trace')) return `${sName} exports distributed traces to ${tName} via OpenTelemetry SDK, enabling end-to-end request latency analysis`;
    if (tLower.includes('loki') || tLower.includes('log') || tLower.includes('fluentd') || tLower.includes('logstash')) return `${sName} ships structured logs to ${tName} for centralized log aggregation and root cause analysis`;
    if (tLower.includes('prometheus') || tLower.includes('collector') || tLower.includes('monitor')) return `${sName} exposes /metrics endpoint scraped by ${tName} for RED metrics (Rate, Error, Duration)`;
    if (tLower.includes('grafana')) return `${sName} metrics are visualized in ${tName} dashboards for real-time operational visibility`;
    return `${sName} sends telemetry data to ${tName} for observability and operational monitoring`;
  }
  if (isGateway(source) && isObservability(target)) return `${sName} emits request-level telemetry to ${tName} for API-wide latency tracking and error rate monitoring`;

  if (isObservability(source) && isObservability(target)) {
    const sLower = (source.name || '').toLowerCase();
    const tLower = (target.name || '').toLowerCase();
    if ((sLower.includes('jaeger') || sLower.includes('trace')) && (tLower.includes('loki') || tLower.includes('log'))) return `${sName} correlates trace IDs with ${tName} log entries for click-through debugging`;
    if ((sLower.includes('prometheus') || sLower.includes('collector')) && tLower.includes('grafana')) return `${sName} feeds time-series metrics to ${tName} for dashboard visualization and alerting`;
    return `${sName} correlates observability signals with ${tName} for unified operational intelligence`;
  }

  // Feedback paths
  if (t === 'service' && s === 'cache') return `${sName} returns cached data to ${tName} on cache hit, avoiding expensive database round-trips and reducing p99 latency by 10-100x`;
  if (t === 'service' && s === 'database') return `${sName} returns query results to ${tName} as part of the read response path`;
  if (t === 'service' && s === 'external') return `${sName} sends webhook callbacks to ${tName} for asynchronous event notification`;

  if (s === 'service' && t === 'service') {
    if (isGateway(source) || isLoadBalancer(source)) return `${sName} routes incoming requests to ${tName}`;
    if (isRateLimiter(source)) return `${sName} throttles and forwards approved traffic to ${tName}`;
    if (isCircuitBreaker(source)) return `${sName} guards ${tName} with circuit-breaking for fault isolation`;
    if (isObservability(source)) return `${sName} monitors ${tName} health and performance metrics`;
    return `${sName} calls ${tName} for cross-domain business logic coordination via synchronous API`;
  }

  return `${sName} connects to ${tName} for system integration`;
}

// ═══════════════════════════════════════════════════════════════
// PROTOCOL, LABEL, EDGE TYPE RESOLVERS
// ═══════════════════════════════════════════════════════════════

function getProtocol(source, target) {
  // Explicit protocol from component definition takes precedence
  // BUT only for the component's own protocol, not generic inheritance
  if (target.type === 'queue') return 'AMQP';
  if (target.type === 'cache') return 'TCP';
  if (target.type === 'database') {
    const tech = (target.tech || '').toLowerCase();
    if (tech.includes('mongo') || tech.includes('dynamo')) return 'TCP';
    return 'TCP/SQL';
  }
  if (source.type === 'ui') return 'HTTPS';
  if (source.type === 'service' && target.type === 'service') {
    // ★ gRPC ONLY when BOTH sides explicitly support it ★
    // Prevents gRPC overuse for async/event flows
    const srcTech = (source.tech || '').toLowerCase();
    const tgtTech = (target.tech || '').toLowerCase();
    if (srcTech.includes('grpc') && tgtTech.includes('grpc')) return 'gRPC';
    return 'HTTPS';
  }
  if (target.type === 'external') return 'HTTPS';
  if (target.type === 'worker') return 'AMQP';
  return 'HTTPS';
}

function getEdgeLabel(source, target) {
  const s = source.type;
  const t = target.type;
  if (s === 'ui' && t === 'service') return 'Requests';
  if (s === 'service' && t === 'service') {
    if (isGateway(source) || isLoadBalancer(source)) return 'Routes';
    if (isRateLimiter(source)) return 'Throttles';
    if (isCircuitBreaker(source)) return 'Guards';
    if (isServiceRegistry(source) || isConfigServer(source)) return 'Configures';
    if (isObservability(source)) return 'Monitors';
    if (isServiceMesh(source)) return 'Proxies';
    return 'Calls';
  }
  if (s === 'service' && t === 'database') return 'Reads/Writes';
  if (s === 'service' && t === 'cache') return 'Cache Lookup';
  if (s === 'service' && t === 'queue') return isDLQ(target) ? 'Dead Letter' : 'Publishes';
  if (s === 'service' && t === 'external') return 'Integrates';
  if (s === 'service' && t === 'worker') return 'Dispatches';
  if (s === 'queue' && t === 'worker') return 'Consumes';
  if (s === 'queue' && t === 'service') return 'Triggers';
  if (s === 'queue' && t === 'queue') return 'DLQ Retry';
  if (s === 'worker' && t === 'database') return 'Batch Writes';
  if (s === 'worker' && t === 'external') return 'Sends';
  if (s === 'worker' && t === 'queue') return 'Acknowledges';
  if (s === 'external' && t === 'service') return 'Webhook';
  if (s === 'cache' && t === 'service') return 'Cache Hit';
  if (s === 'database' && t === 'service') return 'Query Result';
  return 'Connects';
}

function getEdgeType(source, target) {
  if (target.type === 'queue') return 'event';
  if (source.type === 'queue') return 'async';
  if (target.type === 'worker' || source.type === 'worker') return 'async';
  if (isObservability(target)) return 'async';
  // Feedback paths are response type
  if (source.type === 'cache' && target.type === 'service') return 'response';
  if (source.type === 'database' && target.type === 'service') return 'response';
  return 'request';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT ROLE CLASSIFIERS
// ═══════════════════════════════════════════════════════════════

function isGateway(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap.includes('gateway') || cap === 'api-gateway' || name.includes('gateway') || name.includes('ingress');
}

function isLoadBalancer(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'horizontal-scaling' || cap.includes('load-balanc') || name.includes('balancer') || name.includes('load') || name.includes('alb') || name.includes('nlb');
}

function isRateLimiter(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'rate-limiting' || name.includes('rate') || name.includes('throttl');
}

function isCircuitBreaker(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'circuit-breaker' || name.includes('circuit') || name.includes('resilience');
}

function isWAF(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  return name.includes('waf') || name.includes('firewall');
}

function isCDN(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'cdn-delivery' || name.includes('cdn');
}

function isObservability(comp) {
  if (!comp) return false;
  const cap = (comp.capability || '').toLowerCase();
  const name = (comp.name || '').toLowerCase();
  return cap.includes('monitoring') || cap.includes('observability') || cap.includes('telemetry') ||
         cap.includes('distributed-tracing') || cap.includes('centralized-logging') || cap.includes('health-check') ||
         name.includes('prometheus') || name.includes('grafana') || name.includes('collector') ||
         name.includes('jaeger') || name.includes('zipkin') || name.includes('trace') ||
         name.includes('fluentd') || name.includes('logstash') || name.includes('loki') ||
         name.includes('monitor') || name.includes('observability') || name.includes('telemetry') ||
         name.includes('log aggregat');
}

function isServiceRegistry(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'service-discovery' || name.includes('registry') || name.includes('consul') || name.includes('eureka');
}

function isConfigServer(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'config-management' || name.includes('config server') || name.includes('config-server');
}

function isServiceMesh(comp) {
  if (!comp) return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'service-mesh' || name.includes('istio') || name.includes('linkerd') || name.includes('service mesh');
}

function isInfraService(comp) {
  return isGateway(comp) || isLoadBalancer(comp) || isRateLimiter(comp) ||
         isCircuitBreaker(comp) || isWAF(comp) || isCDN(comp) || isObservability(comp) ||
         isServiceRegistry(comp) || isConfigServer(comp) || isServiceMesh(comp);
}

function isCoreService(comp) {
  if (!comp || comp.type !== 'service') return false;
  return !isInfraService(comp);
}

function isDLQ(comp) {
  if (!comp || comp.type !== 'queue') return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return name.includes('dead') || name.includes('dlq') || cap === 'dead-letter-queue';
}

// ═══════════════════════════════════════════════════════════════
// MAIN FLOW GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateFlows(components, patterns) {
  const flatComps = Object.values(components).flat();
  const flows = [];
  const seenEdges = new Set();
  const connectedNodes = new Set();

  /**
   * Adds a validated flow edge. EVERY edge passes through canConnect().
   */
  const addFlow = (source, target, pipelineId, overrides = {}) => {
    if (!source || !target) return false;
    if (source.id === target.id) return false;

    // ★ STRICT VALIDATION GATE ★
    if (!canConnect(source, target)) {
      return false;
    }

    const key = `${source.id}->${target.id}:${pipelineId}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);

    const type = overrides.type || getEdgeType(source, target);
    const protocol = overrides.protocol || getProtocol(source, target);
    const label = overrides.label || getEdgeLabel(source, target);
    const reason = overrides.reason || getArchitecturalReason(source, target);
    const weight = calcWeight(source, target);

    connectedNodes.add(source.id);
    connectedNodes.add(target.id);

    flows.push({
      source: source.id,
      target: target.id,
      type,
      label,
      protocol,
      reason,
      pipelineId,
      weight
    });

    return true;
  };

  // ═══════════════════════════════════════════════════════════════
  // CATEGORIZE COMPONENTS BY ROLE
  // ═══════════════════════════════════════════════════════════════

  const UIs = flatComps.filter(c => c.type === 'ui');
  const AllGateways = flatComps.filter(c => c.type === 'service' && isGateway(c));
  const LoadBalancers = flatComps.filter(c => c.type === 'service' && isLoadBalancer(c) && !isGateway(c));
  const RateLimiters = flatComps.filter(c => c.type === 'service' && isRateLimiter(c));
  const CircuitBreakers = flatComps.filter(c => c.type === 'service' && isCircuitBreaker(c));
  const WAFs = flatComps.filter(c => c.type === 'service' && isWAF(c));
  const CDNs = flatComps.filter(c => c.type === 'service' && isCDN(c));
  const CoreServices = flatComps.filter(c => isCoreService(c));
  const Observability = flatComps.filter(c => isObservability(c));
  const ServiceRegistries = flatComps.filter(c => isServiceRegistry(c));
  const ConfigServers = flatComps.filter(c => isConfigServer(c));
  const ServiceMeshes = flatComps.filter(c => isServiceMesh(c));
  const Workers = flatComps.filter(c => c.type === 'worker');
  const Queues = flatComps.filter(c => c.type === 'queue' && !isDLQ(c));
  const DLQs = flatComps.filter(c => isDLQ(c));
  const Caches = flatComps.filter(c => c.type === 'cache');
  const DBs = flatComps.filter(c => c.type === 'database');
  const Externals = flatComps.filter(c => c.type === 'external');

  const primaryWAF = WAFs[0];
  const primaryLB = LoadBalancers[0];
  const primaryGateway = AllGateways.find(g => {
    const cap = (g.capability || '').toLowerCase();
    return cap === 'api-gateway' || cap === 'backend-logic';
  }) || AllGateways[0];
  const primaryRateLimiter = RateLimiters[0];
  const REP_COUNT = Math.min(2, CoreServices.length); // Wire 2 representative services to infra

  // ★ PRIMARY PIPELINE TRACKER ★
  const primaryPipeline = [];

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: CDN (static content — explicit split from API path)
  // User → CDN → Static Assets   |   User → Gateway → API
  // ═══════════════════════════════════════════════════════════════

  for (const cdn of CDNs) {
    for (const ui of UIs) {
      addFlow(ui, cdn, 'cdn-static', { protocol: 'HTTPS', label: 'Static Assets',
        reason: `${ui.name} loads static assets (JS, CSS, images, fonts) from ${cdn.name} edge nodes — CDN path is separate from API path through Gateway`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: INGRESS CHAIN
  // ═══════════════════════════════════════════════════════════════

  const ingressChain = [];
  if (primaryWAF) ingressChain.push(primaryWAF);
  if (primaryLB) ingressChain.push(primaryLB);
  if (primaryRateLimiter) ingressChain.push(primaryRateLimiter);
  if (primaryGateway) ingressChain.push(primaryGateway);

  for (const ui of UIs) {
    if (ingressChain.length > 0) {
      addFlow(ui, ingressChain[0], 'ingress', { protocol: 'HTTPS' });
    } else if (CoreServices.length > 0) {
      const matchSvc = CoreServices.find(s => s.capability === ui.capability) || CoreServices[0];
      addFlow(ui, matchSvc, 'ingress', { protocol: 'HTTPS' });
    }
  }

  for (let i = 0; i < ingressChain.length - 1; i++) {
    addFlow(ingressChain[i], ingressChain[i + 1], 'ingress', { protocol: 'HTTPS' });
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: SERVICE ROUTING (Gateway → Services)
  // ═══════════════════════════════════════════════════════════════

  const ingressExit = ingressChain.length > 0 ? ingressChain[ingressChain.length - 1] : null;

  if (ingressExit) {
    // Route ALL core services from gateway — gateway is the single entry point
    for (const svc of CoreServices) {
      addFlow(ingressExit, svc, 'service-routing', { protocol: svc.protocol || 'HTTPS' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: DATA ACCESS (Service → Cache → DB)
  // ═══════════════════════════════════════════════════════════════


  // ★ DW GUARD — Data warehouses may ONLY be written by workers/ETL processors ★
  // Enforces: Service→Kafka→Worker→DW. Direct service→DW writes are forbidden.
  function isDataWarehouse(comp) {
    if (!comp || comp.type !== 'database') return false;
    const name = (comp.name || '').toLowerCase();
    const desc = (comp.description || '').toLowerCase();
    return name.includes('warehouse') || name.includes('clickhouse') ||
           name.includes('bigquery') || name.includes('redshift') ||
           name.includes('snowflake') || desc.includes('kafka-etl-only') ||
           desc.includes('dwsourcecontract') || (comp.dwSourceContract === 'kafka-etl-only');
  }

  // Separate OLTP databases from OLAP data warehouses
  const OLTPDBs = DBs.filter(db => !isDataWarehouse(db));
  // OLAPDBs (warehouses) are written exclusively by workers via analytics-flow pipeline

  let fallbackDBUsed = false;
  for (const svc of CoreServices) {
    if (Caches.length > 0) {
      const matchCache = Caches.find(c => c.capability === svc.capability) || Caches[0];
      addFlow(svc, matchCache, 'data-access', { protocol: 'TCP', label: 'Cache Lookup' });
    }

    // Only connect to OLTP databases — NEVER to data warehouses directly
    const matchDBs = OLTPDBs.filter(db => db.capability === svc.capability);
    if (matchDBs.length > 0) {
      for (const db of matchDBs) {
        addFlow(svc, db, 'data-access', { protocol: db.protocol || 'TCP/SQL' });
      }
    } else if (OLTPDBs.length > 0 && !fallbackDBUsed) {
      // Only connect ONE service to fallback DB to avoid shared-database anti-pattern.
      // The invariants engine will inject dedicated DBs for other services if needed.
      const generalDB = OLTPDBs.find(db => !db.capability || db.capability === 'persistence' || db.capability === 'persistent-storage') || OLTPDBs[0];
      if (generalDB) {
        addFlow(svc, generalDB, 'data-access', { protocol: generalDB.protocol || 'TCP/SQL' });
        fallbackDBUsed = true;
      }
    }
    // ✅ Data warehouses are intentionally SKIPPED here — workers handle DW writes
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: ASYNC PROCESSING (Service → Queue → Worker → DB)
  // ═══════════════════════════════════════════════════════════════

  if (Queues.length > 0) {
    // Every core service publishes to its matching queue (async decoupling)
    for (const svc of CoreServices) {
      const matchQueue = Queues.find(q => q.capability === svc.capability) || Queues[0];
      addFlow(svc, matchQueue, 'async-pipeline', { type: 'event', protocol: matchQueue.protocol || 'AMQP', label: 'Publishes' });
    }

    for (const q of Queues) {
      for (const w of Workers) {
        addFlow(q, w, 'async-pipeline', { type: 'async', protocol: q.protocol || 'AMQP', label: 'Consumes' });
      }
    }
  }

  // DLQ routing
  for (const dlq of DLQs) {
    for (const q of Queues) {
      addFlow(q, dlq, 'async-pipeline', { type: 'event', protocol: 'AMQP', label: 'Failed Messages' });
    }
  }

  // Worker → DB
  for (const w of Workers) {
    if (DBs.length > 0) {
      const matchDB = DBs.find(db => db.capability === w.capability) || DBs[DBs.length - 1];
      addFlow(w, matchDB, 'async-pipeline', { type: 'async', protocol: matchDB.protocol || 'TCP/SQL', label: 'Batch Writes' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: EXTERNAL INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  for (const ext of Externals) {
    const matchSvc = CoreServices.find(s => s.capability === ext.capability);
    if (matchSvc) {
      if (CircuitBreakers.length > 0) {
        addFlow(matchSvc, CircuitBreakers[0], 'external-integration', { protocol: 'HTTPS', label: 'Guards' });
        addFlow(CircuitBreakers[0], ext, 'external-integration', { protocol: ext.protocol || 'HTTPS', label: 'Calls' });
      } else {
        addFlow(matchSvc, ext, 'external-integration', { protocol: ext.protocol || 'HTTPS' });
      }
    } else if (CoreServices.length > 0) {
      addFlow(CoreServices[0], ext, 'external-integration', { protocol: ext.protocol || 'HTTPS' });
    } else if (AllGateways.length > 0) {
      addFlow(AllGateways[0], ext, 'external-integration', { protocol: ext.protocol || 'HTTPS' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: INTER-SERVICE COMMUNICATION
  // ═══════════════════════════════════════════════════════════════

  if (CoreServices.length > 1) {
    const capRelations = [
      ['authentication', 'admin-panel'], ['authentication', 'admin-dashboard'],
      ['authentication', 'session-management'], ['authentication', 'compliance'],
      ['payment-processing', 'e-commerce'], ['payment-processing', 'order-management'],
      ['order-management', 'inventory-management'], ['order-management', 'catalog-management'],
      ['e-commerce', 'catalog-management'], ['e-commerce', 'inventory-management'],
      ['e-commerce', 'recommendation-system'],
      ['content-ingestion', 'content-distribution'], ['content-distribution', 'search-indexing'],
      ['content-distribution', 'recommendation-system'],
      ['content-management', 'content-distribution'], ['content-management', 'search-indexing'],
      ['ml-pipeline', 'content-distribution'], ['ml-pipeline', 'search-indexing'],
      ['ml-pipeline', 'recommendation-system'], ['recommendation-system', 'content-distribution'],
      ['nlp-processing', 'content-management'], ['nlp-processing', 'search-indexing'],
      ['real-time-streaming', 'bidirectional-messaging'],
      ['push-notification', 'bidirectional-messaging'], ['push-notification', 'scheduling'],
      ['scheduling', 'push-notification'], ['scheduling', 'async-processing'],
      ['geolocation', 'push-notification'], ['geolocation', 'scheduling'],
      ['analytics', 'monitoring'], ['audit-logging', 'compliance'],
      ['audit-logging', 'analytics'], ['presence-tracking', 'bidirectional-messaging'],
    ];

    for (const [capA, capB] of capRelations) {
      const svcA = CoreServices.find(s => s.capability === capA);
      const svcB = CoreServices.find(s => s.capability === capB);
      if (svcA && svcB) {
        addFlow(svcA, svcB, 'inter-service');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: SAGA ORCHESTRATION (distributed transactions)
  // Order → Saga → Payment → Saga → Inventory (compensating)
  // ═══════════════════════════════════════════════════════════════

  const SagaOrchestrators = flatComps.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes('saga') || name.includes('orchestrator') || name.includes('temporal') || name.includes('step function');
  });

  if (SagaOrchestrators.length > 0) {
    const saga = SagaOrchestrators[0];
    const orderSvc = CoreServices.find(s => (s.capability || '') === 'order-management' || (s.capability || '') === 'e-commerce');
    const paymentSvc = CoreServices.find(s => (s.capability || '') === 'payment-processing');
    const inventorySvc = CoreServices.find(s => (s.capability || '') === 'inventory-management');

    if (orderSvc) {
      addFlow(orderSvc, saga, 'inter-service', {
        protocol: 'HTTPS', label: 'Initiates Saga',
        reason: `${orderSvc.name} triggers a distributed transaction via ${saga.name} — orchestrates Order → Payment → Inventory as an atomic business workflow with compensation on failure`
      });
    }
    if (paymentSvc) {
      addFlow(saga, paymentSvc, 'inter-service', {
        protocol: 'HTTPS', label: 'Saga Step: Pay',
        reason: `${saga.name} invokes ${paymentSvc.name} as step 2 of the distributed transaction — if payment fails, previous steps are compensated (rolled back)`
      });
    }
    if (inventorySvc) {
      addFlow(saga, inventorySvc, 'inter-service', {
        protocol: 'HTTPS', label: 'Saga Step: Reserve',
        reason: `${saga.name} invokes ${inventorySvc.name} for stock reservation — if reservation fails, payment is refunded via compensation workflow`
      });
    }
    // Wire saga to queue for event publishing on completion
    if (Queues.length > 0) {
      addFlow(saga, Queues[0], 'async-pipeline', {
        type: 'event', protocol: 'AMQP', label: 'Saga Complete',
        reason: `${saga.name} publishes saga completion events (success/failure) to ${Queues[0].name} for downstream consumers (notifications, analytics)`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: RATE LIMITER PROTECTION ARROWS
  // Shows which services the rate limiter actually protects
  // ═══════════════════════════════════════════════════════════════

  for (const rl of RateLimiters) {
    // ★ MINIMALITY: Rate limiter protects gateway only ★
    if (primaryGateway) {
      addFlow(rl, primaryGateway, 'infra-wiring', {
        protocol: 'HTTPS', label: 'Protects',
        reason: `${rl.name} enforces per-client rate limits at ${primaryGateway.name} level`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: SECRETS MANAGER WIRING
  // Services → Vault for credential retrieval
  // ═══════════════════════════════════════════════════════════════

  const SecretsManagers = flatComps.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes('vault') || name.includes('secrets') || name.includes('kms');
  });

  if (SecretsManagers.length > 0) {
    const vault = SecretsManagers[0];
    const sensitiveServices = CoreServices.filter(s => {
      const cap = (s.capability || '').toLowerCase();
      return cap === 'payment-processing' || cap === 'authentication' || cap === 'e-commerce' || cap === 'order-management';
    });
    // If no sensitive services found, wire top 2 services
    const toWire = sensitiveServices.length > 0 ? sensitiveServices : CoreServices.slice(0, 2);
    for (const svc of toWire) {
      addFlow(svc, vault, 'infra-wiring', {
        protocol: 'HTTPS', label: 'Fetches Secrets',
        reason: `${svc.name} retrieves database credentials, API keys, and encryption keys from ${vault.name} at startup and on rotation events — never stores secrets in config files or environment variables`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: CDN → ORIGIN (fetch dynamic content)
  // ═══════════════════════════════════════════════════════════════

  for (const cdn of CDNs) {
    // CDN fetches from gateway or first service on cache miss
    const origin = primaryGateway || CoreServices[0];
    if (origin) {
      addFlow(cdn, origin, 'ingress', {
        protocol: 'HTTPS', label: 'Origin Fetch',
        reason: `${cdn.name} fetches cacheable API responses from ${origin.name} on cache miss, then caches at edge for subsequent requests`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: SERVICE DISCOVERY LOOP (Registry ↔ Gateway)
  // Service → Consul (health check) | Consul → Gateway (routing update)
  // ═══════════════════════════════════════════════════════════════

  for (const reg of ServiceRegistries) {
    // ★ Consul → Gateway (routing update push) — completes the discovery loop ★
    if (primaryGateway) {
      addFlow(reg, primaryGateway, 'service-discovery-loop', {
        type: 'async', protocol: 'HTTPS', label: 'Routing Update',
        reason: `${reg.name} pushes service topology changes to ${primaryGateway.name} — enables dynamic request routing without gateway restart when services scale up/down or fail health checks`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: CACHE INVALIDATION (MANDATORY when cache + DB present)
  // DB write → Service (write-ack) → Cache (invalidate) → Service (confirm)
  // ═══════════════════════════════════════════════════════════════

  if (Caches.length > 0 && DBs.length > 0 && CoreServices.length > 0) {
    // Cache invalidation for top 2 write-path services
    for (const svc of CoreServices.slice(0, Math.min(2, CoreServices.length))) {
      const matchCache = Caches.find(c => c.capability === svc.capability) || Caches[0];
      const matchDB = DBs.find(db => db.capability === svc.capability) || DBs[0];

      addFlow(svc, matchCache, 'cache-invalidation', {
        protocol: 'TCP', label: 'Invalidate Key',
        reason: `${svc.name} invalidates stale cache entries in ${matchCache.name} after writing to ${matchDB.name}`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: STREAM vs BATCH PROCESSING SEPARATION
  // Kafka → Flink (real-time)  |  Kafka → Spark (batch)
  // ═══════════════════════════════════════════════════════════════

  const StreamProcessors = flatComps.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes('flink') || name.includes('stream process') || name.includes('kafka streams');
  });

  const BatchProcessors = flatComps.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes('spark') || name.includes('batch');
  });

  const DataWarehouses = flatComps.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
           name.includes('redshift') || name.includes('snowflake');
  });

  // Kafka → Flink (real-time stream processing)
  for (const sp of StreamProcessors) {
    for (const q of Queues) {
      addFlow(q, sp, 'stream-processing', {
        type: 'async', protocol: 'TCP/TLS', label: 'Stream Consume',
        reason: `${sp.name} consumes events from ${q.name} in real-time with exactly-once semantics for sub-second windowed aggregation and streaming ETL`
      });
    }
    // Flink → Data Warehouse
    for (const dw of DataWarehouses) {
      addFlow(sp, dw, 'stream-processing', {
        type: 'async', protocol: 'TCP/SQL', label: 'Stream Write',
        reason: `${sp.name} writes real-time aggregated results to ${dw.name} — materialized views update with sub-second latency`
      });
    }
  }

  // Kafka → Spark (batch processing — separate from stream)
  for (const bp of BatchProcessors) {
    for (const q of Queues) {
      addFlow(q, bp, 'batch-processing', {
        type: 'async', protocol: 'TCP/TLS', label: 'Batch Consume',
        reason: `${bp.name} reads historical event batches from ${q.name} on a scheduled cadence — batch ≠ stream, runs on cron, NOT event-triggered`
      });
    }
    // Spark → Data Warehouse
    for (const dw of DataWarehouses) {
      addFlow(bp, dw, 'batch-processing', {
        type: 'async', protocol: 'TCP/SQL', label: 'Batch Write',
        reason: `${bp.name} writes batch-processed aggregation results to ${dw.name} for historical reporting, ML feature computation, and dashboards`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: INFRASTRUCTURE WIRING
  // ═══════════════════════════════════════════════════════════════

  for (const reg of ServiceRegistries) {
    const reps = CoreServices.slice(0, REP_COUNT);
    for (const svc of reps) {
      addFlow(svc, reg, 'infra-wiring', { protocol: 'HTTPS', label: 'Registers' });
    }
    if (primaryGateway) addFlow(primaryGateway, reg, 'infra-wiring', { protocol: 'HTTPS', label: 'Discovers' });
  }

  for (const cfg of ConfigServers) {
    const reps = CoreServices.slice(0, REP_COUNT);
    for (const svc of reps) {
      addFlow(svc, cfg, 'infra-wiring', { protocol: 'HTTPS', label: 'Fetches Config' });
    }
    if (primaryGateway) addFlow(primaryGateway, cfg, 'infra-wiring', { protocol: 'HTTPS', label: 'Fetches Config' });
  }

  for (const mesh of ServiceMeshes) {
    const reps = CoreServices.slice(0, REP_COUNT);
    for (const svc of reps) {
      addFlow(mesh, svc, 'infra-wiring', { protocol: 'gRPC', label: 'Sidecar Proxy' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: OBSERVABILITY
  // ═══════════════════════════════════════════════════════════════

  if (Observability.length > 0) {
    const representativeServices = CoreServices.slice(0, REP_COUNT);

    for (const observer of Observability) {
      // Use correct protocol: Prometheus uses HTTP scrape, OTLP can use gRPC or HTTP
      const obsName = (observer.name || '').toLowerCase();
      const obsProto = 'HTTPS'; // OTLP/HTTP — standard for production observability
      for (const svc of representativeServices) {
        addFlow(svc, observer, 'observability', { type: 'async', protocol: obsProto, label: 'Sends Telemetry' });
      }
      if (primaryGateway) {
        addFlow(primaryGateway, observer, 'observability', { type: 'async', protocol: obsProto, label: 'Sends Telemetry' });
      }
    }

    // Inter-observability correlation
    if (Observability.length > 1) {
      const tracers = Observability.filter(o => { const n = (o.name || '').toLowerCase(); return n.includes('jaeger') || n.includes('zipkin') || n.includes('trace'); });
      const loggers = Observability.filter(o => { const n = (o.name || '').toLowerCase(); return n.includes('loki') || n.includes('log') || n.includes('fluentd') || n.includes('logstash'); });
      const metricsCollectors = Observability.filter(o => { const n = (o.name || '').toLowerCase(); return n.includes('prometheus') || n.includes('collector') || n.includes('monitor') || n.includes('observability'); });

      for (const tracer of tracers) {
        for (const logger of loggers) addFlow(tracer, logger, 'observability', { type: 'async', protocol: 'HTTPS', label: 'Correlates' });
      }
      for (const mc of metricsCollectors) {
        for (const tracer of tracers) addFlow(mc, tracer, 'observability', { type: 'async', protocol: 'HTTPS', label: 'Drill-down' });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: FEEDBACK LOOPS (Response paths — v7 expansion)
  // ═══════════════════════════════════════════════════════════════

  // Cache → Service (cache-hit response)
  if (Caches.length > 0 && CoreServices.length > 0) {
    const primaryCache = Caches[0];
    const primarySvc = CoreServices[0];
    addFlow(primaryCache, primarySvc, 'feedback', {
      type: 'response', protocol: 'TCP', label: 'Cache Hit',
      reason: `${primaryCache.name} returns cached data to ${primarySvc.name} on cache hit, avoiding database round-trips and reducing p99 latency by 10-100x`
    });
  }

  // DB → Service (query response for top 2 services)
  if (DBs.length > 0 && CoreServices.length > 0) {
    for (const svc of CoreServices.slice(0, Math.min(2, CoreServices.length))) {
      const matchDB = DBs.find(db => db.capability === svc.capability) || DBs[0];
      addFlow(matchDB, svc, 'feedback', {
        type: 'response', protocol: matchDB.protocol || 'TCP/SQL', label: 'Query Result',
        reason: `${matchDB.name} returns query results to ${svc.name}`
      });
    }
  }

  // External → Service (webhook callbacks)
  for (const ext of Externals) {
    const matchSvc = CoreServices.find(s => s.capability === ext.capability);
    if (matchSvc) {
      addFlow(ext, matchSvc, 'feedback', {
        type: 'async', protocol: 'HTTPS', label: 'Webhook',
        reason: `${ext.name} sends async webhook callbacks to ${matchSvc.name} for event notification (e.g., payment confirmation, delivery status)`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ORPHAN PREVENTION
  // ═══════════════════════════════════════════════════════════════

  for (const comp of flatComps) {
    if (connectedNodes.has(comp.id)) continue;

    if (comp.type === 'ui') {
      const target = ingressChain[0] || primaryGateway || CoreServices[0];
      if (target) addFlow(comp, target, 'ingress', { protocol: 'HTTPS' });
    } else if (comp.type === 'service') {
      if (isObservability(comp)) {
        const obsName = (comp.name || '').toLowerCase();
        const obsProto = 'HTTPS'; // OTLP/HTTP standard
        const reps = CoreServices.slice(0, REP_COUNT);
        for (const svc of reps) addFlow(svc, comp, 'observability', { type: 'async', protocol: obsProto, label: 'Sends Telemetry' });
        if (primaryGateway) addFlow(primaryGateway, comp, 'observability', { type: 'async', protocol: obsProto, label: 'Sends Telemetry' });
      } else if (isInfraService(comp)) {
        const target = CoreServices[0];
        if (target) addFlow(comp, target, 'infra-wiring', { protocol: 'HTTPS' });
      } else {
        if (ingressExit) addFlow(ingressExit, comp, 'service-routing', { protocol: 'HTTPS' });
        if (DBs.length > 0) addFlow(comp, DBs[0], 'data-access', { protocol: 'TCP/SQL' });
        if (Caches.length > 0) addFlow(comp, Caches[0], 'data-access', { protocol: 'TCP', label: 'Cache Lookup' });
      }
    } else if (comp.type === 'database') {
      const source = CoreServices.find(s => s.capability === comp.capability) || CoreServices[0];
      if (source) addFlow(source, comp, 'data-access', { protocol: comp.protocol || 'TCP/SQL' });
    } else if (comp.type === 'cache') {
      const source = CoreServices[0] || AllGateways[0];
      if (source) addFlow(source, comp, 'data-access', { protocol: 'TCP', label: 'Cache Lookup' });
    } else if (comp.type === 'queue') {
      const source = CoreServices[0];
      if (source) addFlow(source, comp, 'async-pipeline', { type: 'event', protocol: comp.protocol || 'AMQP', label: 'Publishes' });
    } else if (comp.type === 'worker') {
      if (Queues.length > 0) {
        addFlow(Queues[0], comp, 'async-pipeline', { type: 'async', protocol: 'AMQP', label: 'Consumes' });
      } else if (CoreServices.length > 0) {
        addFlow(CoreServices[0], comp, 'async-pipeline', { type: 'async', label: 'Dispatches' });
      }
    } else if (comp.type === 'external') {
      const source = CoreServices[0] || AllGateways[0];
      if (source) addFlow(source, comp, 'external-integration', { protocol: comp.protocol || 'HTTPS' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIMARY PIPELINE IDENTIFICATION
  // Trace: UI → ... → Gateway → first Service → DB
  // ═══════════════════════════════════════════════════════════════

  const primaryUI = UIs[0];
  const primarySvc = CoreServices[0];
  const primaryDB = primarySvc ? (DBs.find(db => db.capability === primarySvc.capability) || DBs[0]) : DBs[0];

  if (primaryUI) primaryPipeline.push(primaryUI.id);
  for (const node of ingressChain) primaryPipeline.push(node.id);
  if (primarySvc && !primaryPipeline.includes(primarySvc.id)) primaryPipeline.push(primarySvc.id);
  if (primaryDB) primaryPipeline.push(primaryDB.id);

  // Mark flows on the primary pipeline
  const primaryPairs = new Set();
  for (let i = 0; i < primaryPipeline.length - 1; i++) {
    primaryPairs.add(`${primaryPipeline[i]}->${primaryPipeline[i + 1]}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SOFT OUTGOING EDGE LIMIT (target 5, not hard cap)
  // Production systems have 3-5 connections per node naturally
  // ═══════════════════════════════════════════════════════════════

  const MAX_OUTGOING = 5;
  const outgoingCount = {};
  const prunedFlows = [];

  // Sort: primary pipeline edges first, then by weight descending
  flows.sort((a, b) => {
    const aOnPrimary = primaryPairs.has(`${a.source}->${a.target}`) ? 0 : 1;
    const bOnPrimary = primaryPairs.has(`${b.source}->${b.target}`) ? 0 : 1;
    if (aOnPrimary !== bOnPrimary) return aOnPrimary - bOnPrimary;
    return (b.weight || 0) - (a.weight || 0);
  });

  for (const flow of flows) {
    if (!outgoingCount[flow.source]) outgoingCount[flow.source] = 0;
    
    if (outgoingCount[flow.source] < MAX_OUTGOING) {
      flow.isPrimary = primaryPairs.has(`${flow.source}->${flow.target}`);
      prunedFlows.push(flow);
      outgoingCount[flow.source]++;
    }
    // Silently drop excess — they're lowest weight
  }

  // Sort by lifecycle order, then assign step numbers
  const lifecycleOrder = ['request', 'event', 'async', 'response'];
  prunedFlows.sort((a, b) => {
    const idxA = lifecycleOrder.indexOf(a.type);
    const idxB = lifecycleOrder.indexOf(b.type);
    return idxA - idxB;
  });

  prunedFlows.forEach((flow, i) => { flow.step = i + 1; });

  const droppedEdgeCount = flows.length - prunedFlows.length;
  if (droppedEdgeCount > 0) {
    console.log(`\x1b[33m[FLOW ENGINE] Pruned ${droppedEdgeCount} edges exceeding max ${MAX_OUTGOING} outgoing per node\x1b[0m`);
  }

  return { flows: prunedFlows, primaryPipeline };
}

module.exports = { generateFlows };
