/**
 * ArchForge — Call rules (dependency-cruiser style).
 * --------------------------------------------------
 * Which layer may connect to which. The verifier flags any edge that is not
 * explicitly allowed. This is what stops the classic nonsense the old rule
 * engine produced — client wired straight to a database, services reaching
 * into another service's private DB, and so on.
 *
 * Directional: ALLOWED[fromLayer] = Set(toLayer, ...).
 */

export const ALLOWED_LAYER_EDGES = {
  client:  ['edge', 'gateway'],
  edge:    ['gateway', 'service', 'data'], // CDN → origin service / static object store
  gateway: ['service', 'security', 'data'], // data allowed ONLY for cache-type stores (see type rules)
  service: ['service', 'async', 'data', 'ml', 'external', 'security', 'observability'],
  async:   ['service', 'async', 'data', 'ml', 'external', 'observability'], // queue→worker→db, CDC→stream
  data:    ['async', 'data', 'observability'], // replication, change-data-capture, metrics
  ml:      ['data', 'ml', 'service', 'observability'],
  external:['service', 'async'],              // webhooks / callbacks back into the system
  // Auth has its own store, calls an external IdP, and reads key material from
  // a secrets manager — that last hop is security→security, the same
  // intra-layer allowance every other non-terminal layer already has.
  security:['security', 'data', 'external', 'observability'],
  observability: [],                          // pure sink
};

/**
 * Hard-forbidden pairs — always an error regardless of anything else.
 * These encode the most common and most damaging mistakes.
 */
export const FORBIDDEN_LAYER_EDGES = [
  ['client', 'data'],   // never talk to a datastore directly from the client
  ['client', 'service'],// clients go through edge/gateway, not straight to a service
  ['client', 'async'],
  ['client', 'ml'],
  ['edge', 'async'],
];

/**
 * Finer, TYPE-level forbidden connections that a layer rule can't express.
 * A gateway may reach a *cache* (rate-limit counters, edge cache) but must NOT
 * own or query a primary database — that belongs to a service.
 */
export const FORBIDDEN_TYPE_EDGES = [
  ['api_gateway', 'sql_db'], ['api_gateway', 'nosql_db'], ['api_gateway', 'wide_column_db'],
  ['api_gateway', 'graph_db'], ['api_gateway', 'data_warehouse'], ['api_gateway', 'ledger_db'],
  ['load_balancer', 'sql_db'], ['load_balancer', 'nosql_db'],
];

/** Is this specific source→target *type* connection forbidden? */
export function isTypeEdgeForbidden(sourceType, targetType) {
  return FORBIDDEN_TYPE_EDGES.some(([a, b]) => a === sourceType && b === targetType);
}

/**
 * Protocol expectations by the TARGET node type. If an edge points at one of
 * these, its protocol should match — e.g. anything feeding a message queue is
 * asynchronous by definition. The verifier auto-corrects mismatches (safe fix).
 */
export const EXPECTED_PROTOCOL_BY_TARGET_TYPE = {
  message_queue:    'async',
  event_bus:        'async',
  scheduler:        'async',
  stream_processor: 'stream',
  time_series_db:   'stream', // metrics/telemetry ingestion is typically streamed
};

/**
 * Edges that should exist for a design to be sound at a given scale. Used by
 * the verifier to flag *missing* structure (not just wrong structure).
 * Evaluated as: "if the design has <whenTypePresent>, it should also have
 * <requiredType> upstream of it." Kept declarative so principles stay data-driven.
 */
export const STRUCTURAL_EXPECTATIONS = [
  {
    id: 'lb-in-front-of-services',
    whenTypePresent: 'service',
    minScale: 'medium',
    requiredUpstreamType: ['load_balancer', 'api_gateway'],
    message: 'Services at this scale should sit behind a load balancer or gateway (avoid a single point of failure).',
  },
  {
    id: 'cache-for-read-heavy',
    whenTypePresent: 'sql_db',
    minReadWriteRatio: 5,
    requiredType: 'cache',
    message: 'Read-heavy workload — add a cache in front of the primary database.',
  },
  {
    id: 'search-index-not-db-scan',
    whenCapability: 'search',
    requiredType: 'search_index',
    message: 'Full-text search should use a dedicated search index, not scans on the primary database.',
  },
];

/** Is an edge from→to layer allowed? */
export function isEdgeAllowed(fromLayer, toLayer) {
  if (FORBIDDEN_LAYER_EDGES.some(([a, b]) => a === fromLayer && b === toLayer)) {
    return false;
  }
  return (ALLOWED_LAYER_EDGES[fromLayer] || []).includes(toLayer);
}
