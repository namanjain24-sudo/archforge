/**
 * Well-Architected review — roll findings up into the AWS 6-pillar scorecard.
 * Each pillar starts at 100 and loses points per unresolved finding mapped to it.
 * Gives the UI a credible, industry-standard scorecard with the specific issues.
 */
import { PILLARS } from '../contracts/index.js';

const PILLAR_LABELS = {
  reliability: 'Reliability',
  performance: 'Performance Efficiency',
  security: 'Security',
  cost: 'Cost Optimization',
  operational: 'Operational Excellence',
  sustainability: 'Sustainability',
};

const PENALTY = { error: 25, warning: 10, info: 3 };

export function review(findings) {
  const pillars = Object.fromEntries(PILLARS.map((p) => [p, { pillar: p, label: PILLAR_LABELS[p], score: 100, findings: [] }]));

  for (const f of findings) {
    if (f.fixed) continue;                 // auto-fixed issues don't count against the score
    const bucket = pillars[f.pillar];
    if (!bucket) continue;
    bucket.score = Math.max(0, bucket.score - (PENALTY[f.severity] || 0));
    bucket.findings.push({ id: f.id, title: f.title, severity: f.severity, message: f.message });
  }

  const list = PILLARS.map((p) => pillars[p]);
  const overall = Math.round(list.reduce((s, p) => s + p.score, 0) / list.length);
  return { overall, pillars: list };
}
