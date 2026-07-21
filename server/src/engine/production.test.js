import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchitecture } from './normalize.js';
import { productionReadiness } from './production.js';

test('a toy design scores low on production readiness', () => {
  const toy = normalizeArchitecture({
    system: { name: 'X' },
    nodes: [{ id: 'web', type: 'web_app', why: 'x' }, { id: 'db', type: 'sql_db', why: 'x' }],
    edges: [{ id: 'e1', source: 'web', target: 'db', label: 'x', protocol: 'sync', why: 'x' }],
  });
  const r = productionReadiness(toy);
  assert.ok(r.score < 40, `toy should score low, got ${r.score}`);
});

test('a full production design scores high', () => {
  const full = normalizeArchitecture({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'lb', type: 'load_balancer', why: 'x', redundant: true },
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'cache', type: 'cache', why: 'x', redundant: true },
      { id: 'db', type: 'sql_db', why: 'x', redundant: true },
      { id: 'blob', type: 'blob_storage', why: 'x', redundant: true },
      { id: 'q', type: 'message_queue', why: 'x' },
      { id: 'auth', type: 'auth_service', why: 'x' },
      { id: 'log', type: 'logging', why: 'x' },
      { id: 'trace', type: 'tracing', why: 'x' },
    ],
    edges: [{ id: 'e1', source: 'web', target: 'lb', label: 'x', protocol: 'sync', why: 'x' }],
  });
  const r = productionReadiness(full);
  assert.ok(r.score >= 90, `full design should score high, got ${r.score}`);
});
