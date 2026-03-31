/**
 * ============================================================================
 * ARCHFORGE — STOPWORDS CONFIGURATION
 * ============================================================================
 * 
 * Stopwords are common English words that carry no architectural meaning.
 * They are removed during tokenization to reduce noise in capability detection.
 * 
 * EXTENDING: Add new words to the array below. The parser will automatically
 * exclude them. Group new additions by category for readability.
 * 
 * IMPORTANT: Never add domain-significant words here. If in doubt,
 * leave the word in — a false positive in capability detection is better
 * than a missed capability.
 * ============================================================================
 */

const STOPWORDS = new Set([
  // ── Articles ──
  'a', 'an', 'the',

  // ── Prepositions ──
  'in', 'on', 'at', 'to', 'for', 'of', 'by', 'from',
  'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'over',

  // ── Conjunctions ──
  'and', 'or', 'but', 'nor', 'yet', 'so', 'both',
  'either', 'neither', 'not', 'only',

  // ── Pronouns ──
  'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'it', 'its', 'they', 'them', 'their',
  'this', 'that', 'these', 'those',

  // ── Auxiliary / Linking verbs ──
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',

  // ── Common verbs (architecturally meaningless) ──
  'get', 'got', 'make', 'made', 'let', 'go', 'going',
  'want', 'need', 'like', 'use', 'used',

  // ── Quantifiers / Determiners ──
  'some', 'any', 'all', 'each', 'every', 'no', 'few',
  'many', 'much', 'more', 'most', 'other', 'another',

  // ── Filler / Noise ──
  'just', 'also', 'very', 'really', 'quite', 'rather',
  'too', 'enough', 'even', 'still', 'already',
  'about', 'then', 'than', 'here', 'there',
  'where', 'when', 'how', 'what', 'which', 'who',
  'well', 'back', 'up', 'out', 'off',

  // ── System description noise ──
  'app', 'application', 'system', 'platform', 'tool',
  'service', 'solution', 'software', 'project', 'product',
  'build', 'create', 'develop', 'implement',
  'based', 'type', 'kind', 'thing', 'stuff',
  'simple', 'basic', 'complex', 'advanced',
  'new', 'modern', 'custom',
  'using', 'with', 'without', 'via',
  'able', 'allow', 'allows', 'enable', 'enables',
  'include', 'includes', 'including',
  'similar', 'related', 'something',
  'etc', 'etc.', 'e.g.', 'i.e.',
]);

module.exports = { STOPWORDS };
