/**
 * ============================================================================
 * ARCHFORGE — CAPABILITY MAP CONFIGURATION v2 (ENTERPRISE)
 * ============================================================================
 * 
 * The single-token → capability mapping table. When a token (after synonym
 * resolution) matches a key here, the corresponding capability is emitted.
 * 
 * v2: Expanded to cover enterprise patterns that big companies expect:
 *   - Infrastructure: rate-limiting, circuit-breaker, service-discovery, config-mgmt
 *   - Resilience: dead-letter-queue, health-checks, blue-green deployment
 *   - Observability: distributed-tracing, centralized-logging
 *   - Domain: content-management, order-management, inventory, catalog
 *   - AI/ML: recommendation-system, nlp-processing
 *   - Compliance: audit-logging, compliance
 * ============================================================================
 */

const CAPABILITY_MAP = new Map([
  // ── Communication ──
  ['chat', {
    capability: 'bidirectional-messaging',
    category: 'communication',
    description: 'Real-time bidirectional messaging between users or systems'
  }],
  ['real-time', {
    capability: 'real-time-streaming',
    category: 'communication',
    description: 'Low-latency state propagation via persistent connections (WebSocket/SSE)'
  }],
  ['notification', {
    capability: 'push-notification',
    category: 'communication',
    description: 'Push notifications to users across channels (in-app, mobile, email)'
  }],
  ['video', {
    capability: 'video-communication',
    category: 'communication',
    description: 'Video streaming or video calling capabilities (WebRTC/HLS)'
  }],
  ['email', {
    capability: 'email-delivery',
    category: 'communication',
    description: 'Transactional and/or marketing email delivery'
  }],
  ['collaboration', {
    capability: 'real-time-collaboration',
    category: 'communication',
    description: 'Multi-user real-time document or workspace collaboration'
  }],

  // ── Processing ──
  ['queue', {
    capability: 'async-processing',
    category: 'processing',
    description: 'Asynchronous job processing via message queues (Kafka, RabbitMQ, SQS)'
  }],
  ['news', {
    capability: 'content-ingestion',
    category: 'processing',
    description: 'Content ingestion, transformation, and distribution pipeline'
  }],
  ['feed', {
    capability: 'content-distribution',
    category: 'processing',
    description: 'Activity or content feed generation and distribution'
  }],

  // ── Persistence ──
  ['storage', {
    capability: 'persistent-storage',
    category: 'persistence',
    description: 'Durable data persistence (relational or document-based)'
  }],
  ['cache', {
    capability: 'caching',
    category: 'persistence',
    description: 'High-speed data caching layer (Redis, Memcached)'
  }],
  ['search', {
    capability: 'search-indexing',
    category: 'persistence',
    description: 'Full-text or faceted search indexing (Elasticsearch, Typesense)'
  }],
  ['file-storage', {
    capability: 'file-storage',
    category: 'persistence',
    description: 'Binary file and media object storage (S3-compatible)'
  }],

  // ── Integration ──
  ['auth', {
    capability: 'authentication',
    category: 'integration',
    description: 'User identity verification and session management'
  }],
  ['payment', {
    capability: 'payment-processing',
    category: 'integration',
    description: 'Payment gateway integration and transaction processing'
  }],
  ['api', {
    capability: 'api-gateway',
    category: 'integration',
    description: 'External API exposure or consumption via REST/GraphQL/gRPC'
  }],

  // ── Observation ──
  ['analytics', {
    capability: 'analytics',
    category: 'observation',
    description: 'User behavior and system analytics collection and reporting'
  }],
  ['monitoring', {
    capability: 'monitoring',
    category: 'observation',
    description: 'System health monitoring, metrics, logging, and alerting'
  }],
  ['dashboard', {
    capability: 'admin-dashboard',
    category: 'observation',
    description: 'Administrative dashboard for system management and monitoring'
  }],

  // ── Resilience ──
  ['scaling', {
    capability: 'horizontal-scaling',
    category: 'resilience',
    description: 'Horizontal scaling via load balancing, clustering, or auto-scaling'
  }],
  ['security', {
    capability: 'security',
    category: 'resilience',
    description: 'Security hardening: encryption, firewall, access control'
  }],

  // ── Enterprise Infrastructure (NEW) ──
  ['rate-limiting', {
    capability: 'rate-limiting',
    category: 'resilience',
    description: 'API rate limiting and throttling to prevent abuse and ensure fair usage'
  }],
  ['circuit-breaker', {
    capability: 'circuit-breaker',
    category: 'resilience',
    description: 'Circuit breaker pattern preventing cascading failures across services'
  }],
  ['service-discovery', {
    capability: 'service-discovery',
    category: 'resilience',
    description: 'Dynamic service registration and discovery for microservices'
  }],
  ['config-management', {
    capability: 'config-management',
    category: 'resilience',
    description: 'Centralized configuration management with hot-reload support'
  }],
  ['service-mesh', {
    capability: 'service-mesh',
    category: 'resilience',
    description: 'Sidecar proxy mesh for secure inter-service communication'
  }],
  ['health-check', {
    capability: 'health-checks',
    category: 'observation',
    description: 'Liveness and readiness probes for container orchestration'
  }],
  ['distributed-tracing', {
    capability: 'distributed-tracing',
    category: 'observation',
    description: 'End-to-end request tracing across all services (OpenTelemetry/Jaeger)'
  }],
  ['centralized-logging', {
    capability: 'centralized-logging',
    category: 'observation',
    description: 'Aggregated log collection and search (ELK Stack/Loki)'
  }],

  // ── Domain-specific ──
  ['e-commerce', {
    capability: 'e-commerce',
    category: 'domain',
    description: 'E-commerce platform capabilities (catalog, cart, checkout)'
  }],
  ['scheduling', {
    capability: 'scheduling',
    category: 'domain',
    description: 'Time-based scheduling, booking, or appointment management'
  }],
  ['geo', {
    capability: 'geolocation',
    category: 'domain',
    description: 'Location-based services, GPS tracking, geofencing'
  }],
  ['ai', {
    capability: 'ml-pipeline',
    category: 'domain',
    description: 'Machine learning inference, recommendation, or NLP pipeline'
  }],
  ['admin', {
    capability: 'admin-panel',
    category: 'domain',
    description: 'Administrative interface for content and user management'
  }],
  ['content-management', {
    capability: 'content-management',
    category: 'domain',
    description: 'Content lifecycle management (create, review, publish, archive)'
  }],
  ['order-management', {
    capability: 'order-management',
    category: 'domain',
    description: 'Order lifecycle from placement through fulfillment and returns'
  }],
  ['catalog-management', {
    capability: 'catalog-management',
    category: 'domain',
    description: 'Product/service catalog with categories, attributes, and pricing'
  }],
  ['inventory-management', {
    capability: 'inventory-management',
    category: 'domain',
    description: 'Stock tracking, warehouse management, and supply chain visibility'
  }],
  ['recommendation', {
    capability: 'recommendation-system',
    category: 'domain',
    description: 'Personalized recommendation engine using collaborative/content-based filtering'
  }],
  ['nlp', {
    capability: 'nlp-processing',
    category: 'domain',
    description: 'Natural language processing for text analysis, classification, or generation'
  }],
  ['compliance', {
    capability: 'compliance',
    category: 'resilience',
    description: 'Regulatory compliance (GDPR, HIPAA, PCI-DSS, SOC2)'
  }],
  ['audit-logging', {
    capability: 'audit-logging',
    category: 'observation',
    description: 'Immutable audit trail for security events and data access'
  }],
  ['cdn', {
    capability: 'cdn-delivery',
    category: 'resilience',
    description: 'Content delivery network for edge caching and global distribution'
  }],
  ['session-management', {
    capability: 'session-management',
    category: 'integration',
    description: 'Distributed session management across service instances'
  }],
  ['security', {
    capability: 'security',
    category: 'resilience',
    description: 'Centralized secrets management, key rotation, and credential vaulting'
  }],
  ['vault', {
    capability: 'security',
    category: 'resilience',
    description: 'HashiCorp Vault or cloud-native secrets management for dynamic credentials'
  }],
  ['secrets', {
    capability: 'security',
    category: 'resilience',
    description: 'Secrets management for API keys, database credentials, and encryption keys'
  }],
]);

module.exports = { CAPABILITY_MAP };
