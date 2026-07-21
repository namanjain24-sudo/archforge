import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchitecture } from './normalize.js';
import { verify } from './verify.js';

const has = (findings, id) => findings.some((f) => f.id === id);
const norm = (a) => normalizeArchitecture(a);

test('auto-reroutes a forbidden client→auth edge through the gateway', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'auth', type: 'auth_service', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'req', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'web', target: 'auth', label: 'login', protocol: 'sync', why: 'x' }, // client→security (illegal)
      { id: 'e3', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed, findings } = verify(arch, { promptText: 'app with login' });
  // the illegal edge is gone, and a gateway→auth hop now exists
  assert.ok(!fixed.edges.some((e) => e.source === 'web' && e.target === 'auth'));
  assert.ok(fixed.edges.some((e) => e.source === 'gw' && e.target === 'auth'));
  const f = findings.find((x) => x.id === 'allowed-layer-edges');
  assert.ok(f && f.fixed);
});

test('reverses a backwards edge instead of dropping it', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'auth', type: 'auth_service', why: 'x' },
    ],
    edges: [{ id: 'e1', source: 'auth', target: 'gw', label: 'auth', protocol: 'sync', why: 'backwards' }], // security→gateway (illegal)
  });
  const { arch: fixed, findings } = verify(arch, {});
  assert.ok(fixed.edges.some((e) => e.source === 'gw' && e.target === 'auth')); // reversed
  assert.ok(!fixed.edges.some((e) => e.source === 'auth' && e.target === 'gw'));
  assert.ok(findings.some((f) => f.id === 'allowed-layer-edges' && f.fixed && /reversed/i.test(f.message)));
});

test('auto-connects an orphaned edge-layer node (e.g. WAF) into the flow', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'waf', type: 'waf', why: 'x' }, // added but never wired
    ],
    edges: [{ id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' }],
  });
  const { arch: fixed, findings } = verify(arch, {});
  const wafDegree = fixed.edges.filter((e) => e.source === 'waf' || e.target === 'waf').length;
  assert.ok(wafDegree >= 1, 'WAF should be connected');
  assert.ok(findings.some((f) => f.id === 'no-orphan-nodes' && f.fixed));
});

test('auto-connects an orphaned service so it is reachable from the gateway', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'orphan', type: 'service', label: 'E-Prescription Service', why: 'x' }, // never wired
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed, findings } = verify(arch, {});
  const deg = fixed.edges.filter((e) => e.source === 'orphan' || e.target === 'orphan').length;
  assert.ok(deg >= 1, 'orphan service should be wired in');
  assert.ok(findings.some((f) => f.id === 'no-orphan-nodes' && f.fixed));
});

test('wires an orphaned datastore to its name-matched service', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'appt', type: 'service', label: 'Appointment Service', why: 'x' },
      { id: 'ehr', type: 'service', label: 'EHR Service', why: 'x' },
      { id: 'apptdb', type: 'sql_db', label: 'Appointment Database', why: 'x' }, // orphan store
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'appt', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'gw', target: 'ehr', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed } = verify(arch, {});
  const writer = fixed.edges.find((e) => e.target === 'apptdb');
  assert.ok(writer, 'orphan datastore should get a writer');
  assert.equal(writer.source, 'appt', 'should wire to the Appointment Service, not EHR');
});

test('auto-injects an auth boundary when the design has none', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed, findings } = verify(arch, {});
  const auth = fixed.nodes.find((n) => n.layer === 'security');
  assert.ok(auth, 'an auth service should be injected');
  assert.ok(fixed.edges.some((e) => e.target === auth.id), 'auth should be wired from the entry');
  const f = findings.find((x) => x.id === 'auth-boundary');
  assert.ok(f && f.fixed, 'auth-boundary should be reported as fixed, not an open warning');
});

test('auto-injects observability (logging, metrics, tracing) when absent', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed } = verify(arch, {});
  const obs = new Set(fixed.nodes.filter((n) => n.layer === 'observability').map((n) => n.type));
  assert.ok(obs.has('logging') && obs.has('metrics') && obs.has('tracing'), 'the observability trio should be present');
});

