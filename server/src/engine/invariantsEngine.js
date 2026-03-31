/**
 * ============================================================================
 * ARCHFORGE — ARCHITECTURE INVARIANTS ENGINE v1 (SYSTEM DESIGN COMPILER)
 * ============================================================================
 *
 * This is the core "compiler" that transforms ArchForge from a diagram
 * generator into a system design verification engine.
 *
 * It enforces HARD INVARIANTS that every production system must satisfy.
 * When an invariant is violated, it auto-injects the missing component
 * or adjusts the architecture to comply.
 *
 * INVARIANT CATEGORIES:
 *   1. DATA OWNERSHIP     — DB-per-service, no shared databases
 *   2. DISTRIBUTED TXN    — Saga pattern for cross-service mutations
 *   3. SECURITY           — Secrets management, auth at gateway, mTLS
 *   4. CACHE DESIGN       — Invalidation strategy, TTL, write-through
 *   5. INGRESS            — CDN for frontends, API versioning
 *   6. ASYNC DECOUPLING   — Queue for heavy workloads, batch ≠ stream
 *   7. RESILIENCE         — Bulkhead, graceful degradation, idempotency
 *   8. OBSERVABILITY      — Health check feedback loops
 *   9. CQRS               — Separate read/write models for analytics
 *  10. DR/HA              — Multi-region strategy indication
 *
 * DESIGN:
 *   Each invariant has:
 *     - detect()  → boolean: does this system need this invariant?
 *     - check()   → boolean: is the invariant currently satisfied?
 *     - fix()     → injects missing components/edges/metadata
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const INVARIANTS = [

  // ──────────────────────────────────────────────────────────────
  // 1. DATABASE PER SERVICE — No shared databases across services
  // ──────────────────────────────────────────────────────────────
  {
    id: 'DB_PER_SERVICE',
    name: 'Database-per-Service Pattern',
    category: 'data-ownership',
    severity: 'critical',
    detect: (ctx) => {
      // Applies when there are 2+ core services
      return ctx.coreServices.length >= 2 && ctx.databases.length > 0;
    },
    check: (ctx) => {
      // Each core service that writes to a DB should own its own DB
      // Check: no two core services share the same database
      const dbUsers = {};
      for (const flow of ctx.flows) {
        const src = ctx.nodeMap.get(flow.source);
        const tgt = ctx.nodeMap.get(flow.target);
        if (src && tgt && src.type === 'service' && tgt.type === 'database' && !ctx.isInfra(src)) {
          if (!dbUsers[tgt.id]) dbUsers[tgt.id] = [];
          dbUsers[tgt.id].push(src.id);
        }
      }
      // Violation: any DB used by 2+ services
      for (const dbId in dbUsers) {
        if (dbUsers[dbId].length > 1) return false;
      }
      return true;
    },
    fix: (ctx) => {
      const injected = [];
      // Find services sharing databases and give each its own
      const dbUsers = {};
      for (const flow of ctx.flows) {
        const src = ctx.nodeMap.get(flow.source);
        const tgt = ctx.nodeMap.get(flow.target);
        if (src && tgt && src.type === 'service' && tgt.type === 'database' && !ctx.isInfra(src)) {
          if (!dbUsers[tgt.id]) dbUsers[tgt.id] = { db: tgt, services: [] };
          dbUsers[tgt.id].services.push(src);
        }
      }

      // Domain-specific DB name map — deterministic naming per capability
      const DOMAIN_DB_NAMES = {
        'order-management':    { name: 'Order DB',    tech: 'PostgreSQL' },
        'e-commerce':          { name: 'Order DB',    tech: 'PostgreSQL' },
        'payment-processing':  { name: 'Payment DB',  tech: 'PostgreSQL + PCI HSM' },
        'authentication':      { name: 'User DB',     tech: 'PostgreSQL' },
        'inventory-management':{ name: 'Inventory DB', tech: 'PostgreSQL' },
        'catalog-management':  { name: 'Catalog DB',  tech: 'PostgreSQL + Elasticsearch' },
        'bidirectional-messaging': { name: 'Chat DB', tech: 'Cassandra (wide-column)' },
        'analytics':           { name: 'Analytics DB', tech: 'ClickHouse (OLAP)' },
        'content-management':  { name: 'Content DB',  tech: 'PostgreSQL' },
        'geolocation':         { name: 'Location DB', tech: 'PostGIS / TimescaleDB' },
        'scheduling':          { name: 'Jobs DB',     tech: 'PostgreSQL' }
      };

      for (const dbId in dbUsers) {
        const { db, services } = dbUsers[dbId];
        if (services.length <= 1) continue;

        // First service keeps the original DB, others get dedicated ones
        for (let i = 1; i < services.length; i++) {
          const svc = services[i];
          const domainMeta = DOMAIN_DB_NAMES[svc.capability] || null;
          const newDbId = `${svc.capability || svc.id}-db`;
          const newDb = {
            id: newDbId,
            name: domainMeta ? domainMeta.name : `${svc.name.replace(/ Service$/i, '').trim()} DB`,
            type: 'database',
            layer: 'data',
            capability: svc.capability || 'persistent-storage',
            tech: domainMeta ? domainMeta.tech : (db.tech || 'PostgreSQL'),
            description: `Dedicated DB for ${svc.name} — strict DB-per-service pattern enforcing bounded context isolation. No other service may access this store directly.`,
            priority: 'high'
          };
          injected.push({
            type: 'ADD_COMPONENT',
            component: newDb,
            reason: `DB-per-service: ${svc.name} must own its data store (${newDb.name}) independently from ${services[0].name}`
          });
          injected.push({
            type: 'REWIRE_FLOW',
            oldTarget: dbId,
            newTarget: newDbId,
            serviceId: svc.id,
            reason: `Rewired ${svc.name} from shared ${db.name} to dedicated ${newDb.name}`
          });
        }
      }
      return injected;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 2. SAGA PATTERN — Distributed transactions need orchestration
  // ──────────────────────────────────────────────────────────────
  {
    id: 'SAGA_PATTERN',
    name: 'Saga Pattern for Distributed Transactions',
    category: 'distributed-transactions',
    severity: 'critical',
    detect: (ctx) => {
      // Needed when: e-commerce + payment, or order + inventory + payment
      return ctx.capSet.has('e-commerce') || ctx.capSet.has('payment-processing') ||
             (ctx.capSet.has('order-management') && ctx.capSet.has('inventory-management'));
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('saga') || name.includes('orchestrator') || name.includes('temporal') || name.includes('step function');
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'saga-orchestrator',
        name: 'Saga Orchestrator',
        type: 'service',
        layer: 'processing',
        capability: 'order-management',
        tech: 'Temporal / AWS Step Functions',
        description: 'Coordinates distributed transactions across Order → Payment → Inventory with compensation workflows for partial failure rollback',
        priority: 'high'
      },
      reason: 'Distributed transactions (Order + Payment + Inventory) require saga orchestration to prevent data corruption on partial failures'
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 3. SECRETS MANAGEMENT — No credentials in config/env
  // ──────────────────────────────────────────────────────────────
  {
    id: 'SECRETS_MANAGEMENT',
    name: 'Centralized Secrets Management',
    category: 'security',
    severity: 'critical',
    detect: (ctx) => {
      // Tier 1: Required for any system with sensitive credentials or ≥3 services
      return ctx.coreServices.length >= 3 || ctx.capSet.has('payment-processing') || ctx.capSet.has('authentication');
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('vault') || name.includes('secrets') || name.includes('kms') || name.includes('key management');
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'secrets-manager',
        name: 'Secrets Manager (Vault)',
        type: 'external',
        layer: 'integration',
        capability: 'security',
        tech: 'HashiCorp Vault / AWS Secrets Manager',
        description: 'Centralized secrets rotation, dynamic database credentials, encryption key management, and certificate lifecycle — replaces config-stored secrets',
        priority: 'high'
      },
      reason: 'Storing credentials in config servers or environment variables is a critical security anti-pattern. Vault provides dynamic secrets with automatic rotation.'
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 4. AUTH AT GATEWAY — JWT validation at edge, not per-service
  // ──────────────────────────────────────────────────────────────
  {
    id: 'AUTH_AT_GATEWAY',
    name: 'Authentication at API Gateway (Edge Auth)',
    category: 'security',
    severity: 'high',
    detect: (ctx) => {
      return ctx.capSet.has('authentication') && ctx.allComps.some(c => {
        const cap = (c.capability || '').toLowerCase();
        return cap === 'api-gateway';
      });
    },
    check: (ctx) => {
      // Auth must be wired FROM gateway → auth service (not from deep services)
      const gateway = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'api-gateway');
      if (!gateway) return true;
      // Check: gateway has authMiddleware annotation OR gateway→auth flow exists
      if (gateway.authMiddleware) return true;
      const authService = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'authentication' && c.type === 'service');
      if (!authService) return true;
      return ctx.flows.some(f => f.source === gateway.id && f.target === authService.id);
    },
    fix: (ctx) => {
      const fixes = [];
      const gateway = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'api-gateway');
      const authService = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'authentication' && c.type === 'service');

      if (gateway) {
        // 1. Annotate gateway as the auth enforcement point
        fixes.push({
          type: 'ENRICH_COMPONENT',
          componentId: gateway.id,
          updates: {
            authMiddleware: true,
            description: `${
              (gateway.description || 'API Gateway')
            }. JWT middleware validates Bearer tokens on every inbound request before routing to backend services — services trust the gateway and receive pre-authenticated user context via X-User-Id headers.`
          },
          reason: 'Auth must happen at the gateway edge as a middleware, not inside individual services. Services should trust the gateway and receive pre-authenticated context.'
        });

        // 2. Wire gateway → auth service for token validation
        if (authService) {
          fixes.push({
            type: 'ADD_FLOW',
            flow: {
              source: gateway.id,
              target: authService.id,
              type: 'request',
              label: 'JWT Validate [HTTPS]',
              protocol: 'HTTPS',
              pipelineId: 'auth-flow',
              weight: 6,
              reason: `${gateway.name} validates JWT tokens via ${authService.name} middleware on every request — auth is enforced at the edge. Downstream services receive trusted X-User-Id and X-Roles headers.`
            },
            reason: 'Gateway must validate auth before forwarding — services must never re-validate tokens independently'
          });
        }
      }
      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 5. CDN FOR FRONTENDS — Static assets must be edge-cached
  // ──────────────────────────────────────────────────────────────
  {
    id: 'CDN_FOR_FRONTEND',
    name: 'CDN Layer for Frontend Delivery',
    category: 'ingress',
    severity: 'high',
    detect: (ctx) => {
      // Tier 1: Any system with a UI needs CDN for static asset delivery
      return ctx.allComps.some(c => c.type === 'ui');
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        const cap = (c.capability || '').toLowerCase();
        return name.includes('cdn') || cap === 'cdn-delivery';
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'cdn-edge-network',
        name: 'CDN Edge Network',
        type: 'service',
        layer: 'interaction',
        capability: 'cdn-delivery',
        tech: 'CloudFront / Fastly / Akamai',
        description: 'Global edge cache serving static assets (JS, CSS, images) with sub-50ms latency worldwide — prevents origin server overload',
        priority: 'high'
      },
      reason: 'Frontend UIs without CDN hit origin servers directly. Static assets must be edge-cached for global performance and origin offload.'
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 6. CACHE INVALIDATION — Cache must have explicit strategy flows
  // ──────────────────────────────────────────────────────────────
  {
    id: 'CACHE_INVALIDATION',
    name: 'Cache Invalidation Strategy (Cache-Aside + Write-Through + TTL+PubSub)',
    category: 'caching',
    severity: 'high',
    detect: (ctx) => {
      return ctx.allComps.some(c => c.type === 'cache');
    },
    check: (ctx) => {
      // Check if cache has description mentioning all three patterns
      const caches = ctx.allComps.filter(c => c.type === 'cache');
      return caches.every(c => {
        const desc = (c.description || '').toLowerCase();
        return (desc.includes('cache-aside') || desc.includes('cache aside')) &&
               (desc.includes('write-through') || desc.includes('write through')) &&
               desc.includes('ttl');
      });
    },
    fix: (ctx) => {
      const fixes = [];
      const caches = ctx.allComps.filter(c => c.type === 'cache');
      const coreServices = ctx.coreServices;

      for (const cache of caches) {
        // 1. Enrich cache description with full strategy
        fixes.push({
          type: 'ENRICH_COMPONENT',
          componentId: cache.id,
          updates: {
            cacheStrategy: 'cache-aside+write-through+ttl+pubsub',
            description: `${
              (cache.description || 'In-memory cache')
            }. Cache-aside pattern: services check cache before DB on reads. Write-through: all DB mutations also update cache atomically. TTL: per-key expiry (seconds for session, minutes for catalog). Pub/Sub invalidation: write events broadcast key invalidation to all cache replicas for cross-instance consistency.`
          },
          reason: 'Cache must explicitly document cache-aside read, write-through update, TTL expiry, and pub/sub invalidation strategy.'
        });

        // 2. Inject explicit cache-aside READ flow: Service→Cache (read before DB)
        const matchService = coreServices.find(s => s.capability === cache.capability) || coreServices[0];
        if (matchService) {
          fixes.push({
            type: 'ADD_FLOW',
            flow: {
              source: matchService.id,
              target: cache.id,
              type: 'request',
              label: 'Cache-Aside Read',
              protocol: 'TCP',
              pipelineId: 'cache-strategy',
              weight: 5,
              reason: `${matchService.name} checks ${cache.name} before querying DB (cache-aside pattern) — sub-millisecond response on hit, DB fallback on miss`
            },
            reason: 'Cache-aside read flow: service checks cache before hitting primary DB'
          });

          // 3. Inject INVALIDATION flow: Service→Cache (after DB write)
          fixes.push({
            type: 'ADD_FLOW',
            flow: {
              source: matchService.id,
              target: cache.id,
              type: 'event',
              label: 'Invalidate + TTL Reset',
              protocol: 'TCP',
              pipelineId: 'cache-strategy',
              weight: 4,
              reason: `${matchService.name} publishes cache invalidation events to ${cache.name} after any DB write — ensures stale data is evicted and TTL is reset via pub/sub broadcast`
            },
            reason: 'Write-through invalidation: after every DB write, cache keys are invalidated via pub/sub to prevent stale reads'
          });
        }
      }
      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 7. CQRS FOR ANALYTICS — Separate read/write models
  // ──────────────────────────────────────────────────────────────
  {
    id: 'CQRS_ANALYTICS',
    name: 'CQRS: Separate Read Model for Analytics',
    category: 'data',
    severity: 'high',
    detect: (ctx) => {
      return ctx.capSet.has('analytics') && ctx.databases.length > 0;
    },
    check: (ctx) => {
      // Analytics should read from its own data warehouse, not the OLTP database
      const hasWarehouse = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') || name.includes('redshift') || name.includes('snowflake');
      });
      return hasWarehouse;
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'analytics-read-store',
        name: 'Analytics Data Warehouse',
        type: 'database',
        layer: 'data',
        capability: 'analytics',
        tech: 'ClickHouse / BigQuery / Snowflake',
        description: 'CQRS read model — OLAP-optimized columnar store consuming events from Kafka/CDC, isolated from OLTP write path to prevent read-write contention',
        priority: 'high'
      },
      reason: 'Analytics reading from OLTP databases causes lock contention and degrades write performance. CQRS separates read (OLAP) from write (OLTP) models.'
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 8. HEALTH CHECK FEEDBACK — Registry ↔ Service heartbeats
  // ──────────────────────────────────────────────────────────────
  {
    id: 'HEALTH_CHECK_LOOP',
    name: 'Health Check Feedback Loop',
    category: 'observability',
    severity: 'medium',
    detect: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('registry') || name.includes('consul');
      });
    },
    check: (ctx) => {
      const registry = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('registry') || (c.name || '').toLowerCase().includes('consul'));
      if (!registry) return true;
      // Check: at least one service has a RETURN flow from registry
      return ctx.flows.some(f => f.source === registry.id);
    },
    fix: (ctx) => {
      const registry = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('registry'));
      if (!registry) return [];
      const topService = ctx.coreServices[0];
      if (!topService) return [];
      return [{
        type: 'ADD_FLOW',
        flow: {
          source: registry.id, target: topService.id,
          type: 'response', label: 'Health Status [HTTPS]', protocol: 'HTTPS',
          reason: `${registry.name} pushes health status updates to ${topService.name} for self-healing routing decisions`,
          pipelineId: 'feedback', weight: 3
        },
        reason: 'Service registry without return health check arrows means self-healing routing cannot work'
      }];
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 9. IDEMPOTENCY — Payment/Order mutations need replay protection
  // ──────────────────────────────────────────────────────────────
  {
    id: 'IDEMPOTENCY',
    name: 'Idempotency Keys for Mutations',
    category: 'resilience',
    severity: 'high',
    detect: (ctx) => {
      return ctx.capSet.has('payment-processing') || ctx.capSet.has('order-management') || ctx.capSet.has('e-commerce');
    },
    check: (ctx) => {
      // Check if any payment/order service mentions idempotency
      const mutationServices = ctx.allComps.filter(c => {
        const cap = (c.capability || '').toLowerCase();
        return cap === 'payment-processing' || cap === 'order-management' || cap === 'e-commerce';
      });
      return mutationServices.some(s => {
        const desc = (s.description || '').toLowerCase();
        return desc.includes('idempoten');
      });
    },
    fix: (ctx) => {
      const fixes = [];
      const mutationServices = ctx.allComps.filter(c => {
        const cap = (c.capability || '').toLowerCase();
        return (cap === 'payment-processing' || cap === 'order-management' || cap === 'e-commerce') && c.type === 'service';
      });
      for (const svc of mutationServices) {
        const desc = svc.description || '';
        if (!desc.toLowerCase().includes('idempoten')) {
          fixes.push({
            type: 'ENRICH_COMPONENT',
            componentId: svc.id,
            updates: {
              description: `${desc}. Enforces idempotency keys on all mutating operations to prevent duplicate processing on retries and network failures.`
            },
            reason: `${svc.name} processes financial/order mutations without idempotency protection — retries can cause duplicate charges or orders`
          });
        }
      }
      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 10. BATCH ≠ STREAM — Separate processing pipelines
  // ──────────────────────────────────────────────────────────────
  {
    id: 'BATCH_STREAM_SEPARATION',
    name: 'Batch vs Stream Processing Separation',
    category: 'data',
    severity: 'high',
    detect: (ctx) => {
      return ctx.capSet.has('analytics') && (ctx.capSet.has('real-time-streaming') || ctx.capSet.has('event-streaming'));
    },
    check: (ctx) => {
      // Check: system has BOTH a stream processor AND a batch processor (not conflated)
      const hasStream = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('flink') || name.includes('stream process');
      });
      const hasBatch = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('spark') || name.includes('batch');
      });
      // If both exist, they should be separate components (not one "async-processing" blob)
      if (hasStream && hasBatch) {
        const streamComp = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('flink') || (c.name || '').toLowerCase().includes('stream process'));
        const batchComp = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('spark') || (c.name || '').toLowerCase().includes('batch'));
        return streamComp && batchComp && streamComp.id !== batchComp.id;
      }
      return hasStream || hasBatch; // having at least one is partial compliance
    },
    fix: (ctx) => {
      const fixes = [];
      const hasStream = ctx.allComps.some(c => (c.name || '').toLowerCase().includes('flink') || (c.name || '').toLowerCase().includes('stream process'));
      const hasBatch = ctx.allComps.some(c => (c.name || '').toLowerCase().includes('spark') || (c.name || '').toLowerCase().includes('batch'));

      if (!hasStream) {
        fixes.push({
          type: 'ADD_COMPONENT',
          component: {
            id: 'stream-processor-flink',
            name: 'Stream Processor (Flink)',
            type: 'service',
            layer: 'processing',
            capability: 'real-time-streaming',
            tech: 'Apache Flink / Kafka Streams',
            description: 'Real-time stream processing with exactly-once semantics — consumes from Kafka for sub-second event transformation and aggregation',
            priority: 'high'
          },
          reason: 'Real-time analytics requires a dedicated stream processor. Batch processors (Spark) cannot handle sub-second latency requirements.'
        });
      }
      if (!hasBatch) {
        fixes.push({
          type: 'ADD_COMPONENT',
          component: {
            id: 'batch-processor-spark',
            name: 'Batch Processor (Spark)',
            type: 'worker',
            layer: 'processing',
            capability: 'async-processing',
            tech: 'Apache Spark / dbt',
            description: 'Scheduled batch processing for historical data aggregation, ML feature computation, and reporting — runs on a cron schedule, NOT triggered by events',
            priority: 'medium'
          },
          reason: 'Batch analytics (daily reports, ML training) must NOT share a pipeline with real-time streaming. Separate concerns.'
        });
      }

      // Fix conflated batch/stream components
      const conflated = ctx.allComps.filter(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('batch') && (c.capability || '').toLowerCase() === 'async-processing' && c.type === 'worker';
      });
      for (const comp of conflated) {
        fixes.push({
          type: 'ENRICH_COMPONENT',
          componentId: comp.id,
          updates: {
            description: `${comp.description || ''}. BATCH ONLY — runs on scheduled intervals (cron), NOT event-driven. Reads from data lake/warehouse for historical processing. Separate from real-time stream processing.`,
            capability: 'async-processing'
          },
          reason: `${comp.name} was labeled as generic "async-processing" but batch ≠ async. Clarified as batch-scheduled workload.`
        });
      }

      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 11. mTLS / ZERO TRUST — Service mesh must enforce policies
  // ──────────────────────────────────────────────────────────────
  {
    id: 'MTLS_ZERO_TRUST',
    name: 'mTLS and Zero Trust Enforcement',
    category: 'security',
    severity: 'medium',
    detect: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('mesh') || name.includes('istio') || name.includes('linkerd');
      });
    },
    check: (ctx) => {
      const mesh = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('mesh') || (c.name || '').toLowerCase().includes('istio'));
      if (!mesh) return true;
      const desc = (mesh.description || '').toLowerCase();
      return desc.includes('mtls') || desc.includes('zero trust') || desc.includes('mutual tls');
    },
    fix: (ctx) => {
      const mesh = ctx.allComps.find(c => (c.name || '').toLowerCase().includes('mesh') || (c.name || '').toLowerCase().includes('istio'));
      if (!mesh) return [];
      return [{
        type: 'ENRICH_COMPONENT',
        componentId: mesh.id,
        updates: {
          description: `${mesh.description || 'Service mesh control plane'}. Enforces mTLS between all services (zero-trust networking), traffic policies (canary, blue-green), per-service RBAC authorization, and automatic certificate rotation via Citadel/cert-manager.`
        },
        reason: 'Service mesh without explicit mTLS/zero-trust policies is decorative. Must enforce encryption, authorization, and traffic policies.'
      }];
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 12. API VERSIONING — Gateway must support version routing
  // ──────────────────────────────────────────────────────────────
  {
    id: 'API_VERSIONING',
    name: 'API Versioning Strategy',
    category: 'ingress',
    severity: 'medium',
    detect: (ctx) => {
      return ctx.allComps.some(c => (c.capability || '').toLowerCase() === 'api-gateway');
    },
    check: (ctx) => {
      const gateway = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'api-gateway');
      if (!gateway) return true;
      const desc = (gateway.description || '').toLowerCase();
      return desc.includes('version') || desc.includes('v1/v2');
    },
    fix: (ctx) => {
      const gateway = ctx.allComps.find(c => (c.capability || '').toLowerCase() === 'api-gateway');
      if (!gateway) return [];
      return [{
        type: 'ENRICH_COMPONENT',
        componentId: gateway.id,
        updates: {
          description: `${gateway.description || 'API Gateway'}. Supports URL-prefix API versioning (/v1/, /v2/) with backward compatibility routing, allowing gradual consumer migration without breaking existing clients.`,
          apiVersions: ['v1', 'v2'],
          versioningStrategy: 'url-prefix'
        },
        reason: 'API Gateway without versioning strategy means breaking changes affect all consumers simultaneously. Added /v1, /v2 URL-prefix versioning with backward compatibility routing.'
      }];
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 13. GRACEFUL DEGRADATION — Fallback paths for downstream failures
  // ──────────────────────────────────────────────────────────────
  {
    id: 'GRACEFUL_DEGRADATION',
    name: 'Graceful Degradation Modeling',
    category: 'resilience',
    severity: 'medium',
    detect: (ctx) => {
      return ctx.coreServices.length >= 3 && ctx.allComps.some(c => c.type === 'external');
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        const cap = (c.capability || '').toLowerCase();
        return name.includes('circuit') || cap === 'circuit-breaker';
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'circuit-breaker-resilience',
        name: 'Circuit Breaker + Fallback',
        type: 'service',
        layer: 'processing',
        capability: 'circuit-breaker',
        tech: 'Resilience4j / Envoy',
        description: 'Wraps external dependency calls with circuit breaker (open after 5 failures), bulkhead isolation (separate thread pools per service), and fallback responses for graceful degradation during downstream outages.',
        priority: 'high'
      },
      reason: 'No graceful degradation path exists. When external services fail, the system fails completely instead of returning cached/default responses.'
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 14. DATA WAREHOUSE SOURCING — Service→Kafka→Worker→DW only
  //     Direct service→DW writes are FORBIDDEN
  // ──────────────────────────────────────────────────────────────
  {
    id: 'DW_FROM_KAFKA',
    name: 'Data Warehouse Must Consume via Kafka → ETL Worker (Never Direct)',
    category: 'data',
    severity: 'critical',
    detect: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
               name.includes('redshift') || name.includes('snowflake');
      });
    },
    check: (ctx) => {
      const dw = ctx.allComps.find(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
               name.includes('redshift') || name.includes('snowflake');
      });
      if (!dw) return true;
      // VIOLATION: any core service writes directly to DW
      const directWrites = ctx.flows.filter(f => {
        const src = ctx.nodeMap.get(f.source);
        return src && src.type === 'service' && !ctx.isInfra(src) && f.target === dw.id;
      });
      return directWrites.length === 0;
    },
    fix: (ctx) => {
      const fixes = [];
      const dw = ctx.allComps.find(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
               name.includes('redshift') || name.includes('snowflake');
      });
      if (!dw) return [];

      // 1. Remove all direct service→DW flows
      const directWriteSources = ctx.flows
        .filter(f => {
          const src = ctx.nodeMap.get(f.source);
          return src && src.type === 'service' && !ctx.isInfra(src) && f.target === dw.id;
        })
        .map(f => f.source);

      for (const srcId of directWriteSources) {
        fixes.push({
          type: 'REMOVE_FLOW',
          sourceId: srcId,
          targetId: dw.id,
          reason: `Direct service→DW write is an architectural violation. Data must flow: Service→Kafka→ETL Worker→DW`
        });
      }

      // 2. Check if ETL worker already exists for DW
      const etlWorkerExists = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return (c.type === 'worker' || name.includes('etl') || name.includes('flink') || name.includes('spark')) &&
               ctx.flows.some(f => f.source === c.id && f.target === dw.id);
      });

      if (!etlWorkerExists) {
        // 3. Inject ETL Analytics Worker if missing
        fixes.push({
          type: 'ADD_COMPONENT',
          component: {
            id: 'analytics-etl-worker',
            name: 'Analytics ETL Worker',
            type: 'worker',
            layer: 'processing',
            capability: 'analytics',
            tech: 'Apache Flink / Kafka Streams',
            description: `ETL worker consuming events from Kafka — transforms, aggregates, and loads data into ${dw.name} on a micro-batch schedule. ONLY component that may write to the data warehouse. Enforces: Service→Kafka→Worker→DW pipeline.`,
            priority: 'high'
          },
          reason: 'Data warehouse needs a dedicated ETL worker to consume from Kafka and write to the DW. Direct service writes are forbidden.'
        });

        // 4. Wire ETL Worker → DW
        fixes.push({
          type: 'ADD_FLOW',
          flow: {
            source: 'analytics-etl-worker',
            target: dw.id,
            type: 'async',
            label: 'ETL Load [TCP/SQL]',
            protocol: 'TCP/SQL',
            pipelineId: 'analytics-flow',
            weight: 4,
            reason: `Analytics ETL Worker transforms and loads Kafka event streams into ${dw.name} — only legitimate DW writer. Pipeline: Service→Kafka→ETL Worker→DW`
          },
          reason: 'ETL Worker is the only component authorized to write to the Data Warehouse'
        });
      }

      // 5. Enrich DW description with correct sourcing contract
      fixes.push({
        type: 'ENRICH_COMPONENT',
        componentId: dw.id,
        updates: {
          dwSourceContract: 'kafka-etl-only',
          description: `${
            dw.description || 'Analytical data warehouse'
          }. RECEIVES DATA ONLY from Kafka ETL Worker — direct service writes are architecturally forbidden. Flow: Service→Kafka→ETL Worker→DW. Supports OLAP queries for dashboards and ML feature computation without impacting OLTP performance.`
        },
        reason: 'Enforcing DW source contract: Service→Kafka→Worker→DW. No bypass allowed.'
      });

      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 18. SINGLE BROKER — Remove duplicate brokers (Kafka wins)
  //     Kafka and RabbitMQ must never coexist as primary brokers
  // ──────────────────────────────────────────────────────────────
  {
    id: 'SINGLE_BROKER',
    name: 'Single Message Broker (Remove RabbitMQ when Kafka exists)',
    category: 'async-processing',
    severity: 'high',
    detect: (ctx) => {
      // Applies when both Kafka and RabbitMQ exist
      const hasKafka = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return c.type === 'queue' && (name.includes('kafka') || name.includes('event stream'));
      });
      const hasRabbit = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('rabbit') || name.includes('rabbitmq');
      });
      return hasKafka && hasRabbit;
    },
    check: (ctx) => {
      // Satisfied if RabbitMQ does NOT exist alongside Kafka
      const hasRabbit = ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('rabbit') || name.includes('rabbitmq');
      });
      return !hasRabbit;
    },
    fix: (ctx) => {
      const fixes = [];
      const rabbitComps = ctx.allComps.filter(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('rabbit') || name.includes('rabbitmq');
      });
      for (const rabbit of rabbitComps) {
        fixes.push({
          type: 'REMOVE_COMPONENT',
          componentId: rabbit.id,
          reason: 'Duplicate broker: Kafka and RabbitMQ cannot coexist as primary async transport. Kafka provides: durable log replay, consumer groups, stream processing integration, and horizontal partitioning. RabbitMQ removed.'
        });
      }
      return fixes;
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 15. LOAD BALANCER — Required for 4+ service deployments
  // ──────────────────────────────────────────────────────────────
  {
    id: 'LOAD_BALANCER',
    name: 'Load Balancer for High Availability',
    category: 'ingress',
    severity: 'high',
    detect: (ctx) => {
      return ctx.coreServices.length >= 4;
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes('balancer') || name.includes('load') || name.includes('alb') || name.includes('nlb');
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'application-load-balancer',
        name: 'Application Load Balancer',
        type: 'service',
        layer: 'interaction',
        capability: 'horizontal-scaling',
        tech: 'AWS ALB / NGINX / HAProxy',
        description: 'L7 load balancer distributing requests across service instances using round-robin, least-connections, and health-check-aware routing for zero-downtime deployments',
        priority: 'high'
      },
      reason: `${ctx.coreServices.length} services without a load balancer means single-instance failures cause total outage. LB enables horizontal scaling and zero-downtime deployments.`
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 16. OBSERVABILITY — Logging, metrics, tracing for 3+ services
  // ──────────────────────────────────────────────────────────────
  {
    id: 'OBSERVABILITY_STACK',
    name: 'Observability Stack (Metrics + Logs + Traces)',
    category: 'observability',
    severity: 'high',
    detect: (ctx) => {
      return ctx.coreServices.length >= 3;
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        const cap = (c.capability || '').toLowerCase();
        return cap.includes('monitoring') || cap.includes('observability') || cap.includes('tracing') ||
               cap.includes('logging') || cap.includes('telemetry') ||
               name.includes('prometheus') || name.includes('grafana') || name.includes('jaeger') ||
               name.includes('collector') || name.includes('observability') || name.includes('datadog');
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'observability-collector',
        name: 'Observability Collector',
        type: 'service',
        layer: 'processing',
        capability: 'monitoring',
        tech: 'OpenTelemetry / Prometheus / Grafana',
        description: 'Collects metrics, traces, and logs from all services via OpenTelemetry SDK. Exposes RED metrics (Rate, Error, Duration), distributed traces for cross-service debugging, and structured logs for root-cause analysis.',
        priority: 'high'
      },
      reason: `${ctx.coreServices.length} microservices without observability means debugging production issues requires SSH-ing into individual containers — unacceptable for production.`
    }]
  },

  // ──────────────────────────────────────────────────────────────
  // 17. DEAD LETTER QUEUE — Poison messages must not crash workers
  // ──────────────────────────────────────────────────────────────
  {
    id: 'DEAD_LETTER_QUEUE',
    name: 'Dead Letter Queue for Failed Messages',
    category: 'resilience',
    severity: 'high',
    detect: (ctx) => {
      return ctx.allComps.some(c => c.type === 'queue');
    },
    check: (ctx) => {
      return ctx.allComps.some(c => {
        const name = (c.name || '').toLowerCase();
        const cap = (c.capability || '').toLowerCase();
        return name.includes('dead') || name.includes('dlq') || cap === 'dead-letter-queue';
      });
    },
    fix: (ctx) => [{
      type: 'ADD_COMPONENT',
      component: {
        id: 'dead-letter-queue',
        name: 'Dead Letter Queue (DLQ)',
        type: 'queue',
        layer: 'integration',
        capability: 'dead-letter-queue',
        tech: 'RabbitMQ DLX / SQS DLQ / Kafka DLT',
        description: 'Captures messages that fail processing after max retry attempts. Prevents poison messages from blocking the main queue and crashing workers. Enables manual inspection, replay, and alerting on failed events.',
        priority: 'high'
      },
      reason: 'Queues without DLQ means a single malformed message can block all downstream processing. DLQ isolates failures and preserves them for debugging.'
    }]
  }
];

// ═══════════════════════════════════════════════════════════════
// INVARIANT EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Runs all invariants against the current architecture.
 * Returns violations with auto-fix instructions.
 */
