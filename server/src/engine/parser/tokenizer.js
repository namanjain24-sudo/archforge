/**
 * ============================================================================
 * ARCHFORGE — TOKENIZER
 * ============================================================================
 * 
 * Splits the processed input string into individual tokens.
 * Runs AFTER phrase extraction, so compound concepts are already
 * collapsed into hyphenated single tokens.
 * 
 * RESPONSIBILITIES:
 *   1. Split on whitespace to produce raw tokens.
 *   2. Remove empty tokens (from consecutive spaces).
 *   3. Deduplicate tokens (same concept mentioned twice = one capability).
 *   4. Preserve hyphenated compounds as single tokens ("real-time-updates").
 * 
 * DESIGN PRINCIPLE: The tokenizer is intentionally simple because
 * complexity belongs in the normalizer (before) and the capability
 * detector (after). The tokenizer is just the boundary between
 * "string world" and "array world."
 * ============================================================================
 */

const { STOPWORDS } = require('../../config/stopwords');

/**
 * Splits input into tokens, removes stopwords, and deduplicates.
 * 
 * @param {string} processedInput - Input after normalization and phrase extraction
 * @returns {{
 *   allTokens:      string[],
 *   filteredTokens: string[],
 *   removedStopwords: string[]
 * }}
 */
function tokenize(processedInput) {
  // ── Split on whitespace ──
  const rawTokens = processedInput
    .split(/\s+/)
    .filter(token => token.length > 0);

  // ── Deduplicate while preserving order ──
  // Use a Set to track seen tokens, but build the result as an array
  // to maintain the order of first occurrence.
  const seen = new Set();
  const allTokens = [];

  for (const token of rawTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      allTokens.push(token);
    }
  }

  // ── Separate stopwords from meaningful tokens ──
  const filteredTokens = [];
  const removedStopwords = [];

  for (const token of allTokens) {
    // Hyphenated tokens are NEVER treated as stopwords.
    // "real-time" or "chat-first" are compound concepts, not noise.
    if (token.includes('-') || !STOPWORDS.has(token)) {
      filteredTokens.push(token);
    } else {
      removedStopwords.push(token);
    }
  }

  return {
    allTokens,
    filteredTokens,
    removedStopwords,
  };
}

/**
 * Standalone stopword removal (for use outside the full tokenize flow).
 * 
 * @param {string[]} tokens - Array of tokens to filter
 * @returns {string[]} Tokens with stopwords removed
 */
function removeStopwords(tokens) {
  return tokens.filter(token => token.includes('-') || !STOPWORDS.has(token));
}

module.exports = { tokenize, removeStopwords };