test('connects an orphaned external dependency (payment gateway) to its service', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'pay', type: 'service', label: 'Payment Service', why: 'x' },
      { id: 'stripe', type: 'payment_gateway', label: 'Payment Gateway', why: 'x' }, // orphan external
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'pay', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed } = verify(arch, {});
  const wired = fixed.edges.some((e) => e.target === 'stripe' && e.source === 'pay');
  assert.ok(wired, 'the payment gateway should be wired from the Payment Service');
});

test('flags a single point of failure', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'db', type: 'sql_db', why: 'x', redundant: false },
    ],
    edges: [{ id: 'e1', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'x' }],
  });
  const { findings } = verify(arch, {});
  assert.ok(has(findings, 'no-single-point-of-failure'));
});

test('auto-injects a cache for a read-heavy design that lacks one', () => {
  const arch = norm({
    system: { name: 'X' },
    assumptions: { dailyActiveUsers: 1000, actionsPerUserPerDay: 10, readWriteRatio: 20, avgItemSizeBytes: 500, retentionDays: 30, latencySloMs: 200, consistency: 'eventual' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'db', type: 'sql_db', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'svc', target: 'db', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed, findings } = verify(arch, { promptText: 'a shop with payments and search' });
  // A cache was added and wired from the service that reads the datastore.
  const cache = fixed.nodes.find((n) => n.type === 'cache');
  assert.ok(cache, 'a cache node should be injected');
  assert.ok(cache.redundant, 'the injected cache should be redundant');
  assert.ok(fixed.edges.some((e) => e.source === 'svc' && e.target === cache.id), 'service should read/write the cache');
  // The finding is now auto-fixed, not an open warning.
  const cf = findings.find((f) => f.id === 'cache-read-heavy');
  assert.ok(cf && cf.fixed, 'cache-read-heavy should be reported as fixed');
  assert.ok(has(findings, 'capability-coverage')); // payments + search still missing
  assert.ok(has(findings, 'observability-present'));
  assert.ok(has(findings, 'auth-boundary'));
});

test('does not add a second cache when one already exists', () => {
  const arch = norm({
    system: { name: 'X' },
    assumptions: { dailyActiveUsers: 1000, actionsPerUserPerDay: 10, readWriteRatio: 20, avgItemSizeBytes: 500, retentionDays: 30, latencySloMs: 200, consistency: 'eventual' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'db', type: 'sql_db', why: 'x' },
      { id: 'redis', type: 'cache', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'svc', target: 'db', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e4', source: 'svc', target: 'redis', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed } = verify(arch, {});
  assert.equal(fixed.nodes.filter((n) => n.type === 'cache').length, 1);
});

test('flags a direct OLTP write to a data warehouse', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'dw', type: 'data_warehouse', why: 'x' },
    ],
    edges: [{ id: 'e1', source: 'svc', target: 'dw', label: 'write', protocol: 'sync', why: 'x' }],
  });
  const { findings } = verify(arch, {});
  assert.ok(has(findings, 'analytics-via-pipeline'));
});

test('a clean design scores higher than a broken one', () => {
  const clean = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
      { id: 'cache', type: 'cache', why: 'x' },
      { id: 'db', type: 'sql_db', why: 'x', redundant: true },
      { id: 'log', type: 'logging', why: 'x' },
      { id: 'auth', type: 'auth_service', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'gw', target: 'auth', label: 'a', protocol: 'sync', why: 'x' },
      { id: 'e4', source: 'svc', target: 'cache', label: 'c', protocol: 'sync', why: 'x' },
      { id: 'e5', source: 'svc', target: 'db', label: 'w', protocol: 'sync', why: 'x' },
      { id: 'e6', source: 'svc', target: 'log', label: 'l', protocol: 'async', why: 'x' },
    ],
  });
  const broken = norm({
    system: { name: 'X' },
    nodes: [{ id: 'web', type: 'web_app', why: 'x' }, { id: 'db', type: 'sql_db', why: 'x' }],
    edges: [{ id: 'e1', source: 'web', target: 'db', label: 'x', protocol: 'sync', why: 'x' }],
  });
  const a = verify(clean, { promptText: 'basic web app' });
  const b = verify(broken, { promptText: 'basic web app' });
  assert.ok(a.score > b.score, `clean(${a.score}) should beat broken(${b.score})`);
});

