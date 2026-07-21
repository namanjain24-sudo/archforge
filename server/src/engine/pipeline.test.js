/**
 * Full-pipeline test (offline via the mock provider). Feeds a design with an
 * illegal client→auth edge, a missing observability layer and a missing
 * capability, and asserts the pipeline returns a *fixed* architecture plus
 * capacity, review and findings — the complete guarantee layer in one call.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const MOCK = JSON.stringify({
  system: { name: 'Login Shop', summary: 'login + payments', domain: 'general', scale: 'medium' },
  assumptions: { dailyActiveUsers: 100000, actionsPerUserPerDay: 10, readWriteRatio: 20, avgItemSizeBytes: 1000, retentionDays: 365, latencySloMs: 200, consistency: 'eventual' },
  nodes: [
    { id: 'web', type: 'web_app', layer: 'client', why: 'entry' },
    { id: 'gw', type: 'api_gateway', layer: 'gateway', why: 'route' },
    { id: 'auth', type: 'auth_service', layer: 'security', why: 'login' },
    { id: 'svc', type: 'service', layer: 'service', why: 'logic' },
    { id: 'db', type: 'sql_db', layer: 'data', why: 'store', redundant: true },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'req', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'web', target: 'auth', label: 'login', protocol: 'sync', why: 'illegal' },
    { id: 'e3', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'x' },
    { id: 'e4', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'x' },
  ],
});

test('pipeline returns a fixed architecture with capacity and review', async () => {
  process.env.ARCHFORGE_MOCK = MOCK;
  const { runPipeline } = await import('./pipeline.js');

  const r = await runPipeline('a login app that also takes payments', { count: 1 });

  // illegal client→auth edge was auto-rerouted through the gateway
  assert.ok(!r.architecture.edges.some((e) => e.source === 'web' && e.target === 'auth'));
  assert.ok(r.architecture.edges.some((e) => e.source === 'gw' && e.target === 'auth'));
  assert.ok(r.findings.some((f) => f.id === 'allowed-layer-edges' && f.fixed));

  // missing capability + observability were flagged
  assert.ok(r.findings.some((f) => f.id === 'capability-coverage')); // payments missing
  assert.ok(r.findings.some((f) => f.id === 'observability-present'));

  // capacity + review + readiness present
  assert.equal(r.capacity.metrics.length, 8);
  assert.equal(r.review.pillars.length, 6);
  assert.ok(r.review.overall >= 0 && r.review.overall <= 100);
  assert.ok(r.readiness && r.readiness.items.length >= 6);
  assert.ok(r.readiness.score >= 0 && r.readiness.score <= 100);

  // capabilities detected from the prompt
  assert.ok(r.capabilities.some((c) => c.id === 'payments'));
  assert.ok(r.capabilities.some((c) => c.id === 'auth'));

  assert.equal(r.meta.provider, 'mock');
  assert.ok(r.meta.autofixes >= 1);

  // response carries the prompt + timestamp for the UI
  assert.equal(r.prompt, 'a login app that also takes payments');
  assert.ok(r.generatedAt && !Number.isNaN(Date.parse(r.generatedAt)));
  delete process.env.ARCHFORGE_MOCK;
});
