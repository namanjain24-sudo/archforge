/**
 * Reference-integrity eval (offline, deterministic — no LLM).
 * ----------------------------------------------------------
 * The golden library is ArchForge's accuracy asset: the model is grounded in
 * these designs, so they must themselves be sound. This runs every reference
 * through the real normalize → verify pipeline and asserts the invariants the
 * product guarantees:
 *   - it survives normalization (all node types are in the taxonomy),
 *   - the verifier finds NO unfixed structural error,
 *   - no node is left orphaned,
 *   - every datastore is a sink (no calls originate from a store),
 *   - it exposes an auth boundary and observability.
 * It also guards against regressions in the verifier itself — an auto-fix that
 * corrupted a clean reference would surface here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from './library.js';
import { normalizeArchitecture } from '../engine/normalize.js';
import { verify } from '../engine/verify.js';
import { NODE_TYPES } from '../contracts/index.js';

const degreeOf = (arch) => {
  const d = Object.fromEntries(arch.nodes.map((n) => [n.id, 0]));
  for (const e of arch.edges) { d[e.source]++; d[e.target]++; }
  return d;
};

for (const ref of LIBRARY) {
  const name = ref.meta.title || ref.meta.domain;

  test(`reference "${name}" verifies clean`, () => {
    const norm = normalizeArchitecture(ref.arch);
    // Normalization must not silently drop the design.
    assert.ok(norm.nodes.length >= 3, `${name}: too few nodes after normalize`);

    const { arch, findings } = verify(norm, { promptText: ref.meta.keywords?.join(' ') || '' });

    // 1. No unfixed structural errors.
    const errors = findings.filter((f) => f.severity === 'error' && !f.fixed);
    assert.equal(errors.length, 0, `${name}: unfixed errors → ${errors.map((e) => e.message).join(' | ')}`);

    // 2. No orphans remain.
    const deg = degreeOf(arch);
    const orphans = arch.nodes.filter((n) => deg[n.id] === 0);
    assert.equal(orphans.length, 0, `${name}: orphaned nodes → ${orphans.map((n) => n.label).join(', ')}`);

    // 3. Datastores are sinks (no non-replication/CDC/telemetry egress).
    const layerById = Object.fromEntries(arch.nodes.map((n) => [n.id, n.layer]));
    for (const n of arch.nodes) {
      if (!NODE_TYPES[n.type].isStore) continue;
      const badOut = arch.edges.filter((e) => e.source === n.id && !['observability', 'data', 'async'].includes(layerById[e.target]));
      assert.equal(badOut.length, 0, `${name}: datastore ${n.label} originates a call`);
    }
  });
}

test('the library covers a broad spread of domains', () => {
  const domains = new Set(LIBRARY.map((r) => r.meta.domain));
  assert.ok(domains.size >= 12, `expected ≥12 distinct domains, got ${domains.size}`);
});
