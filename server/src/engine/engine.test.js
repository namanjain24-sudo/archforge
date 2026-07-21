/**
 * Engine pipeline test (offline, via the mock provider).
 * Feeds deliberately messy model output — code fences, a wrong layer, an extra
 * top-level key, a dangling edge — and asserts the pipeline returns a clean,
 * schema-valid architecture. This proves the deterministic accuracy gates work
 * without needing any API key.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetMock } from './providers.js';

const VALID = JSON.stringify({
  system: { name: 'Notes App', summary: 'Store notes', domain: 'notes', scale: 'small' },
  assumptions: { dailyActiveUsers: 5000, actionsPerUserPerDay: 10, readWriteRatio: 3, avgItemSizeBytes: 800, retentionDays: 365, latencySloMs: 200, consistency: 'eventual' },
  nodes: [
    { id: 'web', label: 'Web App', type: 'web_app', layer: 'client', why: 'entry' },
    { id: 'gw', label: 'Gateway', type: 'api_gateway', layer: 'gateway', why: 'routing' },
    { id: 'svc', label: 'Notes Service', type: 'service', layer: 'service', tech: 'Node', why: 'logic' },
    { id: 'db', label: 'DB', type: 'sql_db', layer: 'data', tech: 'Postgres', why: 'store' },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'http', protocol: 'sync', why: 'req' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'dispatch' },
    { id: 'e3', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'persist' },
  ],
});

const MESSY = '```json\n' + JSON.stringify({
  system: { name: 'URL Shortener', summary: 'Shorten & redirect URLs', domain: 'url-shortener', scale: 'large' },
  assumptions: { dailyActiveUsers: 1_000_000, actionsPerUserPerDay: 5, readWriteRatio: 100, avgItemSizeBytes: 500, retentionDays: 730, latencySloMs: 100, consistency: 'eventual' },
  nodes: [
    { id: 'web', label: 'Web App', type: 'web_app', layer: 'THIS_IS_WRONG', why: 'user entry', redundant: true },
    { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', why: 'routing' },
    { id: 'svc', label: 'Shorten Service', type: 'service', layer: 'service', tech: 'Node.js', why: 'core logic' },
    { id: 'cache', label: 'Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'hot reads' },
    { id: 'db', label: 'DB', type: 'nosql_db', layer: 'data', tech: 'DynamoDB', why: 'mapping store' },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'HTTP', protocol: 'sync', why: 'requests' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'dispatch' },
    { id: 'e3', source: 'svc', target: 'cache', label: 'lookup', protocol: 'sync', why: 'fast path' },
    { id: 'e4', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'persist' },
    { id: 'e5', source: 'svc', target: 'ghost', label: 'dangling', protocol: 'sync', why: 'drop me' },
  ],
  tradeoffs: [{ decision: 'datastore', choice: 'DynamoDB', alternative: 'PostgreSQL', why: 'kv at scale' }],
  notes: ['Shard by hash of short code'],
  garbage: 'should be stripped',
}) + '\n```';

test('pipeline cleans messy model output into a valid architecture', async () => {
  process.env.ARCHFORGE_MOCK = MESSY;
  const { generateCandidates } = await import('./generate.js');

  const { provider, candidates } = await generateCandidates('a URL shortener', { count: 1 });
  assert.equal(provider, 'mock');
  const best = candidates.find((c) => c.valid);
  assert.ok(best, `expected a valid candidate, got errors: ${JSON.stringify(candidates.map((c) => c.errors))}`);

  const arch = best.arch;
  // wrong layer was snapped to the taxonomy layer
  assert.equal(arch.nodes.find((n) => n.id === 'web').layer, 'client');
  // unknown top-level key stripped
  assert.ok(!('garbage' in arch));
  // dangling edge removed
  assert.equal(arch.edges.length, 4);
  assert.ok(!arch.edges.some((e) => e.target === 'ghost'));
  // core shape intact
  assert.equal(arch.nodes.length, 5);
  assert.equal(arch.system.name, 'URL Shortener');
});

test('format-repair recovers when the first draw is not JSON', async () => {
  delete process.env.ARCHFORGE_MOCK;
  process.env.ARCHFORGE_MOCK_SEQ = JSON.stringify(['I cannot produce JSON right now.', VALID]);
  resetMock();
  const { generateCandidates } = await import('./generate.js');

  const { candidates } = await generateCandidates('a notes app', { count: 1 });
  const best = candidates.find((c) => c.valid);
  assert.ok(best, `expected repair to recover a valid candidate; got ${JSON.stringify(candidates.map((c) => c.errors))}`);
  assert.equal(best.repaired, true);
  assert.equal(best.arch.system.name, 'Notes App');
  delete process.env.ARCHFORGE_MOCK_SEQ;
});
