/**
 * Real-user integration test — drives the HTTP API exactly like the frontend
 * will, and checks the response has everything the UI needs. Also probes edge
 * cases (empty / gibberish prompts).
 *
 * Assumes the server is running:  node src/index.js
 *   node src/dev/api-test.js [baseURL]
 */
const BASE = process.argv[2] || 'http://localhost:8799';
const post = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const get = (path) => fetch(BASE + path);

const issues = [];
const check = (cond, msg) => { if (!cond) { issues.push(msg); console.log('  ⚠', msg); } };

console.log('1) GET /api/health');
const health = await get('/api/health').then((r) => r.json());
console.log('   providers:', health.providers);
check(health.ok, 'health not ok');

console.log('2) GET /api/examples');
const ex = await get('/api/examples').then((r) => r.json());
console.log('   examples:', ex.examples?.length);

console.log('3) edge case — empty prompt (expect 400)');
const bad = await post('/api/generate', { prompt: '' });
console.log('   status:', bad.status);
check(bad.status === 400, 'empty prompt should 400');

console.log('4) POST /api/generate — a real user prompt');
const prompt = 'a food delivery app with restaurant search, orders, payments and live courier tracking';
const t0 = Date.now();
const res = await post('/api/generate', { prompt });
console.log('   status:', res.status, '| time:', Date.now() - t0, 'ms');
if (!res.ok) { console.log('   FAILED:', await res.text()); process.exit(1); }
const r = await res.json();

// ── validate everything the frontend consumes ──
console.log('\n5) Response completeness for the frontend:');
check(r.architecture?.nodes?.length > 0, 'no nodes');
check(r.graph?.nodes?.length === r.architecture?.nodes?.length, 'graph/arch node count mismatch');
check(r.graph?.nodes?.every((n) => Number.isFinite(n.position?.x) && Number.isFinite(n.position?.y)), 'some graph nodes lack positions');
check(r.graph?.nodes?.every((n) => n.data?.label && n.data?.layer && n.data?.icon), 'some nodes lack label/layer/icon');
check(r.graph?.edges?.length === r.architecture?.edges?.length, 'graph/arch edge count mismatch');
check(r.graph?.edges?.every((e) => e.data?.protocol), 'some edges lack protocol');
check(r.capacity?.metrics?.length === 8, 'capacity metrics missing');
check(r.review?.pillars?.length === 6, 'review pillars missing');
check(typeof r.readiness?.score === 'number', 'readiness score missing');
check(Array.isArray(r.findings), 'findings missing');
check(Array.isArray(r.capabilities), 'capabilities missing');
const dbNode = r.graph?.nodes?.find((n) => n.data?.isStore);
check(!dbNode || dbNode.data?.cloud?.aws, 'store node lacks cloud mapping');
check(r.architecture.nodes.every((n) => n.why && n.why.length > 3), 'some nodes lack a why');
check(r.architecture.nodes.every((n) => !n.tech || !/^(various|generic|database|db)$/i.test(n.tech)), 'some nodes have vague tech');

console.log(`\n   system: ${r.architecture.system.name} | nodes ${r.architecture.nodes.length} | edges ${r.architecture.edges.length}`);
console.log(`   grounding: ${r.grounding.map((g) => g.domain).join(', ')} | caps: ${r.capabilities.map((c) => c.label).join(', ')}`);
console.log(`   readiness ${r.readiness.score}/100 | well-architected ${r.review.overall}/100 | autofixes ${r.meta.autofixes} | provider ${r.meta.provider}`);
console.log(`   layers used: ${[...new Set(r.graph.nodes.map((n) => n.data.layer))].join(', ')}`);

console.log(`\n${issues.length ? '⚠ ' + issues.length + ' issue(s) found' : '✅ all frontend-completeness checks passed'}`);
