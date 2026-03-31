/**
 * ============================================================================
 * ARCHFORGE — PARSER ENGINE (MAIN)
 * ============================================================================
 * 
 * Orchestrates the full parsing pipeline:
 *   1. normalizeInput()       - clean casing and whitespace
 *   2. extractPhrases()       - capture multi-word semantic concepts
 *   3. tokenize()             - split into single words, filter noise (stopwords)
 *   4. mapSynonyms()          - standardize vocabulary to canonical terms
 *   5. detectCapabilities()   - map canonical terms and phrases to architectural traits
 * 
 * The system returns a structured object that is ready for the capability mapping
 * layer of ArchForge, including traceability (source words/methods) and confidence.
 * ============================================================================
 */

const { normalizeInput } = require('./parser/normalizer');
const { extractPhrases } = require('./parser/phraseExtractor');
const { tokenize } = require('./parser/tokenizer');
const { mapSynonyms } = require('./parser/synonymMapper');
const { detectCapabilities } = require('./parser/capabilityDetector');

/**
 * Parses raw natural language input and extracts architectural capabilities.
 * 
 * @param {string} rawInput - A prompt describing the desired architecture.
 * @returns {object} Structred capability map representing the input.
 */
function parseInput(rawInput) {
  try {
    // 1. Normalize
    const { normalized, original } = normalizeInput(rawInput);
    
    // 2. Extract Phrases before tokenization
    const { processedInput, matchedPhrases } = extractPhrases(normalized);
    
    // 3. Tokenize & remove stopwords
    const { filteredTokens } = tokenize(processedInput);
    
    // 4. Map synonyms to canonical tokens
    const { mappedTokens, mappings } = mapSynonyms(filteredTokens);
    
    // 5. Detect capabilities
    const capabilities = detectCapabilities(mappedTokens, mappings, matchedPhrases);
    
    // Extract phrase strings for the final output 'phrases' array
    const phraseStrings = matchedPhrases.map(p => p.pattern);
    
    return {
      input: original,
      normalized: normalized,
      tokens: mappedTokens, // the tokens actually considered for properties, post-synonym mappings
      phrases: phraseStrings,
      capabilities: capabilities
    };
    
  } catch (error) {
    // Handle edge cases like empty string or malformed inputs
    // Returning structured fallback for gracefully failing API.
    return {
      input: rawInput,
      normalized: "",
      tokens: [],
      phrases: [],
      capabilities: [],
      error: error.message
    };
  }
}

module.exports = { parseInput };
