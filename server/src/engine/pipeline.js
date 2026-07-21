/**
 * The pipeline — assembles the whole engine end to end.
 * -----------------------------------------------------
 *   detect capabilities
 *   → ground on the closest reference architectures
 *   → generate N candidates (parallel self-consistency)
 *   → verify + score EACH candidate, pick the best (Best-of-N by verifier score)
 *   → the winner's auto-fixed architecture is final
 *   → attach capacity estimate + Well-Architected review
 *
 * Returns everything the UI needs in one object.
 */

import { detectCapabilities } from './capabilities.js';
import { selectReferencesForPrompt } from '../references/select.js';
import { generateCandidates } from './generate.js';
import { estimateCapacity } from './capacity.js';
import { verify } from './verify.js';
import { review } from './review.js';
import { productionReadiness } from './production.js';
import { layoutArchitecture } from './layout.js';
import { explainArchitecture } from './explain.js';

export async function runPipeline(promptText, opts = {}) {
  const t0 = Date.now();

  const capabilities = detectCapabilities(promptText);
  const complexity = capabilities.length;

  // Complex ideas get grounded on MORE reference patterns (one per facet) and
  // get more self-consistency candidates — the levers that keep multi-subsystem
  // designs accurate instead of collapsing them into a toy.
  //
  // Candidate count is bounded so one burst stays within a free provider's
  // tokens-per-minute budget: at ~3K tokens per call, 2–3 parallel draws fit
  // Groq's free 12K TPM (across its two rotated keys), whereas 4 would tip over
  // and fall through to the (quota-limited) backup. Set CANDIDATES to override.
  // ONE candidate by default. Measured on 40 cached generations
  // (src/dev/ablation.js): 80% of the time only a single draw was even
  // schema-valid, so best-of-N had nothing to choose between; where it did, it
  // moved mean readiness by 0.0 and mean rank by ~1.5% — for double the tokens.
  // The deterministic verifier already normalizes candidates to the same
  // quality, which is exactly why the second draw stops paying for itself.
  // Robustness is unaffected: if the single draw fails validation, the
  // format-repair path in generate.js retries it.
  const maxRefs = Math.min(4, Math.max(2, 1 + Math.ceil(complexity / 2)));
  const envCount = Number(process.env.CANDIDATES);
  const count = opts.count ?? (Number.isFinite(envCount) && envCount > 0 ? envCount : 1);

  const chosen = selectReferencesForPrompt(promptText, { maxRefs });
  const references = chosen.map((r) => r.arch);

  const { provider, candidates } = await generateCandidates(promptText, { references, count, byo: opts.byo });
  const valid = candidates.filter((c) => c.valid);
  if (!valid.length) {
    const e = new Error('The model did not return a valid architecture. Try rephrasing the prompt.');
    e.details = candidates.map((c) => c.errors);
    throw e;
  }

  // Best-of-N: verify + score each candidate, choose the highest score.
  const scored = valid
    .map((c) => {
      const capacity = estimateCapacity(c.arch.assumptions);
      const v = verify(c.arch, { promptText, capacity });
      const readiness = productionReadiness(v.arch);
      // Best-of-N prefers designs that are both correct AND production-complete,
      // so a richer real-world design beats a thin one.
      return { ...v, capacity, readiness, rank: v.score + readiness.score * 0.4 };
    })
    .sort((a, b) => b.rank - a.rank);

  const best = scored[0];
  const graph = await layoutArchitecture(best.arch); // positioned, React-Flow ready

  return {
    prompt: promptText,
    generatedAt: new Date().toISOString(),
    architecture: best.arch,
    graph,
    findings: best.findings,
    capacity: best.capacity,
    review: review(best.findings),
    readiness: best.readiness,
    explanation: explainArchitecture(best.arch),
    capabilities,
    grounding: chosen.map((r) => ({ domain: r.domain, score: r.score })),
    meta: {
      provider,
      complexity,
      references: references.length,
      candidates: candidates.length,
      valid: valid.length,
      chosenScore: best.score,
      candidateScores: scored.map((s) => s.score),
      autofixes: best.findings.filter((f) => f.fixed).length,
      ms: Date.now() - t0,
    },
  };
}
