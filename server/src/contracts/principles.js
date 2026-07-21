/**
 * ArchForge — Principle registry (the Correctness Contract, as data).
 * ------------------------------------------------------------------
 * Every rule a sound architecture must satisfy lives here as a declarative
 * entry. The Phase-3 verifier implements a check function keyed by `id`; this
 * registry is the single source of truth for what each rule means, how severe
 * a violation is, which Well-Architected pillar it maps to, and whether the
 * verifier may auto-fix it. New principles are added by appending here.
 *
 * severity: 'error'   → structurally invalid; auto-fixed or the diagram is marked invalid
 *           'warning' → violates a best practice; surfaced, sometimes auto-fixed
 *           'info'    → advisory / trade-off note
 *
 * pillar:   AWS Well-Architected pillar this rolls up into.
 */

export const PILLARS = [
  'reliability',
  'performance',
  'security',
  'cost',
  'operational',
  'sustainability',
];

export const PRINCIPLES = [
  // ── A. Structural / graph correctness ──────────────────────────────
  {
    id: 'valid-node-refs',
    title: 'Edges reference real nodes',
    severity: 'error', pillar: 'operational', autofixable: false,
    message: 'Every edge must connect two nodes that exist in the diagram.',
  },
  {
    id: 'allowed-layer-edges',
    title: 'Only valid layer-to-layer connections',
    severity: 'error', pillar: 'reliability', autofixable: false,
    message: 'Connections must follow the call rules (e.g. clients never talk to a database directly).',
  },
  {
    id: 'no-orphan-nodes',
    title: 'No orphan / unreachable components',
    severity: 'warning', pillar: 'operational', autofixable: false,
    message: 'Every component should be reachable from an entrypoint (or explicitly justified).',
  },
  {
    id: 'stores-are-sinks',
    title: 'Datastores are sinks',
    severity: 'warning', pillar: 'reliability', autofixable: false,
    message: 'Datastores should not originate calls (except replication or change-data-capture).',
  },
  {
    id: 'protocol-correctness',
    title: 'Correct protocol per connection',
    severity: 'warning', pillar: 'performance', autofixable: true,
    message: 'Connections into queues/streams must be async/stream, request paths sync.',
  },
  {
    id: 'has-entrypoint',
    title: 'System has an entrypoint',
    severity: 'error', pillar: 'operational', autofixable: false,
    message: 'A system must have at least one client / traffic origin.',
  },

  // ── B. Distributed-systems principles ──────────────────────────────
  {
    id: 'db-per-service',
    title: 'Database per service',
    severity: 'warning', pillar: 'reliability', autofixable: false,
    message: 'In a microservice design, services should not share one database.',
  },
  {
    id: 'no-single-point-of-failure',
    title: 'No single point of failure',
    severity: 'warning', pillar: 'reliability', autofixable: false,
    message: 'Critical stateful/entry components need redundancy or must be flagged as a SPOF.',
  },
  {
    id: 'stateless-app-tier',
    title: 'Stateless application tier',
    severity: 'info', pillar: 'reliability', autofixable: false,
    message: 'App services should be stateless (session/state in cache or store) so they scale horizontally.',
  },
  {
    id: 'cache-read-heavy',
    title: 'Cache read-heavy workloads',
    severity: 'warning', pillar: 'performance', autofixable: false,
    message: 'A read-heavy workload should place a cache in front of the primary datastore.',
  },
  {
    id: 'async-offload',
    title: 'Offload slow work asynchronously',
    severity: 'warning', pillar: 'performance', autofixable: false,
    message: 'Email, notifications and analytics should go through a queue/worker, not block the request.',
  },
  {
    id: 'cdn-for-static',
    title: 'CDN for static assets',
    severity: 'info', pillar: 'performance', autofixable: false,
    message: 'Serve static assets via a CDN; keep dynamic APIs off the CDN.',
  },
  {
    id: 'dedicated-search',
    title: 'Dedicated search index',
    severity: 'warning', pillar: 'performance', autofixable: false,
    message: 'Full-text search should use a search index, not LIKE-scans on the primary DB.',
  },
  {
    id: 'analytics-via-pipeline',
    title: 'Feed analytics via a pipeline',
    severity: 'warning', pillar: 'reliability', autofixable: false,
    message: 'Data warehouses should be fed by stream/ETL, never written to directly by OLTP services.',
  },
  {
    id: 'rate-limit-at-gateway',
    title: 'Rate limiting at the edge/gateway',
    severity: 'info', pillar: 'security', autofixable: false,
    message: 'Apply rate limiting at the gateway to protect downstream services.',
  },
  {
    id: 'idempotent-critical-writes',
    title: 'Idempotency for critical writes',
    severity: 'info', pillar: 'reliability', autofixable: false,
    message: 'Payments and other critical writes should be idempotent / retry-safe.',
  },

  // ── C. Well-Architected coverage ───────────────────────────────────
  {
    id: 'observability-present',
    title: 'Observability is present',
    severity: 'warning', pillar: 'operational', autofixable: false,
    message: 'A production system should include logging/metrics/tracing.',
  },
  {
    id: 'auth-boundary',
    title: 'Authentication boundary',
    severity: 'warning', pillar: 'security', autofixable: false,
    message: 'Requests should pass an auth boundary; datastores must not be publicly reachable.',
  },
  {
    id: 'right-sized',
    title: 'Right-sized for the load',
    severity: 'info', pillar: 'cost', autofixable: false,
    message: 'Components should match the estimated load — neither a SPOF nor wastefully over-provisioned.',
  },

  // ── D. Capacity sanity ─────────────────────────────────────────────
  {
    id: 'scaled-for-qps',
    title: 'Scaled for estimated QPS',
    severity: 'warning', pillar: 'performance', autofixable: false,
    message: 'High estimated QPS requires a load balancer, multiple instances and a cache.',
  },
  {
    id: 'sharding-for-volume',
    title: 'Partitioning for data volume',
    severity: 'info', pillar: 'performance', autofixable: false,
    message: 'Very large datasets imply sharding/partitioning or read replicas.',
  },
  {
    id: 'latency-budget',
    title: 'Path latency within SLO',
    severity: 'info', pillar: 'performance', autofixable: false,
    message: 'The estimated latency of the hottest request path should fit the stated SLO.',
  },

  // ── E. Prompt coverage ─────────────────────────────────────────────
  {
    id: 'capability-coverage',
    title: 'Every requested capability is present',
    severity: 'warning', pillar: 'operational', autofixable: false,
    message: 'Each capability named in the prompt should map to at least one component.',
  },
  {
    id: 'no-hallucinated-components',
    title: 'No irrelevant components',
    severity: 'info', pillar: 'cost', autofixable: false,
    message: 'The design should not include components unrelated to the stated requirements.',
  },
];

/** Fast lookup by id. */
export const PRINCIPLES_BY_ID = Object.fromEntries(PRINCIPLES.map((p) => [p.id, p]));
