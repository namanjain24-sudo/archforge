/**
 * Explanation layer — teach the diagram, don't just draw it.
 * ----------------------------------------------------------
 * Derives a plain-English walkthrough DIRECTLY from the verified graph:
 * the request path a user's call actually takes, the background work that
 * happens off that path, what each tier is for, and what each datastore holds.
 *
 * This is deterministic on purpose. The narrative is computed from the same
 * nodes and edges the user is looking at, so it can never drift from the
 * picture (an LLM re-describing the diagram could). It also costs nothing and
 * returns instantly.
 */

import { LAYERS, NODE_TYPES } from '../contracts/index.js';

/** What each tier is for, in one line the reader can act on. */
const LAYER_ROLE = {
  client: 'Where people actually use the product — the apps that call your API.',
  edge: 'The network edge. Absorbs traffic close to users, serves cached/static content, and filters abuse before it ever reaches your servers.',
  gateway: 'The front door. Routes each request, enforces authentication and rate limits, and spreads load across service instances.',
  service: 'The business logic, split by responsibility. These stay stateless so you can add instances to handle more traffic.',
  async: 'Decoupling. Queues and streams absorb spikes and move slow work off the request path, so users never wait for it.',
  data: 'State. A purpose-built store per job, each owned by the service that needs it.',
  ml: 'Intelligence — model serving plus the feature/vector stores it reads from.',
  external: 'Third-party systems you depend on but do not run.',
  security: 'The authentication boundary — who is allowed to do what.',
  observability: 'Operations. Logs, metrics and traces so you can see and debug the system in production.',
};

/** What a given store type is typically chosen for. */
const STORE_ROLE = {
  sql_db: 'relational data needing transactions and strong consistency',
  nosql_db: 'flexible, high-volume documents that scale horizontally',
  wide_column_db: 'very large write-heavy datasets partitioned across many nodes',
  graph_db: 'highly connected data queried by relationships',
  time_series_db: 'timestamped metrics and telemetry',
  cache: 'hot data kept in memory to keep reads fast and take load off the database',
  search_index: 'full-text and faceted search, which a primary database does poorly',
  blob_storage: 'large binary files — images, video, documents',
  data_warehouse: 'historical data for analytics and reporting, kept off the live path',
  ledger_db: 'an immutable, auditable record of financial movements',
  vector_db: 'embeddings for semantic / similarity search',
  feature_store: 'precomputed features served to models consistently',
  secrets_manager: 'credentials and keys, kept out of code and config',
};

const byId = (arch) => Object.fromEntries(arch.nodes.map((n) => [n.id, n]));
const layerOrder = (l) => LAYERS[l]?.order ?? 99;
const isCrossCutting = (l) => !!LAYERS[l]?.crossCutting;
const typeLabel = (n) => NODE_TYPES[n.type]?.label || n.type;

/** One step of a flow, shaped for direct rendering. */
function step(node, edge) {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    typeLabel: typeLabel(node),
    layer: node.layer,
    tech: node.tech || null,
    why: node.why || null,
    via: edge ? (edge.label || null) : null,     // what flows along the edge INTO this node
    protocol: edge ? (edge.protocol || null) : null,
  };
}

/**
 * Walk downstream from `startId` over edges passing `edgeOk`, preferring the
 * path that reaches the deepest layer. Returns an ordered node/edge chain.
 * Breadth-first with parent tracking, so we get the shortest route to each
 * node and can reconstruct the most representative (deepest) one.
 */
function deepestPath(arch, startId, edgeOk) {
  const nodes = byId(arch);
  const parent = { [startId]: null };
  const queue = [startId];
  const seen = new Set([startId]);
  let best = startId;

  while (queue.length) {
    const cur = queue.shift();
    for (const e of arch.edges) {
      if (e.source !== cur || seen.has(e.target)) continue;
      const from = nodes[e.source], to = nodes[e.target];
      if (!from || !to || !edgeOk(e, from, to)) continue;
      seen.add(e.target);
      parent[e.target] = e;
      queue.push(e.target);
      if (layerOrder(to.layer) > layerOrder(nodes[best].layer)) best = e.target;
    }
  }

  // Reconstruct start → best.
  const chain = [];
  for (let id = best; id; ) {
    const e = parent[id];
    chain.unshift(step(nodes[id], e));
    id = e ? e.source : null;
  }
  return chain.length > 1 ? chain : [];
}

/**
 * @param {object} arch  a verified, normalized architecture
 * @returns {{ summary: string, flows: object[], layers: object[], stores: object[] }}
 */
