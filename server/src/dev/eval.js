/**
 * Accuracy eval harness (live — runs the full pipeline).
 * ------------------------------------------------------
 * batch.js prints a loose scorecard; this scores each generation against a
 * hard rubric with per-prompt EXPECTATIONS, then reports an aggregate accuracy
 * so we can gate regressions and prove the tool is accurate, not just plausible.
 *
 *   node src/dev/eval.js                # default set, 2 candidates each
 *   EVAL_COUNT=3 node src/dev/eval.js   # more candidates (best-of-N)
 *
 * Each prompt is graded on ten checks. A prompt "passes" at ≥90% of checks; the
 * suite passes when every prompt passes. Exit code is non-zero on failure, so
 * it can run in CI.
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
import { detectCapabilityIds } from '../engine/capabilities.js';

const COUNT = Number(process.env.EVAL_COUNT || 2);
const VAGUE = /^(various|generic|database|db|store|cache|queue|service|tbd|n\/?a|custom|backend|frontend)$/i;
// Pace the suite under the providers' aggregate tokens-per-minute ceiling.
// Each prompt costs ~9k tokens across its candidates, so firing them 2.5s
// apart overran the budget and produced spurious rate-limit 'failures'.
const GAP_MS = Number(process.env.EVAL_GAP_MS || 8000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Curated prompts with the concrete node types a correct design MUST contain.
// `anyOf` groups mean "at least one of these types is present".
const CASES = [
  { prompt: 'a scalable e-commerce platform with product search, payments and analytics',
    expect: [['payment_gateway'], ['search_index'], ['data_warehouse', 'stream_processor']] },
  { prompt: 'a realtime chat app like WhatsApp with group messaging and presence',
    expect: [['websocket_server', 'event_bus']] },
  { prompt: 'a ride-sharing app with driver matching, live tracking and payments',
    expect: [['payment_gateway'], ['maps_service', 'time_series_db', 'stream_processor']] },
  { prompt: 'a video streaming platform like YouTube with upload and transcoding',
    expect: [['blob_storage'], ['message_queue', 'worker', 'stream_processor']] },
  { prompt: 'an AI customer support chatbot that answers from our help docs using RAG',
    expect: [['vector_db'], ['model_serving']] },
  { prompt: 'a URL shortener handling billions of redirects',
    expect: [['cache'], ['sql_db', 'nosql_db', 'wide_column_db']] },
  { prompt: 'an online banking system with accounts, money transfers and fraud detection',
    expect: [['payment_gateway', 'ledger_db']] },
  { prompt: 'a food delivery app with restaurant search, orders, payments and live courier tracking',
    expect: [['payment_gateway'], ['search_index']] },
];

const degreeOf = (a) => {
  const d = Object.fromEntries(a.nodes.map((n) => [n.id, 0]));
  for (const e of a.edges) { d[e.source]++; d[e.target]++; }
  return d;
};
const hasAnyType = (a, types) => a.nodes.some((n) => types.includes(n.type));

function grade(c, r) {
  const a = r.architecture;
  const types = new Set(a.nodes.map((n) => n.type));
  const deg = degreeOf(a);
  const openCov = r.findings.filter((f) => f.id === 'capability-coverage' && !f.fixed).length;
  const unfixedErr = r.findings.filter((f) => f.severity === 'error' && !f.fixed).length;
  const nonClient = a.nodes.filter((n) => n.layer !== 'client');
  const concrete = nonClient.filter((n) => n.tech && !VAGUE.test(String(n.tech).trim())).length;

  const checks = {
    entrypoint:    a.nodes.some((n) => n.layer === 'client'),
    auth:          a.nodes.some((n) => n.layer === 'security'),
    observability: a.nodes.some((n) => n.layer === 'observability'),
    noErrors:      unfixedErr === 0,
    noOrphans:     a.nodes.every((n) => deg[n.id] > 0),
    coverage:      openCov === 0,
    concreteTech:  nonClient.length === 0 || concrete / nonClient.length >= 0.85,
    expectedTypes: c.expect.every((group) => hasAnyType(a, group)),
    readiness:     r.readiness.score >= 80,
    notToy:        a.nodes.length >= 8,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return { checks, passed, total, pct: passed / total, types };
}

const PASS_BAR = 0.9;
console.log(`\nArchForge accuracy eval · ${CASES.length} prompts · ${COUNT} candidate(s) each\n`);
console.log('prompt'.padEnd(46), 'score', ' fails');
console.log('-'.repeat(78));

let suitePass = true;
const agg = {};
for (const c of CASES) {
  let line;
  try {
    const r = await runPipeline(c.prompt, { count: COUNT });
    const g = grade(c, r);
    for (const [k, v] of Object.entries(g.checks)) { agg[k] = agg[k] || { pass: 0, n: 0 }; agg[k].n++; if (v) agg[k].pass++; }
    const fails = Object.entries(g.checks).filter(([, v]) => !v).map(([k]) => k);
    const ok = g.pct >= PASS_BAR;
    suitePass = suitePass && ok;
    const label = c.prompt.length > 44 ? c.prompt.slice(0, 43) + '…' : c.prompt;
    line = `${(ok ? '✓' : '✗')} ${label}`.padEnd(46) + ` ${g.passed}/${g.total}`.padEnd(6) + '  ' + (fails.join(', ') || '—');
  } catch (e) {
    suitePass = false;
    line = `✗ ${c.prompt.slice(0, 43)}`.padEnd(46) + '  ERROR  ' + e.message;
  }
  console.log(line);
  await sleep(GAP_MS);
}

console.log('-'.repeat(78));
console.log('\nPer-check pass rate across all prompts:');
for (const [k, v] of Object.entries(agg)) {
  const pct = Math.round((v.pass / v.n) * 100);
  console.log(`  ${k.padEnd(16)} ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 5)).padEnd(20)} ${v.pass}/${v.n}`);
}
const overall = Object.values(agg).reduce((s, v) => s + v.pass, 0) / Object.values(agg).reduce((s, v) => s + v.n, 0);
console.log(`\nOverall accuracy: ${(overall * 100).toFixed(1)}%   ·   suite ${suitePass ? 'PASS ✅' : 'FAIL ❌'}\n`);
process.exit(suitePass ? 0 : 1);
