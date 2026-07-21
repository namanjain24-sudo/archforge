/**
 * Capability detection.
 * ---------------------
 * Extracts the high-level capabilities a prompt asks for (payments, search,
 * realtime, analytics, …) and derives which capabilities an architecture
 * actually provides (from its node types). Two payoffs:
 *   - grounding recall: match a prompt to references by capability, not just
 *     surface keywords (generalizes past brittle keyword hits);
 *   - coverage: Phase 3 can check every requested capability is present, and
 *     the UI can show "Detected requirements: payments, search, analytics".
 */

export const CAPABILITIES = {
  payments:      { label: 'Payments',      keywords: ['payment', 'payments', 'pay', 'checkout', 'billing', 'wallet', 'transaction', 'transactions', 'transfer', 'transfers', 'money transfer', 'remittance', 'banking', 'ledger', 'card', 'subscription', 'orders', 'order placement', 'place an order', 'order management', 'marketplace', 'invoice', 'invoicing', 'refund', 'escrow', 'purchase', 'cart'], nodeTypes: ['payment_gateway', 'ledger_db'] },
  search:        { label: 'Search',        keywords: ['search', 'full-text', 'typeahead', 'autocomplete', 'elasticsearch', 'catalog', 'catalogue', 'browse', 'listing', 'facet', 'filtering', 'discovery'], nodeTypes: ['search_index'] },
  realtime:      { label: 'Realtime',      keywords: ['realtime', 'real-time', 'live chat', 'live updates', 'live tracking', 'live location', 'live gps', 'websocket', 'presence', 'instant', 'video call', 'video calls', 'conferencing', 'telemedicine', 'collaboration', 'collaborative', 'collaborative editing', 'co-editing'], nodeTypes: ['websocket_server', 'event_bus'] },
  analytics:     { label: 'Analytics',     keywords: ['analytics', 'metrics', 'dashboard', 'reporting', 'clickstream', 'etl', 'warehouse', 'insights'], nodeTypes: ['data_warehouse', 'stream_processor'] },
  notifications: { label: 'Notifications', keywords: ['notification', 'notifications', 'notify', 'push', 'email', 'sms', 'alert', 'alerts'], nodeTypes: ['push_service', 'email_service', 'sms_service'] },
  auth:          { label: 'Auth',          keywords: ['auth', 'login', 'log in', 'sign in', 'sign-in', 'signin', 'sign up', 'sign-up', 'signup', 'oauth', 'sso', 'single sign-on', 'single sign on', 'identity', 'permission', 'authentication', 'authorization', 'role-based', 'rbac', 'user account', 'kyc'], nodeTypes: ['auth_service', 'identity_provider'] },
  media:         { label: 'Media',         keywords: ['image', 'video', 'photo', 'media', 'upload', 'transcode', 'audio'], nodeTypes: ['blob_storage'] },
  geo:           { label: 'Geospatial',    keywords: ['location', 'geo', 'nearby', 'maps', 'gps', 'geospatial', 'tracking', 'live tracking', 'delivery tracking', 'courier', 'courier dispatch', 'driver dispatch', 'driver location', 'driver matching', 'eta', 'route optimisation', 'route optimization', 'delivery route', 'fleet', 'shipment', 'last mile'], nodeTypes: ['maps_service', 'time_series_db'] },
  ml:            { label: 'AI / ML',       keywords: ['ai', 'recommendation', 'recommendations', 'embedding', 'embeddings', 'llm', 'rag', 'vector', 'ml model', 'model serving', 'prediction', 'semantic', 'machine learning', 'symptom checker', 'personalization', 'ranking', 'fraud', 'fraud detection', 'anomaly', 'anomaly detection', 'risk scoring'], nodeTypes: ['model_serving', 'vector_db', 'feature_store'] },
  // Messaging is store-and-forward: a queue/bus is what delivers to offline
  // users and fans a group message out, so it is a real structural requirement.
  messaging:     { label: 'Messaging',     keywords: ['chat', 'messaging', 'conversation', 'direct message', 'group chat'], nodeTypes: ['message_queue', 'event_bus'] },
  // Data that originates OUTSIDE the system. Without this a prompt like
  // "show coupons available on Amazon and Flipkart" produced a coupon database
  // that nothing ever filled — the single most damaging kind of omission,
  // because the diagram looks complete while the product cannot work.
  integration:   { label: 'External data source', keywords: ['available on', 'scrape', 'scraping', 'crawl', 'crawler', 'aggregate', 'aggregator', 'aggregates', 'third-party', 'third party', 'affiliate', 'partner api', 'public api', 'external api', 'fetch from', 'import from', 'sync from', 'pull from', 'integrate with', 'integrates with', 'integrated with', 'connects to'], nodeTypes: ['third_party_api'] },
  // Externally-sourced data goes stale, so something must refresh it on a
  // schedule rather than on a user request.
  sync:          { label: 'Scheduled refresh',   keywords: ['periodically', 'periodic', 'every hour', 'every day', 'hourly', 'daily sync', 'cron', 'scheduled', 'refresh', 'keep up to date', 'kept up to date', 'continuously updated', 'up-to-date'], nodeTypes: ['scheduler', 'worker'] },
  caching:       { label: 'Caching',       keywords: ['cache', 'caching'], nodeTypes: ['cache'] },
  async:         { label: 'Async jobs',    keywords: ['queue', 'background job', 'worker', 'decouple'], nodeTypes: ['message_queue', 'worker'] },
};

const CAP_IDS = Object.keys(CAPABILITIES);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Capability ids requested by a prompt.
 * Word-boundary matched, with a light plural allowance so a keyword written in
 * the singular still matches natural phrasing ("dashboard" → "dashboards",
 * "order" → "orders"). Without it the vocabulary silently missed a large share
 * of ordinary prompts.
 */
export function detectCapabilityIds(promptText) {
  const text = ` ${String(promptText).toLowerCase()} `;
  return CAP_IDS.filter((id) =>
    CAPABILITIES[id].keywords.some((k) => new RegExp(`\\b${esc(k)}(?:e?s)?\\b`, 'i').test(text)));
}

/** Same, but with labels — for the UI. */
export function detectCapabilities(promptText) {
  return detectCapabilityIds(promptText).map((id) => ({ id, label: CAPABILITIES[id].label }));
}

/**
 * For each capability the prompt asks for that maps to concrete node types,
 * the capability label plus the exact `type` value(s) that satisfy it (any one
 * suffices). This is the single source the prompt nudge and the verifier's
 * coverage check both read from — so whatever the verifier will require, the
 * prompt already demands. Capabilities with no node-type mapping (e.g. pure
 * "messaging") are omitted; they carry no structural requirement.
 */
export function capabilityRequirements(promptText) {
  return detectCapabilityIds(promptText)
    .map((id) => ({ id, label: CAPABILITIES[id].label, types: CAPABILITIES[id].nodeTypes }))
    .filter((c) => c.types.length);
}

/** Capability ids an architecture actually provides, derived from its node types. */
export function capabilitiesOfArch(arch) {
  const types = new Set((arch?.nodes || []).map((n) => n.type));
  return new Set(CAP_IDS.filter((id) => CAPABILITIES[id].nodeTypes.some((t) => types.has(t))));
}
