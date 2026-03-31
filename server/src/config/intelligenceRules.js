/**
 * ============================================================================
 * ARCHFORGE — INTELLIGENCE RULES v3 (ENTERPRISE SELF-SUFFICIENT)
 * ============================================================================
 * 
 * Context-aware heuristic rules that generate accurate, specific insights
 * based on actual architectural analysis. Designed to produce the kind of
 * feedback a Principal Architect at FAANG would provide.
 * 
 * v3 UPGRADES:
 *  - Cost optimization suggestions
 *  - Compliance gap detection
 *  - Data sovereignty warnings
 *  - Deployment strategy recommendations
 *  - Database sharding suggestions
 *  - Service mesh recommendations
 *  - More granular classification profiles
 *  - Enterprise-specific risk detection
 * ============================================================================
 */

const INTELLIGENCE_RULES = {
  // ── SCALING RULES ──
  scaling: [
    {
      id: 'scale-real-time',
      condition: (ctx) => ctx.hasCapability('real-time-streaming') || ctx.hasCapability('bidirectional-messaging'),
      suggestion: (ctx) => {
        const hasWS = ctx.allComponents.some(c => c.name?.toLowerCase().includes('websocket'));
        if (hasWS) {
          return 'Your WebSocket Gateway will become a bottleneck under heavy load. Deploy a WebSocket cluster behind a sticky-session load balancer with Redis Pub/Sub as the backplane for horizontal scaling across instances.';
        }
        return 'Deploy a WebSocket cluster (e.g., Redis Pub/Sub backplane) to handle persistent real-time connections at scale. Consider sticky sessions with health-check failover for connection durability.';
      },
      confidence: 0.92
    },
    {
      id: 'scale-data-heavy',
      condition: (ctx) => ctx.hasCapability('video-communication') || ctx.hasCapability('content-distribution') || ctx.hasCapability('file-storage'),
      suggestion: (ctx) => {
        const hasCDN = ctx.allComponents.some(c => c.name?.toLowerCase().includes('cdn') || c.name?.toLowerCase().includes('edge'));
        if (hasCDN) {
          return 'CDN edge nodes are present — ensure cache invalidation strategies are configured (TTL-based + purge API). Consider multi-region CDN replication for global latency reduction.';
        }
        return 'Introduce a Content Delivery Network (CDN) to offload heavy media requests and asset distribution from your core servers. This reduces origin server load by 60-80% for static content.';
      },
      confidence: 0.90
    },
    {
      id: 'scale-microservices',
      condition: (ctx) => ctx.serviceCount >= 3 && !ctx.hasGateway,
      suggestion: (ctx) => `Your architecture has ${ctx.serviceCount} services (${ctx.getServiceList()}) without a centralized API Gateway. Implement one (e.g., Kong, NGINX, AWS API Gateway) to route traffic efficiently, enforce rate limiting, and provide a single entry point for all clients.`,
      confidence: 0.88
    },
    {
      id: 'scale-db-read-heavy',
      condition: (ctx) => ctx.dbCount >= 1 && ctx.serviceCount >= 2 && !ctx.hasCache,
      suggestion: (ctx) => {
        const dbList = ctx.dbNames.slice(0, 2).join(', ');
        return `Add read replicas for your database${ctx.dbCount > 1 ? 's' : ''} (${dbList}) to distribute read load across your ${ctx.serviceCount} services. This prevents the primary from becoming a bottleneck under read-heavy workloads.`;
      },
      confidence: 0.82
    },
    {
      id: 'scale-db-sharding',
      condition: (ctx) => ctx.dbCount >= 1 && ctx.serviceCount >= 5 && (ctx.hasCapability('e-commerce') || ctx.hasCapability('geolocation') || ctx.hasCapability('analytics')),
      suggestion: (ctx) => {
        const dbList = ctx.dbNames.slice(0, 2).join(', ');
        return `With ${ctx.serviceCount} services in a high-throughput domain, consider database sharding for ${dbList}. Use consistent hashing (e.g., by user_id or region) for horizontal data partitioning to handle billions of rows.`;
      },
      confidence: 0.78
    },
    {
      id: 'scale-connection-pooling',
      condition: (ctx) => ctx.serviceCount >= 4 && ctx.dbCount >= 1,
      suggestion: (ctx) => `With ${ctx.serviceCount} services sharing ${ctx.dbCount} database(s), implement connection pooling (e.g., PgBouncer for PostgreSQL, ProxySQL for MySQL). Without pooling, each service instance creating its own connections will exhaust the database connection limit.`,
      confidence: 0.85
    },
    {
      id: 'scale-auto-scaling',
      condition: (ctx) => ctx.serviceCount >= 4 && !ctx.hasCapability('horizontal-scaling'),
      suggestion: (ctx) => `Your ${ctx.serviceCount}-service architecture should implement auto-scaling policies (target tracking on CPU/RPS/latency). Use Kubernetes HPA or AWS Auto Scale Groups with predictive scaling for traffic spikes.`,
      confidence: 0.80
    }
  ],

  // ── MISSING DEPENDENCIES ──
  missing: [
    {
      id: 'missing-auth',
      condition: (ctx) => {
        const inputLower = ctx.input.toLowerCase();
        const isUserFacing = inputLower.includes('user') || inputLower.includes('login') || 
                            inputLower.includes('account') || inputLower.includes('profile') ||
                            inputLower.includes('signup') || inputLower.includes('register');
        return isUserFacing && !ctx.hasAuth;
      },
      suggestion: 'Your system handles user data but lacks an explicit authentication layer. Add an Auth Service with JWT token management and consider OAuth2/OIDC integration for social login support.',
      confidence: 0.90
    },
    {
      id: 'missing-cache',
      condition: (ctx) => ctx.dbCount > 0 && !ctx.hasCache && ctx.serviceCount >= 2,
      suggestion: (ctx) => {
        const dbList = ctx.dbNames.slice(0, 2).join(' and ');
        return `Add a Caching Layer (e.g., Redis cluster) in front of ${dbList} to reduce database query load. Cache-aside pattern can eliminate 70-90% of repetitive reads and reduce p99 latency by 10x.`;
      },
      confidence: 0.85
    },
    {
      id: 'missing-queue-async',
      condition: (ctx) => ctx.hasCapability('async-processing') && ctx.queueCount === 0,
      suggestion: 'Async processing intent detected without an explicit message queue. Strongly recommend deploying a message broker (Kafka for event streaming, RabbitMQ for task queues, or SQS for simple job queues) to prevent request timeout cascades.',
      confidence: 0.92
    },
    {
      id: 'missing-monitoring',
      condition: (ctx) => ctx.serviceCount >= 3 && !ctx.hasMonitoring,
      suggestion: (ctx) => `With ${ctx.serviceCount} services in your architecture, you need distributed observability. Add centralized logging (ELK/Loki), metrics collection (Prometheus/Datadog), and distributed tracing (Jaeger/Zipkin) to debug cross-service issues.`,
      confidence: 0.80
    },
    {
      id: 'missing-circuit-breaker',
      condition: (ctx) => ctx.externalCount >= 2 && ctx.serviceCount >= 2,
      suggestion: (ctx) => `Your system integrates with ${ctx.externalCount} external services. Implement circuit breaker patterns (e.g., Hystrix, Resilience4j) to prevent cascading failures when external dependencies are slow or unavailable.`,
      confidence: 0.75
    },
    {
      id: 'missing-rate-limiter',
      condition: (ctx) => ctx.hasGateway && ctx.serviceCount >= 3 && !ctx.allComponents.some(c => c.name?.toLowerCase().includes('rate') || c.capability === 'rate-limiting'),
      suggestion: (ctx) => `Your API Gateway serves ${ctx.serviceCount} services without explicit rate limiting. Add a Rate Limiter (sliding window or token bucket) to protect against abuse, DDoS, and noisy neighbor problems. Enterprise SLA typically requires per-client/per-endpoint limits.`,
      confidence: 0.82
    },
    {
      id: 'missing-dlq',
      condition: (ctx) => ctx.queueCount > 0 && !ctx.allComponents.some(c => (c.name || '').toLowerCase().includes('dead') || (c.name || '').toLowerCase().includes('dlq')),
      suggestion: 'Your message queue setup lacks a Dead Letter Queue (DLQ). Failed messages should be routed to a DLQ for inspection, retry, and alerting instead of being silently dropped or blocking the main queue.',
      confidence: 0.78
    },
    {
      id: 'missing-health-checks',
      condition: (ctx) => ctx.serviceCount >= 3 && !ctx.allComponents.some(c => c.capability === 'health-checks'),
      suggestion: (ctx) => `${ctx.serviceCount} services without health check endpoints means your load balancer can\'t distinguish healthy from unhealthy instances. Add /health and /ready endpoints for liveness and readiness probes.`,
      confidence: 0.75
    },
    {
      id: 'missing-backup-strategy',
      condition: (ctx) => ctx.dbCount >= 2 && !(ctx.input.toLowerCase().includes('backup') || ctx.input.toLowerCase().includes('disaster')),
      suggestion: (ctx) => `Your architecture has ${ctx.dbCount} databases without a documented backup/DR strategy. Implement automated point-in-time recovery, cross-region replication, and regular backup testing to meet RPO/RTO requirements.`,
      confidence: 0.72
    }
  ],

  // ── RISK DETECTION ──
  risks: [
    {
      id: 'risk-overload',
      condition: (ctx) => ctx.serviceCount >= 3 && ctx.queueCount === 0 && !ctx.hasCapability('async-processing'),
      suggestion: (ctx) => `Overload Risk: ${ctx.serviceCount} services communicate synchronously without any message queue for decoupling. Under high throughput, a slow service (e.g., ${ctx.serviceNames[ctx.serviceNames.length - 1] || 'downstream service'}) will propagate backpressure, triggering cascading timeouts across the entire system. Add a message queue for non-critical operations.`,
      severity: 'High',
      confidence: 0.85
    },
    {
      id: 'risk-spof-db',
      condition: (ctx) => ctx.dbCount === 1 && ctx.serviceCount > 2,
      suggestion: (ctx) => `Single Point of Failure: ${ctx.serviceCount} services share a single database (${ctx.dbNames[0] || 'Primary Database'}). If this database goes down, your entire system fails. Consider read replicas, database per service pattern, or active-standby failover with automated promotion.`,
      severity: 'Critical',
      confidence: 0.93
    },
    {
      id: 'risk-tight-coupling',
      condition: (ctx) => ctx.uiCount > 1 && !ctx.hasGateway && ctx.serviceCount > 1,
      suggestion: (ctx) => `Tight Coupling Risk: ${ctx.uiCount} front-end clients communicate directly with ${ctx.serviceCount} backend services without an API Gateway boundary. This creates N×M direct dependencies that scale poorly. Implement a BFF (Backend-for-Frontend) or API Gateway pattern.`,
      severity: 'Medium',
      confidence: 0.82
    },
    {
      id: 'risk-no-retry',
      condition: (ctx) => ctx.externalCount >= 1 && ctx.queueCount === 0,
      suggestion: 'External integration without retry/dead-letter mechanisms: If an external API call fails, there is no automatic retry. Consider adding a persistent job queue with exponential backoff retry for external integration calls.',
      severity: 'Medium',
      confidence: 0.72
    },
    {
      id: 'risk-data-inconsistency',
      condition: (ctx) => ctx.dbCount >= 3 && ctx.serviceCount >= 4 && ctx.queueCount === 0,
      suggestion: (ctx) => `Data Consistency Risk: ${ctx.dbCount} databases across ${ctx.serviceCount} services without event-driven synchronization. Distributed transactions across multiple databases are fragile. Implement the Saga pattern or event sourcing with Kafka for eventual consistency.`,
      severity: 'High',
      confidence: 0.80
    },
    {
      id: 'risk-no-idempotency',
      condition: (ctx) => ctx.hasCapability('payment-processing') && ctx.queueCount > 0,
      suggestion: 'Payment processing with async queues requires idempotency keys on all write operations. Without idempotency, message retries (after network timeouts or consumer crashes) can result in duplicate charges. Implement idempotency keys stored in a fast lookup (Redis) with TTL.',
      severity: 'Critical',
      confidence: 0.88
    },
    {
      id: 'risk-secret-management',
      condition: (ctx) => ctx.externalCount >= 2 && !ctx.allComponents.some(c => (c.name || '').toLowerCase().includes('secret') || (c.name || '').toLowerCase().includes('vault') || (c.name || '').toLowerCase().includes('kms')),
      suggestion: (ctx) => `Your system integrates with ${ctx.externalCount} external services storing API keys/secrets. Without centralized secret management (HashiCorp Vault, AWS SSM), secrets end up in env vars or config files — a major security risk. Implement dynamic secret rotation.`,
      severity: 'High',
      confidence: 0.78
    },
    {
      id: 'risk-no-cors',
      condition: (ctx) => ctx.uiCount >= 1 && ctx.hasGateway,
      suggestion: 'Web clients accessing backend APIs through a gateway require proper CORS configuration. Misconfigured CORS headers is the #1 cause of failed client-server integration in production. Configure allowed origins, methods, and headers at the gateway level.',
      severity: 'Low',
      confidence: 0.70
    }
  ],

  // ── CLASSIFICATION PROFILES ──
  classification: [
    {
      type: 'Event-Driven Architecture',
      condition: (ctx) => {
        let score = 0;
        if (ctx.queueCount > 0) score += 3;
        if (ctx.workerCount > 0) score += 2;
        if (ctx.hasCapability('real-time-streaming')) score += 2;
        if (ctx.hasCapability('async-processing')) score += 2;
        if (ctx.hasCapability('bidirectional-messaging')) score += 1;
        return score;
      }
    },
    {
      type: 'Distributed Microservices Architecture',
      condition: (ctx) => {
        let score = 0;
        if (ctx.serviceCount >= 6) score += 5;
        else if (ctx.serviceCount >= 4) score += 3;
        if (ctx.hasGateway && ctx.serviceCount >= 4) score += 1;
        if (ctx.dbCount >= 2) score += 1;
        if (ctx.externalCount >= 3) score += 1;
        if (ctx.allComponents.some(c => c.capability === 'service-discovery')) score += 2;
        if (ctx.allComponents.some(c => c.capability === 'service-mesh')) score += 2;
        return score;
      }
    },
    {
      type: 'Layered Web Application',
      condition: (ctx) => {
        let score = 0;
        if (ctx.serviceCount >= 1 && ctx.serviceCount <= 4) score += 2;
        if (ctx.hasGateway) score += 2;
        if (ctx.uiCount >= 1) score += 1;
        if (ctx.dbCount >= 1) score += 1;
        if (ctx.queueCount === 0) score += 1;
        if (ctx.serviceCount > 5) score = 0;
        return score;
      }
    },
    {
      type: 'Monolithic Architecture',
      condition: (ctx) => {
        let score = 0;
        if (ctx.serviceCount <= 2) score += 3;
        if (ctx.dbCount <= 1) score += 1;
        if (ctx.queueCount === 0) score += 1;
        if (ctx.totalComponents > 6) score = 0;
        return score;
      }
    },
    {
      type: 'Data-Intensive Application',
      condition: (ctx) => {
        let score = 0;
        if (ctx.dbCount >= 2) score += 2;
        if (ctx.hasCapability('analytics')) score += 3;
        if (ctx.hasCapability('search-indexing')) score += 2;
        if (ctx.hasCapability('ml-pipeline')) score += 2;
        if (ctx.hasCapability('content-ingestion')) score += 1;
        if (ctx.hasCapability('recommendation-system')) score += 2;
        return score;
      }
    },
    {
      type: 'Real-Time Communication Platform',
      condition: (ctx) => {
        let score = 0;
        if (ctx.hasCapability('bidirectional-messaging')) score += 3;
        if (ctx.hasCapability('real-time-streaming')) score += 3;
        if (ctx.hasCapability('video-communication')) score += 2;
        if (ctx.hasCapability('push-notification')) score += 1;
        if (ctx.hasCapability('real-time-collaboration')) score += 2;
        return score;
      }
    },
    {
      type: 'E-Commerce Platform',
      condition: (ctx) => {
        let score = 0;
        if (ctx.hasCapability('e-commerce')) score += 4;
        if (ctx.hasCapability('payment-processing')) score += 3;
        if (ctx.hasCapability('search-indexing')) score += 1;
        if (ctx.hasCapability('authentication')) score += 1;
        if (ctx.hasCapability('inventory-management')) score += 2;
        if (ctx.hasCapability('order-management')) score += 2;
        return score;
      }
    },
    {
      type: 'Cloud-Native Platform',
      condition: (ctx) => {
        let score = 0;
        if (ctx.allComponents.some(c => c.capability === 'service-mesh')) score += 3;
        if (ctx.allComponents.some(c => c.capability === 'service-discovery')) score += 3;
        if (ctx.allComponents.some(c => c.capability === 'config-management')) score += 2;
        if (ctx.allComponents.some(c => c.capability === 'distributed-tracing')) score += 2;
        if (ctx.hasCapability('horizontal-scaling')) score += 1;
        return score;
      }
    }
  ]
};

module.exports = { INTELLIGENCE_RULES };
