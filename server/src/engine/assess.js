/**
 * Assess — the non-LLM half of the pipeline for an already-formed architecture.
 * Normalize → verify (auto-fix) → capacity → review → readiness → layout.
 * Used to RE-VERIFY user edits: every change round-trips through the same
 * guarantees, so an edited diagram can never end up invalid.
 */
import { normalizeArchitecture } from './normalize.js';
import { estimateCapacity } from './capacity.js';
import { verify } from './verify.js';
import { review } from './review.js';
import { productionReadiness } from './production.js';
import { layoutArchitecture } from './layout.js';
import { explainArchitecture } from './explain.js';

export async function assess(arch, { promptText = '' } = {}) {
  const norm = normalizeArchitecture(arch);
  const capacity = estimateCapacity(norm.assumptions);
  const v = verify(norm, { promptText, capacity });
  const readiness = productionReadiness(v.arch);
  const graph = await layoutArchitecture(v.arch);
  return {
    architecture: v.arch,
    graph,
    findings: v.findings,
    capacity,
    review: review(v.findings),
    readiness,
    // Derived from the POST-verify graph, so the walkthrough always matches the
    // diagram on screen — including after a user edit or a refine.
    explanation: explainArchitecture(v.arch),
  };
}
