/**
 * ============================================================================
 * ARCHFORGE — CAPABILITY TO LAYER MAPPER
 * ============================================================================
 * 
 * Takes parsed capability models from the capability detector and semantically
 * segregates them into structured architectural layers. Computes layer 
 * confidence weightings to determine primary systemic importance.
 * 
 * ARCHITECTURAL DESIGN:
 * - Pure functions strictly generating mapping objects without mutational side effects
 * - Fully config-driven relying strictly on layerMap.js targets.
 * ============================================================================
 */

const { LAYER_MAP_CONFIG } = require('../config/layerMap');

/**
 * Converts detected capabilities into a structured multi-layer architecture model.
 * 
 * @param {object} parserOutput - The structured output from the Parser layer containing capabilities.
 * @returns {object} Layer mapping highlighting capacities and dynamic confidence weight.
 */
function mapCapabilitiesToLayers(parserOutput) {
  const { capabilities } = parserOutput;
  
  // 1. Initialize layer structure dynamically from config
  const internalLayers = {};
  for (const layerName of LAYER_MAP_CONFIG.layerDefinitions) {
    internalLayers[layerName] = {
      capabilities: [],
      weight: 0
    };
  }

  // 2. Map capabilities to defined layers
  for (const cap of capabilities) {
    // Identify target layers from config, or fallback
    const targetLayers = LAYER_MAP_CONFIG.capabilityToLayers[cap.type] || LAYER_MAP_CONFIG.fallbackLayers;

    for (const targetLayer of targetLayers) {
      if (!internalLayers[targetLayer]) {
        // Support dynamic layer creation if new items are dynamically mapped but missing in definition list
        internalLayers[targetLayer] = { capabilities: [], weight: 0 };
      }
      
      // We push a clone or reference. A direct reference suffices here.
      internalLayers[targetLayer].capabilities.push(cap);
    }
  }

  // 3. Compute weight for each layer
  // Weight formulas heavily leverage the combined count of capabilities AND the individual confidence scores
  for (const layerName in internalLayers) {
    const layer = internalLayers[layerName];
    
    // Determine accumulated confidence and sheer density of capabilities
    const totalConfidence = layer.capabilities.reduce((sum, cap) => sum + cap.confidence, 0);
    const densityBonus = layer.capabilities.length * 0.5; // Constant baseline magnitude per item
    
    // Resolve dynamic weight
    layer.weight = Number((totalConfidence + densityBonus).toFixed(2));
  }

  // 4. Sort layers by systemic importance (Highest weight first)
  // JavaScript objects generally maintain string key insertion order sequentially resolving iterators.
  const sortedEntries = Object.entries(internalLayers).sort((a, b) => b[1].weight - a[1].weight);
  
  const sortedLayers = {};
  for (const [layerName, layerData] of sortedEntries) {
    sortedLayers[layerName] = layerData;
  }

  return { layers: sortedLayers };
}

module.exports = { mapCapabilitiesToLayers };
