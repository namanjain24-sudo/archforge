/**
 * ============================================================================
 * ARCHFORGE — INPUT NORMALIZER
 * ============================================================================
 * 
 * The first stage of the parsing pipeline. Takes raw user input and produces
 * a clean, normalized string that downstream modules can reliably process.
 * 
 * Normalization rules (applied in order):
 *   1. Trim leading/trailing whitespace
 *   2. Lowercase everything
 *   3. Expand common contractions
 *   4. Normalize unicode whitespace and dashes
 *   5. Collapse multiple spaces into one
 *   6. Strip punctuation that carries no architectural meaning
 * 
 * DESIGN PRINCIPLE: This module is intentionally aggressive about cleaning.
 * Downstream modules should never have to deal with casing, extra spaces,
 * or stray punctuation. Better to over-normalize here than to scatter
 * cleaning logic across the pipeline.
 * ============================================================================
 */

/**
 * Contraction expansion map.
 * We expand these because the tokenizer would otherwise split them incorrectly.
 * Example: "can't" → "cannot" → tokens: ["cannot"] instead of ["can", "t"]
 */
const CONTRACTIONS = new Map([
  ["can't",    'cannot'],
  ["won't",    'will not'],
  ["don't",    'do not'],
  ["doesn't",  'does not'],
  ["didn't",   'did not'],
  ["isn't",    'is not'],
  ["aren't",   'are not'],
  ["wasn't",   'was not'],
  ["weren't",  'were not'],
  ["hasn't",   'has not'],
  ["haven't",  'have not'],
  ["hadn't",   'had not'],
  ["wouldn't", 'would not'],
  ["couldn't", 'could not'],
  ["shouldn't",'should not'],
  ["it's",     'it is'],
  ["that's",   'that is'],
  ["there's",  'there is'],
  ["i'm",      'i am'],
  ["i've",     'i have'],
  ["i'll",     'i will'],
  ["i'd",      'i would'],
  ["we're",    'we are'],
  ["we've",    'we have'],
  ["we'll",    'we will'],
  ["they're",  'they are'],
  ["they've",  'they have'],
  ["they'll",  'they will'],
  ["you're",   'you are'],
  ["you've",   'you have'],
  ["you'll",   'you will'],
  ["let's",    'let us'],
]);

/**
 * Normalizes raw user input into a clean, consistent string.
 * 
 * @param {string} rawInput - The raw user-provided string
 * @returns {{ normalized: string, original: string }} 
 *   The normalized string and the preserved original
 * @throws {Error} If input is not a string or is empty after normalization
 */
function normalizeInput(rawInput) {
  // ── Guard: type check ──
  if (typeof rawInput !== 'string') {
    throw new Error(`[Parser:Normalizer] Expected string input, received ${typeof rawInput}`);
  }

  const original = rawInput.trim();

  // ── Guard: empty input ──
  if (original.length === 0) {
    throw new Error('[Parser:Normalizer] Input is empty after trimming');
  }

  let text = original.toLowerCase();

  // ── Step 1: Expand contractions ──
  // We iterate the map rather than using regex replacement for each,
  // because the input is typically short (< 500 chars) and this is cleaner.
  for (const [contraction, expansion] of CONTRACTIONS) {
    // Use word boundary-safe replacement (contractions contain apostrophes,
    // so simple includes + split/join is reliable here)
    if (text.includes(contraction)) {
      text = text.split(contraction).join(expansion);
    }
  }

  // ── Step 2: Normalize dashes and unicode whitespace ──
  // Replace en-dash, em-dash, and other dash variants with standard hyphen
  text = text.replace(/[\u2013\u2014\u2015]/g, '-');
  // Replace non-breaking spaces and other unicode whitespace with standard space
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

  // ── Step 3: Strip punctuation that carries no architectural meaning ──
  // Keep: hyphens (compound words like "real-time"), alphanumeric, spaces
  // Remove: commas, periods, colons, semicolons, quotes, parens, brackets, etc.
  text = text.replace(/[^a-z0-9\s\-]/g, ' ');

  // ── Step 4: Collapse multiple spaces/hyphens ──
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/-+/g, '-');

  // ── Step 5: Trim again (stripping punctuation may have created edge spaces) ──
  text = text.trim();

  // ── Guard: empty after normalization ──
  if (text.length === 0) {
    throw new Error('[Parser:Normalizer] Input contains no meaningful content after normalization');
  }

  return {
    normalized: text,
    original,
  };
}

module.exports = { normalizeInput };