test('wires back a subgraph that has edges but is unreachable from the entrypoint', () => {
  // The gateway feeds services, but NOTHING feeds the gateway — every node has
  // degree > 0, so a plain orphan check misses that no request can ever arrive.
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', label: 'Web App', why: 'x' },
      { id: 'lb', type: 'load_balancer', label: 'Load Balancer', why: 'x' },
      { id: 'gw', type: 'api_gateway', label: 'API Gateway', why: 'x' },
      { id: 'svc', type: 'service', label: 'User Service', why: 'x' },
      { id: 'db', type: 'sql_db', label: 'User DB', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'lb', label: 'req', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'route', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'svc', target: 'db', label: 'read', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed, findings } = verify(arch, {});

  const reach = new Set(['web']);
  const stack = ['web'];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fixed.edges) if (e.source === cur && !reach.has(e.target)) { reach.add(e.target); stack.push(e.target); }
  }
  for (const id of ['gw', 'svc', 'db']) {
    assert.ok(reach.has(id), `${id} should be reachable from the entrypoint after the fix`);
  }
  assert.ok(findings.some((f) => f.fixed && /[Uu]nreachable/.test(f.message)), 'should report the reachability fix');
});

test('does not report a reachability problem for a well-formed design', () => {
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', why: 'x' },
      { id: 'gw', type: 'api_gateway', why: 'x' },
      { id: 'svc', type: 'service', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    ],
  });
  const { findings } = verify(arch, {});
  assert.ok(!findings.some((f) => /Not reachable/.test(f.message || '')), 'no false reachability complaint');
});

// ── Coverage for the previously-unimplemented principles ───────────────────

