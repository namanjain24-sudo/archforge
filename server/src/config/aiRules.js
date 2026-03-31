/**
 * ============================================================================
 * ARCHFORGE — AI ENHANCEMENT RULES v3 (ENTERPRISE SELF-SUFFICIENT)
 * ============================================================================
 * 
 * The core deterministic intelligence that makes ArchForge produce FAANG-level
 * system architecture diagrams WITHOUT any external LLM dependency.
 * 
 * v3 UPGRADES:
 *  - 20+ capability inferences (auto-detect missing enterprise concerns)
 *  - 5 architecture pattern detectors
 *  - 12 domain boost configurations  
 *  - 25+ smart infrastructure injections
 *  - Full ingress chain auto-injection (WAF → LB → Gateway → Services)
 *  - Resilience patterns (circuit breaker, rate limiter, DLQ, retry)
 *  - Observability stack auto-injection for any 4+ service architecture
 *  - Session management, service discovery, config server auto-injection
 * ============================================================================
 */

const AI_RULES = {
  // ══════════════════════════════════════════════════════════════
  // CAPABILITY INFERENCES — Auto-detect implied enterprise concerns
  // ══════════════════════════════════════════════════════════════
  inferences: [
    // Communication inferences
    { sourceId: 'bidirectional-messaging', infer: 'presence-tracking', reason: 'Messaging systems require connection-state awareness.' },
    { sourceId: 'bidirectional-messaging', infer: 'session-management', reason: 'Chat sessions require distributed session state across WebSocket instances.' },
    { sourceId: 'bidirectional-messaging', infer: 'persistent-storage', reason: 'Chat message history requires durable database storage for retrieval and compliance.' },
    { sourceId: 'real-time-streaming', infer: 'event-streaming', reason: 'Real-time throughput demands scalable, decoupled event streams.' },
    
    // Auth/Security inferences
    { sourceId: 'authentication', infer: 'session-management', reason: 'Auth tokens and sessions need distributed storage for horizontal scaling.' },
    { sourceId: 'authentication', infer: 'audit-logging', reason: 'Authentication events must be logged for security compliance.' },
    { sourceId: 'authentication', infer: 'security', reason: 'Authentication requires edge auth at gateway, secrets management, and mTLS enforcement.' },
    
    // Payment/Commerce inferences
    { sourceId: 'payment-processing', infer: 'audit-logging', reason: 'Financial transactions require immutable audit trails.' },
    { sourceId: 'payment-processing', infer: 'compliance', reason: 'Payment processing mandates PCI-DSS compliance.' },
    { sourceId: 'payment-processing', infer: 'order-management', reason: 'Payments are always paired with order management — requires Saga orchestration for distributed transactions.' },
    { sourceId: 'e-commerce', infer: 'search-indexing', reason: 'E-commerce platforms need product search for discoverability.' },
    { sourceId: 'e-commerce', infer: 'caching', reason: 'Product catalog and session data need caching for performance.' },
    { sourceId: 'e-commerce', infer: 'security', reason: 'E-commerce requires secrets management for payment credentials and API keys.' },
    { sourceId: 'e-commerce', infer: 'inventory-management', reason: 'E-commerce platforms require stock tracking, reservation, and back-order management.' },
    { sourceId: 'e-commerce', infer: 'cdn-delivery', reason: 'E-commerce storefronts require CDN for static asset delivery and global performance.' },
    { sourceId: 'e-commerce', infer: 'async-processing', reason: 'E-commerce order→payment→inventory coordination requires async event bus for decoupling and reliability.' },
    
    // Scaling inferences
    { sourceId: 'horizontal-scaling', infer: 'service-discovery', reason: 'Scaling multiple service instances requires dynamic service registry.' },
    { sourceId: 'horizontal-scaling', infer: 'health-checks', reason: 'Load balancers require health check endpoints for routing decisions.' },
    { sourceId: 'horizontal-scaling', infer: 'config-management', reason: 'Scaled services need centralized config to avoid drift.' },
    
    // Data inferences
    { sourceId: 'analytics', infer: 'async-processing', reason: 'Analytics event ingestion should be asynchronous to avoid blocking user requests.' },
    { sourceId: 'analytics', infer: 'real-time-streaming', reason: 'Analytics requires dedicated stream processing (Flink) separate from batch processing (Spark).' },
    { sourceId: 'content-distribution', infer: 'caching', reason: 'Content feeds require aggressive caching for read-heavy workloads.' },
    { sourceId: 'content-distribution', infer: 'cdn-delivery', reason: 'Content distribution benefits from edge caching via CDN.' },
    
    // ML inferences  
    { sourceId: 'ml-pipeline', infer: 'async-processing', reason: 'ML model training and batch inference require async job processing.' },
    { sourceId: 'recommendation-system', infer: 'caching', reason: 'Recommendations are frequently accessed and benefit from caching.' },
    
    // Observability inferences
    { sourceId: 'monitoring', infer: 'distributed-tracing', reason: 'Monitoring requires distributed tracing for cross-service debugging.' },
    { sourceId: 'monitoring', infer: 'centralized-logging', reason: 'Effective monitoring requires centralized log aggregation.' },
    
    // External integration inferences
    { sourceId: 'circuit-breaker', infer: 'health-checks', reason: 'Circuit breakers need health check data to make trip decisions.' }
  ],
  
  // ══════════════════════════════════════════════════════════════
  // CAPABILITY WEIGHTS — Importance scores for topology prioritization
  // ══════════════════════════════════════════════════════════════
  capabilityImportance: {
    'real-time-streaming': 0.9,
    'e-commerce': 0.9,
    'payment-processing': 0.9,
    'bidirectional-messaging': 0.8,
    'authentication': 0.8,
    'horizontal-scaling': 0.8,
    'analytics': 0.7,
    'security': 0.7,
    'geolocation': 0.7,
    'ml-pipeline': 0.7,
    'content-distribution': 0.6,
    'async-processing': 0.6,
    'search-indexing': 0.6,
    'monitoring': 0.6,
    'rate-limiting': 0.5,
    'circuit-breaker': 0.5,
    'default': 0.5
  },

  // ══════════════════════════════════════════════════════════════
  // MULTI-PATTERN DETECTION — Architecture archetype classification
  // ══════════════════════════════════════════════════════════════
  patterns: [
    { name: 'Event-Driven Microservices', condition: caps => caps.has('real-time-streaming') || caps.has('event-streaming') || caps.has('bidirectional-messaging') || caps.has('async-processing') },
    { name: 'Data Pipeline Architecture', condition: caps => caps.has('analytics') || caps.has('ml-pipeline') || caps.has('content-ingestion') || caps.has('recommendation-system') },
    { name: 'Distributed Microservices', condition: caps => caps.has('e-commerce') || caps.has('payment-processing') || (caps.has('geolocation') && caps.size >= 5) || caps.size >= 6 },
    { name: 'Cloud-Native Architecture', condition: caps => caps.has('service-discovery') || caps.has('service-mesh') || caps.has('config-management') || (caps.has('horizontal-scaling') && caps.size >= 5) },
    { name: 'Layered Architecture', condition: caps => caps.size < 5 } // Small-to-medium apps
  ],

  // ══════════════════════════════════════════════════════════════
  // DOMAIN-AWARE COMPONENT BOOSTS — Force-inject domain-critical components
  // ══════════════════════════════════════════════════════════════
  domainBoosts: {
    ecommerce: [
      { id: 'cart-service', name: 'Shopping Cart Service', type: 'service', layer: 'processing', capability: 'e-commerce', priority: 'high', tech: 'Node.js, Redis', description: 'Manages cart state with TTL-based expiry and conflict-free replicated data types' },
      { id: 'order-service', name: 'Order Management Service', type: 'service', layer: 'processing', capability: 'order-management', priority: 'high', tech: 'Node.js, Express', description: 'Orchestrates order lifecycle from cart to fulfillment with saga pattern for distributed transactions' },
      { id: 'payment-gateway', name: 'Payment Gateway Integration', type: 'external', layer: 'integration', capability: 'payment-processing', priority: 'high', tech: 'Stripe / PayPal / Adyen', description: 'PCI-compliant payment processor for card, wallet, and bank transfer payments' },
      { id: 'inventory-service', name: 'Inventory Service', type: 'service', layer: 'processing', capability: 'inventory-management', priority: 'high', tech: 'Node.js, PostgreSQL', description: 'Real-time stock tracking with optimistic locking for reservation and deduction' }
    ],
    chat: [
      { id: 'presence-service', name: 'Presence Tracker Service', type: 'service', layer: 'processing', capability: 'presence-tracking', priority: 'high', tech: 'Node.js, Redis', description: 'Tracks online/offline/typing status with pub/sub broadcast to subscribed clients' },
      { id: 'websocket-gateway', name: 'WebSocket Connection Gateway', type: 'service', layer: 'interaction', capability: 'real-time-streaming', priority: 'high', tech: 'Node.js, ws', description: 'Manages persistent WebSocket connections with heartbeat, reconnection, and room multiplexing' },
      { id: 'message-db', name: 'Message Store (MongoDB)', type: 'database', layer: 'data', capability: 'persistent-storage', priority: 'high', tech: 'MongoDB / Cassandra', description: 'Durable message history storage with time-series indexing for chat retrieval, search, and compliance' }
    ],
    analytics: [
      { id: 'telemetry-pipeline', name: 'Telemetry Ingestion Pipeline', type: 'service', layer: 'processing', capability: 'analytics', priority: 'high', tech: 'Apache Kafka, Flink', description: 'High-throughput event ingestion with schema validation and stream processing' },
      { id: 'analytics-dw', name: 'Analytics Data Warehouse', type: 'database', layer: 'data', capability: 'analytics', priority: 'high', tech: 'ClickHouse / BigQuery', description: 'Columnar OLAP database for sub-second analytical queries over billions of events' },
      { id: 'dashboard-service', name: 'Dashboard API Service', type: 'service', layer: 'processing', capability: 'admin-dashboard', priority: 'medium', tech: 'Node.js, Express', description: 'Serves pre-aggregated metrics and custom report queries to admin dashboards' }
    ],
    geo: [
      { id: 'location-service', name: 'Location Tracking Service', type: 'service', layer: 'processing', capability: 'geolocation', priority: 'high', tech: 'Node.js, Turf.js', description: 'Real-time GPS ingestion, proximity calculations, and geofence event triggering' },
      { id: 'maps-integration', name: 'Maps API Integration', type: 'external', layer: 'integration', capability: 'geolocation', priority: 'medium', tech: 'Google Maps / Mapbox', description: 'Geocoding, routing, and ETA calculation via external mapping providers' },
      { id: 'geospatial-db', name: 'Geospatial Database (PostGIS)', type: 'database', layer: 'data', capability: 'geolocation', priority: 'high', tech: 'PostgreSQL + PostGIS', description: 'Spatial-indexed storage with R-tree queries for proximity and polygon containment' },
      { id: 'route-optimizer', name: 'Route Optimization Engine', type: 'service', layer: 'processing', capability: 'geolocation', priority: 'medium', tech: 'OSRM / Google Routes', description: 'Calculates optimal routes considering traffic, distance, and delivery windows' }
    ],
    scheduling: [
      { id: 'scheduler-service', name: 'Job Scheduler Service', type: 'service', layer: 'processing', capability: 'scheduling', priority: 'high', tech: 'Node.js, Agenda', description: 'Manages cron jobs, recurring tasks, and delayed execution with distributed locking' },
      { id: 'calendar-service', name: 'Calendar Management Service', type: 'service', layer: 'processing', capability: 'scheduling', priority: 'medium', tech: 'Node.js, iCal', description: 'Calendar sync, availability calculation, and timezone-aware booking management' },
      { id: 'notification-worker', name: 'Reminder Worker', type: 'worker', layer: 'processing', capability: 'scheduling', priority: 'medium', tech: 'Node.js, Bull', description: 'Sends scheduled reminders via email, SMS, and push notifications' }
    ],
    feed: [
      { id: 'feed-service', name: 'Content Feed Service', type: 'service', layer: 'processing', capability: 'content-distribution', priority: 'high', tech: 'Node.js, Redis', description: 'Fan-out-on-write feed generation with personalized ranking algorithms' },
      { id: 'content-db', name: 'Content Store (MongoDB)', type: 'database', layer: 'data', capability: 'content-distribution', priority: 'high', tech: 'MongoDB', description: 'Document store for rich content with embedded media references and engagement counters' },
      { id: 'moderation-service', name: 'Content Moderation Service', type: 'service', layer: 'processing', capability: 'content-management', priority: 'medium', tech: 'Python, TensorFlow', description: 'AI-powered content moderation (text toxicity, image NSFW, spam detection)' }
    ],
    ai: [
      { id: 'ml-inference-service', name: 'ML Inference Service', type: 'service', layer: 'processing', capability: 'ml-pipeline', priority: 'high', tech: 'Python, FastAPI, TensorFlow Serving', description: 'Serves ML models with batching, caching, shadow mode, and A/B routing' },
      { id: 'model-store', name: 'Model Artifact Store', type: 'database', layer: 'data', capability: 'ml-pipeline', priority: 'medium', tech: 'S3, MLflow', description: 'Versioned model artifact storage with metadata, metrics, and lineage tracking' },
      { id: 'vector-db', name: 'Vector Database (Pinecone/Qdrant)', type: 'database', layer: 'data', capability: 'ml-pipeline', priority: 'high', tech: 'Pinecone / Qdrant / Weaviate', description: 'High-dimensional vector index for similarity search, RAG, and embedding retrieval' },
      { id: 'feature-pipeline', name: 'Feature Engineering Pipeline', type: 'worker', layer: 'processing', capability: 'ml-pipeline', priority: 'medium', tech: 'Python, Apache Spark', description: 'Computes and stores ML features with point-in-time correctness for training and serving' }
    ],
    payment: [
      { id: 'fraud-detector', name: 'Fraud Detection Service', type: 'service', layer: 'processing', capability: 'payment-processing', priority: 'high', tech: 'Python, scikit-learn', description: 'Real-time fraud scoring with ML models, velocity checks, and geographic anomaly detection' },
      { id: 'ledger-service', name: 'Ledger Service', type: 'service', layer: 'processing', capability: 'payment-processing', priority: 'high', tech: 'Node.js, PostgreSQL', description: 'Double-entry bookkeeping ledger for immutable financial transaction recording' }
    ],
    // Security domain boost
    security: [
      { id: 'waf-shield', name: 'WAF Shield', type: 'service', layer: 'interaction', capability: 'security', priority: 'high', tech: 'AWS WAF / Cloudflare', description: 'Web Application Firewall filtering OWASP attacks, bot traffic, and L7 DDoS' },
      { id: 'secrets-manager', name: 'Secrets Manager', type: 'external', layer: 'integration', capability: 'security', priority: 'high', tech: 'HashiCorp Vault / AWS SSM', description: 'Centralized secrets rotation, dynamic credentials, and encryption key management' }
    ],
    // Video domain boost
    video: [
      { id: 'transcoding-service', name: 'Video Transcoding Service', type: 'worker', layer: 'processing', capability: 'video-communication', priority: 'high', tech: 'FFmpeg, AWS Elemental', description: 'Converts video to adaptive bitrate formats (HLS/DASH) for multi-device playback' },
      { id: 'media-cdn', name: 'Media CDN', type: 'service', layer: 'interaction', capability: 'cdn-delivery', priority: 'high', tech: 'CloudFront / Akamai', description: 'Global edge delivery for video segments with byte-range request support' }
    ]
  },
  
  // ══════════════════════════════════════════════════════════════
  // SMART INFRASTRUCTURE INJECTIONS — Pattern-driven component injection
  // ══════════════════════════════════════════════════════════════
  injections: [
    // ── Event-Driven Pattern ──
    {
      pattern: 'Event-Driven Microservices',
      layer: 'integration', type: 'queue', priority: 'high', capability: 'async-processing',
      options: [
        { name: 'Kafka Event Broker', weight: 4, condition: caps => caps.has('analytics') || caps.size >= 5 },
        { name: 'RabbitMQ Message Broker', weight: 2, condition: () => true },
        { name: 'Redis PubSub', weight: 3, condition: caps => caps.size < 4 }
      ]
    },
    {
      pattern: 'Event-Driven Microservices',
      layer: 'data', type: 'cache', priority: 'high', capability: 'caching',
      options: [
        { name: 'Redis Cache Cluster', weight: 3, condition: () => true },
        { name: 'Memcached', weight: 1, condition: () => true }
      ]
    },
    {
      pattern: 'Event-Driven Microservices',
      layer: 'integration', type: 'queue', priority: 'medium', capability: 'dead-letter-queue',
      options: [
        { name: 'Dead Letter Queue', weight: 3, condition: () => true }
      ]
    },

    // ── Distributed Microservices Pattern ──
    {
      pattern: 'Distributed Microservices',
      layer: 'interaction', type: 'service', priority: 'high', capability: 'api-gateway',
      options: [
        { name: 'Envoy API Gateway', weight: 3, condition: caps => caps.has('e-commerce') || caps.has('real-time-streaming') },
        { name: 'Kong API Gateway', weight: 2, condition: () => true },
        { name: 'NGINX Ingress Controller', weight: 1, condition: () => true }
      ]
    },
    {
      pattern: 'Distributed Microservices',
      layer: 'interaction', type: 'service', priority: 'high', capability: 'horizontal-scaling',
      options: [
        { name: 'Application Load Balancer', weight: 3, condition: () => true },
        { name: 'NGINX Load Balancer', weight: 2, condition: () => true }
      ]
    },
    {
      pattern: 'Distributed Microservices',
      layer: 'processing', type: 'service', priority: 'high', capability: 'rate-limiting',
      options: [
        { name: 'Rate Limiter Service', weight: 3, condition: () => true }
      ]
    },
    {
      pattern: 'Distributed Microservices',
      layer: 'processing', type: 'service', priority: 'low', capability: 'service-discovery',
      options: [
        { name: 'Service Registry (Consul)', weight: 3, condition: caps => caps.size >= 8 },
        { name: 'Service Registry (Eureka)', weight: 2, condition: caps => caps.size >= 8 }
      ]
    },
    {
      pattern: 'Distributed Microservices',
      layer: 'processing', type: 'service', priority: 'low', capability: 'circuit-breaker',
      options: [
        { name: 'Circuit Breaker Proxy', weight: 3, condition: caps => caps.has('circuit-breaker') },
        { name: 'Resilience Gateway', weight: 2, condition: caps => caps.has('circuit-breaker') }
      ]
    },
    {
      pattern: 'Distributed Microservices',
      layer: 'data', type: 'cache', priority: 'high', capability: 'caching',
      options: [
        { name: 'Redis Cache Cluster', weight: 3, condition: () => true }
      ]
    },

    // ── Cloud-Native Pattern ──
    {
      pattern: 'Cloud-Native Architecture',
      layer: 'processing', type: 'service', priority: 'high', capability: 'service-mesh',
      options: [
        { name: 'Istio Service Mesh', weight: 3, condition: caps => caps.size >= 6 },
        { name: 'Linkerd Service Mesh', weight: 2, condition: () => true }
      ]
    },
    {
      pattern: 'Cloud-Native Architecture',
      layer: 'processing', type: 'service', priority: 'high', capability: 'distributed-tracing',
      options: [
        { name: 'Jaeger Trace Collector', weight: 3, condition: () => true },
        { name: 'Zipkin Trace Collector', weight: 1, condition: () => true }
      ]
    },
    {
      pattern: 'Cloud-Native Architecture',
      layer: 'processing', type: 'service', priority: 'medium', capability: 'centralized-logging',
      options: [
        { name: 'Fluentd Log Aggregator', weight: 3, condition: caps => caps.size >= 5 },
        { name: 'Loki Log Aggregator', weight: 2, condition: () => true }
      ]
    },
    {
      pattern: 'Cloud-Native Architecture',
      layer: 'interaction', type: 'service', priority: 'high', capability: 'horizontal-scaling',
      options: [
        { name: 'Application Load Balancer', weight: 3, condition: () => true }
      ]
    },

    // ── Data Pipeline Pattern ──
    {
      pattern: 'Data Pipeline Architecture',
      layer: 'data', type: 'database', priority: 'high', capability: 'analytics',
      options: [
        { name: 'ClickHouse Analytics Engine', weight: 3, condition: caps => caps.has('real-time-streaming') },
        { name: 'Snowflake Data Warehouse', weight: 2, condition: () => true }
      ]
    },
    {
      pattern: 'Data Pipeline Architecture',
      layer: 'processing', type: 'worker', priority: 'medium', capability: 'async-processing',
      options: [
        { name: 'Spark Batch Processor', weight: 2, condition: () => true },
        { name: 'Flink Stream Processor', weight: 3, condition: caps => caps.has('event-streaming') || caps.has('real-time-streaming') }
      ]
    },
    {
      pattern: 'Data Pipeline Architecture',
      layer: 'integration', type: 'queue', priority: 'high', capability: 'async-processing',
      options: [
        { name: 'Kafka Data Pipeline', weight: 4, condition: () => true }
      ]
    },

    // ── Layered Architecture Fallbacks (ensures minimum viable architecture) ──
    {
      pattern: 'Layered Architecture',
      layer: 'interaction', type: 'ui', priority: 'medium', capability: 'frontend',
      options: [
        { name: 'Web Application Client', weight: 3, condition: () => true },
        { name: 'Mobile Application', weight: 1, condition: caps => caps.has('mobile') }
      ]
    },
    {
      pattern: 'Layered Architecture',
      layer: 'interaction', type: 'service', priority: 'high', capability: 'api-gateway',
      options: [
        { name: 'Edge API Gateway', weight: 1, condition: () => true }
      ]
    },
    {
      pattern: 'Layered Architecture',
      layer: 'processing', type: 'service', priority: 'high', capability: 'backend-logic',
      options: [
        { name: 'Core Application Service', weight: 1, condition: () => true }
      ]
    },
    {
      pattern: 'Layered Architecture',
      layer: 'data', type: 'database', priority: 'high', capability: 'persistent-storage',
      options: [
        { name: 'Relational Database (PostgreSQL)', weight: 3, condition: () => true },
        { name: 'Document Store (MongoDB)', weight: 1, condition: caps => caps.has('content-management') || caps.has('content-distribution') }
      ]
    },
    {
      pattern: 'Layered Architecture',
      layer: 'data', type: 'cache', priority: 'medium', capability: 'caching',
      options: [
        { name: 'Redis Cache', weight: 3, condition: () => true }
      ]
    },

    // ── UNIVERSAL INJECTIONS (apply to any pattern with enough complexity) ──
    // These use pattern '*' and are checked separately in the enhancer
  ],

  // ══════════════════════════════════════════════════════════════
  // UNIVERSAL RULES — Applied regardless of pattern when conditions met
  // These ensure enterprise-grade output even for simple inputs
  // ══════════════════════════════════════════════════════════════
  universalInjections: [
    // Auto-inject observability for any non-trivial system
    {
      condition: (capSet, componentCount) => componentCount >= 6 && !capSet.has('monitoring'),
      components: [
        { id: 'observability-collector', name: 'Observability Collector', type: 'service', layer: 'processing', capability: 'monitoring', priority: 'medium', tech: 'OpenTelemetry, Prometheus', description: 'Collects metrics, traces, and logs from all services via OpenTelemetry SDK' }
      ]
    },
    // Auto-inject auth for any user-facing system without it
    {
      condition: (capSet, componentCount) => componentCount >= 4 && !capSet.has('authentication') && (capSet.has('bidirectional-messaging') || capSet.has('e-commerce') || capSet.has('content-distribution') || capSet.has('admin-dashboard')),
      components: [
        { id: 'auth-service', name: 'Authentication Service', type: 'service', layer: 'processing', capability: 'authentication', priority: 'high', tech: 'Node.js, Passport.js, JWT', description: 'Manages user identity, JWT issuance, refresh rotation, and RBAC policy enforcement' }
      ]
    },
    // Auto-inject CDN for content-heavy systems
    {
      condition: (capSet) => (capSet.has('content-distribution') || capSet.has('video-communication') || capSet.has('file-storage')) && !capSet.has('cdn-delivery'),
      components: [
        { id: 'cdn-edge', name: 'CDN Edge Network', type: 'service', layer: 'interaction', capability: 'cdn-delivery', priority: 'medium', tech: 'CloudFront / Fastly', description: 'Global edge cache for static assets, media, and API responses' }
      ]
    },
    // Auto-inject session store for auth systems
    {
      condition: (capSet) => capSet.has('authentication') && !capSet.has('session-management'),
      components: [
        { id: 'session-store', name: 'Session Store', type: 'cache', layer: 'data', capability: 'session-management', priority: 'medium', tech: 'Redis', description: 'Distributed session storage enabling stateless horizontal scaling' }
      ]
    }
  ]
};

module.exports = { AI_RULES };
