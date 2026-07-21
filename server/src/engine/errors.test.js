/**
 * User-facing failure messages. A provider's raw text ("This operation was
 * aborted", "HTTP 429 …") is meaningless to someone who just typed a prompt,
 * so every failure mode must translate into something actionable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ARCH_OK = JSON.stringify({
  system: { name: 'S', summary: 's', domain: 'web', scale: 'large' },
  assumptions: { dailyActiveUsers: 1000, actionsPerUserPerDay: 10, readWriteRatio: 3, avgItemSizeBytes: 500, retentionDays: 30, latencySloMs: 200, consistency: 'eventual' },
  nodes: [
    { id: 'web', label: 'Web', type: 'web_app', layer: 'client', why: 'x', redundant: true, stateful: false },
    { id: 'svc', label: 'Svc', type: 'service', layer: 'service', why: 'x', redundant: true, stateful: false },
  ],
  edges: [{ id: 'e1', source: 'web', target: 'svc', label: 'r', protocol: 'sync', why: 'x' }],
  tradeoffs: [], notes: [],
});

async function failWith(raw) {
  const prev = process.env.ARCHFORGE_MOCK;
  const prevDir = process.env.ARCHFORGE_CACHE_DIR;
  delete process.env.ARCHFORGE_CACHE_DIR;
  process.env.ARCHFORGE_MOCK = raw;
  try {
    const { generateCandidates } = await import(`./generate.js?err=${Math.random()}`);
    await generateCandidates(`prompt ${Math.random()}`, { count: 1 });
    return null;
  } catch (e) {
    return e;
  } finally {
    if (prev === undefined) delete process.env.ARCHFORGE_MOCK; else process.env.ARCHFORGE_MOCK = prev;
    if (prevDir !== undefined) process.env.ARCHFORGE_CACHE_DIR = prevDir;
  }
}

test('unparseable model output yields a rephrasing hint, not internals', async () => {
  const e = await failWith('this is not json at all');
  assert.ok(e, 'should reject');
  assert.match(e.message, /did not return a valid architecture/i);
  assert.ok(!/JSON\.parse|undefined|stack/i.test(e.message), 'no internals leak into the message');
});

test('a successful generation still works through the same path', async () => {
  const e = await failWith(ARCH_OK);
  assert.equal(e, null, 'valid output must not throw');
});

test('the raw provider text is preserved for logs but not shown as the headline', async () => {
  const e = await failWith('nope');
  assert.ok(e.cause !== undefined, 'raw cause is kept for diagnosis');
  assert.notEqual(e.message, e.cause, 'the headline is the friendly message');
});
