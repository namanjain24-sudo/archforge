/**
 * Best-of-N ablation — how much is the second candidate actually worth?
 * ---------------------------------------------------------------------
 * Self-consistency (generate N, keep the best by verifier score) doubles the
 * token cost of every diagram. On a free tier that is half the daily budget, so
 * it has to earn its place rather than be assumed.
 *
 * This measures it at ZERO token cost: the dev cache already stores every raw
 * candidate, so we can replay them and ask what would have shipped with N=1
 * versus best-of-N. Pure arithmetic on data we already paid for.
 *
 *   node src/dev/ablation.js
 */
import '../config/env.js';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSystemPrompt, buildUserPrompt } from '../engine/prompt.js';
import { selectReferencesForPrompt } from '../references/select.js';
import { detectCapabilities } from '../engine/capabilities.js';
import { extractJson } from '../engine/json.js';
import { normalizeArchitecture } from '../engine/normalize.js';
import { estimateCapacity } from '../engine/capacity.js';
import { verify } from '../engine/verify.js';
import { productionReadiness } from '../engine/production.js';

const CACHE = process.env.ARCHFORGE_CACHE_DIR || fileURLToPath(new URL('../../.eval-cache/', import.meta.url));

// The prompts our suites use — we re-derive each cache key from the prompt.
const PROMPTS = [
  'a scalable e-commerce platform with product search, payments and analytics',
  'a realtime chat app like WhatsApp with group messaging and presence',
  'a ride-sharing app with driver matching, live tracking and payments',
  'a video streaming platform like YouTube with upload and transcoding',
  'an AI customer support chatbot that answers from our help docs using RAG',
  'a URL shortener handling billions of redirects',
  'an online banking system with accounts, money transfers and fraud detection',
  'a food delivery app with restaurant search, orders, payments and live courier tracking',
  'a multiplayer game backend with matchmaking, realtime game state and leaderboards',
  'a hotel booking platform with room search, availability calendars, reservations and payments',
  'a stock trading platform with real-time market data, order matching and portfolio tracking',
  'a learning management system with video courses, quizzes, progress tracking and certificates',
  'a package logistics platform with shipment tracking, route optimisation and delivery notifications',
  'a ticketing platform like Ticketmaster handling flash sales for concerts with seat reservation',
  'a hospital records system with patient charts, lab results, prescriptions and doctor scheduling',
  'a crypto exchange with an order book, wallet custody, trade settlement and KYC checks',
  'an ad serving platform with real-time bidding, targeting and impression analytics',
  'a podcast hosting platform with audio upload, transcoding, RSS feeds and listen analytics',
  'a ride-sharing platform like Uber with driver matching, live GPS tracking, trip payments and surge pricing',
  'a video streaming platform like Netflix with a global CDN, content upload, transcoding and personalized recommendations',
  'a photo-sharing social network like Instagram with a personalized feed, following, photo uploads and notifications at massive scale',
  'a realtime messaging app like WhatsApp with 1:1 and group chat, presence, delivery receipts and push notifications',
  'a lodging marketplace like Airbnb with listing search, availability, bookings, payments and reviews',
  'a microblogging platform like Twitter with a home timeline, followers, posting and trending topics',
  'a file storage and sync service like Dropbox with uploads, versioning, sharing and cross-device sync',
  'a team chat platform like Slack with channels, threads, presence, search and file sharing',
  'an on-demand delivery marketplace like DoorDash with merchant catalogues, order placement, courier dispatch and live ETA',
  'a video sharing platform like YouTube with uploads, transcoding, adaptive streaming, comments and recommendations',
];

/** Score one raw candidate exactly as the pipeline ranks it. */
function scoreRaw(raw) {
  try {
    const arch = normalizeArchitecture(extractJson(raw));
    if (!arch.nodes.length) return null;
    const capacity = estimateCapacity(arch.assumptions);
    const v = verify(arch, { capacity });
    const readiness = productionReadiness(v.arch);
    return { rank: v.score + readiness.score * 0.4, readiness: readiness.score, nodes: v.arch.nodes.length };
  } catch { return null; }
}

let entries = 0, secondWon = 0, tieOrFirst = 0;
let rankFirst = 0, rankBest = 0, readyFirst = 0, readyBest = 0;
const wins = [];

const files = fs.existsSync(CACHE) ? fs.readdirSync(CACHE).filter((f) => f.endsWith('.json')) : [];
let singleValid = 0;

for (const f of files) {
  let raws;
  try { raws = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch { continue; }
  if (!Array.isArray(raws) || !raws.length) continue;
  if (raws.length < 2) { singleValid++; continue; }

  const scored = raws.map(scoreRaw).filter(Boolean);
  if (scored.length < 2) { singleValid++; continue; }

  const first = scored[0];
  const best = scored.reduce((a, b) => (b.rank > a.rank ? b : a));
  entries++;
  rankFirst += first.rank; rankBest += best.rank;
  readyFirst += first.readiness; readyBest += best.readiness;
  if (best.rank > first.rank) {
    secondWon++;
    wins.push({ prompt: `${f.slice(0, 8)}… (${scored.length} candidates)`, gain: (best.rank - first.rank).toFixed(1), readyGain: best.readiness - first.readiness });
  } else tieOrFirst++;
}

console.log(`\ncache: ${files.length} generations · ${singleValid} yielded only ONE schema-valid candidate · ${entries} had a real choice`);

if (!entries) {
  console.log('\nNo multi-candidate cache entries found — run a suite first so there is data to replay.\n');
  process.exit(0);
}

console.log(`\nBest-of-N ablation · ${entries} cached generations replayed · zero tokens\n`);
console.log(`  first candidate already the best : ${tieOrFirst}/${entries}  (${Math.round(tieOrFirst / entries * 100)}%)`);
console.log(`  a later candidate won            : ${secondWon}/${entries}  (${Math.round(secondWon / entries * 100)}%)`);
console.log(`\n  mean rank    N=1 ${(rankFirst / entries).toFixed(1)}   →  best-of-N ${(rankBest / entries).toFixed(1)}   (+${((rankBest - rankFirst) / entries).toFixed(1)})`);
console.log(`  mean readiness N=1 ${(readyFirst / entries).toFixed(1)}   →  best-of-N ${(readyBest / entries).toFixed(1)}   (+${((readyBest - readyFirst) / entries).toFixed(1)})`);

if (wins.length) {
  console.log('\n  where the extra candidate actually helped:');
  for (const w of wins) console.log(`    +${String(w.gain).padStart(5)} rank (readiness ${w.readyGain >= 0 ? '+' : ''}${w.readyGain})  ${w.prompt}`);
}
console.log(`\n  cost of best-of-N: ~2x tokens per diagram.`);
console.log(`  → halving candidates doubles daily capacity; the table above is what it costs in accuracy.\n`);