function enforceInvariants(components, flows, graph) {
  const allComps = Object.values(components).flat();
  const nodeMap = new Map((graph?.nodes || allComps).map(n => [n.id, n]));
  const capSet = new Set(allComps.map(c => c.capability).filter(Boolean));

  const coreServices = allComps.filter(c => c.type === 'service' && !isInfraComp(c));
  const databases = allComps.filter(c => c.type === 'database');

  const ctx = {
    allComps,
    nodeMap,
    capSet,
    flows,
    coreServices,
    databases,
    isInfra: isInfraComp
  };

  const results = [];
  const allFixes = [];

  for (const inv of INVARIANTS) {
    if (!inv.detect(ctx)) {
      results.push({ id: inv.id, name: inv.name, status: 'NOT_APPLICABLE', severity: inv.severity });
      continue;
    }

    const satisfied = inv.check(ctx);
    if (satisfied) {
      results.push({ id: inv.id, name: inv.name, status: 'SATISFIED', severity: inv.severity });
    } else {
      const fixes = inv.fix(ctx);
      results.push({
        id: inv.id,
        name: inv.name,
        status: 'VIOLATED',
        severity: inv.severity,
        category: inv.category,
        fixCount: fixes.length
      });
      allFixes.push(...fixes);
    }
  }

  // ★ INVARIANTS OVERRIDE CAPS — Critical infra MUST be injected ★
  // Invariants represent hard correctness requirements (DB-per-service, Saga, 
  // Secrets Manager, CDN). They cannot be capped or blocked.
  console.log(`\x1b[36m[INVARIANTS] ${allFixes.filter(f => f.type === 'ADD_COMPONENT').length} component injections, ${allFixes.filter(f => f.type !== 'ADD_COMPONENT').length} enrichments/rewires\x1b[0m`);

  return {
    invariants: results,
    fixes: allFixes,
    satisfiedCount: results.filter(r => r.status === 'SATISFIED').length,
    violatedCount: results.filter(r => r.status === 'VIOLATED').length,
    totalChecked: results.filter(r => r.status !== 'NOT_APPLICABLE').length
  };
}

