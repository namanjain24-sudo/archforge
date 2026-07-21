/**
 * ArchForge — Taxonomy (single source of truth)
 * ------------------------------------------------
 * Every node type, layer and protocol the engine can produce is defined here.
 * The LLM is constrained to these values, the validator checks against them,
 * and the frontend renders from them. Accuracy starts by making the vocabulary
 * finite and well-defined — the model cannot invent an undefined component.
 */

/**
 * LAYERS — vertical bands, ordered top→bottom for the layered layout.
 * `crossCutting` layers (security, observability) are rendered as side rails,
 * not in the request-flow order, because real systems touch them from everywhere.
 */
export const LAYERS = {
  client:        { order: 0, label: 'Client',              crossCutting: false },
  edge:          { order: 1, label: 'Edge / CDN',          crossCutting: false },
  gateway:       { order: 2, label: 'Gateway',             crossCutting: false },
  service:       { order: 3, label: 'Services',            crossCutting: false },
  async:         { order: 4, label: 'Async / Messaging',   crossCutting: false },
  data:          { order: 5, label: 'Data',                crossCutting: false },
  ml:            { order: 6, label: 'ML / AI',             crossCutting: false },
  external:      { order: 7, label: 'External / 3rd-party', crossCutting: false },
  security:      { order: 8, label: 'Security / Identity', crossCutting: true },
  observability: { order: 9, label: 'Observability',       crossCutting: true },
};

export const LAYER_IDS = Object.keys(LAYERS);

/**
 * PROTOCOLS — how an edge carries data. Drives edge styling AND correctness
 * checks (e.g. an edge into a message queue must be `async`).
 */
export const PROTOCOLS = {
  sync:   { label: 'Sync — request/response', style: 'solid'   },
  async:  { label: 'Async — queue/event',     style: 'dashed'  },
  stream: { label: 'Stream — continuous',     style: 'animated' },
};

export const PROTOCOL_IDS = Object.keys(PROTOCOLS);

/**
 * NODE_TYPES — the catalog of components.
 *   layer         which band it lives in
 *   label         default human label
 *   icon          lucide-react icon name (frontend)
 *   isStore       persists data → it is a data SINK (edges rarely originate here)
 *   canBeStateful holds state → relevant to SPOF / statelessness checks
 *   entrypoint    a traffic origin (clients)
 */
