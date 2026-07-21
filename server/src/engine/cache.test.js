/**
 * The dev generation cache. Re-running an eval after a verifier change must
 * cost zero tokens while still re-running every deterministic check — that is
 * what keeps a free-tier daily budget from being burned on identical prompts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ARCH = JSON.stringify({
  system: { name: 'Cached', summary: 's', domain: 'web', scale: 'large' },
  assumptions: { dailyActiveUsers: 1000, actionsPerUserPerDay: 10, readWriteRatio: 3, avgItemSizeBytes: 500, retentionDays: 30, latencySloMs: 200, consistency: 'eventual' },
  nodes: [
    { id: 'web', label: 'Web', type: 'web_app', layer: 'client', why: 'x', redundant: true, stateful: false },
    { id: 'gw', label: 'GW', type: 'api_gateway', layer: 'gateway', why: 'x', redundant: true, stateful: false },
    { id: 'svc', label: 'Svc', type: 'service', layer: 'service', why: 'x', redundant: true, stateful: false },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
  ],
  tradeoffs: [], notes: [],
});

test('a cached prompt is replayed without calling any provider', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-cache-'));
  const prevDir = process.env.ARCHFORGE_CACHE_DIR;
  const prevMock = process.env.ARCHFORGE_MOCK;
  process.env.ARCHFORGE_CACHE_DIR = dir;
  process.env.ARCHFORGE_MOCK = ARCH;
  try {
    const { generateCandidates } = await import(`./generate.js?cache-test=${Date.now()}`);

    const first = await generateCandidates('a cached test prompt', { count: 1 });
    assert.equal(first.provider, 'mock', 'first run goes to the provider');
    assert.ok(first.candidates.some((c) => c.valid));
    assert.equal(fs.readdirSync(dir).length, 1, 'raw output is cached');

    // Break the provider outright — a cache hit must still succeed.
    process.env.ARCHFORGE_MOCK = 'NOT JSON AT ALL';
    const second = await generateCandidates('a cached test prompt', { count: 1 });
    assert.equal(second.provider, 'cache', 'second run is served from cache');
    assert.ok(second.candidates.some((c) => c.valid), 'cached candidate still validates');

    // A different prompt must not collide with the cached entry.
    await assert.rejects(
      generateCandidates('a completely different prompt', { count: 1 }),
      /did not return a valid architecture/,
      'a different prompt must miss the cache',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (prevDir === undefined) delete process.env.ARCHFORGE_CACHE_DIR; else process.env.ARCHFORGE_CACHE_DIR = prevDir;
    if (prevMock === undefined) delete process.env.ARCHFORGE_MOCK; else process.env.ARCHFORGE_MOCK = prevMock;
  }
});

test('the cache stays off unless ARCHFORGE_CACHE_DIR is set', async () => {
  const prevDir = process.env.ARCHFORGE_CACHE_DIR;
  const prevMock = process.env.ARCHFORGE_MOCK;
  delete process.env.ARCHFORGE_CACHE_DIR;
  process.env.ARCHFORGE_MOCK = ARCH;
  try {
    const { generateCandidates } = await import(`./generate.js?nocache-test=${Date.now()}`);
    const a = await generateCandidates('an uncached prompt', { count: 1 });
    const b = await generateCandidates('an uncached prompt', { count: 1 });
    assert.equal(a.provider, 'mock');
    assert.equal(b.provider, 'mock', 'the live server must never serve stale generations');
  } finally {
    if (prevDir === undefined) delete process.env.ARCHFORGE_CACHE_DIR; else process.env.ARCHFORGE_CACHE_DIR = prevDir;
    if (prevMock === undefined) delete process.env.ARCHFORGE_MOCK; else process.env.ARCHFORGE_MOCK = prevMock;
  }
});

test('the cache works when the project path contains spaces', async () => {
  // Regression: deriving the directory from URL.pathname percent-encodes spaces
  // ("my project" → "my%20project"), which silently wrote to a directory that
  // never matched on read — the cache appeared to work while doing nothing.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'af cache with spaces-'));
  const dir = path.join(base, 'eval cache');
  const prevDir = process.env.ARCHFORGE_CACHE_DIR;
  const prevMock = process.env.ARCHFORGE_MOCK;
  process.env.ARCHFORGE_CACHE_DIR = dir;
  process.env.ARCHFORGE_MOCK = ARCH;
  try {
    const { generateCandidates } = await import(`./generate.js?space-test=${Date.now()}`);
    const first = await generateCandidates('a spaced path prompt', { count: 1 });
    assert.equal(first.provider, 'mock');
    assert.ok(fs.existsSync(dir), 'cache directory is created at the literal path');
    assert.equal(fs.readdirSync(dir).length, 1);

    process.env.ARCHFORGE_MOCK = 'NOT JSON';
    const second = await generateCandidates('a spaced path prompt', { count: 1 });
    assert.equal(second.provider, 'cache', 'cache must hit despite spaces in the path');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    if (prevDir === undefined) delete process.env.ARCHFORGE_CACHE_DIR; else process.env.ARCHFORGE_CACHE_DIR = prevDir;
    if (prevMock === undefined) delete process.env.ARCHFORGE_MOCK; else process.env.ARCHFORGE_MOCK = prevMock;
  }
});

test('eval harnesses resolve their cache directory to a real filesystem path', async () => {
  // Guards the whole family: no harness may use URL.pathname for a disk path.
  const files = ['../dev/eval.js', '../dev/benchmark.js', '../dev/eval-holdout.js'];
  for (const f of files) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(src.includes('fileURLToPath'), `${f} must use fileURLToPath`);
    assert.ok(!/ARCHFORGE_CACHE_DIR\s*=\s*new URL\([^)]*\)\.pathname/.test(src), `${f} must not use URL.pathname for a path`);
  }
});

test('the cache honours ARCHFORGE_CACHE_DIR set AFTER the module was loaded', async () => {
  // Regression: reading the env into a module-level const made the cache dead
  // for every eval harness, because ES imports are hoisted above the harness's
  // own top-level assignment. Importing FIRST, then setting the env, reproduces
  // exactly that order — the earlier tests set the env first and so passed
  // while the real scripts silently cached nothing.
  const prevDir = process.env.ARCHFORGE_CACHE_DIR;
  const prevMock = process.env.ARCHFORGE_MOCK;
  delete process.env.ARCHFORGE_CACHE_DIR;

  const { generateCandidates } = await import(`./generate.js?hoist-test=${Date.now()}`); // loaded with NO cache dir

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-hoist-'));
  process.env.ARCHFORGE_CACHE_DIR = dir;          // set only afterwards
  process.env.ARCHFORGE_MOCK = ARCH;
  try {
    const first = await generateCandidates('a late-configured prompt', { count: 1 });
    assert.equal(first.provider, 'mock');
    assert.equal(fs.readdirSync(dir).length, 1, 'must write even though the dir was set after import');

    process.env.ARCHFORGE_MOCK = 'NOT JSON';
    const second = await generateCandidates('a late-configured prompt', { count: 1 });
    assert.equal(second.provider, 'cache', 'must read even though the dir was set after import');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (prevDir === undefined) delete process.env.ARCHFORGE_CACHE_DIR; else process.env.ARCHFORGE_CACHE_DIR = prevDir;
    if (prevMock === undefined) delete process.env.ARCHFORGE_MOCK; else process.env.ARCHFORGE_MOCK = prevMock;
  }
});
