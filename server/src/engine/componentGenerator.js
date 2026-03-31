/**
 * ============================================================================
 * ARCHFORGE — COMPONENT GENERATION ENGINE v3 (CLEAN NAMING)
 * ============================================================================
 * 
 * Takes the semantically mapped multi-layer capabilities architecture and
 * converts the abstract capabilities into actionable, named real-world 
 * system components.
 * 
 * v3 FIXES:
 *  - SMART NAMING: Uses capability name as prefix instead of raw synonym source
 *    to avoid garbage like "Pricing Storefront" or "Ride Auth Portal"
 *  - Better deduplication across layers
 *  - Clean, professional names that match real-world system design docs
 * ============================================================================
 */

const { COMPONENT_MAP } = require('../config/componentMap');

/**
 * Transforms a source string into a Title Cased string safely handling hyphenated words.
 */
function toTitleCase(str) {
  if (!str) return '';
  return str.split(' ')
    .map(word => word
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('-'))
    .join(' ');
}

/**
 * Creates a clean, professional component name.
 * 
 * STRATEGY:
 * 1. If baseName already contains a domain-specific name → use baseName as-is
 * 2. If capability source is a meaningful domain term → prefix it
 * 3. Never prefix raw synonym noise like "pricing", "ride", "live", "design"
 */
function createComponentName(capSource, capType, baseName) {
  // Words that should NEVER be used as a prefix (they come from synonym noise)
  const NOISE_PREFIXES = new Set([
    'api', 'auth', 'storage', 'cache', 'search', 'notification', 'payment',
    'queue', 'scaling', 'security', 'monitoring', 'analytics', 'scheduling',
    'geo', 'ai', 'admin', 'dashboard', 'video', 'email', 'feed',
    'collaboration', 'e-commerce', 'file-storage', 'real-time',
    // Common verbs/adjectives that make bad prefixes
    'design', 'build', 'create', 'make', 'deploy', 'scalable', 'distributed',
    'live', 'instant', 'fast', 'simple', 'advanced', 'smart', 'modern',
    'cloud', 'secure', 'mobile', 'web', 'online', 'digital',
    // Domain nouns that create nonsensical names
    'user', 'users', 'data', 'account', 'profile', 'order', 'product',
    'pricing', 'ride', 'uber', 'taxi', 'hotel', 'food', 'restaurant',
    'todo', 'note', 'booking', 'tracking', 'content', 'social',
    'customer', 'student', 'teacher', 'school', 'university',
    'finance', 'banking', 'trading', 'crypto', 'gaming', 'game',
    'fitness', 'health', 'medical', 'travel', 'flight', 'property',
    'rental', 'real-estate', 'delivery',
    // Compound synonyms
    'real-time', 'e-commerce', 'file-storage', 'audit-logging',
    'rate-limiting', 'circuit-breaker', 'service-discovery', 'config-management',
    'service-mesh', 'health-check', 'distributed-tracing', 'centralized-logging',
    'cdn', 'session-management', 'content-management', 'order-management',
    'catalog-management', 'inventory-management', 'recommendation',
    'nlp', 'compliance'
  ]);

  const source = (capSource || '').toLowerCase();
  
  // If the source is noise, just use the baseName directly
  if (!source || NOISE_PREFIXES.has(source)) {
    return baseName;
  }

  const baseNameLower = baseName.toLowerCase();
  const sourceTitled = toTitleCase(source);

  // Prevent redundancy: "Chat Messaging Service" when baseName = "Messaging Service"
  if (baseNameLower.includes(source)) {
    return baseName;
  }
  // Prevent redundancy: source contains baseName
  if (source.includes(baseNameLower)) {
    return sourceTitled;
  }

  return `${sourceTitled} ${baseName}`.trim();
}

/**
 * Generates structured functional components from layered capability architecture.
 */
function generateComponents(layeredOutput) {
  const { layers } = layeredOutput;
  
  const components = {
    interaction: [],
    processing: [],
    data: [],
    integration: []
  };

  // Global dedup across ALL layers — prevents same component appearing in multiple layers
  const seenIdentities = new Set();
  
  for (const [layerName, layerData] of Object.entries(layers)) {
    if (!components[layerName]) {
      components[layerName] = [];
    }
    
    for (const cap of layerData.capabilities) {
      const blueprints = COMPONENT_MAP[cap.type] || [];
      
      for (const blueprint of blueprints) {
        // Enforce layer boundary
        if (blueprint.layer !== layerName) continue;
        
        // Clean professional naming
        const fullName = createComponentName(cap.source, cap.type, blueprint.baseName);
        const id = fullName.toLowerCase().replace(/[\s\/]+/g, '-').replace(/[()]/g, '');
        
        // Global deduplication
        if (!seenIdentities.has(id)) {
          seenIdentities.add(id);
          
          components[layerName].push({
            id,
            name: fullName,
            type: blueprint.type,
            capability: cap.type,
            layer: layerName,
            tech: blueprint.tech || null,
            description: blueprint.description || null,
            protocol: blueprint.protocol || null
          });
        }
      }
    }
  }

  return { components };
}

module.exports = { generateComponents };
