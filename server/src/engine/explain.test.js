import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchitecture } from './normalize.js';
import { explainArchitecture } from './explain.js';

const norm = (a) => normalizeArchitecture(a);

const base = () => norm({
  system: { name: 'Shop', scale: 'large' },
  nodes: [
    { id: 'web', type: 'web_app', label: 'Web App', tech: 'React', why: 'x' },
    { id: 'gw', type: 'api_gateway', label: 'API Gateway', tech: 'Envoy', why: 'x' },
    { id: 'svc', type: 'service', label: 'Order Service', tech: 'Go', why: 'x' },
    { id: 'db', type: 'sql_db', label: 'Order DB', tech: 'PostgreSQL', why: 'x' },
    { id: 'q', type: 'message_queue', label: 'Queue', tech: 'Kafka', why: 'x' },
    { id: 'wk', type: 'worker', label: 'Email Worker', tech: 'Node', why: 'x' },
    { id: 'auth', type: 'auth_service', label: 'Auth', tech: 'OAuth2', why: 'x' },
    { id: 'log', type: 'logging', label: 'Logging', tech: 'ELK', why: 'x' },
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'place order', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'x' },
    { id: 'e3', source: 'svc', target: 'db', label: 'read/write', protocol: 'sync', why: 'x' },
    { id: 'e4', source: 'svc', target: 'q', label: 'enqueue email', protocol: 'async', why: 'x' },
    { id: 'e5', source: 'q', target: 'wk', label: 'consume', protocol: 'async', why: 'x' },
    { id: 'e6', source: 'gw', target: 'auth', label: 'authenticate', protocol: 'sync', why: 'x' },
    { id: 'e7', source: 'svc', target: 'log', label: 'emit', protocol: 'async', why: 'x' },
  ],
});

test('builds a request flow that follows the sync path from the entrypoint', () => {
  const { flows } = explainArchitecture(base());
  const req = flows.find((f) => f.id === 'request');
  assert.ok(req, 'a request flow should exist');
  const ids = req.steps.map((s) => s.id);
  assert.equal(ids[0], 'web', 'starts at the entrypoint');
  assert.ok(ids.includes('gw') && ids.includes('svc'), 'passes through gateway and service');
  assert.equal(ids.at(-1), 'db', 'ends at the datastore');
});

test('the request flow excludes cross-cutting tiers (auth/observability)', () => {
  const { flows } = explainArchitecture(base());
  const ids = flows.find((f) => f.id === 'request').steps.map((s) => s.id);
  assert.ok(!ids.includes('auth'), 'auth should not clutter the main spine');
  assert.ok(!ids.includes('log'), 'logging should not clutter the main spine');
});

test('carries the edge label and tech onto each step', () => {
  const { flows } = explainArchitecture(base());
  const steps = flows.find((f) => f.id === 'request').steps;
  const gw = steps.find((s) => s.id === 'gw');
  assert.equal(gw.via, 'place order', 'shows what flows INTO the step');
  assert.equal(gw.tech, 'Envoy');
});

test('surfaces a background flow for queued work', () => {
  const { flows } = explainArchitecture(base());
  const bg = flows.find((f) => f.id === 'background');
  assert.ok(bg, 'a background flow should exist');
  const ids = bg.steps.map((s) => s.id);
  assert.ok(ids.includes('q'), 'goes through the queue');
});

test('describes every datastore with its role and who writes it', () => {
  const { stores } = explainArchitecture(base());
  const db = stores.find((s) => s.id === 'db');
  assert.ok(db, 'the datastore should be described');
  assert.match(db.role, /transaction|consisten/i);
  assert.deepEqual(db.writtenBy, ['Order Service']);
});

test('lists only the tiers this design actually uses, in flow order', () => {
  const { layers } = explainArchitecture(base());
  const order = layers.map((l) => l.layer);
  assert.equal(order[0], 'client', 'client tier first');
  assert.ok(order.indexOf('gateway') < order.indexOf('data'), 'gateway before data');
  assert.ok(layers.every((l) => l.components.length > 0), 'no empty tiers');
  assert.ok(layers.every((l) => l.role), 'every tier explains its purpose');
});

test('summarizes the shape of the system in plain English', () => {
  const { summary } = explainArchitecture(base());
  assert.match(summary, /8 components/);
  assert.match(summary, /Web App/);
});

test('returns an empty explanation for an empty architecture', () => {
  const x = explainArchitecture({ nodes: [], edges: [] });
  assert.deepEqual(x.flows, []);
  assert.equal(x.summary, '');
});
