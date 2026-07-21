/**
 * Reference selector — grounding.
 * -------------------------------
 * Deterministic, fast, dependency-free: score each library entry by how well
 * its keywords/domain match the prompt and return the closest one or two to
 * inject as few-shot grounding. (An optional embeddings-based selector can be
 * layered on later for fuzzy prompts — see selectReferencesSemantic stub.)
 */

import { LIBRARY } from './library.js';
import { detectCapabilityIds, capabilitiesOfArch } from '../engine/capabilities.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word / whole-phrase match, so "link" doesn't fire on "linkedin". */
function mentions(text, term) {
  return new RegExp(`\\b${esc(term)}\\b`, 'i').test(text);
}

function scoreEntry(text, entry) {
  let score = 0;
  for (const kw of entry.meta.keywords) {
    if (mentions(text, kw)) score += kw.includes(' ') ? 3 : 1; // multiword = stronger signal
  }
  if (mentions(text, entry.meta.domain.replace(/-/g, ' '))) score += 3;
  return score;
}

/**
 * @returns {{ title, domain, score, arch }[]} ranked, non-zero matches only
 */
export function rankReferences(promptText) {
  const text = ` ${String(promptText).toLowerCase()} `;
  const promptCaps = new Set(detectCapabilityIds(promptText));
  return LIBRARY
    .map((entry) => {
      let score = scoreEntry(text, entry);
      // Capability overlap is a SECONDARY signal (weight 1) — it must not
      // outrank a strong domain-keyword match. A "payments" mention shouldn't
      // pull an e-commerce reference above the actual ride-sharing one.
      const archCaps = capabilitiesOfArch(entry.arch);
      for (const c of promptCaps) if (archCaps.has(c)) score += 1;
      return { title: entry.meta.title, domain: entry.meta.domain, score, arch: entry.arch };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * The grounding used by generation: the top-k reference architectures.
 * @returns {object[]} architecture objects (possibly empty for novel prompts)
 */
export function selectReferences(promptText, k = 2) {
  return rankReferences(promptText).slice(0, k).map((r) => r.arch);
}

/**
 * Capability-coverage-driven selection — the key to grounding COMPLEX ideas.
 * A multi-subsystem prompt (say payments + realtime + ml + geo) must be shown
 * a reference pattern for EACH facet, not just the two highest-scoring. This
 * greedily picks references (starting from the best match) so that every
 * detected capability is covered by some reference, up to `maxRefs`.
 *
 * @returns {{ domain, score, arch }[]} the chosen ranked entries
 */
export function selectReferencesForPrompt(promptText, { maxRefs = 3 } = {}) {
  const ranked = rankReferences(promptText);
  if (!ranked.length) return [];
  const wanted = new Set(detectCapabilityIds(promptText));

  const chosen = [];
  const covered = new Set();
  const take = (r) => {
    chosen.push(r);
    for (const c of capabilitiesOfArch(r.arch)) if (wanted.has(c)) covered.add(c);
  };

  take(ranked[0]); // always ground on the single best match
  while (chosen.length < maxRefs) {
    const remaining = [...wanted].filter((c) => !covered.has(c));
    if (!remaining.length) break;
    // pick the not-yet-chosen reference that covers the most missing capabilities
    let best = null, bestGain = 0;
    for (const r of ranked) {
      if (chosen.includes(r)) continue;
      const gain = [...capabilitiesOfArch(r.arch)].filter((c) => remaining.includes(c)).length;
      if (gain > bestGain) { bestGain = gain; best = r; }
    }
    if (!best) break;
    take(best);
  }
  return chosen;
}
