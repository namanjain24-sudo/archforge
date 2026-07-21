/**
 * Bake the prompts the UI itself offers.
 * --------------------------------------
 * Every example chip and gallery card is a question we already know the answer
 * to, so answering it with a model call wastes a fixed daily budget on the most
 * predictable traffic there is. This generates each one once and stores the
 * architecture; the server re-verifies it per request, so it stays current.
 *
 *   node src/dev/precompute.js            # fill in anything missing
 *   node src/dev/precompute.js --force    # regenerate everything
 *
 * Uses the dev cache, so re-running after an engine change is usually free.
 */
import '../config/env.js';
import { fileURLToPath } from 'node:url';
if (!process.env.ARCHFORGE_NO_CACHE && !process.env.ARCHFORGE_CACHE_DIR) {
  process.env.ARCHFORGE_CACHE_DIR = fileURLToPath(new URL('../../.eval-cache/', import.meta.url));
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runPipeline } from '../engine/pipeline.js';
import { normalizePrompt } from '../precomputed/index.js';

const OUT = fileURLToPath(new URL('../precomputed/data/', import.meta.url));
const FORCE = process.argv.includes('--force');
const GAP_MS = Number(process.env.EVAL_GAP_MS || 8000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Must stay in step with /api/examples and the Landing gallery.
const CURATED = [
  // example chips
  'A scalable e-commerce platform with payments, product search and analytics',
  'A realtime chat app like WhatsApp with group messaging and presence',
  'A ride-sharing app with driver matching, live tracking and payments',
  'An AI customer support chatbot that answers from our help docs using RAG',
  'A video streaming platform like YouTube with upload and transcoding',
  'A healthcare platform with appointment booking, telemedicine video calls, records and billing',
  // landing hero chips
  'a scalable e-commerce platform with payments, search and analytics',
  'a realtime chat app like WhatsApp with group messaging',
  'a ride-sharing app with driver matching and live tracking',
  'an AI support chatbot that answers from our docs using RAG',
  // gallery cards
  'a digital banking app with accounts, money transfers, an immutable ledger and fraud detection',
  'a food delivery app with restaurant search, orders, payments and live courier tracking',
  'a collaborative document editor like Google Docs with realtime editing',
  'an IoT platform ingesting sensor telemetry with time-series storage and alerting',
  'a realtime analytics platform for clickstream events with a data warehouse and dashboards',
];

const fileFor = (prompt) => path.join(OUT, `${crypto.createHash('sha1').update(normalizePrompt(prompt)).digest('hex').slice(0, 16)}.json`);

fs.mkdirSync(OUT, { recursive: true });
console.log(`\nPre-baking ${CURATED.length} curated prompts → ${path.relative(process.cwd(), OUT)}\n`);

let made = 0, kept = 0, failed = 0;
for (const prompt of CURATED) {
  const file = fileFor(prompt);
  if (!FORCE && fs.existsSync(file)) { kept++; console.log(`  · kept    ${prompt.slice(0, 60)}`); continue; }
  try {
    const r = await runPipeline(prompt, {});
    fs.writeFileSync(file, JSON.stringify({
      prompt,
      architecture: r.architecture,
      grounding: r.grounding,
      bakedAt: new Date().toISOString(),
    }, null, 2));
    made++;
    console.log(`  ✓ baked   ${prompt.slice(0, 56)}  (${r.architecture.nodes.length} nodes, readiness ${r.readiness.score})`);
  } catch (e) {
    failed++;
    console.log(`  ✗ failed  ${prompt.slice(0, 56)}  — ${e.message.slice(0, 50)}`);
  }
  await sleep(GAP_MS);
}

console.log(`\nbaked ${made} · kept ${kept} · failed ${failed}`);
if (failed) console.log('Re-run later to fill the gaps; existing fixtures are untouched.\n');
else console.log('Every curated prompt now answers instantly, for zero tokens.\n');
