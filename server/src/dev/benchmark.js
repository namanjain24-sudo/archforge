/**
 * Ground-truth benchmark — match our output against REAL published architectures.
 * ------------------------------------------------------------------------------
 * For each well-known system we encode the key building blocks its real,
 * published architecture is known to have (curated from Uber Engineering, the
 * Netflix Tech Blog, Instagram Engineering, ByteByteGo / "System Design
 * Interview" by Alex Xu, and High Scalability). Each block is an `anyOf` group
 * of node types that legitimately fills that role. We then generate the design
 * from a plain prompt and measure RECALL: how many of the real system's blocks
 * our diagram independently reproduced — and, crucially, WHICH it missed, so we
 * know exactly what to improve.
 *
 *   node src/dev/benchmark.js
 *   EVAL_COUNT=3 node src/dev/benchmark.js
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
// Pace the suite under the providers' aggregate tokens-per-minute ceiling.
// Each prompt costs ~9k tokens across its candidates, so firing them 2.5s
// apart overran the budget and produced spurious rate-limit 'failures'.
const GAP_MS = Number(process.env.EVAL_GAP_MS || 8000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// role → node types that satisfy it, per the real published design.
const TRUTH = [
  { name: 'Uber', source: 'Uber Eng / ByteByteGo',
    prompt: 'a ride-sharing platform like Uber with driver matching, live GPS tracking, trip payments and surge pricing',
    blocks: {
      'edge/gateway':      ['api_gateway', 'load_balancer'],
      'matching service':  ['service'],
      'geospatial index':  ['maps_service', 'time_series_db'],
      'event streaming':   ['stream_processor', 'event_bus', 'message_queue'],
      'trip datastore':    ['wide_column_db', 'sql_db', 'nosql_db'],
      'payments':          ['payment_gateway'],
      'cache':             ['cache'],
      'realtime push':     ['websocket_server'],
      'observability':     ['logging', 'metrics', 'tracing'],
    } },
  { name: 'Netflix', source: 'Netflix Tech Blog',
    prompt: 'a video streaming platform like Netflix with a global CDN, content upload, transcoding and personalized recommendations',
    blocks: {
      'CDN':               ['cdn'],
      'API gateway (Zuul)':['api_gateway', 'load_balancer'],
      'microservices':     ['service'],
      'object storage':    ['blob_storage'],
      'transcoding async': ['message_queue', 'worker', 'stream_processor'],
      'cache (EVCache)':   ['cache'],
      'recommendations':   ['model_serving', 'feature_store', 'vector_db'],
      'analytics':         ['data_warehouse', 'stream_processor'],
      'observability':     ['logging', 'metrics', 'tracing'],
    } },
  { name: 'Instagram', source: 'Instagram Eng / High Scalability',
    prompt: 'a photo-sharing social network like Instagram with a personalized feed, following, photo uploads and notifications at massive scale',
    blocks: {
      'CDN':               ['cdn'],
      'load balancer':     ['load_balancer', 'api_gateway'],
      'app services':      ['service'],
      'cache (Memcached)': ['cache'],
      'relational store':  ['sql_db'],
      'wide-column store': ['nosql_db', 'wide_column_db'],
      'photo blob store':  ['blob_storage'],
      'feed fan-out':      ['message_queue', 'worker', 'event_bus'],
      'notifications':     ['push_service', 'email_service'],
      'observability':     ['logging', 'metrics', 'tracing'],
    } },
  { name: 'WhatsApp', source: 'ByteByteGo / High Scalability',
    prompt: 'a realtime messaging app like WhatsApp with 1:1 and group chat, presence, delivery receipts and push notifications',
    blocks: {
      'realtime gateway':  ['websocket_server'],
      'chat services':     ['service'],
      'message queue':     ['message_queue', 'event_bus'],
      'message store':     ['nosql_db', 'wide_column_db', 'sql_db'],
      'push':              ['push_service'],
      'observability':     ['logging', 'metrics', 'tracing'],
    } },
  { name: 'Airbnb', source: 'System Design Interview (Alex Xu)',
    prompt: 'a lodging marketplace like Airbnb with listing search, availability, bookings, payments and reviews',
    blocks: {
      'gateway':           ['api_gateway', 'load_balancer'],
      'search':            ['search_index'],
      'services':          ['service'],
      'relational store':  ['sql_db'],
      'payments':          ['payment_gateway'],
      'cache':             ['cache'],
      'observability':     ['logging', 'metrics', 'tracing'],
    } },
];

const hasAny = (a, types) => a.nodes.some((n) => types.includes(n.type));

console.log(`\nGround-truth benchmark · vs. real published architectures · ${COUNT} candidate(s)\n`);
let totMatched = 0, totBlocks = 0;
const rows = [];

for (const t of TRUTH) {
  try {
    const r = await runPipeline(t.prompt, { count: COUNT });
    const entries = Object.entries(t.blocks);
    const matched = entries.filter(([, types]) => hasAny(r.architecture, types));
    const missed = entries.filter(([, types]) => !hasAny(r.architecture, types)).map(([role]) => role);
    totMatched += matched.length; totBlocks += entries.length;
    const recall = Math.round((matched.length / entries.length) * 100);
    rows.push({ name: t.name, recall, matched: matched.length, total: entries.length, missed, nodes: r.architecture.nodes.length, source: t.source });
  } catch (e) {
    rows.push({ name: t.name, error: e.message });
  }
  await sleep(GAP_MS);
}

for (const row of rows) {
  if (row.error) { console.log(`${row.name.padEnd(11)} ERROR — ${row.error}`); continue; }
  const bar = '█'.repeat(Math.round(row.recall / 5)).padEnd(20);
  console.log(`${row.name.padEnd(11)} ${String(row.recall).padStart(3)}%  ${bar} ${row.matched}/${row.total} blocks · ${row.nodes} nodes  (${row.source})`);
  if (row.missed.length) console.log(`${' '.repeat(12)}missing: ${row.missed.join(', ')}`);
}

const overall = totBlocks ? Math.round((totMatched / totBlocks) * 100) : 0;
console.log(`\nOverall ground-truth recall: ${overall}%  (${totMatched}/${totBlocks} real-architecture blocks reproduced)\n`);
