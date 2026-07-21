/**
 * Deploy guard: the Vercel entry is a bare (req, res) handler.
 * Vercel invokes api/[...path].js directly rather than through a listening
 * server, so this mounts it the same way and drives real HTTP against it.
 * Without this the serverless path is only ever exercised in production.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const ARCH = {
  nodes: [
    { id: 'web', type: 'web_app', why: 'x' },
    { id: 'gw', type: 'api_gateway', why: 'x' },
    { id: 'svc', type: 'service', why: 'x' },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
  ],
};

async function withServer(fn) {
  const handler = (await import('../../api/[...path].js')).default;
  assert.equal(typeof handler, 'function', 'the Vercel entry must default-export a handler');
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('the serverless entry serves every route Vercel will route to it', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const examples = await fetch(`${base}/api/examples`);
    assert.equal(examples.status, 200);
    assert.ok(Array.isArray((await examples.json()).examples));

    const verify = await fetch(`${base}/api/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ architecture: ARCH }),
    });
    assert.equal(verify.status, 200);
    const body = await verify.json();
    assert.ok(body.architecture?.nodes?.length, 'returns a verified diagram');
    assert.ok(body.explanation, 'returns the walkthrough');
  });
});

test('input validation still applies through the serverless entry', async () => {
  await withServer(async (base) => {
    const bad = await fetch(`${base}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    assert.equal(bad.status, 400, 'empty prompts are rejected before any model call');
  });
});
