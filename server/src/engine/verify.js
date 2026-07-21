/**
 * Deterministic verifier — the guarantee layer.
 * ----------------------------------------------
 * Runs every principle from the registry against a design as CODE (never the
 * model's discretion). Structural violations are auto-fixed where it is safe —
 * most importantly, forbidden connections are RE-ROUTED through a valid
 * intermediary (e.g. client→DB becomes client→gateway→…). What can't be safely
 * fixed is reported as a finding with severity + Well-Architected pillar.
 *
 * verify() also returns a numeric `score` used for Best-of-N selection: the
 * candidate with the fewest violations and best capability coverage wins —
 * research shows scoring by an external verifier beats letting the model judge.
 */

import {
  isEdgeAllowed, isTypeEdgeForbidden, PRINCIPLES_BY_ID, NODE_TYPES, LAYERS,
  EXPECTED_PROTOCOL_BY_TARGET_TYPE,
} from '../contracts/index.js';
import { detectCapabilityIds, capabilitiesOfArch, CAPABILITIES } from './capabilities.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Primary OLTP datastores — the ones a read-heavy workload should cache. */
const PRIMARY_DB_TYPES = ['sql_db', 'nosql_db', 'wide_column_db', 'graph_db'];

function ensureEdge(a, source, target, protocol, label) {
  if (a.edges.some((e) => e.source === source && e.target === target)) return;
  a.edges.push({ id: `fix-${source}-${target}`, source, target, protocol, label: label || 'route', why: 'Added by verifier to satisfy the call-rules.' });
}
function removeEdge(a, id) { a.edges = a.edges.filter((e) => e.id !== id); }

/** Re-route a forbidden edge through an existing valid intermediary node. */
function reroute(a, edge, layerById, typeById) {
  const srcL = layerById[edge.source], tgtL = layerById[edge.target];
  const mids = a.nodes.filter((m) =>
    m.id !== edge.source && m.id !== edge.target &&
    isEdgeAllowed(srcL, m.layer) && isEdgeAllowed(m.layer, tgtL) &&
    !isTypeEdgeForbidden(typeById[edge.source], m.type) &&
    !isTypeEdgeForbidden(m.type, typeById[edge.target]));
  if (!mids.length) return null;
  const pref = srcL === 'client' ? 'gateway' : 'service';
  mids.sort((x, y) => (y.layer === pref) - (x.layer === pref));
  const m = mids[0];
  ensureEdge(a, edge.source, m.id, edge.protocol, `via ${m.label}`);
  ensureEdge(a, m.id, edge.target, edge.protocol, edge.label);
  removeEdge(a, edge.id);
  return m;
}

/**
 * @param {object} arch normalized architecture
 * @param {{ promptText?: string, capacity?: object }} ctx
 * @returns {{ arch, findings, score }}
 */
