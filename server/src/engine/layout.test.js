import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchitecture } from './normalize.js';
import { layoutArchitecture } from './layout.js';

const arch = normalizeArchitecture({
  system: { name: 'X' },
  nodes: [
    { id: 'web', type: 'web_app', why: 'x' },
    { id: 'gw', type: 'api_gateway', why: 'x' },
    { id: 'svc', type: 'service', why: 'x' },
    { id: 'sp', type: 'stream_processor', why: 'x' },
    { id: 'db', type: 'sql_db', why: 'x' },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    { id: 'e3', source: 'svc', target: 'sp', label: 'pub', protocol: 'stream', why: 'x' },
    { id: 'e4', source: 'sp', target: 'db', label: 'w', protocol: 'stream', why: 'x' },
  ],
});

test('produces positioned react-flow nodes banded top-to-bottom', async () => {
  const { nodes, edges } = await layoutArchitecture(arch);
  assert.equal(nodes.length, 5);
  assert.equal(edges.length, 4);

  for (const n of nodes) {
    assert.ok(Number.isFinite(n.position.x) && Number.isFinite(n.position.y), `${n.id} unpositioned`);
    assert.equal(n.type, 'arch');
  }
  // taxonomy banding: client sits above data
  const y = Object.fromEntries(nodes.map((n) => [n.id, n.position.y]));
  assert.ok(y.web < y.db, `client (${y.web}) should be above data (${y.db})`);
  assert.ok(y.gw < y.svc, 'gateway above services');
});

test('carries edge protocol + node cloud mapping into the graph', async () => {
  const { nodes, edges } = await layoutArchitecture(arch);
  const streamEdge = edges.find((e) => e.id === 'e3');
  assert.equal(streamEdge.animated, true);            // stream → animated
  assert.equal(streamEdge.data.protocol, 'stream');

  const db = nodes.find((n) => n.id === 'db');
  assert.ok(db.data.cloud && db.data.cloud.aws, 'db node should carry cloud services');
  assert.equal(db.data.isStore, true);
});
