/**
 * ============================================================================
 * ARCHFORGE — LAYER MAP CONFIGURATION v2
 * ============================================================================
 * 
 * Defines the architectural layers and specifies how to semantically map 
 * specific capabilities to those multi-layered environments.
 * 
 * v2: Expanded to cover all enterprise capabilities ensuring every
 * capability maps to at least one architectural layer.
 * ============================================================================
 */

const LAYER_MAP_CONFIG = {
  layerDefinitions: [
    'interaction',
    'processing',
    'data',
    'integration'
  ],
  
  fallbackLayers: ['processing'],

  capabilityToLayers: {
    // ── Communication ──
    'bidirectional-messaging': ['interaction', 'processing'],
    'real-time-streaming':     ['interaction', 'processing'],
    'push-notification':       ['interaction', 'integration'],
    'video-communication':     ['interaction', 'processing'],
    'email-delivery':          ['processing', 'integration'],
    'real-time-collaboration': ['interaction', 'processing', 'data'],

    // ── Processing ──
    'async-processing':        ['processing', 'integration'],
    'content-ingestion':       ['processing', 'data'],
    'content-distribution':    ['processing', 'data', 'integration'],

    // ── Persistence ──
    'persistent-storage':      ['data'],
    'caching':                 ['data'],
    'search-indexing':         ['data'],
    'file-storage':            ['data'],

    // ── Integration ──
    'authentication':          ['interaction', 'integration'],
    'payment-processing':      ['processing', 'integration'],
    'api-gateway':             ['interaction', 'processing', 'integration'],

    // ── Observation ──
    'analytics':               ['interaction', 'data', 'processing'],
    'monitoring':              ['processing', 'integration'],
    'admin-dashboard':         ['interaction', 'processing'],

    // ── Resilience ──
    'horizontal-scaling':      ['interaction', 'processing', 'data'],
    'security':                ['interaction', 'processing', 'data', 'integration'],

    // ── Enterprise Infrastructure (NEW) ──
    'rate-limiting':           ['interaction'],
    'circuit-breaker':         ['processing'],
    'service-discovery':       ['processing'],
    'config-management':       ['processing'],
    'service-mesh':            ['processing'],
    'health-checks':           ['processing'],
    'distributed-tracing':     ['processing', 'integration'],
    'centralized-logging':     ['processing', 'data'],
    'cdn-delivery':            ['interaction'],
    'session-management':      ['data'],

    // ── Domain-specific ──
    'e-commerce':              ['interaction', 'processing', 'data', 'integration'],
    'scheduling':              ['processing', 'data'],
    'geolocation':             ['interaction', 'processing', 'data'],
    'ml-pipeline':             ['processing', 'data'],
    'admin-panel':             ['interaction', 'processing'],

    // ── Domain Management (NEW) ──
    'content-management':      ['processing', 'data'],
    'order-management':        ['processing', 'data'],
    'catalog-management':      ['processing', 'data'],
    'inventory-management':    ['processing', 'data'],
    'recommendation-system':   ['processing', 'data'],
    'nlp-processing':          ['processing', 'data'],
    'compliance':              ['processing', 'data'],
    'audit-logging':           ['processing', 'data']
  }
};

module.exports = { LAYER_MAP_CONFIG };