export const NODE_TYPES = {
  // ── client ─────────────────────────────────────────────
  web_app:            { layer: 'client',   label: 'Web App',            icon: 'monitor',      entrypoint: true  },
  mobile_app:         { layer: 'client',   label: 'Mobile App',         icon: 'smartphone',   entrypoint: true  },
  desktop_app:        { layer: 'client',   label: 'Desktop App',        icon: 'app-window',   entrypoint: true  },
  cli:                { layer: 'client',   label: 'CLI / SDK',          icon: 'terminal',     entrypoint: true  },
  iot_device:         { layer: 'client',   label: 'IoT Device',         icon: 'cpu',          entrypoint: true  },

  // ── edge ───────────────────────────────────────────────
  cdn:                { layer: 'edge',     label: 'CDN',                icon: 'globe'      },
  waf:                { layer: 'edge',     label: 'WAF',                icon: 'shield'     },
  dns:                { layer: 'edge',     label: 'DNS',                icon: 'route'      },
  static_hosting:     { layer: 'edge',     label: 'Static Hosting',     icon: 'file-code'  },

  // ── gateway ────────────────────────────────────────────
  api_gateway:        { layer: 'gateway',  label: 'API Gateway',        icon: 'door-open'  },
  load_balancer:      { layer: 'gateway',  label: 'Load Balancer',      icon: 'split'      },
  reverse_proxy:      { layer: 'gateway',  label: 'Reverse Proxy',      icon: 'arrow-left-right' },
  bff:                { layer: 'gateway',  label: 'BFF',                icon: 'layout-panel-top' },

  // ── service ────────────────────────────────────────────
  service:            { layer: 'service',  label: 'Service',            icon: 'box',          canBeStateful: false },
  monolith:           { layer: 'service',  label: 'Monolith',           icon: 'package',      canBeStateful: false },
  serverless_function:{ layer: 'service',  label: 'Serverless Fn',      icon: 'zap',          canBeStateful: false },
  graphql_server:     { layer: 'service',  label: 'GraphQL Server',     icon: 'network',      canBeStateful: false },
  websocket_server:   { layer: 'service',  label: 'WebSocket Server',   icon: 'radio',        canBeStateful: true  },

  // ── async ──────────────────────────────────────────────
  message_queue:      { layer: 'async',    label: 'Message Queue',      icon: 'list-ordered' },
  event_bus:          { layer: 'async',    label: 'Event Bus',          icon: 'radio-tower'  },
  stream_processor:   { layer: 'async',    label: 'Stream Processor',   icon: 'waves'        },
  worker:             { layer: 'async',    label: 'Worker',             icon: 'cog',         canBeStateful: false },
  scheduler:          { layer: 'async',    label: 'Scheduler / Cron',   icon: 'clock'        },

  // ── data ───────────────────────────────────────────────
  sql_db:             { layer: 'data',     label: 'SQL Database',       icon: 'database',      isStore: true, canBeStateful: true },
  nosql_db:           { layer: 'data',     label: 'NoSQL Database',     icon: 'database',      isStore: true, canBeStateful: true },
  wide_column_db:     { layer: 'data',     label: 'Wide-Column DB',     icon: 'columns-3',     isStore: true, canBeStateful: true },
  graph_db:           { layer: 'data',     label: 'Graph Database',     icon: 'git-fork',      isStore: true, canBeStateful: true },
  time_series_db:     { layer: 'data',     label: 'Time-Series DB',     icon: 'chart-line',    isStore: true, canBeStateful: true },
  cache:              { layer: 'data',     label: 'Cache',              icon: 'gauge',         isStore: true, canBeStateful: true },
  search_index:       { layer: 'data',     label: 'Search Index',       icon: 'search',        isStore: true, canBeStateful: true },
  blob_storage:       { layer: 'data',     label: 'Object Storage',     icon: 'hard-drive',    isStore: true, canBeStateful: true },
  data_warehouse:     { layer: 'data',     label: 'Data Warehouse',     icon: 'warehouse',     isStore: true, canBeStateful: true },
  ledger_db:          { layer: 'data',     label: 'Ledger DB',          icon: 'book-lock',     isStore: true, canBeStateful: true },

  // ── ml ─────────────────────────────────────────────────
  model_serving:      { layer: 'ml',       label: 'Model Serving',      icon: 'brain'      },
  vector_db:          { layer: 'ml',       label: 'Vector DB',          icon: 'boxes',        isStore: true, canBeStateful: true },
  feature_store:      { layer: 'ml',       label: 'Feature Store',      icon: 'layers',       isStore: true, canBeStateful: true },
  training_pipeline:  { layer: 'ml',       label: 'Training Pipeline',  icon: 'workflow'   },

  // ── external ───────────────────────────────────────────
  payment_gateway:    { layer: 'external', label: 'Payment Gateway',    icon: 'credit-card' },
  email_service:      { layer: 'external', label: 'Email Service',      icon: 'mail'        },
  sms_service:        { layer: 'external', label: 'SMS Service',        icon: 'message-square' },
  push_service:       { layer: 'external', label: 'Push Notifications', icon: 'bell'        },
  maps_service:       { layer: 'external', label: 'Maps / Geo',         icon: 'map'         },
  oauth_provider:     { layer: 'external', label: 'OAuth Provider',     icon: 'key-round'   },
  third_party_api:    { layer: 'external', label: '3rd-party API',      icon: 'plug'        },

  // ── security (cross-cutting) ───────────────────────────
  auth_service:       { layer: 'security', label: 'Auth Service',       icon: 'lock',        canBeStateful: false },
  identity_provider:  { layer: 'security', label: 'Identity Provider',  icon: 'user-check'  },
  secrets_manager:    { layer: 'security', label: 'Secrets Manager',    icon: 'key-square',   isStore: true },
  api_key_service:    { layer: 'security', label: 'API Key / Token Svc', icon: 'ticket'     },

  // ── observability (cross-cutting) ──────────────────────
  logging:            { layer: 'observability', label: 'Logging',       icon: 'scroll-text', isStore: true },
  metrics:            { layer: 'observability', label: 'Metrics',       icon: 'activity'    },
  tracing:            { layer: 'observability', label: 'Tracing',       icon: 'git-commit-horizontal' },
  alerting:           { layer: 'observability', label: 'Alerting',      icon: 'siren'       },
};

export const NODE_TYPE_IDS = Object.keys(NODE_TYPES);

/** Types that persist data (data sinks). Edges should rarely originate here. */
export const STORE_TYPES = NODE_TYPE_IDS.filter((t) => NODE_TYPES[t].isStore);

/** Traffic origins. */
export const ENTRYPOINT_TYPES = NODE_TYPE_IDS.filter((t) => NODE_TYPES[t].entrypoint);

/** Convenience: type → layer. */
export const layerOf = (type) => NODE_TYPES[type]?.layer;

/** Scale buckets — drives which principles/capacity thresholds apply. */
export const SCALES = ['small', 'medium', 'large', 'hyperscale'];
