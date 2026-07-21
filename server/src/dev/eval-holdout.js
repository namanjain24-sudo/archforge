/**
 * HELD-OUT accuracy eval — fresh material the system has never been tuned on.
 * ---------------------------------------------------------------------------
 * eval.js and benchmark.js have been run repeatedly while improving ArchForge,
 * so their prompts risk measuring "fit to the test set". This file exists to
 * give an honest generalization number: every prompt, every domain and every
 * ground-truth system below is NEW — none of them shaped any keyword, rule or
 * reference in the engine.
 *
 * Two halves, same rigor as the main harness:
 *   1. RUBRIC   — 10 hard checks on 10 unseen domains.
 *   2. GROUND   — recall vs. five more real, published architectures.
 *
 *   node src/dev/eval-holdout.js
 */
import '../config/env.js';
import { fileURLToPath } from 'node:url';
// Reuse cached model output across runs so iterating on the verifier costs no
// tokens. Set ARCHFORGE_NO_CACHE=1 to force fresh generations.
// NOTE: fileURLToPath, not URL.pathname — pathname is percent-encoded, so a
// project path containing a space would silently write to the wrong directory.
if (!process.env.ARCHFORGE_NO_CACHE && !process.env.ARCHFORGE_CACHE_DIR) {
  process.env.ARCHFORGE_CACHE_DIR = fileURLToPath(new URL('../../.eval-cache/', import.meta.url));
}

import { runPipeline } from '../engine/pipeline.js';