const simple = (extraNodes = [], extraEdges = [], assumptions = null) => norm({
  system: { name: 'X', scale: 'large' },
  ...(assumptions ? { assumptions } : {}),
  nodes: [
    { id: 'web', type: 'web_app', label: 'Web', why: 'x' },
    { id: 'gw', type: 'api_gateway', label: 'Gateway', why: 'x' },
    { id: 'svc', type: 'service', label: 'Service', why: 'x' },
    ...extraNodes,
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
    { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
    ...extraEdges,
  ],
});

test('a user-drawn edge into a queue always ends up asynchronous', () => {
  // normalize corrects it up-front; verify is the safety net for anything that
  // sets a wrong protocol afterwards. Either way the guarantee is the outcome.
  const arch = simple(
    [{ id: 'q', type: 'message_queue', label: 'Queue', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'q', label: 'enqueue', protocol: 'sync', why: 'user drew this' }],
  );
  const { arch: fixed } = verify(arch, {});
  assert.equal(fixed.edges.find((e) => e.target === 'q').protocol, 'async');
});

test('verify repairs a wrong protocol introduced after normalization', () => {
  const arch = simple(
    [{ id: 'sp', type: 'stream_processor', label: 'Kafka', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'sp', label: 'stream', protocol: 'stream', why: 'x' }],
  );
  arch.edges.find((e) => e.target === 'sp').protocol = 'sync'; // corrupt post-normalize
  const { arch: fixed, findings } = verify(arch, {});
  assert.equal(fixed.edges.find((e) => e.target === 'sp').protocol, 'stream');
  assert.ok(findings.some((f) => f.id === 'protocol-correctness' && f.fixed));
});

test('flags a stateful application service', () => {
  const arch = simple();
  arch.nodes.find((n) => n.id === 'svc').stateful = true;
  const { findings } = verify(arch, {});
  assert.ok(has(findings, 'stateless-app-tier'));
});

test('suggests a CDN when user-facing files come straight from object storage', () => {
  const arch = simple(
    [{ id: 'blob', type: 'blob_storage', label: 'Files', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'blob', label: 'store', protocol: 'sync', why: 'x' }],
  );
  assert.ok(has(verify(arch, {}).findings, 'cdn-for-static'));
  // …and stays quiet once a CDN exists
  const withCdn = simple(
    [{ id: 'blob', type: 'blob_storage', label: 'Files', why: 'x' }, { id: 'cdn', type: 'cdn', label: 'CDN', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'blob', label: 'store', protocol: 'sync', why: 'x' },
      { id: 'e4', source: 'web', target: 'cdn', label: 'assets', protocol: 'sync', why: 'x' },
      { id: 'e5', source: 'cdn', target: 'svc', label: 'origin', protocol: 'sync', why: 'x' }],
  );
  assert.ok(!has(verify(withCdn, {}).findings, 'cdn-for-static'));
});

test('requires idempotency wherever money moves', () => {
  const arch = simple(
    [{ id: 'pay', type: 'payment_gateway', label: 'Stripe', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'pay', label: 'charge', protocol: 'sync', why: 'x' }],
  );
  assert.ok(has(verify(arch, {}).findings, 'idempotent-critical-writes'));
});

test('recommends partitioning once projected volume passes a terabyte', () => {
  const arch = simple(
    [{ id: 'db', type: 'sql_db', label: 'DB', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'x' }],
  );
  const big = { capacity: { raw: { totalStorageBytes: 5 * 1024 ** 4 } } };
  assert.ok(has(verify(arch, big).findings, 'sharding-for-volume'));
  assert.ok(!has(verify(arch, { capacity: { raw: { totalStorageBytes: 1e9 } } }).findings, 'sharding-for-volume'));
});

test('flags a domain component the prompt never asked for', () => {
  const arch = simple(
    [{ id: 'pay', type: 'payment_gateway', label: 'Stripe', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'pay', label: 'charge', protocol: 'sync', why: 'x' }],
  );
  const { findings } = verify(arch, { promptText: 'a blog with articles and comments' });
  assert.ok(has(findings, 'no-hallucinated-components'));
});

test('never flags injected production infrastructure as unrequested', () => {
  // auth, cache and queues are mandated by the production baseline — and some
  // are injected by this very verifier, so complaining about them is a bug.
  const arch = simple(
    [{ id: 'q', type: 'message_queue', label: 'Queue', why: 'x' }, { id: 'sp', type: 'stream_processor', label: 'Kafka', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'q', label: 'enqueue', protocol: 'async', why: 'x' },
      { id: 'e4', source: 'svc', target: 'sp', label: 'stream', protocol: 'stream', why: 'x' }],
  );
  const { findings } = verify(arch, { promptText: 'a blog with articles' });
  const f = findings.find((x) => x.id === 'no-hallucinated-components');
  assert.ok(!f, `infrastructure must not be flagged, got: ${f?.message}`);
});

test('never reports a node as unconnected after wiring it back in', () => {
  // Guards the ordering bug: the orphan pass used to report a node the later
  // reachability pass had already rescued.
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', label: 'Web', why: 'x' },
      { id: 'gw', type: 'api_gateway', label: 'Gateway', why: 'x' },
      { id: 'svc', type: 'service', label: 'Service', why: 'x' },
    ],
    edges: [{ id: 'e1', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' }],
  });
  const { findings } = verify(arch, {});
  const rescued = findings.some((f) => f.fixed && /wired back|unconnected — wired/i.test(f.message));
  const complained = findings.some((f) => !f.fixed && /Unconnected:/.test(f.message || ''));
  assert.ok(!(rescued && complained), 'must not both fix and complain about the same nodes');
});

