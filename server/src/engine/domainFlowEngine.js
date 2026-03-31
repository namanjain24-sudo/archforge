/**
 * ============================================================================
 * ARCHFORGE — DOMAIN FLOW ENGINE v1 (FAANG-GRADE PIPELINE TEMPLATES)
 * ============================================================================
 *
 * Implements domain-specific pipeline templates that inject correct,
 * deterministic flow sequences for each detected domain.
 *
 * DOMAINS:
 *   E-commerce: User → CDN → Gateway → Cart → Order → Payment → Saga → Inventory → Kafka
 *   Chat:       User → WebSocket → Gateway → Chat Service → Redis → Fanout
 *   Analytics:  Service → Kafka → Stream Processor (Flink) → Warehouse
 *                        Kafka → Batch Processor (Spark) → Warehouse
 *
 * DESIGN:
 *   - Each pipeline is a deterministic sequence of edges
 *   - All edges pass through canConnect() validation
 *   - Domain detection uses capabilities + input text
 *   - Supplements (not replaces) generic flow engine pipelines
 * ============================================================================
 */

const { canConnect } = require('./connectionValidator');

// ═══════════════════════════════════════════════════════════════
// DOMAIN DETECTION
// ═══════════════════════════════════════════════════════════════

function detectDomains(allComps, input) {
  const capSet = new Set(allComps.map(c => c.capability).filter(Boolean));
  const inputLower = (input || '').toLowerCase();
  const domains = [];

  // E-commerce detection
  if (capSet.has('e-commerce') || capSet.has('payment-processing') ||
      capSet.has('order-management') || capSet.has('inventory-management') ||
      capSet.has('catalog-management') ||
      inputLower.includes('e-commerce') || inputLower.includes('ecommerce') ||
      inputLower.includes('shop') || inputLower.includes('store') ||
      inputLower.includes('marketplace')) {
    domains.push('ecommerce');
  }

  // Chat/Messaging detection
  if (capSet.has('bidirectional-messaging') || capSet.has('presence-tracking') ||
      inputLower.includes('chat') || inputLower.includes('messag') ||
      inputLower.includes('real-time communication') ||
      inputLower.includes('whatsapp') || inputLower.includes('slack')) {
    domains.push('chat');
  }

  // Analytics detection
  if (capSet.has('analytics') || capSet.has('real-time-streaming') ||
      capSet.has('event-streaming') ||
      inputLower.includes('analytic') || inputLower.includes('dashboard') ||
      inputLower.includes('data pipeline') || inputLower.includes('etl') ||
      inputLower.includes('big data')) {
    domains.push('analytics');
  }

  return domains;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT FINDERS — Locate components by role/name/capability
// ═══════════════════════════════════════════════════════════════

function findByRole(comps, role) {
  return comps.find(c => {
    const name = (c.name || '').toLowerCase();
    const cap = (c.capability || '').toLowerCase();
    switch (role) {
      case 'cdn':
        return cap === 'cdn-delivery' || name.includes('cdn');
      case 'gateway':
        return cap === 'api-gateway' || cap.includes('gateway') || name.includes('gateway') || name.includes('ingress');
      case 'websocket':
        return cap === 'real-time-streaming' || name.includes('websocket') || name.includes('socket');
      case 'cart':
        return cap === 'e-commerce' || name.includes('cart') || name.includes('storefront');
      case 'order':
        return cap === 'order-management' || name.includes('order');
      case 'payment':
        return cap === 'payment-processing' || name.includes('payment');
      case 'saga':
        return name.includes('saga') || name.includes('orchestrator') || name.includes('temporal');
      case 'inventory':
        return cap === 'inventory-management' || name.includes('inventory');
      case 'kafka':
        return (c.type === 'queue' && (name.includes('kafka') || name.includes('event stream') || name.includes('event-stream'))) ||
               (c.type === 'queue' && cap === 'real-time-streaming');
      case 'queue':
        return c.type === 'queue' && !name.includes('dead') && !name.includes('dlq');
      case 'chat-service':
        return cap === 'bidirectional-messaging' || name.includes('chat') || name.includes('messag');
      case 'redis':
        return c.type === 'cache' || (name.includes('redis') && c.type === 'cache');
      case 'fanout':
        return c.type === 'worker' || (name.includes('fanout') || name.includes('worker'));
      case 'flink':
        return name.includes('flink') || name.includes('stream process') || name.includes('kafka streams');
      case 'spark':
        return name.includes('spark') || name.includes('batch');
      case 'warehouse':
        return name.includes('warehouse') || name.includes('clickhouse') || name.includes('bigquery') ||
               name.includes('redshift') || name.includes('snowflake');
      case 'analytics-service':
        return cap === 'analytics' || name.includes('analytics') || name.includes('pipeline');
      case 'user':
        return c.type === 'ui';
      default:
        return false;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE TEMPLATES — Deterministic edge sequences
// ═══════════════════════════════════════════════════════════════

/**
 * E-COMMERCE PIPELINE
 * User → CDN → Gateway → Cart/Order → Payment → Saga → Inventory → Kafka
 */
function buildEcommercePipeline(allComps, addFlow) {
  const injected = [];
  const user     = findByRole(allComps, 'user');
  const cdn      = findByRole(allComps, 'cdn');
  const gateway  = findByRole(allComps, 'gateway');
  const cart     = findByRole(allComps, 'cart');
  const order    = findByRole(allComps, 'order');
  const payment  = findByRole(allComps, 'payment');
  const saga     = findByRole(allComps, 'saga');
  const inventory = findByRole(allComps, 'inventory');
  const kafka    = findByRole(allComps, 'kafka') || findByRole(allComps, 'queue');

  // User → CDN (static assets)
  if (user && cdn) {
    injected.push(addFlow(user, cdn, 'order-flow', {
      protocol: 'HTTPS', label: 'Loads Assets',
      reason: `${user.name} loads static storefront assets (JS, CSS, images) from ${cdn.name} edge nodes for sub-100ms global delivery`
    }));
  }

  // User → Gateway (API requests)
  if (user && gateway) {
    injected.push(addFlow(user, gateway, 'order-flow', {
      protocol: 'HTTPS', label: 'API Requests',
      reason: `${user.name} sends checkout/browse API requests to ${gateway.name} for authenticated routing to backend services`
    }));
  }

  // Gateway → Cart/Order Service
  const orderEntry = cart || order;
  if (gateway && orderEntry) {
    injected.push(addFlow(gateway, orderEntry, 'order-flow', {
      protocol: 'HTTPS', label: 'Routes Order',
      reason: `${gateway.name} routes authenticated order requests to ${orderEntry.name} based on /v1/orders path matching`
    }));
  }

  // Cart → Order (if both exist)
  if (cart && order && cart.id !== order.id) {
    injected.push(addFlow(cart, order, 'order-flow', {
      protocol: 'HTTPS', label: 'Place Order',
      reason: `${cart.name} submits finalized cart contents to ${order.name} for order creation and lifecycle management`
    }));
  }

  // ──────────────────────────────────────────────────
  // SAGA ORCHESTRATION (complete chain with compensation)
  // Order → Saga → Payment → Saga → Inventory → Saga (Complete/Compensate)
  // ──────────────────────────────────────────────────

  // Order → Saga (initiate distributed txn)
  if (order && saga) {
    injected.push(addFlow(order, saga, 'order-flow', {
      protocol: 'HTTPS', label: 'Initiate Saga',
      reason: `${order.name} triggers the ${saga.name} to begin a distributed transaction — atomically orchestrates Payment and Inventory reservation with rollback on any failure`
    }));
  } else if (order && payment && !saga) {
    // No saga but order+payment exist: direct flow
    injected.push(addFlow(order, payment, 'order-flow', {
      protocol: 'HTTPS', label: 'Process Payment',
      reason: `${order.name} delegates payment authorization to ${payment.name} — payment failure triggers order cancellation`
    }));
  }

  if (saga) {
    // Saga Step 1: Saga → Payment
    if (payment) {
      injected.push(addFlow(saga, payment, 'order-flow', {
        protocol: 'HTTPS', label: 'Step 1: Authorize Payment',
        reason: `${saga.name} invokes ${payment.name} as saga step 1 — charges the customer. On failure: saga triggers compensation (refund any prior charges)`
      }));
    }

    // Saga Step 2: Saga → Inventory (after payment succeeds)
    if (inventory) {
      injected.push(addFlow(saga, inventory, 'order-flow', {
        protocol: 'HTTPS', label: 'Step 2: Reserve Stock',
        reason: `${saga.name} invokes ${inventory.name} as saga step 2 — reserves stock after successful payment. On failure: saga refunds payment via compensation workflow`
      }));
    }

    // Saga Compensation: if inventory reservation fails → refund payment
    if (payment && inventory) {
      // Compensation flow: Saga → Payment (compensate/refund)
      injected.push(addFlow(saga, payment, 'order-flow', {
        type: 'async',
        protocol: 'HTTPS',
        label: 'Compensate: Refund',
        reason: `${saga.name} compensation step — issues refund to ${payment.name} if inventory reservation (step 2) failed. ${saga.name} guarantees atomicity: either ALL steps succeed or ALL are rolled back`
      }));
    }

    // Saga Complete → Kafka (publish outcome event)
    if (kafka) {
      injected.push(addFlow(saga, kafka, 'order-flow', {
        type: 'event', protocol: 'AMQP', label: 'Saga Complete/Failed',
        reason: `${saga.name} publishes saga outcome event to ${kafka.name} — downstream consumers (notifications, analytics, audit) react to order success or failure`
      }));
    }
  }

  // Payment → Kafka (payment events for analytics)
  if (payment && kafka) {
    injected.push(addFlow(payment, kafka, 'analytics-flow', {
      type: 'event', protocol: 'AMQP', label: 'Payment Event',
      reason: `${payment.name} publishes payment success/failure events to ${kafka.name} for audit trail and analytics consumption`
    }));
  }

  // Inventory → Kafka (stock update events)
  if (inventory && kafka) {
    injected.push(addFlow(inventory, kafka, 'analytics-flow', {
      type: 'event', protocol: 'AMQP', label: 'Stock Updated',
      reason: `${inventory.name} publishes stock level change events to ${kafka.name} for real-time inventory dashboards`
    }));
  }

  return injected.filter(Boolean);
}

/**
 * CHAT PIPELINE
 * User → WebSocket Gateway → API Gateway → Chat Service → Redis Cache → Fanout Worker
 */
function buildChatPipeline(allComps, addFlow) {
  const injected = [];
  const user       = findByRole(allComps, 'user');
  const websocket  = findByRole(allComps, 'websocket');
  const gateway    = findByRole(allComps, 'gateway');
  const chatSvc    = findByRole(allComps, 'chat-service');
  const redis      = findByRole(allComps, 'redis');
  const fanout     = findByRole(allComps, 'fanout');
  const queue      = findByRole(allComps, 'queue');

  // User → WebSocket Gateway
  if (user && websocket) {
    injected.push(addFlow(user, websocket, 'domain-chat', {
      protocol: 'WSS', label: 'WebSocket Connect',
      reason: `${user.name} establishes persistent WebSocket connection to ${websocket.name} for bi-directional real-time messaging`
    }));
  }

  // WebSocket → Gateway (if gateway exists, route through it)
  if (websocket && gateway && websocket.id !== gateway.id) {
    injected.push(addFlow(websocket, gateway, 'domain-chat', {
      protocol: 'HTTPS', label: 'Routes Messages',
      reason: `${websocket.name} forwards authenticated messages to ${gateway.name} for routing and rate-limiting before reaching chat services`
    }));
  }

  // Gateway → Chat Service
  const chatEntry = gateway || websocket;
  if (chatEntry && chatSvc && chatEntry.id !== chatSvc.id) {
    injected.push(addFlow(chatEntry, chatSvc, 'domain-chat', {
      protocol: 'HTTPS', label: 'Delivers Message',
      reason: `${chatEntry.name} forwards validated chat messages to ${chatSvc.name} for persistence, delivery tracking, and read-receipt management`
    }));
  }

  // Chat Service → Redis (cache recent messages + presence)
  if (chatSvc && redis) {
    injected.push(addFlow(chatSvc, redis, 'domain-chat', {
      protocol: 'TCP', label: 'Cache + Presence',
      reason: `${chatSvc.name} stores recent messages and user presence state in ${redis.name} for sub-ms access — avoids DB lookup for active conversations`
    }));
  }

  // Redis → Chat Service (cache hit response)
  if (redis && chatSvc) {
    injected.push(addFlow(redis, chatSvc, 'domain-chat', {
      type: 'response', protocol: 'TCP', label: 'Cache Hit',
      reason: `${redis.name} returns cached messages and presence data to ${chatSvc.name} on cache hit — 10-100x faster than database lookup`
    }));
  }

  // Chat Service → Queue (for fanout delivery)
  if (chatSvc && queue) {
    injected.push(addFlow(chatSvc, queue, 'domain-chat', {
      type: 'event', protocol: 'AMQP', label: 'Fanout Message',
      reason: `${chatSvc.name} publishes message delivery events to ${queue.name} for asynchronous multi-recipient fanout delivery`
    }));
  }

  // Queue → Fanout Worker
  if (queue && fanout) {
    injected.push(addFlow(queue, fanout, 'domain-chat', {
      type: 'async', protocol: 'AMQP', label: 'Deliver to Recipients',
      reason: `${fanout.name} consumes messages from ${queue.name} and delivers to all recipients via their active WebSocket connections`
    }));
  }

  return injected.filter(Boolean);
}

/**
 * ANALYTICS PIPELINE
 * Service → Kafka → Stream Processor (Flink) → Warehouse (real-time)
 * Service → Kafka → Batch Processor (Spark) → Warehouse (batch)
 */
function buildAnalyticsPipeline(allComps, addFlow) {
  const injected = [];
  const analyticsSvc = findByRole(allComps, 'analytics-service');
  const kafka     = findByRole(allComps, 'kafka') || findByRole(allComps, 'queue');
  const flink     = findByRole(allComps, 'flink');
  const spark     = findByRole(allComps, 'spark');
  const warehouse = findByRole(allComps, 'warehouse');

  // Any core service → Kafka (event sourcing for analytics)
  const coreServices = allComps.filter(c =>
    c.type === 'service' && !isInfraComp(c)
  );

  // Top 2 core services publish events to Kafka for analytics
  if (kafka) {
    const publishers = coreServices.slice(0, Math.min(2, coreServices.length));
    for (const svc of publishers) {
      injected.push(addFlow(svc, kafka, 'analytics-flow', {
        type: 'event', protocol: 'TCP/TLS', label: 'Domain Events',
        reason: `${svc.name} publishes domain events to ${kafka.name} for analytics consumption — enables event sourcing without coupling to analytics service`
      }));
    }
  }

  // Kafka → Flink (real-time stream processing)
  if (kafka && flink) {
    injected.push(addFlow(kafka, flink, 'analytics-flow', {
      type: 'async', protocol: 'TCP/TLS', label: 'Stream Consume',
      reason: `${flink.name} consumes events from ${kafka.name} in real-time for sub-second windowed aggregation, CEP, and streaming ETL`
    }));
  }

  // Flink → Warehouse (ONLY Flink/ETL workers may write to DW)
  if (flink && warehouse) {
    injected.push(addFlow(flink, warehouse, 'analytics-flow', {
      type: 'async', protocol: 'TCP/SQL', label: 'Stream Write',
      reason: `${flink.name} writes real-time aggregated results to ${warehouse.name} — Flink is the ONLY authorized DW writer (Service→Kafka→Flink→DW). Direct service writes are forbidden.`
    }));
  }

  // Kafka → Spark (batch processing)
  if (kafka && spark) {
    injected.push(addFlow(kafka, spark, 'analytics-flow', {
      type: 'async', protocol: 'TCP/TLS', label: 'Batch Consume',
      reason: `${spark.name} reads historical event batches from ${kafka.name} on a scheduled cadence for large-scale aggregation and ML training`
    }));
  }

  // Spark → Warehouse (batch aggregates — ONLY Spark may write to DW in batch mode)
  if (spark && warehouse) {
    injected.push(addFlow(spark, warehouse, 'analytics-flow', {
      type: 'async', protocol: 'TCP/SQL', label: 'Batch Write',
      reason: `${spark.name} writes batch-processed aggregation results to ${warehouse.name} for historical reporting and dashboards. Enforces: Kafka→Spark→DW (no direct service writes)`
    }));
  }

  // Analytics Service → Warehouse (CQRS read model — READ ONLY, never write path)
  if (analyticsSvc && warehouse) {
    injected.push(addFlow(analyticsSvc, warehouse, 'analytics-flow', {
      protocol: 'TCP/SQL', label: 'OLAP Read',
      reason: `${analyticsSvc.name} reads from ${warehouse.name} OLAP store (CQRS read model) — READ ONLY. Write path is exclusively via Kafka→ETL Worker→DW`
    }));
  }

  return injected.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// INFRA HELPER
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
         name.includes('collector') || name.includes('observability') || name.includes('saga') ||
         name.includes('flink') || name.includes('stream process') || name.includes('kafka streams');
}

// ═══════════════════════════════════════════════════════════════
// MAIN: GENERATE DOMAIN FLOWS
// ═══════════════════════════════════════════════════════════════

/**
 * Generates domain-specific flows that supplement the generic flow engine.
 *
 * @param {object} components - Categorized components { interaction, processing, data, integration }
 * @param {string} input - Original user input text
 * @returns {{ domainFlows: Array, detectedDomains: string[] }}
 */
function generateDomainFlows(components, input) {
  const allComps = Object.values(components).flat();
  const detectedDomains = detectDomains(allComps, input);
  const domainFlows = [];
  const seenEdges = new Set();

  /**
   * Domain flow adder — validates via canConnect, deduplicates.
   */
  const addFlow = (source, target, pipelineId, overrides = {}) => {
    if (!source || !target) return null;
    if (source.id === target.id) return null;
    if (!canConnect(source, target)) return null;

    const key = `${source.id}->${target.id}`;
    if (seenEdges.has(key)) return null;
    seenEdges.add(key);

    const flow = {
      source: source.id,
      target: target.id,
      type: overrides.type || 'request',
      label: overrides.label || 'Connects',
      protocol: overrides.protocol || 'HTTPS',
      reason: overrides.reason || `Domain flow: ${source.name} → ${target.name}`,
      pipelineId,
      weight: overrides.weight || 4,
      step: 0,
      isDomainFlow: true
    };

    domainFlows.push(flow);
    return flow;
  };

  // Build domain-specific pipelines
  for (const domain of detectedDomains) {
    switch (domain) {
      case 'ecommerce':
        buildEcommercePipeline(allComps, addFlow);
        console.log(`\x1b[35m[DOMAIN] E-commerce pipeline injected (${domainFlows.length} domain flows)\x1b[0m`);
        break;
      case 'chat':
        buildChatPipeline(allComps, addFlow);
        console.log(`\x1b[35m[DOMAIN] Chat pipeline injected (${domainFlows.length} domain flows)\x1b[0m`);
        break;
      case 'analytics':
        buildAnalyticsPipeline(allComps, addFlow);
        console.log(`\x1b[35m[DOMAIN] Analytics pipeline injected (${domainFlows.length} domain flows)\x1b[0m`);
        break;
    }
  }

  return { domainFlows, detectedDomains };
}

module.exports = { generateDomainFlows, detectDomains };
