/**
 * Integrity tests for the contract layer — the accuracy backbone.
 * Run: cd server && node --test src/contracts/
 * These catch typos/mismatches in the shared vocabulary before any later stage
 * builds on it (a wrong layer id here would silently corrupt every diagram).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAYERS, LAYER_IDS, NODE_TYPES, NODE_TYPE_IDS, PROTOCOL_IDS,
  ARCHITECTURE_SCHEMA, DEFAULT_ASSUMPTIONS, emptyArchitecture,
  ALLOWED_LAYER_EDGES, FORBIDDEN_LAYER_EDGES, EXPECTED_PROTOCOL_BY_TARGET_TYPE,
  isEdgeAllowed, isTypeEdgeForbidden, PRINCIPLES, PILLARS, PRINCIPLES_BY_ID,
} from './index.js';

test('every node type maps to a real layer', () => {
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    assert.ok(LAYER_IDS.includes(def.layer), `${type} → unknown layer "${def.layer}"`);
  }
});

test('call rules reference only real layers', () => {
  for (const [from, tos] of Object.entries(ALLOWED_LAYER_EDGES)) {
    assert.ok(LAYER_IDS.includes(from), `unknown from-layer "${from}"`);
    for (const to of tos) assert.ok(LAYER_IDS.includes(to), `unknown to-layer "${to}"`);
  }
  for (const [a, b] of FORBIDDEN_LAYER_EDGES) {
    assert.ok(LAYER_IDS.includes(a) && LAYER_IDS.includes(b), `bad forbidden pair ${a}->${b}`);
  }
});

test('expected-protocol targets are real node types with real protocols', () => {
  for (const [type, proto] of Object.entries(EXPECTED_PROTOCOL_BY_TARGET_TYPE)) {
    assert.ok(NODE_TYPE_IDS.includes(type), `unknown target type "${type}"`);
    assert.ok(PROTOCOL_IDS.includes(proto), `unknown protocol "${proto}"`);
  }
});

test('isEdgeAllowed enforces the classic forbidden edges', () => {
  assert.equal(isEdgeAllowed('client', 'data'), false);   // client → DB
  assert.equal(isEdgeAllowed('client', 'service'), false); // client → service
  assert.equal(isEdgeAllowed('client', 'gateway'), true);
  assert.equal(isEdgeAllowed('service', 'data'), true);
  assert.equal(isEdgeAllowed('service', 'async'), true);
  assert.equal(isEdgeAllowed('gateway', 'data'), true);   // gateway → cache is allowed at layer level
});

test('type-level rule forbids gateway → primary database but allows gateway → cache', () => {
  assert.equal(isTypeEdgeForbidden('api_gateway', 'sql_db'), true);
  assert.equal(isTypeEdgeForbidden('api_gateway', 'nosql_db'), true);
  assert.equal(isTypeEdgeForbidden('api_gateway', 'cache'), false); // rate-limit counters OK
});

test('schema enums are populated from the taxonomy', () => {
  const nodeType = ARCHITECTURE_SCHEMA.properties.nodes.items.properties.type;
  assert.equal(nodeType.enum.length, NODE_TYPE_IDS.length);
  const proto = ARCHITECTURE_SCHEMA.properties.edges.items.properties.protocol;
  assert.deepEqual(proto.enum, PROTOCOL_IDS);
});

test('default assumptions satisfy the schema shape', () => {
  const required = ARCHITECTURE_SCHEMA.properties.assumptions.required;
  for (const k of required) assert.ok(k in DEFAULT_ASSUMPTIONS, `missing default "${k}"`);
});

test('emptyArchitecture has the required top-level keys', () => {
  const arch = emptyArchitecture();
  for (const k of ARCHITECTURE_SCHEMA.required) assert.ok(k in arch, `missing "${k}"`);
});

test('every principle has a valid pillar and unique id', () => {
  const seen = new Set();
  for (const p of PRINCIPLES) {
    assert.ok(PILLARS.includes(p.pillar), `${p.id} → unknown pillar "${p.pillar}"`);
    assert.ok(['error', 'warning', 'info'].includes(p.severity), `${p.id} bad severity`);
    assert.ok(!seen.has(p.id), `duplicate principle id "${p.id}"`);
    seen.add(p.id);
  }
  assert.equal(Object.keys(PRINCIPLES_BY_ID).length, PRINCIPLES.length);
});

test('every non-terminal layer permits its own intra-layer calls', () => {
  // Services call services, queues chain, stores replicate, and an auth service
  // reads key material from a secrets manager. Observability is the only pure
  // sink, so it is the sole exception.
  for (const layer of ['service', 'async', 'data', 'ml', 'security']) {
    assert.ok(isEdgeAllowed(layer, layer), `${layer}→${layer} should be allowed`);
  }
  assert.ok(!isEdgeAllowed('observability', 'observability'), 'observability stays a sink');
});
