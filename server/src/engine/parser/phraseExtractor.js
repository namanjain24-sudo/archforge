/**
 * ============================================================================
 * ARCHFORGE — PHRASE EXTRACTOR
 * ============================================================================
 * 
 * Scans the normalized input for multi-word phrases BEFORE tokenization.
 * This is critical because tokenization would split compound concepts:
 *   "real time updates" → ["real", "time", "updates"]  ← meaningless tokens
 *   vs. detecting the phrase first → "real-time-updates" ← single concept
 * 
 * STRATEGY:
 *   1. Sort phrase patterns by length (longest first) to avoid partial matches.
 *   2. Scan the input for each pattern.
 *   3. When a phrase is found, replace it in the input with its canonical form
 *      (hyphenated single token) so the tokenizer treats it as one unit.
 *   4. Track all matched phrases for capability detection.
 * 
 * DESIGN PRINCIPLE: Phrase extraction is greedy — longer matches take priority.
 * "real-time updates" matches before "real-time" alone. This prevents
 * double-counting and ensures the most specific phrase is captured.
 * ============================================================================
 */

const { PHRASE_MAP } = require('../../config/phraseMap');

/**
 * Extracts multi-word phrases from normalized input and replaces them
 * with canonical single-token forms.
 * 
 * @param {string} normalizedInput - The cleaned, lowercase input string
 * @returns {{
 *   processedInput: string,
 *   matchedPhrases: Array<{ pattern: string, canonical: string, capability: string }>
 * }}
 */
function extractPhrases(normalizedInput) {
  // Sort phrases by pattern length descending — greedy matching.
  // Longer patterns are matched first to prevent partial matches.
  const sortedPhrases = [...PHRASE_MAP].sort(
    (a, b) => b.pattern.length - a.pattern.length
  );

  let processedInput = normalizedInput;
  const matchedPhrases = [];

  // Track which character positions have already been claimed by a phrase
  // to prevent overlapping matches on the same text region.
  const claimedRanges = [];

  for (const phrase of sortedPhrases) {
    const idx = processedInput.indexOf(phrase.pattern);

    if (idx === -1) continue;

    // Check if this match overlaps with any already-claimed range
    const matchEnd = idx + phrase.pattern.length;
    const overlaps = claimedRanges.some(
      ([start, end]) => idx < end && matchEnd > start
    );

    if (overlaps) continue;

    // Claim this range
    claimedRanges.push([idx, matchEnd]);

    // Replace the phrase in the input with its canonical form
    // The canonical form is hyphenated, so the tokenizer treats it as one token
    processedInput = processedInput.replace(phrase.pattern, phrase.canonical);

    matchedPhrases.push({
      pattern: phrase.pattern,
      canonical: phrase.canonical,
      capability: phrase.capability,
    });
  }

  return {
    processedInput,
    matchedPhrases,
  };
}

module.exports = { extractPhrases };