export function verify(arch, ctx = {}) {
  const a = clone(arch);
  const findings = [];
  const add = (id, extra = {}) => {
    const p = PRINCIPLES_BY_ID[id];
    findings.push({ id, title: p.title, severity: extra.severity || p.severity, pillar: p.pillar, message: extra.message || p.message, nodes: extra.nodes || [], edges: extra.edges || [], fixed: !!extra.fixed });
  };

  const rebuild = () => {
    const layerById = Object.fromEntries(a.nodes.map((n) => [n.id, n.layer]));
    const typeById = Object.fromEntries(a.nodes.map((n) => [n.id, n.type]));
    return { layerById, typeById };
  };
  let { layerById, typeById } = rebuild();
  const hasType = (t) => a.nodes.some((n) => n.type === t);
  const nodesInLayer = (l) => a.nodes.filter((n) => n.layer === l);

  // ── Cache for read-heavy: auto-inject, don't merely warn ───────────
  // A read-heavy system with a primary datastore but no cache is incomplete.
  // The guarantee layer adds a Redis cache in front of the datastore, wired to
  // the service that reads it — so every read-heavy diagram ships production-
  // correct. Runs first, so the new node/edge pass every check below.
  if ((arch.assumptions?.readWriteRatio ?? 0) >= 5 && PRIMARY_DB_TYPES.some(hasType) && !hasType('cache')) {
    const dbIds = new Set(a.nodes.filter((n) => PRIMARY_DB_TYPES.includes(n.type)).map((n) => n.id));
    const reader = a.nodes.find((n) => n.layer === 'service' && a.edges.some((e) => e.source === n.id && dbIds.has(e.target)))
      || a.nodes.find((n) => n.layer === 'service');
    if (reader) {
      const id = 'cache-verifier';
      a.nodes.push({
        id, label: 'Cache', type: 'cache', layer: NODE_TYPES.cache.layer, tech: 'Redis',
        why: `Added by verifier: read-heavy (${arch.assumptions.readWriteRatio}:1) access needs a cache in front of the datastore.`,
        redundant: true, stateful: true,
      });
      ensureEdge(a, reader.id, id, 'sync', 'cache read/write');
      ({ layerById, typeById } = rebuild());
      add('cache-read-heavy', { message: `Read-heavy (${arch.assumptions.readWriteRatio}:1) — added a Redis cache in front of the datastore.`, nodes: [id], fixed: true });
    } else {
      add('cache-read-heavy', { message: `Read-heavy (${arch.assumptions.readWriteRatio}:1) but no cache in front of the database.` });
    }
  }

  // ── Auth boundary: guarantee one (production mandate) ──────────────
  // Every production system needs an authentication boundary. If the model
  // omitted it, add an auth service at the entry (called by the gateway, or a
  // service if there is no gateway) rather than merely warning.
  if (!a.nodes.some((n) => n.layer === 'security')) {
    const upstream = [a.nodes.find((n) => n.layer === 'gateway'), a.nodes.find((n) => n.layer === 'service')]
      .find((u) => u && isEdgeAllowed(u.layer, 'security'));
    if (upstream) {
      const id = 'auth-verifier';
      a.nodes.push({
        id, label: 'Auth Service', type: 'auth_service', layer: NODE_TYPES.auth_service.layer, tech: 'OAuth2 / JWT',
        why: 'Added by verifier: every production system needs an authentication boundary.',
        redundant: true, stateful: false,
      });
      ensureEdge(a, upstream.id, id, 'sync', 'authenticate');
      ({ layerById, typeById } = rebuild());
      add('auth-boundary', { message: 'No authentication boundary — added an auth service at the entry.', nodes: [id], fixed: true });
    }
  }

  // ── Observability: guarantee logging + metrics + tracing ───────────
  // A production system with zero observability is not shippable. If the layer
  // is entirely absent, add the canonical trio, emitting from a representative
  // service. (When some observability exists, we leave the model's choice.)
  if (!a.nodes.some((n) => n.layer === 'observability')) {
    const emitter = a.nodes.find((n) => n.layer === 'service') || a.nodes.find((n) => n.layer === 'gateway');
    if (emitter && isEdgeAllowed(emitter.layer, 'observability')) {
      for (const [type, label, tech] of [['logging', 'Logging', 'ELK'], ['metrics', 'Metrics', 'Prometheus'], ['tracing', 'Tracing', 'Jaeger']]) {
        if (!NODE_TYPES[type]) continue;
        const id = `${type}-verifier`;
        a.nodes.push({ id, label, type, layer: 'observability', tech, why: 'Added by verifier: production systems need observability.', redundant: true, stateful: false });
        ensureEdge(a, emitter.id, id, 'async', 'emit telemetry');
      }
      ({ layerById, typeById } = rebuild());
      add('observability-present', { message: 'No observability — added logging, metrics and tracing.', fixed: true });
    }
  }

  // ── A. Structural: illegal connections → reverse / reroute / drop ──
  for (const edge of [...a.edges]) {
    const sL = layerById[edge.source], tL = layerById[edge.target];
    const sT = typeById[edge.source], tT = typeById[edge.target];
    const bad = !isEdgeAllowed(sL, tL) || isTypeEdgeForbidden(sT, tT);
    if (!bad) continue;

    // 1) The model wired it backwards — reverse if the reverse direction is legal.
    if (isEdgeAllowed(tL, sL) && !isTypeEdgeForbidden(tT, sT)) {
      const s = edge.source; edge.source = edge.target; edge.target = s;
      add('allowed-layer-edges', { edges: [edge.id], message: `Backwards connection ${sL}→${tL} reversed to ${tL}→${sL}.`, fixed: true });
      ({ layerById, typeById } = rebuild());
      continue;
    }

    // 2) Re-route through a valid intermediary; 3) otherwise drop it.
    const m = reroute(a, edge, layerById, typeById);
    if (!m) removeEdge(a, edge.id);
    add('allowed-layer-edges', {
      edges: [edge.id],
      message: m
        ? `Illegal connection ${sL}→${tL} re-routed through ${m.label}.`
        : `Illegal connection ${sL}→${tL} removed (no valid path).`,
      fixed: true,
    });
    ({ layerById, typeById } = rebuild());
  }

  // ── Orphans (no incident edges) → auto-connect where obvious ───────
  const degree = Object.fromEntries(a.nodes.map((n) => [n.id, 0]));
  for (const e of a.edges) { degree[e.source]++; degree[e.target]++; }
  const orphans = a.nodes.filter((n) => degree[n.id] === 0);

  const entry = a.nodes.find((n) => NODE_TYPES[n.type].entrypoint);
  const gateway = a.nodes.find((n) => n.layer === 'gateway');
  const services = a.nodes.filter((n) => n.layer === 'service');
  const aService = services[0];

  // Pick the service whose name best overlaps a downstream node's name, so an
  // orphan "Appointment Database" wires to the "Appointment Service", not a
  // random one. Falls back to the first service.
  const stop = new Set(['database', 'db', 'store', 'service', 'queue', 'stream', 'cache', 'index', 'the', 'a', 'and', 'of']);
  const wordsOf = (label) => (String(label).toLowerCase().match(/[a-z]+/g) || []).filter((w) => !stop.has(w));
  const bestService = (label) => {
    const want = new Set(wordsOf(label));
    let best = null, bestScore = 0;
    for (const s of services) {
      const sc = wordsOf(s.label).filter((w) => want.has(w)).length;
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    return best || aService;
  };

  const stillOrphan = [];
  for (const o of orphans) {
    let connected = false;
    if (o.layer === 'observability' && aService) {
      ensureEdge(a, aService.id, o.id, 'async', 'emit telemetry'); connected = true;
    } else if (o.layer === 'security' && gateway) {
      ensureEdge(a, gateway.id, o.id, 'sync', 'authenticate'); connected = true;
    } else if (o.layer === 'edge' && entry) {
      const down = gateway || aService;
      if (down && isEdgeAllowed('edge', down.layer)) {
        ensureEdge(a, entry.id, o.id, 'sync', 'traffic');
        ensureEdge(a, o.id, down.id, 'sync', 'forward'); connected = true;
      }
    } else if (o.layer === 'service') {
      // A service nobody can reach is dead code — make it callable from the
      // gateway (preferred), a peer service, or the entrypoint, whichever is legal.
      const up = [gateway, ...services.filter((s) => s.id !== o.id), entry]
        .find((u) => u && isEdgeAllowed(layerById[u.id], 'service') && !isTypeEdgeForbidden(typeById[u.id], o.type));
      if (up) { ensureEdge(a, up.id, o.id, 'sync', 'route'); connected = true; }
    } else if ((o.layer === 'data' || o.layer === 'async' || o.layer === 'ml') && services.length) {
      // A datastore / queue / model nobody uses — wire it from its logical service.
      if (isEdgeAllowed('service', o.layer) && !isTypeEdgeForbidden('service', o.type)) {
        const s = bestService(o.label);
        const proto = o.layer === 'async' ? 'async' : 'sync';
        const label = NODE_TYPES[o.type].isStore ? 'read/write' : o.layer === 'async' ? 'enqueue' : 'infer';
        ensureEdge(a, s.id, o.id, proto, label); connected = true;
      }
    } else if (o.layer === 'external' && services.length) {
      // An external dependency nobody calls — a payment gateway, maps API or
      // notification provider. Wire it from its logical service; notification
      // providers go async (they should not block the request path).
      if (isEdgeAllowed('service', 'external') && !isTypeEdgeForbidden('service', o.type)) {
        const s = bestService(o.label);
        const notify = ['email_service', 'sms_service', 'push_service'].includes(o.type);
        ensureEdge(a, s.id, o.id, notify ? 'async' : 'sync', notify ? 'notify' : 'call'); connected = true;
      }
    }
    if (connected) add('no-orphan-nodes', { nodes: [o.id], message: `${o.label} was unconnected — wired into the flow.`, fixed: true });
    else stillOrphan.push(o);
  }
  // NOTE: the "still unconnected" report is deferred until after the
  // reachability pass below — that pass often wires these in, and reporting
  // here would contradict its own fix.

  // ── Reachability from the entrypoint ───────────────────────────────
  // Having edges is not the same as being reachable: a gateway that nothing
  // feeds, with services hanging off it, has degree > 0 yet no user request can
  // ever arrive. Walk forward from the entrypoints and wire any stranded
  // subgraph back into the flow from the nearest legal upstream tier.
  const entryNodes = a.nodes.filter((n) => NODE_TYPES[n.type].entrypoint);
  if (entryNodes.length) {
    const order = (l) => LAYERS[l]?.order ?? 99;
    const reachableFrom = (seeds) => {
      const seen = new Set(seeds);
      const stack = [...seeds];
      while (stack.length) {
        const cur = stack.pop();
        for (const e of a.edges) {
          if (e.source === cur && !seen.has(e.target)) { seen.add(e.target); stack.push(e.target); }
        }
      }
      return seen;
    };

    let reachable = reachableFrom(entryNodes.map((n) => n.id));
    // Observability is a sink fed by others; it is never "on the request path".
    const stranded = a.nodes.filter((n) => !reachable.has(n.id) && n.layer !== 'observability');

    const rewired = [];
    for (const s of stranded) {
      if (reachable.has(s.id)) continue; // an earlier fix may have pulled it in
      // Prefer the closest reachable tier ABOVE this node that may legally call it.
      const up = a.nodes
        .filter((n) => reachable.has(n.id)
          && isEdgeAllowed(n.layer, s.layer)
          && !isTypeEdgeForbidden(n.type, s.type))
        .sort((x, y) => {
          const dx = order(s.layer) - order(x.layer), dy = order(s.layer) - order(y.layer);
          const px = dx >= 0 ? dx : 100 - dx, py = dy >= 0 ? dy : 100 - dy; // upstream wins
          return px - py;
        })[0];
      if (up) {
        // Use the protocol the target type demands (a stream processor wants
        // "stream", a queue "async") so this fix never introduces a violation.
        const proto = EXPECTED_PROTOCOL_BY_TARGET_TYPE[s.type] || (s.layer === 'async' ? 'async' : 'sync');
        ensureEdge(a, up.id, s.id, proto, 'route');
        reachable = reachableFrom(entryNodes.map((n) => n.id)); // the fix may free a whole subtree
        rewired.push(s.label);
      }
    }
    if (rewired.length) {
      add('no-orphan-nodes', {
        nodes: stranded.map((n) => n.id),
        message: `Unreachable from the entrypoint — wired back into the flow: ${rewired.join(', ')}.`,
        fixed: true,
      });
      ({ layerById, typeById } = rebuild());
    }
    const stillStranded = a.nodes.filter((n) => !reachable.has(n.id) && n.layer !== 'observability');
    if (stillStranded.length) {
      add('no-orphan-nodes', {
        nodes: stillStranded.map((n) => n.id),
        message: `Not reachable from any entrypoint: ${stillStranded.map((n) => n.label).join(', ')}.`,
      });
    }
  }

  // Anything the orphan pass could not wire AND the reachability pass did not
  // rescue is a genuine leftover — report it once, here, with final state.
  {
    const deg2 = Object.fromEntries(a.nodes.map((n) => [n.id, 0]));
    for (const e of a.edges) { deg2[e.source]++; deg2[e.target]++; }
    const leftover = a.nodes.filter((n) => deg2[n.id] === 0);
    if (leftover.length) {
      add('no-orphan-nodes', { nodes: leftover.map((n) => n.id), message: `Unconnected: ${leftover.map((n) => n.label).join(', ')}.` });
    }
  }

  // ── Stores must be sinks ───────────────────────────────────────────
  for (const n of a.nodes) {
    if (!NODE_TYPES[n.type].isStore) continue;
    // Allowed store-originated flows: replication (→data), change-data-capture
    // (→async/stream), and telemetry (→observability). Anything else is wrong.
    const out = a.edges.filter((e) => e.source === n.id && !['observability', 'data', 'async'].includes(layerById[e.target]));
    if (out.length) add('stores-are-sinks', { nodes: [n.id], edges: out.map((e) => e.id), message: `${n.label} (a datastore) originates calls; datastores should be sinks.` });
  }

  // ── Entrypoint ─────────────────────────────────────────────────────
  if (!a.nodes.some((n) => NODE_TYPES[n.type].entrypoint)) {
    add('has-entrypoint', { severity: 'warning', message: 'No client/entrypoint — fine for an internal subsystem, otherwise add one.' });
  }

  // ── Graph integrity: edges must reference real nodes ───────────────
  // Normalization already drops danglers; this is the invariant guard that
  // catches anything a later stage (or a user edit) breaks.
  const nodeIds = new Set(a.nodes.map((n) => n.id));
  const dangling = a.edges.filter((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  if (dangling.length) {
    a.edges = a.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    add('valid-node-refs', { edges: dangling.map((e) => e.id), message: `${dangling.length} edge(s) pointed at a component that no longer exists — removed.`, fixed: true });
  }

  // ── Protocol correctness ───────────────────────────────────────────
  // A user-drawn edge defaults to "sync"; anything feeding a queue or stream
  // is asynchronous by definition, so correct it rather than leave it wrong.
  for (const e of a.edges) {
    const want = EXPECTED_PROTOCOL_BY_TARGET_TYPE[typeById[e.target]];
    if (want && e.protocol !== want) {
      const wasProto = e.protocol;
      e.protocol = want;
      add('protocol-correctness', { edges: [e.id], message: `${e.label || 'connection'} into ${a.nodes.find((n) => n.id === e.target)?.label} was ${wasProto} — corrected to ${want}.`, fixed: true });
    }
  }

  // ── Stateless application tier ─────────────────────────────────────
  const statefulServices = a.nodes.filter((n) => n.layer === 'service' && n.stateful === true);
  if (statefulServices.length) {
    add('stateless-app-tier', { nodes: statefulServices.map((n) => n.id), message: `${statefulServices.map((n) => n.label).join(', ')} hold state — move session/state into a cache or store so instances stay interchangeable.` });
  }

  // ── CDN for user-facing static/media ───────────────────────────────
  if (a.nodes.some((n) => NODE_TYPES[n.type].entrypoint) && hasType('blob_storage') && !hasType('cdn')) {
    add('cdn-for-static', { message: 'User-facing files are served straight from object storage — put a CDN in front to cut latency and egress cost.' });
  }

  // ── Rate limiting at the edge ──────────────────────────────────────
  const RATE_LIMIT_TYPES = ['waf', 'api_key_service', 'reverse_proxy'];
  if (nodesInLayer('gateway').length && !RATE_LIMIT_TYPES.some(hasType)) {
    add('rate-limit-at-gateway', { message: 'No explicit rate limiting at the edge — add it at the gateway/WAF to protect downstream services from abuse and spikes.' });
  }

  // ── Idempotency for money movement ─────────────────────────────────
  const moneyNodes = a.nodes.filter((n) => ['payment_gateway', 'ledger_db'].includes(n.type));
  if (moneyNodes.length) {
    add('idempotent-critical-writes', { nodes: moneyNodes.map((n) => n.id), message: `Money-moving paths (${moneyNodes.map((n) => n.label).join(', ')}) must use idempotency keys so a retry can never double-charge.` });
  }

  // ── Partitioning for data volume ───────────────────────────────────
  const totalBytes = ctx.capacity?.raw?.totalStorageBytes ?? 0;
  const TB = 1024 ** 4;
  if (totalBytes > TB && PRIMARY_DB_TYPES.some(hasType)) {
    add('sharding-for-volume', { message: `~${(totalBytes / TB).toFixed(1)} TB projected — a single primary will not hold this; plan sharding/partitioning and read replicas.` });
  }

  // ── Latency budget on the hottest path ─────────────────────────────
  // Rough model: each synchronous network hop costs ~15 ms.
  const slo = arch.assumptions?.latencySloMs ?? 0;
  if (slo > 0) {
    const entryIds = a.nodes.filter((n) => NODE_TYPES[n.type].entrypoint).map((n) => n.id);
    let hops = 0;
    if (entryIds.length) {
      const depth = Object.fromEntries(entryIds.map((id) => [id, 0]));
      const queue = [...entryIds];
      while (queue.length) {
        const cur = queue.shift();
        for (const e of a.edges) {
          if (e.source !== cur || e.protocol === 'async' || depth[e.target] !== undefined) continue;
          if (layerById[e.target] === 'observability') continue;
          depth[e.target] = depth[cur] + 1;
          hops = Math.max(hops, depth[e.target]);
          queue.push(e.target);
        }
      }
    }
    const estMs = hops * 15;
    if (hops && estMs > slo) {
      add('latency-budget', { message: `The hottest path is ~${hops} synchronous hops (~${estMs} ms) against a ${slo} ms SLO — cache earlier or collapse a hop.` });
    }
  }

  // ── Right-sized: obvious over-provisioning ─────────────────────────
  const peakForSize = ctx.capacity?.raw?.peakQps ?? 0;
  if (peakForSize > 0 && peakForSize < 50 && a.nodes.length > 24) {
    add('right-sized', { message: `Estimated peak is only ~${Math.round(peakForSize)} QPS but the design has ${a.nodes.length} components — this is more machinery than the stated load needs.` });
  }

  // ── Components nobody asked for ────────────────────────────────────
  // Only DOMAIN features count here. Cross-cutting production infrastructure
  // (auth, caching, queues, observability) is mandated by the production
  // baseline — and some of it this verifier injects itself — so flagging it
  // would contradict our own guarantees.
  // Markers are deliberately narrower than a capability's full nodeTypes: a
  // stream processor or event bus is general plumbing (Kafka moves location
  // pings, not just analytics), so only unmistakably domain-specific
  // components count as "nobody asked for this".
  const DOMAIN_MARKERS = {
    payments: ['payment_gateway', 'ledger_db'],
    search: ['search_index'],
    ml: ['model_serving', 'vector_db', 'feature_store'],
    geo: ['maps_service'],
    realtime: ['websocket_server'],
    analytics: ['data_warehouse'],
  };
  const askedCaps = new Set(detectCapabilityIds(ctx.promptText || ''));
  if (ctx.promptText) {
    const unasked = [];
    for (const n of a.nodes) {
      for (const [capId, markers] of Object.entries(DOMAIN_MARKERS)) {
        if (markers.includes(n.type) && !askedCaps.has(capId)) { unasked.push(`${n.label} (${CAPABILITIES[capId].label})`); break; }
      }
    }
    if (unasked.length) {
      add('no-hallucinated-components', { message: `Not requested in the prompt — keep only if you actually need them: ${unasked.join(', ')}.` });
    }
  }

  // ── DB-per-service (shared primary DB) ─────────────────────────────
  for (const n of a.nodes) {
    if (!PRIMARY_DB_TYPES.includes(n.type)) continue;
    const writers = new Set(a.edges.filter((e) => e.target === n.id && layerById[e.source] === 'service').map((e) => e.source));
    if (writers.size > 1) add('db-per-service', { nodes: [n.id, ...writers], message: `${n.label} is shared by ${writers.size} services — prefer a database per service.` });
  }

  // ── SPOF: critical stateful nodes without redundancy ───────────────
  for (const n of a.nodes) {
    const critical = (n.layer === 'gateway' || NODE_TYPES[n.type].isStore || n.stateful) && n.layer !== 'observability';
    if (critical && n.redundant === false) {
      add('no-single-point-of-failure', { nodes: [n.id], severity: 'warning', message: `${n.label} is critical but not marked redundant — a single point of failure.` });
    }
  }

  // ── No asynchronous path at all ────────────────────────────────────
  // A production system of any size has slow, spiky or fan-out work that must
  // not block a request — notifications, billing, indexing, event streams. The
  // readiness checklist scores this, so it belongs in the findings too rather
  // than only as a silent checkbox. Reported, not auto-fixed: what the queue is
  // FOR is domain-specific, and inventing one would be guesswork.
  const ASYNC_TYPES = ['message_queue', 'event_bus', 'stream_processor', 'worker'];
  if (a.nodes.length >= 8 && !ASYNC_TYPES.some(hasType) && nodesInLayer('service').length) {
    add('async-offload', {
      message: 'No queue, stream or worker anywhere — every piece of slow or fan-out work is running inside the request path.',
    });
  }

  // ── Async offload for external notifications ───────────────────────
  const notifyTypes = ['email_service', 'sms_service', 'push_service'];
  for (const e of a.edges) {
    if (notifyTypes.includes(typeById[e.target]) && layerById[e.source] === 'service' && e.protocol === 'sync') {
      add('async-offload', { edges: [e.id], message: `${e.label}: notifications should be sent async via a queue/worker, not synchronously.` });
    }
  }

  // ── Dedicated search ───────────────────────────────────────────────
  const caps = detectCapabilityIds(ctx.promptText || '');
  if (caps.includes('search') && !hasType('search_index')) {
    add('dedicated-search', { message: 'Search was requested but there is no dedicated search index.' });
  }

  // ── Analytics via pipeline (no direct OLTP → warehouse) ────────────
  for (const n of a.nodes) {
    if (n.type !== 'data_warehouse') continue;
    const direct = a.edges.filter((e) => e.target === n.id && layerById[e.source] === 'service');
    if (direct.length) add('analytics-via-pipeline', { nodes: [n.id], edges: direct.map((e) => e.id), message: `${n.label} is written to directly by a service — feed it via a stream/ETL instead.` });
  }

  // ── Observability & auth boundary ──────────────────────────────────
  if (!nodesInLayer('observability').length) add('observability-present', {});
  if (!nodesInLayer('security').length) add('auth-boundary', {});

  // ── Capability coverage ────────────────────────────────────────────
  const have = capabilitiesOfArch(a);
  const missing = caps.filter((c) => CAPABILITIES[c].nodeTypes.length && !have.has(c));
  for (const c of missing) add('capability-coverage', { message: `Requested capability "${CAPABILITIES[c].label}" has no matching component.` });

  // ── Scaled for QPS ─────────────────────────────────────────────────
  const peak = ctx.capacity?.raw?.peakQps ?? 0;
  if (peak > 1_000 && !hasType('load_balancer') && !hasType('api_gateway')) {
    add('scaled-for-qps', { message: `Estimated peak ~${Math.round(peak)} QPS needs a load balancer / gateway in front of services.` });
  }

  // De-duplicate any edges the fixes may have collided on.
  const eseen = new Set();
  a.edges = a.edges.filter((e) => {
    const k = `${e.source}->${e.target}:${e.protocol}`;
    if (eseen.has(k)) return false;
    eseen.add(k);
    return true;
  });

  // ── Score for Best-of-N selection ──────────────────────────────────
  const unfixed = findings.filter((f) => !f.fixed);
  const errors = unfixed.filter((f) => f.severity === 'error').length;
  const warnings = unfixed.filter((f) => f.severity === 'warning').length;
  const infos = unfixed.filter((f) => f.severity === 'info').length;
  const coverage = caps.length ? caps.filter((c) => have.has(c)).length / caps.length : 1;
  const richness = Math.min(1, a.nodes.length / 8);
  const score = Math.round(coverage * 100 - errors * 40 - warnings * 8 - infos * 1 + richness * 10);

  return { arch: a, findings, score, coverage, counts: { errors, warnings, infos } };
}