const COUNT = Number(process.env.EVAL_COUNT || 2);
const VAGUE = /^(various|generic|database|db|store|cache|queue|service|tbd|n\/?a|custom|backend|frontend)$/i;
// Pace the suite under the providers' aggregate tokens-per-minute ceiling.
// Each prompt costs ~9k tokens across its candidates, so firing them 2.5s
// apart overran the budget and produced spurious rate-limit 'failures'.
const GAP_MS = Number(process.env.EVAL_GAP_MS || 8000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. Unseen domains. `expect` = anyOf groups a correct design must contain.
const CASES = [
  { prompt: 'a multiplayer game backend with matchmaking, realtime game state and leaderboards',
    expect: [['websocket_server', 'event_bus'], ['cache', 'nosql_db']] },
  { prompt: 'a hotel booking platform with room search, availability calendars, reservations and payments',
    expect: [['search_index'], ['payment_gateway'], ['sql_db']] },
  { prompt: 'a stock trading platform with real-time market data, order matching and portfolio tracking',
    expect: [['stream_processor', 'event_bus', 'websocket_server'], ['time_series_db', 'sql_db', 'ledger_db']] },
  { prompt: 'a learning management system with video courses, quizzes, progress tracking and certificates',
    expect: [['blob_storage'], ['sql_db', 'nosql_db']] },
  { prompt: 'a package logistics platform with shipment tracking, route optimisation and delivery notifications',
    expect: [['maps_service', 'time_series_db', 'stream_processor'], ['push_service', 'email_service', 'sms_service']] },
  { prompt: 'a ticketing platform like Ticketmaster handling flash sales for concerts with seat reservation',
    expect: [['cache'], ['message_queue', 'event_bus'], ['sql_db']] },
  { prompt: 'a hospital records system with patient charts, lab results, prescriptions and doctor scheduling',
    expect: [['sql_db'], ['auth_service']] },
  { prompt: 'a crypto exchange with an order book, wallet custody, trade settlement and KYC checks',
    expect: [['ledger_db', 'sql_db'], ['stream_processor', 'event_bus', 'message_queue']] },
  { prompt: 'an ad serving platform with real-time bidding, targeting and impression analytics',
    expect: [['stream_processor', 'event_bus'], ['data_warehouse', 'cache']] },
  { prompt: 'a podcast hosting platform with audio upload, transcoding, RSS feeds and listen analytics',
    expect: [['blob_storage'], ['message_queue', 'worker', 'stream_processor']] },
];

// ── 2. Five more real architectures, curated from public engineering sources.
const TRUTH = [
  { name: 'Twitter', source: 'Twitter Eng / ByteByteGo',
    prompt: 'a microblogging platform like Twitter with a home timeline, followers, posting and trending topics',
    blocks: {
      'CDN / edge': ['cdn', 'load_balancer'],
      'gateway': ['api_gateway', 'load_balancer'],
      'services': ['service'],
      'timeline cache': ['cache'],
      'fan-out queue': ['message_queue', 'event_bus', 'stream_processor'],
      'tweet store': ['nosql_db', 'wide_column_db', 'sql_db'],
      'search / trends': ['search_index'],
      'observability': ['logging', 'metrics', 'tracing'],
    } },
  { name: 'Dropbox', source: 'Dropbox Eng / High Scalability',
    prompt: 'a file storage and sync service like Dropbox with uploads, versioning, sharing and cross-device sync',
    blocks: {
      'gateway': ['api_gateway', 'load_balancer'],
      'metadata store': ['sql_db', 'nosql_db'],
      'block/object storage': ['blob_storage'],
      'sync notification': ['websocket_server', 'message_queue', 'event_bus', 'push_service'],
      'services': ['service'],
      'cache': ['cache'],
      'observability': ['logging', 'metrics', 'tracing'],
    } },
  { name: 'Slack', source: 'Slack Eng',
    prompt: 'a team chat platform like Slack with channels, threads, presence, search and file sharing',
    blocks: {
      'realtime gateway': ['websocket_server'],
      'services': ['service'],
      'message store': ['sql_db', 'nosql_db', 'wide_column_db'],
      'search': ['search_index'],
      'file storage': ['blob_storage'],
      'queue': ['message_queue', 'event_bus'],
      'observability': ['logging', 'metrics', 'tracing'],
    } },
  { name: 'DoorDash', source: 'DoorDash Eng',
    prompt: 'an on-demand delivery marketplace like DoorDash with merchant catalogues, order placement, courier dispatch and live ETA',
    blocks: {
      'gateway': ['api_gateway', 'load_balancer'],
      'services': ['service'],
      'geo / routing': ['maps_service', 'time_series_db'],
      'dispatch stream': ['stream_processor', 'event_bus', 'message_queue'],
      'payments': ['payment_gateway'],
      'search': ['search_index'],
      'cache': ['cache'],
      'observability': ['logging', 'metrics', 'tracing'],
    } },
  { name: 'YouTube', source: 'ByteByteGo / High Scalability',
    prompt: 'a video sharing platform like YouTube with uploads, transcoding, adaptive streaming, comments and recommendations',
    blocks: {
      'CDN': ['cdn'],
      'gateway': ['api_gateway', 'load_balancer'],
      'services': ['service'],
      'video blob storage': ['blob_storage'],
      'transcoding pipeline': ['message_queue', 'worker', 'stream_processor'],
      'metadata store': ['sql_db', 'nosql_db', 'wide_column_db'],
      'recommendations': ['model_serving', 'feature_store', 'vector_db'],
      'observability': ['logging', 'metrics', 'tracing'],
    } },
];

const degreeOf = (a) => {
  const d = Object.fromEntries(a.nodes.map((n) => [n.id, 0]));
  for (const e of a.edges) { d[e.source]++; d[e.target]++; }
  return d;
};
const hasAny = (a, types) => a.nodes.some((n) => types.includes(n.type));

function grade(c, r) {
  const a = r.architecture;
  const deg = degreeOf(a);
  const openCov = r.findings.filter((f) => f.id === 'capability-coverage' && !f.fixed).length;
  const unfixedErr = r.findings.filter((f) => f.severity === 'error' && !f.fixed).length;
  const nonClient = a.nodes.filter((n) => n.layer !== 'client');
  const concrete = nonClient.filter((n) => n.tech && !VAGUE.test(String(n.tech).trim())).length;
  return {
    entrypoint: a.nodes.some((n) => n.layer === 'client'),
    auth: a.nodes.some((n) => n.layer === 'security'),
    observability: a.nodes.some((n) => n.layer === 'observability'),
    noErrors: unfixedErr === 0,
    noOrphans: a.nodes.every((n) => deg[n.id] > 0),
    coverage: openCov === 0,
    concreteTech: nonClient.length === 0 || concrete / nonClient.length >= 0.85,
    expectedTypes: c.expect.every((g) => hasAny(a, g)),
    readiness: r.readiness.score >= 80,
    notToy: a.nodes.length >= 8,
    explains: (r.explanation?.flows?.length || 0) > 0, // the walkthrough must be derivable
  };
}

console.log(`\nHELD-OUT eval · ${CASES.length} unseen domains + ${TRUTH.length} unseen real systems · ${COUNT} candidate(s)\n`);
console.log('── 1. Rubric on unseen domains ' + '─'.repeat(44));
const agg = {};
let promptsPassed = 0, promptsRun = 0;

for (const c of CASES) {
  try {
    const r = await runPipeline(c.prompt, { count: COUNT });
    const checks = grade(c, r);
    for (const [k, v] of Object.entries(checks)) { agg[k] = agg[k] || { pass: 0, n: 0 }; agg[k].n++; if (v) agg[k].pass++; }
    const fails = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    const passed = Object.values(checks).filter(Boolean).length, total = Object.keys(checks).length;
    const ok = passed / total >= 0.9;
    promptsRun++; if (ok) promptsPassed++;
    const label = c.prompt.length > 46 ? c.prompt.slice(0, 45) + '…' : c.prompt;
    console.log(`${ok ? '✓' : '✗'} ${label}`.padEnd(50) + ` ${passed}/${total}`.padEnd(7) + (fails.join(', ') || '—'));
  } catch (e) {
    promptsRun++;
    console.log(`✗ ${c.prompt.slice(0, 45)}`.padEnd(50) + '  ERROR  ' + e.message.slice(0, 60));
  }
  await sleep(GAP_MS);
}

console.log('\nPer-check pass rate (unseen domains):');
for (const [k, v] of Object.entries(agg)) {
  const pct = Math.round((v.pass / v.n) * 100);
  console.log(`  ${k.padEnd(15)} ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 5)).padEnd(20)} ${v.pass}/${v.n}`);
}
const rubric = Object.values(agg).reduce((s, v) => s + v.pass, 0) / Math.max(1, Object.values(agg).reduce((s, v) => s + v.n, 0));

console.log('\n── 2. Ground truth vs unseen real architectures ' + '─'.repeat(28));
let tot = 0, hit = 0;
for (const t of TRUTH) {
  try {
    const r = await runPipeline(t.prompt, { count: COUNT });
    const entries = Object.entries(t.blocks);
    const matched = entries.filter(([, types]) => hasAny(r.architecture, types));
    const missed = entries.filter(([, types]) => !hasAny(r.architecture, types)).map(([k]) => k);
    hit += matched.length; tot += entries.length;
    const pct = Math.round((matched.length / entries.length) * 100);
    console.log(`${t.name.padEnd(11)} ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 5)).padEnd(20)} ${matched.length}/${entries.length} · ${r.architecture.nodes.length} nodes`);
    if (missed.length) console.log(`${' '.repeat(12)}missing: ${missed.join(', ')}`);
  } catch (e) {
    console.log(`${t.name.padEnd(11)} ERROR — ${e.message.slice(0, 60)}`);
  }
  await sleep(GAP_MS);
}

console.log('\n' + '═'.repeat(74));
console.log(`HELD-OUT RUBRIC accuracy : ${(rubric * 100).toFixed(1)}%   (${promptsPassed}/${promptsRun} prompts fully passing)`);
console.log(`HELD-OUT GROUND-TRUTH    : ${tot ? Math.round((hit / tot) * 100) : 0}%   (${hit}/${tot} real blocks reproduced)`);
console.log('═'.repeat(74) + '\n');
