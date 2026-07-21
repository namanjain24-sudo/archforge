/**
 * Production-readiness scorecard.
 * ------------------------------
 * A concrete checklist of the concerns a real production system at a large
 * company must address. Turns "is this a toy or something a company could run?"
 * into an explicit score with the specific gaps — enterprise-facing credibility.
 */
import { NODE_TYPES } from '../contracts/index.js';

export function productionReadiness(arch) {
  const types = new Set(arch.nodes.map((n) => n.type));
  const layers = new Set(arch.nodes.map((n) => n.layer));
  const has = (...ts) => ts.some((t) => types.has(t));
  const stores = arch.nodes.filter((n) => NODE_TYPES[n.type].isStore);
  const critical = arch.nodes.filter((n) =>
    (n.layer === 'gateway' || NODE_TYPES[n.type].isStore) && n.layer !== 'observability');

  const items = [
    { item: 'Gateway / load balancing', present: has('api_gateway', 'load_balancer', 'reverse_proxy') },
    { item: 'Caching layer', present: has('cache') },
    { item: 'Asynchronous processing', present: has('message_queue', 'event_bus', 'worker', 'stream_processor') },
    { item: 'Authentication boundary', present: layers.has('security') },
    { item: 'Observability (logs/metrics/tracing)', present: layers.has('observability') },
    { item: 'Distributed tracing', present: has('tracing') },
    { item: 'Redundancy — no single point of failure', present: critical.length > 0 && critical.every((n) => n.redundant !== false) },
    { item: 'Purpose-built datastores', present: stores.length >= 2 },
  ];

  const present = items.filter((i) => i.present).length;
  const score = Math.round((100 * present) / items.length);
  return { score, present, total: items.length, items };
}
