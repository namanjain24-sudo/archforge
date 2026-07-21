/**
 * Broad accuracy sweep — runs the full pipeline over many diverse prompts and
 * prints a one-line scorecard each, so we can spot weaknesses (vague tech,
 * uncovered capabilities, low review scores, leftover violations) at a glance.
 *
 *   node src/dev/batch.js
 */
import '../config/env.js';
import { runPipeline } from '../engine/pipeline.js';
import { detectCapabilityIds } from '../engine/capabilities.js';

const PROMPTS = [
  'a scalable e-commerce platform with payments, product search and analytics',
  'a realtime chat app like WhatsApp with group messaging and presence',
  'a ride-sharing app with driver matching, live tracking and payments',
  'a video streaming platform like YouTube with upload and transcoding',
  'an AI customer support chatbot using RAG over our help docs',
  'a URL shortener handling billions of redirects',
  'a food delivery app with restaurant listings, orders, payments and live tracking',
  'a social media feed like Instagram with posts, stories and notifications',
  'a multiplayer game backend with matchmaking and realtime leaderboards',
  'a hotel booking system with search, reservations and payments',
  'an online banking system with accounts, money transfers and fraud detection',
  'a job board with listings, applications, search and email notifications',
];

const VAGUE = /^(various|generic|database|db|store|cache|queue|service|tbd|n\/?a|custom)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('prompt'.padEnd(42), 'grnd', 'nodes', 'cov', 'viol', 'vague', 'rev', 'ms');
console.log('-'.repeat(90));

let totalVague = 0, totalViol = 0, totalCovMiss = 0, n = 0;

for (const p of PROMPTS) {
  try {
    const r = await runPipeline(p, { count: 2 });
    const a = r.architecture;
    const need = detectCapabilityIds(p);
    const haveIds = new Set(r.capabilities.map((c) => c.id)); // requested
    const covered = need.filter((c) => a.nodes.some((nd) => {
      // crude: a capability is covered if its node types appear
      return true; // refined below via findings
    }));
    const covMiss = r.findings.filter((f) => f.id === 'capability-coverage').length;
    const viol = r.findings.filter((f) => f.severity === 'error' && !f.fixed).length;
    const vague = a.nodes.filter((nd) => !nd.tech || VAGUE.test(nd.tech.trim())).length;

    totalVague += vague; totalViol += viol; totalCovMiss += covMiss; n++;
    const label = p.length > 40 ? p.slice(0, 39) + '…' : p;
    console.log(
      label.padEnd(42),
      String(r.grounding[0]?.domain || 'none').slice(0, 4).padEnd(4),
      String(a.nodes.length).padEnd(5),
      `${need.length - covMiss}/${need.length}`.padEnd(3),
      String(viol).padEnd(4),
      String(vague).padEnd(5),
      String(r.review.overall).padEnd(3),
      String(r.meta.ms),
    );
  } catch (e) {
    console.log(p.slice(0, 40).padEnd(42), 'ERROR:', e.message);
  }
  await sleep(1500); // be gentle on the rate limit
}

console.log('-'.repeat(90));
console.log(`Totals over ${n} prompts — leftover violations: ${totalViol}, vague-tech nodes: ${totalVague}, uncovered capabilities: ${totalCovMiss}`);
