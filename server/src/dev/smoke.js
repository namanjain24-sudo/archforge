/**
 * Manual end-to-end smoke test — drives the FULL pipeline against a live
 * provider and prints the architecture, capacity estimate, Well-Architected
 * review and verifier findings. Verifies the whole guarantee layer for real.
 *
 *   node src/dev/smoke.js "a scalable e-commerce platform with payments"
 */
import '../config/env.js';
import { runPipeline } from '../engine/pipeline.js';

const prompt = process.argv[2] || 'a scalable ride-sharing app with driver matching, live tracking and payments';
console.log('PROMPT:', prompt, '\n');

const r = await runPipeline(prompt, process.argv[3] ? { count: Number(process.argv[3]) } : {});
const a = r.architecture;

console.log(`GROUNDING: ${r.grounding.map((g) => `${g.domain}(${g.score})`).join(', ') || 'none'}`);
console.log(`CAPABILITIES: ${r.capabilities.map((c) => c.label).join(', ') || 'none'}`);
console.log(`PROVIDER: ${r.meta.provider} | candidates ${r.meta.valid}/${r.meta.candidates} | scores ${r.meta.candidateScores.join(',')} | autofixes ${r.meta.autofixes} | ${r.meta.ms}ms\n`);

console.log(`SYSTEM: ${a.system.name}  [${a.system.scale}, ${a.system.domain}]`);
console.log(`NODES (${a.nodes.length}): ${a.nodes.map((n) => n.label).join(', ')}`);
console.log(`EDGES: ${a.edges.length}\n`);

console.log('CAPACITY:');
for (const m of r.capacity.metrics) console.log(`  ${m.label.padEnd(18)} ${String(m.value).padEnd(14)} (${m.hint})`);

console.log(`\nPRODUCTION READINESS: ${r.readiness.score}/100 (${r.readiness.present}/${r.readiness.total})`);
for (const i of r.readiness.items) console.log(`  ${i.present ? '✓' : '✗'} ${i.item}`);

console.log(`\nWELL-ARCHITECTED: overall ${r.review.overall}/100`);
for (const p of r.review.pillars) console.log(`  ${p.label.padEnd(24)} ${p.score}/100${p.findings.length ? '  ← ' + p.findings.map((f) => f.title).join('; ') : ''}`);

console.log(`\nFINDINGS (${r.findings.length}):`);
for (const f of r.findings) console.log(`  [${f.severity}${f.fixed ? '/fixed' : ''}] ${f.title} — ${f.message}`);

console.log(`\nTRADEOFFS (${a.tradeoffs.length}):`);
for (const t of a.tradeoffs) console.log(`  ${t.decision}: ${t.choice} over ${t.alternative} — ${t.why}`);