test('flags a production-sized design with no asynchronous path at all', () => {
  const nodes = [
    { id: 'web', type: 'web_app', why: 'x' }, { id: 'gw', type: 'api_gateway', why: 'x' },
    { id: 'svc', type: 'service', why: 'x' }, { id: 'db', type: 'sql_db', why: 'x' },
    { id: 'cache', type: 'cache', why: 'x' }, { id: 'auth', type: 'auth_service', why: 'x' },
    { id: 'log', type: 'logging', why: 'x' }, { id: 'met', type: 'metrics', why: 'x' },
  ];
  const arch = norm({
    system: { name: 'X' },
    nodes,
    edges: [
      { id: 'e1', source: 'web', target: 'gw', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'gw', target: 'svc', label: 'r', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'svc', target: 'db', label: 'rw', protocol: 'sync', why: 'x' },
      { id: 'e4', source: 'svc', target: 'cache', label: 'rw', protocol: 'sync', why: 'x' },
      { id: 'e5', source: 'gw', target: 'auth', label: 'auth', protocol: 'sync', why: 'x' },
      { id: 'e6', source: 'svc', target: 'log', label: 'emit', protocol: 'async', why: 'x' },
      { id: 'e7', source: 'svc', target: 'met', label: 'emit', protocol: 'async', why: 'x' },
    ],
  });
  assert.ok(has(verify(arch, {}).findings, 'async-offload'));
});

test('stays quiet when the design already has a queue', () => {
  const arch = simple(
    [{ id: 'q', type: 'message_queue', label: 'Queue', why: 'x' },
      { id: 'd1', type: 'sql_db', why: 'x' }, { id: 'd2', type: 'cache', why: 'x' },
      { id: 'a1', type: 'auth_service', why: 'x' }, { id: 'l1', type: 'logging', why: 'x' }],
    [{ id: 'e3', source: 'svc', target: 'q', label: 'enqueue', protocol: 'async', why: 'x' },
      { id: 'e4', source: 'svc', target: 'd1', label: 'rw', protocol: 'sync', why: 'x' },
      { id: 'e5', source: 'svc', target: 'd2', label: 'rw', protocol: 'sync', why: 'x' },
      { id: 'e6', source: 'gw', target: 'a1', label: 'auth', protocol: 'sync', why: 'x' },
      { id: 'e7', source: 'svc', target: 'l1', label: 'emit', protocol: 'async', why: 'x' }],
  );
  const f = verify(arch, {}).findings.filter((x) => x.id === 'async-offload' && /No queue, stream or worker/.test(x.message));
  assert.equal(f.length, 0);
});

test('an unreachable service is wired from the gateway, not from a peer service', () => {
  // Regression: the tier-preference used to score a same-tier peer as the
  // closest upstream, producing "User Service -> Coupon Service" instead of
  // "Load Balancer -> Coupon Service".
  const arch = norm({
    system: { name: 'X' },
    nodes: [
      { id: 'web', type: 'web_app', label: 'Web App', why: 'x' },
      { id: 'lb', type: 'load_balancer', label: 'Load Balancer', why: 'x' },
      { id: 'user', type: 'service', label: 'User Service', why: 'x' },
      { id: 'coupon', type: 'service', label: 'Coupon Service', why: 'x' }, // nothing feeds it
      { id: 'db', type: 'nosql_db', label: 'Coupon DB', why: 'x' },
    ],
    edges: [
      { id: 'e1', source: 'web', target: 'lb', label: 'traffic', protocol: 'sync', why: 'x' },
      { id: 'e2', source: 'lb', target: 'user', label: 'route', protocol: 'sync', why: 'x' },
      { id: 'e3', source: 'coupon', target: 'db', label: 'rw', protocol: 'sync', why: 'x' },
    ],
  });
  const { arch: fixed } = verify(arch, {});
  const feeders = fixed.edges.filter((e) => e.target === 'coupon').map((e) => e.source);
  assert.ok(feeders.length, 'the stranded service must be wired in');
  assert.ok(feeders.includes('lb'), `should be fed from the gateway tier, got: ${feeders.join(', ')}`);
  assert.ok(!feeders.includes('user'), 'must not hang off a peer service when a gateway exists');
});
