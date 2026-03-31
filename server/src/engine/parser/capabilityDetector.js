/**
 * ============================================================================
 * ARCHFORGE — CAPABILITY DETECTOR
 * ============================================================================
 * 
 * Maps canonical tokens and phrases to their final architectural capabilities.
 * Determines the confidence level based on HOW the capability was detected.
 * 
 * CAPABILITY DETECTION RULES:
 *   - Direct match (phrase or canonical token directly specified)
 *       → Confidence: Phrase(0.85) / Direct Token(0.9)
 *   - Synonym match (e.g., "live" → "real-time") 
 *       → Confidence: 0.70
 * ============================================================================
 */

const { CAPABILITY_MAP } = require('../../config/capabilityMap');

/**
 * Detects capabilities based on mapped tokens and matched phrases.
 * 
 * @param {string[]} mappedTokens             - Array of deduplicated, normalized string tokens
 * @param {Array<{original, canonical}>} mappings - History of synonym-mapped tokens
 * @param {Array<{pattern, canonical, capability}>} matchedPhrases 
 *    - Phrases found prior to tokenization
 * @returns {Array<{type: string, source: string, confidence: number, method: string}>}
 *    - Result array with distinct capabilities and scoring info
 */
function detectCapabilities(mappedTokens, mappings, matchedPhrases) {
  const capabilities = [];
  const seenCapabilities = new Set();
  
  // 1. Add capabilities from Phrases (High confidence: 0.85)
  // We process these first because multi-word phrases provide strong context signals.
  for (const phrase of matchedPhrases) {
    if (!seenCapabilities.has(phrase.capability)) {
      capabilities.push({
        type: phrase.capability,
        source: phrase.pattern,
        confidence: 0.85,
        method: 'phrase'
      });
      seenCapabilities.add(phrase.capability);
    }
  }

  // Optimize lookup to deduce if a mappedToken came from a synonym.
  // We map the canonical target back to all words that formed it in the user input.
  const synonymLookup = new Map();
  for (const m of mappings) {
    if (!synonymLookup.has(m.canonical)) {
      synonymLookup.set(m.canonical, []);
    }
    synonymLookup.get(m.canonical).push(m.original);
  }

  // 2. Add capabilities from single tokens
  for (const token of mappedTokens) {
    if (CAPABILITY_MAP.has(token)) {
      const capData = CAPABILITY_MAP.get(token);
      
      // Don't add if already fulfilled by a stronger phrase match
      if (!seenCapabilities.has(capData.capability)) {
        const isSynonym = synonymLookup.has(token);
        
        // If it came from a synonym mapping, we take the FIRST original word 
        // as the context source. If it didn't, the word itself is the source.
        const source = isSynonym ? synonymLookup.get(token)[0] : token;
        
        const method = isSynonym ? 'synonym' : 'direct';
        const confidence = isSynonym ? 0.70 : 0.90;
        
        capabilities.push({
          type: capData.capability,
          source: source,
          confidence: confidence,
          method: method
        });
        
        seenCapabilities.add(capData.capability);
      }
    }
  }
  
  return capabilities;
}

module.exports = { detectCapabilities };