/**
 * Applies invariant fixes to components and flows.
 * Returns mutated copies (no side effects on input).
 */
function applyInvariantFixes(components, flows, fixes) {
  // Deep copy
  const fixedComponents = {};
  for (const layer in components) {
    fixedComponents[layer] = components[layer].map(c => ({ ...c }));
  }
  let fixedFlows = [...flows];

  for (const fix of fixes) {
    switch (fix.type) {
      case 'ADD_COMPONENT': {
        const layer = fix.component.layer || 'processing';
        if (!fixedComponents[layer]) fixedComponents[layer] = [];
        // Dedup
        const exists = fixedComponents[layer].some(c => c.id === fix.component.id);
        if (!exists) {
          fixedComponents[layer].push(fix.component);
          console.log(`\x1b[35m[INVARIANT] Injected: ${fix.component.name} — ${fix.reason}\x1b[0m`);
        }
        break;
      }

      case 'ENRICH_COMPONENT': {
        for (const layer in fixedComponents) {
          fixedComponents[layer] = fixedComponents[layer].map(c => {
            if (c.id === fix.componentId) {
              return { ...c, ...fix.updates };
            }
            return c;
          });
        }
        console.log(`\x1b[33m[INVARIANT] Enriched: ${fix.componentId} — ${fix.reason}\x1b[0m`);
        break;
      }

      case 'ADD_FLOW': {
        const flowKey = `${fix.flow.source}->${fix.flow.target}:${fix.flow.pipelineId || 'default'}`;
        const exists = fixedFlows.some(f =>
          f.source === fix.flow.source && f.target === fix.flow.target && f.label === fix.flow.label
        );
        if (!exists) {
          fixedFlows.push({ ...fix.flow, step: fixedFlows.length + 1 });
          console.log(`\x1b[36m[INVARIANT] Flow added: ${fix.flow.source} → ${fix.flow.target} [${fix.flow.pipelineId || 'default'}] — ${fix.reason}\x1b[0m`);
        }
        break;
      }

      case 'REMOVE_FLOW': {
        const before = fixedFlows.length;
        fixedFlows = fixedFlows.filter(f => !(f.source === fix.sourceId && f.target === fix.targetId));
        const removed = before - fixedFlows.length;
        if (removed > 0) {
          console.log(`\x1b[31m[INVARIANT] REMOVED ${removed} flow(s): ${fix.sourceId} → ${fix.targetId} — ${fix.reason}\x1b[0m`);
        }
        break;
      }

      case 'REMOVE_COMPONENT': {
        for (const layer in fixedComponents) {
          const before = fixedComponents[layer].length;
          fixedComponents[layer] = fixedComponents[layer].filter(c => c.id !== fix.componentId);
          const removed = before - fixedComponents[layer].length;
          if (removed > 0) {
            console.log(`\x1b[31m[INVARIANT] REMOVED component: ${fix.componentId} — ${fix.reason}\x1b[0m`);
            // Also remove all flows referencing the removed component
            fixedFlows = fixedFlows.filter(f => f.source !== fix.componentId && f.target !== fix.componentId);
          }
        }
        break;
      }

      case 'REWIRE_FLOW': {
        fixedFlows = fixedFlows.map(f => {
          if (f.source === fix.serviceId && f.target === fix.oldTarget) {
            console.log(`\x1b[33m[INVARIANT] Rewired: ${fix.serviceId} from ${fix.oldTarget} → ${fix.newTarget}\x1b[0m`);
            return {
              ...f,
              target: fix.newTarget,
              reason: fix.reason,
              autoFixed: true
            };
          }
          return f;
        });
        break;
      }
    }
  }

  return { fixedComponents, fixedFlows };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function isInfraComp(comp) {
  if (!comp || comp.type !== 'service') return false;
  const name = (comp.name || '').toLowerCase();
  const cap = (comp.capability || '').toLowerCase();
  return cap === 'api-gateway' || cap === 'horizontal-scaling' || cap === 'rate-limiting' ||
         cap === 'circuit-breaker' || cap === 'service-discovery' || cap === 'config-management' ||
         cap === 'service-mesh' || cap === 'distributed-tracing' || cap === 'centralized-logging' ||
         cap === 'monitoring' || cap === 'health-checks' || cap === 'cdn-delivery' ||
         name.includes('gateway') || name.includes('balancer') || name.includes('waf') ||
         name.includes('cdn') || name.includes('rate') || name.includes('circuit') ||
         name.includes('registry') || name.includes('consul') || name.includes('mesh') ||
         name.includes('istio') || name.includes('config server') || name.includes('prometheus') ||
         name.includes('jaeger') || name.includes('fluentd') || name.includes('loki') ||
         name.includes('collector') || name.includes('observability') || name.includes('saga');
}

module.exports = { enforceInvariants, applyInvariantFixes, INVARIANTS };