export function explainArchitecture(arch) {
  const nodes = arch?.nodes || [];
  const edges = arch?.edges || [];
  if (!nodes.length) return { summary: '', flows: [], layers: [], stores: [] };

  const map = byId(arch);
  const flows = [];

  // ── 1. The main request path: entry → … → deepest tier, over sync edges,
  //       skipping cross-cutting tiers so the spine stays readable.
  const entry = nodes.find((n) => NODE_TYPES[n.type]?.entrypoint) || nodes.find((n) => n.layer === 'client');
  if (entry) {
    const path = deepestPath(arch, entry.id, (e, from, to) =>
      e.protocol !== 'async' && !isCrossCutting(to.layer) && layerOrder(to.layer) >= layerOrder(from.layer));
    if (path.length > 1) {
      flows.push({
        id: 'request',
        title: 'How a request flows',
        kind: 'sync',
        note: 'The synchronous path a user request takes. Everything here counts against your latency budget.',
        steps: path,
      });
    }
  }

  // ── 2. Background work: the first service→queue hop, then onward.
  const asyncEdge = edges.find((e) => {
    const from = map[e.source], to = map[e.target];
    return from && to && to.layer === 'async' && from.layer === 'service';
  });
  if (asyncEdge) {
    const head = [step(map[asyncEdge.source], null), step(map[asyncEdge.target], asyncEdge)];
    const tail = deepestPath(arch, asyncEdge.target, (e, from, to) => !isCrossCutting(to.layer));
    const steps = tail.length > 1 ? [head[0], ...tail.map((s, i) => (i === 0 ? head[1] : s))] : head;
    flows.push({
      id: 'background',
      title: 'Work that happens in the background',
      kind: 'async',
      note: 'Handed off to a queue so the user gets a response immediately — this work finishes afterwards.',
      steps,
    });
  }

  // ── 3. Realtime push, when the design has a persistent-connection tier.
  const ws = nodes.find((n) => n.type === 'websocket_server');
  if (ws) {
    const feeders = edges.filter((e) => e.target === ws.id && map[e.source]).map((e) => step(map[e.source], null));
    flows.push({
      id: 'realtime',
      title: 'How live updates reach the user',
      kind: 'realtime',
      note: 'A persistent connection pushes updates to clients instead of making them poll.',
      steps: [...feeders.slice(0, 2), step(ws, null), ...(entry ? [step(entry, null)] : [])],
    });
  }

  // ── 4. Analytics, when data leaves the live path for a warehouse.
  const warehouse = nodes.find((n) => n.type === 'data_warehouse');
  if (warehouse) {
    const feeder = edges.find((e) => e.target === warehouse.id && map[e.source]);
    flows.push({
      id: 'analytics',
      title: 'How analytics data is collected',
      kind: 'analytics',
      note: 'Events are streamed off the live path, so reporting never slows down the product.',
      steps: [
        ...(feeder ? [step(map[feeder.source], null)] : []),
        step(warehouse, feeder || null),
      ],
    });
  }

  // ── Tier guide: only the layers this design actually uses, in flow order.
  const used = [...new Set(nodes.map((n) => n.layer))]
    .sort((a, b) => layerOrder(a) - layerOrder(b));
  const layers = used.map((l) => ({
    layer: l,
    label: LAYERS[l]?.label || l,
    role: LAYER_ROLE[l] || '',
    components: nodes.filter((n) => n.layer === l).map((n) => ({
      id: n.id, label: n.label, tech: n.tech || null, why: n.why || null,
    })),
  }));

  // ── Store guide: what each datastore holds and why that engine.
  const stores = nodes
    .filter((n) => NODE_TYPES[n.type]?.isStore && n.layer !== 'observability')
    .map((n) => ({
      id: n.id,
      label: n.label,
      tech: n.tech || null,
      typeLabel: typeLabel(n),
      role: STORE_ROLE[n.type] || 'application state',
      why: n.why || null,
      writtenBy: edges.filter((e) => e.target === n.id && map[e.source]).map((e) => map[e.source].label),
    }));

  // ── One-paragraph shape of the system.
  const storeCount = stores.length;
  const serviceCount = nodes.filter((n) => n.layer === 'service').length;
  const parts = [
    `${arch.system?.name || 'This system'} is ${nodes.length} components across ${used.length} tiers.`,
    entry ? `Traffic enters through ${entry.label}` : null,
    serviceCount ? `${serviceCount} service${serviceCount > 1 ? 's' : ''} carry the business logic` : null,
    storeCount ? `and state lives in ${storeCount} purpose-built store${storeCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  const summary = `${parts[0]} ${parts.slice(1).join(', ')}${parts.length > 1 ? '.' : ''}`;

  return { summary, flows, layers, stores };
}
