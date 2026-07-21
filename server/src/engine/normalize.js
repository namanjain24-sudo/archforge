/**
 * Normalize a raw model architecture into the canonical shape.
 * ------------------------------------------------------------
 * This is the first accuracy gate after generation. Before we even validate,
 * we coerce the model's output into the contract: fill missing assumptions,
 * drop unknown node types, snap each node to its taxonomy-correct layer, and
 * remove edges that reference nodes which don't exist. Cheap, deterministic,
 * and it eliminates a whole class of model slips.
 */

import {
  NODE_TYPES, layerOf, LAYER_IDS, PROTOCOL_IDS,
  DEFAULT_ASSUMPTIONS, SCALES, emptyArchitecture,
  EXPECTED_PROTOCOL_BY_TARGET_TYPE,
} from '../contracts/index.js';

const asArray = (v) => (Array.isArray(v) ? v : []);
const asBool = (v) => v === true;
const clampStr = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function normalizeArchitecture(input) {
  const base = emptyArchitecture();
  const arch = input && typeof input === 'object' ? input : {};

  // system
  const sys = arch.system || {};
  base.system = {
    name: clampStr(sys.name, 80) || 'System',
    summary: clampStr(sys.summary, 400),
    domain: clampStr(sys.domain, 60) || 'general',
    scale: SCALES.includes(sys.scale) ? sys.scale : 'medium',
  };

  // assumptions — fill any missing key with a sensible default
  const a = arch.assumptions || {};
  base.assumptions = { ...DEFAULT_ASSUMPTIONS };
  for (const k of Object.keys(DEFAULT_ASSUMPTIONS)) {
    const def = DEFAULT_ASSUMPTIONS[k];
    const v = a[k];
    if (typeof def === 'number') {
      // Respect stated numbers even if the model returned them as strings ("1000000").
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n > 0) base.assumptions[k] = n;
    } else if (typeof v === typeof def && v != null) {
      base.assumptions[k] = v;
    }
  }
  if (!['strong', 'eventual'].includes(base.assumptions.consistency)) {
    base.assumptions.consistency = DEFAULT_ASSUMPTIONS.consistency;
  }

  // nodes — keep only known types, snap layer to the taxonomy, de-dupe ids
  const seen = new Set();
  base.nodes = asArray(arch.nodes)
    .filter((n) => n && NODE_TYPES[n.type])
    .map((n) => {
      let id = clampStr(n.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      if (!id) id = n.type;
      while (seen.has(id)) id = `${id}-2`;
      seen.add(id);
      return {
        id,
        label: clampStr(n.label, 60) || NODE_TYPES[n.type].label,
        type: n.type,
        layer: layerOf(n.type),                       // authoritative — ignore model's layer
        tech: n.tech ? clampStr(n.tech, 60) : null,
        why: clampStr(n.why, 160) || 'Part of the system.',
        redundant: asBool(n.redundant),
        stateful: n.stateful === undefined ? !!NODE_TYPES[n.type].isStore : asBool(n.stateful),
      };
    });

  const ids = new Set(base.nodes.map((n) => n.id));
  const typeById = Object.fromEntries(base.nodes.map((n) => [n.id, n.type]));

  // edges — drop dangling refs, self-loops and unknown protocols; de-dupe.
  // Also auto-correct the protocol when the target type demands one (e.g. a
  // connection into a message queue is async by definition) — a deterministic
  // accuracy fix, not a guess.
  const edgeSeen = new Set();
  base.edges = asArray(arch.edges)
    .filter((e) => e && ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
    .map((e, i) => {
      const expected = EXPECTED_PROTOCOL_BY_TARGET_TYPE[typeById[e.target]];
      const protocol = expected
        || (PROTOCOL_IDS.includes(e.protocol) ? e.protocol : 'sync');
      return {
        id: clampStr(e.id, 80) || `e-${i}`,
        source: e.source,
        target: e.target,
        label: clampStr(e.label, 60) || 'call',
        protocol,
        why: clampStr(e.why, 160) || 'Connection between components.',
      };
    })
    .filter((e) => {
      // Keep distinct protocols between the same pair (e.g. a sync read AND an
      // async event) — only collapse true duplicates.
      const key = `${e.source}->${e.target}:${e.protocol}`;
      if (edgeSeen.has(key)) return false;
      edgeSeen.add(key);
      return true;
    });

  // tradeoffs & notes (optional)
  base.tradeoffs = asArray(arch.tradeoffs)
    .filter((t) => t && (t.decision || t.choice))
    .map((t) => ({
      decision: clampStr(t.decision, 80),
      choice: clampStr(t.choice, 80),
      alternative: clampStr(t.alternative, 80),
      why: clampStr(t.why, 200),
    }));
  base.notes = asArray(arch.notes).map((s) => clampStr(s, 200)).filter(Boolean);

  return base;
}

export { LAYER_IDS };
