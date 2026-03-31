/**
 * ============================================================================
 * ARCHFORGE — COMPONENT MAP v4 (ENTERPRISE GRADE)
 * ============================================================================
 * 
 * Maps capabilities to production-ready system components with:
 *  - Technology stack recommendations
 *  - Human-readable descriptions
 *  - Communication protocols
 *  - Cloud service mappings (AWS / GCP / Azure)
 * 
 * v4: Added enterprise infrastructure components for:
 *  - Rate Limiting, Circuit Breaker, Service Discovery, Config Management
 *  - CDN, Session Management, Service Mesh
 *  - Content/Order/Catalog/Inventory Management
 *  - Recommendation System, NLP, Compliance, Audit Logging
 *  - Distributed Tracing, Centralized Logging, Health Checks
 * ============================================================================
 */

const COMPONENT_MAP = {
  // ── Communication ──
  'bidirectional-messaging': [
    { layer: 'interaction', type: 'ui', baseName: 'Chat Client', tech: 'React, WebSocket', description: 'Provides real-time messaging interface to end users via persistent WebSocket connections' },
    { layer: 'processing', type: 'service', baseName: 'Messaging Service', tech: 'Node.js, Socket.IO', description: 'Handles message routing, delivery confirmation, and presence tracking between connected clients', protocol: 'WebSocket' },
    { layer: 'data', type: 'database', baseName: 'Message Store', tech: 'MongoDB, Redis', description: 'Persists message history and maintains active session state for reconnection support' }
  ],
  'real-time-streaming': [
    { layer: 'interaction', type: 'service', baseName: 'WebSocket Gateway', tech: 'Node.js, ws', description: 'Manages persistent bidirectional connections for low-latency state propagation', protocol: 'WSS' },
    { layer: 'processing', type: 'service', baseName: 'Stream Processor', tech: 'Apache Flink', description: 'Processes high-throughput event streams with exactly-once delivery guarantees', protocol: 'TCP' },
    { layer: 'integration', type: 'queue', baseName: 'Event Stream', tech: 'Apache Kafka', description: 'Distributed commit log providing durable, ordered event streaming across services', protocol: 'TCP/TLS' }
  ],
  'push-notification': [
    { layer: 'processing', type: 'service', baseName: 'Notification Service', tech: 'Node.js, Bull', description: 'Orchestrates multi-channel notification delivery with retry logic and rate limiting', protocol: 'HTTPS' },
    { layer: 'integration', type: 'external', baseName: 'Push Provider', tech: 'Firebase FCM / APNs', description: 'External push notification gateway for mobile and web push delivery' }
  ],
  'video-communication': [
    { layer: 'interaction', type: 'ui', baseName: 'Video Client', tech: 'React, WebRTC', description: 'Peer-to-peer video/audio rendering with adaptive bitrate and screen sharing support' },
    { layer: 'processing', type: 'service', baseName: 'Signaling Server', tech: 'Node.js, Socket.IO', description: 'Coordinates WebRTC session establishment, ICE candidate exchange, and room management', protocol: 'WSS' },
    { layer: 'integration', type: 'external', baseName: 'TURN/STUN Server', tech: 'Twilio, Coturn', description: 'NAT traversal relay ensuring connectivity behind firewalls and symmetric NATs' }
  ],
  'email-delivery': [
    { layer: 'processing', type: 'service', baseName: 'Email Service', tech: 'Node.js, Nodemailer', description: 'Handles transactional and marketing email composition, templating, and delivery tracking', protocol: 'SMTP/HTTPS' },
    { layer: 'integration', type: 'external', baseName: 'SMTP Provider', tech: 'SendGrid / AWS SES', description: 'Managed email delivery infrastructure with bounce handling and analytics' }
  ],

  // ── Processing ──
  'async-processing': [
    { layer: 'processing', type: 'worker', baseName: 'Background Worker', tech: 'Node.js, BullMQ', description: 'Processes queued jobs asynchronously with configurable concurrency, priorities, and dead-letter handling' },
    { layer: 'integration', type: 'queue', baseName: 'Task Queue', tech: 'Redis / RabbitMQ', description: 'Durable message broker providing at-least-once delivery guarantees for async workloads', protocol: 'AMQP' }
  ],
  'content-ingestion': [
    { layer: 'processing', type: 'service', baseName: 'Ingestion Pipeline', tech: 'Python, Apache Beam', description: 'ETL pipeline that normalizes, validates, and enriches incoming content before persistence' },
    { layer: 'data', type: 'database', baseName: 'Staging Store', tech: 'PostgreSQL', description: 'Temporary staging area for ingested content pending validation and enrichment' }
  ],
  'content-distribution': [
    { layer: 'processing', type: 'service', baseName: 'Feed Generator', tech: 'Node.js, GraphQL', description: 'Computes personalized content feeds using fan-out-on-write with ranking algorithms', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Content Store', tech: 'MongoDB', description: 'Document store for rich content objects with full-text search and geospatial indexing' },
    { layer: 'integration', type: 'service', baseName: 'CDN Edge', tech: 'CloudFront / Fastly', description: 'Global edge cache network reducing latency for static and semi-dynamic content delivery' }
  ],

  // ── Persistence ──
  'persistent-storage': [
    { layer: 'data', type: 'database', baseName: 'Primary Database', tech: 'PostgreSQL', description: 'ACID-compliant relational database storing core business entities with referential integrity' }
  ],
  'caching': [
    { layer: 'data', type: 'cache', baseName: 'Cache Layer', tech: 'Redis Cluster', description: 'In-memory data structure store providing sub-millisecond reads for hot data and session state' }
  ],
  'search-indexing': [
    { layer: 'data', type: 'database', baseName: 'Search Engine', tech: 'Elasticsearch / OpenSearch', description: 'Distributed search and analytics engine supporting full-text, faceted, and vector search' },
    { layer: 'processing', type: 'service', baseName: 'Index Sync Worker', tech: 'Node.js', description: 'CDC-driven worker that keeps search indices synchronized with primary data store in near real-time' }
  ],
  'file-storage': [
    { layer: 'data', type: 'database', baseName: 'Object Storage', tech: 'AWS S3 / MinIO', description: 'Scalable binary object storage for files, images, videos with lifecycle management' },
    { layer: 'interaction', type: 'service', baseName: 'Upload Service', tech: 'Node.js, Multer', description: 'Handles multipart uploads with virus scanning, format validation, and thumbnail generation', protocol: 'HTTPS' }
  ],

  // ── Integration ──
  'authentication': [
    { layer: 'interaction', type: 'ui', baseName: 'Auth Portal', tech: 'React, OAuth2', description: 'User-facing login/registration interface supporting SSO, MFA, and social authentication flows' },
    { layer: 'processing', type: 'service', baseName: 'Auth Service', tech: 'Node.js, Passport.js', description: 'Manages user identity, JWT token issuance, refresh rotation, and RBAC policy enforcement', protocol: 'HTTPS' },
    { layer: 'integration', type: 'external', baseName: 'Identity Provider', tech: 'Auth0 / Cognito / Keycloak', description: 'Federated identity management with OIDC/SAML support and centralized user directory' }
  ],
  'payment-processing': [
    { layer: 'interaction', type: 'ui', baseName: 'Checkout UI', tech: 'React, Stripe Elements', description: 'PCI-compliant payment form with tokenized card input and 3D Secure support' },
    { layer: 'processing', type: 'service', baseName: 'Payment Service', tech: 'Node.js, Stripe SDK', description: 'Orchestrates payment intents, captures, refunds, and subscription billing cycles', protocol: 'HTTPS' },
    { layer: 'integration', type: 'external', baseName: 'Payment Gateway', tech: 'Stripe / PayPal / Adyen', description: 'PCI DSS Level 1 certified payment processor handling card network communication' }
  ],
  'api-gateway': [
    { layer: 'interaction', type: 'service', baseName: 'API Gateway', tech: 'Kong / NGINX / AWS API GW', description: 'Centralized entry point providing rate limiting, auth termination, request routing, and API versioning', protocol: 'HTTPS' }
  ],

  // ── Observation ──
  'analytics': [
    { layer: 'processing', type: 'service', baseName: 'Analytics Pipeline', tech: 'Apache Spark / Kinesis', description: 'Ingests, transforms, and aggregates behavioral events for business intelligence reporting', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Data Warehouse', tech: 'Snowflake / BigQuery / Redshift', description: 'Columnar analytical database optimized for complex aggregation queries across billions of events' }
  ],
  'monitoring': [
    { layer: 'processing', type: 'service', baseName: 'Observability Collector', tech: 'OpenTelemetry, Prometheus', description: 'Collects distributed traces, metrics, and logs from all services with Exemplar correlation', protocol: 'gRPC' },
    { layer: 'integration', type: 'external', baseName: 'Monitoring Platform', tech: 'Datadog / Grafana Cloud', description: 'Centralized observability SaaS with alerting, dashboards, SLO tracking, and incident management' }
  ],
  'admin-dashboard': [
    { layer: 'interaction', type: 'ui', baseName: 'Admin Console', tech: 'React, Material UI', description: 'Internal administrative interface for user management, content moderation, and system configuration' },
    { layer: 'processing', type: 'service', baseName: 'Admin API', tech: 'Node.js, Express', description: 'RBAC-protected administrative API with audit logging for all state-mutating operations', protocol: 'HTTPS' }
  ],

  // ── Resilience ──
  'horizontal-scaling': [
    { layer: 'interaction', type: 'service', baseName: 'Load Balancer', tech: 'AWS ALB / NGINX / Envoy', description: 'Layer 7 load balancer distributing traffic across service replicas with health checking and circuit breaking', protocol: 'HTTPS' }
  ],
  'security': [
    { layer: 'interaction', type: 'service', baseName: 'Web Application Firewall', tech: 'AWS WAF / Cloudflare', description: 'Inspects incoming HTTP traffic filtering OWASP Top 10 attacks, bot traffic, and DDoS attempts', protocol: 'HTTPS' },
    { layer: 'processing', type: 'service', baseName: 'Security Policy Engine', tech: 'OPA / Cedar', description: 'Centralized policy decision point evaluating fine-grained authorization rules across all services', protocol: 'gRPC' },
    { layer: 'integration', type: 'external', baseName: 'Key Management Service', tech: 'AWS KMS / HashiCorp Vault', description: 'Manages encryption keys, secrets rotation, and certificate lifecycle for data-at-rest/in-transit protection' }
  ],

  // ══════════════════════════════════════════════════════════════
  // ENTERPRISE INFRASTRUCTURE (NEW v4)
  // ══════════════════════════════════════════════════════════════

  'rate-limiting': [
    { layer: 'interaction', type: 'service', baseName: 'Rate Limiter', tech: 'Redis, Sliding Window', description: 'Enforces per-client and per-endpoint rate limits using sliding window counters with distributed state', protocol: 'HTTPS' }
  ],
  'circuit-breaker': [
    { layer: 'processing', type: 'service', baseName: 'Circuit Breaker Proxy', tech: 'Resilience4j / Hystrix', description: 'Intercepts outbound calls with circuit breaker, bulkhead, and retry patterns preventing cascading failures', protocol: 'HTTPS' }
  ],
  'service-discovery': [
    { layer: 'processing', type: 'service', baseName: 'Service Registry', tech: 'Consul / Eureka / etcd', description: 'Dynamic service registration and health-aware discovery enabling zero-downtime deployments', protocol: 'gRPC' }
  ],
  'config-management': [
    { layer: 'processing', type: 'service', baseName: 'Config Server', tech: 'Spring Cloud Config / Consul KV', description: 'Centralized configuration management with environment-specific overrides and hot-reload push', protocol: 'HTTPS' }
  ],
  'service-mesh': [
    { layer: 'processing', type: 'service', baseName: 'Service Mesh Control Plane', tech: 'Istio / Linkerd', description: 'Manages sidecar proxy fleet providing mTLS, traffic shaping, observability, and policy enforcement', protocol: 'gRPC' }
  ],
  'health-checks': [
    { layer: 'processing', type: 'service', baseName: 'Health Check Endpoint', tech: 'Node.js, Kubernetes', description: 'Exposes liveness/readiness probes consumed by orchestrator for zero-downtime rolling updates', protocol: 'HTTP' }
  ],
  'distributed-tracing': [
    { layer: 'processing', type: 'service', baseName: 'Trace Collector', tech: 'Jaeger / Zipkin / Tempo', description: 'Collects and correlates distributed traces across all service boundaries for latency analysis', protocol: 'gRPC' },
    { layer: 'integration', type: 'external', baseName: 'Tracing Backend', tech: 'Jaeger / Datadog APM', description: 'Stores and visualizes distributed traces with service dependency maps and critical path analysis' }
  ],
  'centralized-logging': [
    { layer: 'processing', type: 'service', baseName: 'Log Aggregator', tech: 'Fluentd / Logstash', description: 'Collects, transforms, and ships structured logs from all services to a central search index', protocol: 'TCP' },
    { layer: 'data', type: 'database', baseName: 'Log Store', tech: 'Elasticsearch / Loki', description: 'Indexed log storage supporting full-text search, alerting rules, and retention policies' }
  ],
  'cdn-delivery': [
    { layer: 'interaction', type: 'service', baseName: 'CDN Edge Network', tech: 'CloudFront / Akamai / Fastly', description: 'Global edge cache layer serving static assets with 10-50ms latency worldwide', protocol: 'HTTPS' }
  ],
  'session-management': [
    { layer: 'data', type: 'cache', baseName: 'Session Store', tech: 'Redis, Express-Session', description: 'Distributed session store enabling sticky-session-free horizontal scaling across instances' }
  ],

  // ══════════════════════════════════════════════════════════════
  // DOMAIN-SPECIFIC (EXPANDED v4)
  // ══════════════════════════════════════════════════════════════

  'geolocation': [
    { layer: 'interaction', type: 'ui', baseName: 'Map Interface', tech: 'React, Mapbox GL', description: 'Interactive map rendering with real-time marker tracking, clustering, and geofence visualization' },
    { layer: 'processing', type: 'service', baseName: 'Location Service', tech: 'Node.js, Turf.js', description: 'Handles geospatial calculations, proximity queries, route optimization, and geofence event triggering', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Geospatial Database', tech: 'PostgreSQL + PostGIS', description: 'Spatial-indexed database supporting R-tree queries for proximity search and polygon containment checks' }
  ],
  'scheduling': [
    { layer: 'interaction', type: 'ui', baseName: 'Scheduling Interface', tech: 'React, FullCalendar', description: 'Calendar-based booking UI with drag-and-drop, timezone handling, and availability visualization' },
    { layer: 'processing', type: 'service', baseName: 'Scheduler Service', tech: 'Node.js, Agenda', description: 'Manages time-slot allocation, conflict resolution, recurring events, and reminder dispatch', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Schedule Store', tech: 'PostgreSQL', description: 'Stores scheduling data with temporal constraints, attendee relationships, and recurrence rules' }
  ],
  'e-commerce': [
    { layer: 'interaction', type: 'ui', baseName: 'Storefront', tech: 'Next.js, React', description: 'Product browsing, search, and checkout experience with SSR for SEO and performance optimization' },
    { layer: 'processing', type: 'service', baseName: 'Order Management Service', tech: 'Node.js, Express', description: 'Coordinates order lifecycle from cart through fulfillment including inventory reservation and status tracking', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Commerce Database', tech: 'PostgreSQL', description: 'Stores product catalog, inventory levels, order history, and customer data with transactional integrity' }
  ],
  'ml-pipeline': [
    { layer: 'processing', type: 'service', baseName: 'ML Inference Service', tech: 'Python, FastAPI, TensorFlow', description: 'Serves trained ML models via REST/gRPC endpoints with batching, caching, and A/B model routing', protocol: 'gRPC' },
    { layer: 'data', type: 'database', baseName: 'Vector Store', tech: 'Pinecone / Qdrant / Weaviate', description: 'High-dimensional vector database for semantic search, RAG retrieval, and similarity matching' },
    { layer: 'data', type: 'database', baseName: 'Feature Store', tech: 'Feast / Redis', description: 'Centralized repository of precomputed ML features with point-in-time correctness guarantees' }
  ],

  // ── Domain Management (NEW) ──
  'content-management': [
    { layer: 'processing', type: 'service', baseName: 'CMS Service', tech: 'Node.js, Strapi / Sanity', description: 'Headless CMS managing content lifecycle with versioning, scheduling, and multi-locale support', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'CMS Database', tech: 'PostgreSQL / MongoDB', description: 'Stores content models, revisions, assets, and workflow state for editorial pipelines' }
  ],
  'order-management': [
    { layer: 'processing', type: 'service', baseName: 'Order Orchestrator', tech: 'Node.js, Temporal', description: 'Manages order state machine transitions from placement through fulfillment with compensation workflows', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Order Database', tech: 'PostgreSQL', description: 'ACID-compliant storage for order records, line items, and fulfillment tracking with audit history' }
  ],
  'catalog-management': [
    { layer: 'processing', type: 'service', baseName: 'Catalog Service', tech: 'Node.js, Express', description: 'Manages product/service catalog with hierarchical categories, attribute schemas, and pricing rules', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Catalog Database', tech: 'PostgreSQL / MongoDB', description: 'Stores product definitions, variants, images, and category hierarchies with faceted search support' }
  ],
  'inventory-management': [
    { layer: 'processing', type: 'service', baseName: 'Inventory Service', tech: 'Node.js, Express', description: 'Tracks stock levels, warehouse allocation, and reservation with optimistic locking for high concurrency', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Inventory Database', tech: 'PostgreSQL', description: 'Stores SKU-level stock records, warehouse locations, and reservation transactions' }
  ],
  'recommendation-system': [
    { layer: 'processing', type: 'service', baseName: 'Recommendation Engine', tech: 'Python, FastAPI, Surprise/LightFM', description: 'Generates personalized recommendations using collaborative filtering, content-based, and hybrid approaches', protocol: 'gRPC' },
    { layer: 'data', type: 'database', baseName: 'Interaction Store', tech: 'Redis / Cassandra', description: 'Stores user-item interaction events for real-time recommendation model updates' }
  ],
  'nlp-processing': [
    { layer: 'processing', type: 'service', baseName: 'NLP Service', tech: 'Python, spaCy / Hugging Face', description: 'Performs text classification, entity extraction, sentiment analysis, and language detection', protocol: 'gRPC' },
    { layer: 'data', type: 'database', baseName: 'NLP Model Store', tech: 'S3 / MLflow', description: 'Versioned storage for trained NLP models with A/B deployment support' }
  ],
  'compliance': [
    { layer: 'processing', type: 'service', baseName: 'Compliance Gateway', tech: 'Node.js, OPA', description: 'Evaluates data handling policies ensuring GDPR/HIPAA/PCI-DSS compliance at runtime', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Consent Store', tech: 'PostgreSQL', description: 'Stores user consent records, data processing agreements, and right-to-deletion requests' }
  ],
  'audit-logging': [
    { layer: 'processing', type: 'service', baseName: 'Audit Service', tech: 'Node.js, Kafka', description: 'Captures immutable audit events for all state-mutating operations with tamper-proof storage', protocol: 'HTTPS' },
    { layer: 'data', type: 'database', baseName: 'Audit Log Store', tech: 'Elasticsearch / TimescaleDB', description: 'Append-only audit log storage with retention policies and compliance-grade search' }
  ],
  'admin-panel': [
    { layer: 'interaction', type: 'ui', baseName: 'Admin Panel', tech: 'React, Ant Design', description: 'Full-featured admin interface for managing users, roles, content, and system settings' },
    { layer: 'processing', type: 'service', baseName: 'Admin Backend', tech: 'Node.js, Express', description: 'Administrative API with RBAC, bulk operations, and comprehensive audit logging', protocol: 'HTTPS' }
  ],

  // ══════════════════════════════════════════════════════════════
  // ENTERPRISE SECURITY & INFRASTRUCTURE (NEW v5)
  // ══════════════════════════════════════════════════════════════

  'security': [
    { layer: 'integration', type: 'external', baseName: 'Secrets Manager (Vault)', tech: 'HashiCorp Vault / AWS Secrets Manager', description: 'Centralized secrets rotation, dynamic database credentials, encryption key management, and certificate lifecycle — replaces config-stored secrets' }
  ],
  'cdn-delivery': [
    { layer: 'interaction', type: 'service', baseName: 'CDN Edge Network', tech: 'CloudFront / Fastly / Akamai', description: 'Global edge cache serving static assets (JS, CSS, images) with sub-50ms latency worldwide — prevents origin server overload', capability: 'cdn-delivery' }
  ]
};

module.exports = { COMPONENT_MAP };
