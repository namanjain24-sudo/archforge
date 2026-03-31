/**
 * ============================================================================
 * ARCHFORGE — SYNONYM MAPPER
 * ============================================================================
 * 
 * Maps alternative, informal, or abbreviated terms to their canonical 
 * architectural equivalents based on the configured synonym map.
 * 
 * DESIGN PRINCIPLE: We normalize vocabulary early so downstream capabilities
 * don't need to account for a dozen variations of the word "database".
 * ============================================================================
 */

const { SYNONYM_MAP } = require('../../config/synonymMap');

/**
 * Maps input tokens to their canonical forms if a synonym exists.
 * 
 * @param {string[]} tokens - Array of filtered tokens
 * @returns {{
 *   mappedTokens: string[],
 *   mappings: Array<{ original: string, canonical: string }>
 * }}
 */
function mapSynonyms(tokens) {
  const mappedTokens = [];
  const mappings = [];

  for (const token of tokens) {
    if (SYNONYM_MAP.has(token)) {
      const canonical = SYNONYM_MAP.get(token);
      mappedTokens.push(canonical);
      mappings.push({ original: token, canonical });
    } else {
      mappedTokens.push(token);
    }
  }

  // Deduplicate again after mapping.
  // E.g., if input had both "login" and "signin", they both map to "auth".
  // We only want "auth" to appear once in the resulting token list.
  const uniqueMappedTokens = [...new Set(mappedTokens)];

  return {
    mappedTokens: uniqueMappedTokens,
    mappings
  };
}

module.exports = { mapSynonyms };
