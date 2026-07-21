/**
 * Normalize unit tests — locks the deterministic accuracy behaviors so they
 * can't silently regress.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchitecture } from './normalize.js';

test('coerces numeric-string assumptions and keeps stated numbers', () => {
  const arch = normalizeArchitecture({
    system: { name: 'X' },
    assumptions: { dailyActiveUsers: '2000000', retentionDays: 30 },
    nodes: [{ id: 'a', type: 'web_app', why: 'x' }],
    edges: [],
  });
  assert.equal(arch.assumptions.dailyActiveUsers, 2_000_000); // "2000000" → number
  assert.equal(arch.assumptions.retentionDays, 30);           // stated number kept
  assert.equal(typeof arch.assumptions.actionsPerUserPerDay, 'number'); // default filled
});

test('datastores default to stateful; drops unknown node types', () => {
  const arch = normalizeArchitecture({
    system: { name: 'X' },
    nodes: [
      { id: 'db', type: 'sql_db', why: 'store' },
      { id: 'ghost', type: 'not_a_real_type', why: 'nope' },
    ],
    edges: [],
  });
  assert.equal(arch.nodes.length, 1);
  assert.equal(arch.nodes[0].stateful, true); // isStore → stateful by default
});

test('auto-corrects protocol by target type (queue → async, stream processor → stream)', () => {
  const arch = normalizeArchitecture({
    system: { name: 'X' },
    nodes: [
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'q', type: 'message_queue', why: 'x' },
      { id: 'sp', type: 'stream_processor', why: 'x' },
    ],
    edges: [
      { id: 'a', source: 'svc', target: 'q', label: 'enqueue', protocol: 'sync', why: 'wrong on purpose' },
      { id: 'b', source: 'svc', target: 'sp', label: 'publish', protocol: 'sync', why: 'wrong on purpose' },
    ],
  });
  assert.equal(arch.edges.find((e) => e.target === 'q').protocol, 'async');
  assert.equal(arch.edges.find((e) => e.target === 'sp').protocol, 'stream');
});

test('keeps distinct-protocol edges between the same pair', () => {
  const arch = normalizeArchitecture({
    system: { name: 'X' },
    nodes: [
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'db', type: 'sql_db', why: 'x' },
    ],
    edges: [
      { id: 'a', source: 'svc', target: 'db', label: 'read', protocol: 'sync', why: 'r' },
      { id: 'b', source: 'svc', target: 'db', label: 'cdc', protocol: 'stream', why: 's' },
      { id: 'c', source: 'svc', target: 'db', label: 'dup', protocol: 'sync', why: 'dup' }, // true dup → dropped
    ],
  });
  assert.equal(arch.edges.length, 2);
});
