/**
 * ============================================================================
 * ARCHFORGE — INPUT INTENT VALIDATOR
 * ============================================================================
 * 
 * Guards against non-architectural inputs (e.g., "hi", "hello", "what's up").
 * Validates that the input contains at least ONE system-design-relevant signal
 * before allowing the full pipeline to execute.
 * 
 * Returns a structured rejection with a helpful message if no architecture
 * intent is detected, preventing hallucinated diagrams.
 * ============================================================================
 */

/**
 * Comprehensive system-design keyword vocabulary.
 * These are the minimum signals that indicate architectural intent.
 */
const ARCHITECTURE_SIGNALS = new Set([
  // System types
  'app', 'application', 'system', 'platform', 'service', 'website', 'site',
  'portal', 'tool', 'engine', 'server', 'client', 'backend', 'frontend',
  'api', 'microservice', 'monolith', 'saas', 'paas',
  
  // Domain keywords
  'chat', 'messaging', 'ecommerce', 'e-commerce', 'store', 'shop', 'marketplace',
  'social', 'media', 'blog', 'cms', 'crm', 'erp', 'hr', 'booking', 'reservation',
  'streaming', 'video', 'audio', 'music', 'gaming', 'game', 'education', 'learning',
  'healthcare', 'medical', 'fintech', 'banking', 'trading', 'insurance',
  'logistics', 'delivery', 'tracking', 'fleet', 'warehouse', 'inventory',
  'iot', 'sensor', 'dashboard', 'analytics', 'reporting', 'monitoring',
  'news', 'feed', 'notification', 'email', 'payment', 'checkout', 'billing',
  'search', 'recommendation', 'ai', 'ml', 'machine-learning', 'nlp',
  'collaboration', 'project', 'task', 'management', 'workflow', 'automation',
  'authentication', 'authorization', 'security', 'encryption',
  'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'forum', 'community', 'voting', 'poll', 'survey', 'quiz',
  'calendar', 'scheduling', 'appointment', 'event',
  'file', 'storage', 'upload', 'download', 'cdn',
  'map', 'location', 'geo', 'gps', 'navigation', 'ride',
  'food', 'restaurant', 'recipe', 'fitness', 'health', 'workout',
  'travel', 'hotel', 'flight', 'car', 'rental',
  'real-time', 'realtime', 'live', 'websocket',
  'database', 'cache', 'queue', 'broker', 'gateway', 'proxy',
  'scalable', 'distributed', 'microservices', 'serverless', 'containerized',
  
  // Action verbs that indicate building something
  'build', 'create', 'design', 'develop', 'make', 'implement', 'deploy',
  'architect', 'setup', 'configure', 'integrate',
  
  // Architecture concepts
  'architecture', 'infrastructure', 'pipeline', 'stack', 'layer',
  'load-balancer', 'reverse-proxy', 'message-queue', 'pub-sub',
  'rest', 'graphql', 'grpc', 'webhook', 'oauth',
  'web', 'mobile', 'desktop', 'cross-platform',

  // Common product descriptions
  'like', 'similar', 'clone', 'alternative', 'uber', 'airbnb', 'spotify',
  'netflix', 'twitter', 'instagram', 'facebook', 'whatsapp', 'slack',
  'discord', 'zoom', 'notion', 'figma', 'github', 'stackoverflow',
  'amazon', 'ebay', 'shopify', 'stripe', 'youtube', 'tiktok', 'reddit',
  'linkedin', 'pinterest', 'snapchat', 'telegram', 'signal',
  'trello', 'jira', 'asana', 'monday', 'clickup',
  'dropbox', 'drive', 'onedrive', 'box',
  'doordash', 'grubhub', 'ubereats', 'zomato', 'swiggy',
  'robinhood', 'coinbase', 'venmo', 'paypal',

  // Tech-adjacent terms  
  'user', 'users', 'account', 'profile', 'signup', 'login', 'register',
  'data', 'content', 'post', 'comment', 'message', 'order', 'product',
  'transaction', 'subscription', 'membership',
  'admin', 'panel', 'console', 'interface'
]);

/**
 * Multi-word phrases that strongly indicate architectural intent.
 */
const ARCHITECTURE_PHRASES = [
  'web app', 'web application', 'mobile app', 'mobile application',
  'real time', 'real-time', 'load balancer', 'load balancing',
  'message queue', 'message broker', 'api gateway', 'reverse proxy',
  'ci cd', 'ci/cd', 'pub sub', 'pub/sub',
  'micro service', 'microservice', 'full stack', 'fullstack',
  'cloud native', 'event driven', 'data pipeline', 'machine learning',
  'content management', 'user management', 'file sharing',
  'social network', 'social media', 'e commerce', 'online store',
  'chat app', 'chat application', 'video call', 'video streaming',
  'ride sharing', 'food delivery', 'task management', 'project management',
  'booking system', 'reservation system', 'payment system', 'billing system',
  'notification system', 'email system', 'search engine',
  'i want', 'i need', 'build me', 'create a', 'design a', 'develop a',
  'want to build', 'want to create', 'want to make', 'want to design',
  'system for', 'platform for', 'application for', 'service for',
  'in which', 'where users', 'that allows', 'that lets', 'that enables'
];

/**
 * Validates whether the user's input contains architectural intent.
 * 
 * @param {string} rawInput - The raw user input string
 * @returns {{ isValid: boolean, confidence: number, matchedSignals: string[], message?: string }}
 */
function validateArchitecturalIntent(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      confidence: 0,
      matchedSignals: [],
      message: 'Please describe the system or application you want to architect.'
    };
  }

  const normalized = rawInput.toLowerCase().trim();
  
  // Too short to be meaningful architecture description
  if (normalized.length < 3) {
    return {
      isValid: false,
      confidence: 0,
      matchedSignals: [],
      message: 'Your input is too short. Describe the system you want to build — e.g., "a scalable chat application with real-time messaging and user authentication".'
    };
  }

  const matchedSignals = [];

  // Check multi-word phrases first (stronger signal)
  for (const phrase of ARCHITECTURE_PHRASES) {
    if (normalized.includes(phrase)) {
      matchedSignals.push(`phrase:${phrase}`);
    }
  }

  // Check individual keywords
  const words = normalized.split(/[\s\-\/,;:.!?()]+/).filter(w => w.length > 1);
  for (const word of words) {
    if (ARCHITECTURE_SIGNALS.has(word)) {
      matchedSignals.push(`keyword:${word}`);
    }
  }

  // Also check hyphenated compound words
  const compoundWords = normalized.match(/[a-z]+-[a-z]+/g) || [];
  for (const compound of compoundWords) {
    if (ARCHITECTURE_SIGNALS.has(compound)) {
      matchedSignals.push(`compound:${compound}`);
    }
  }

  // Calculate confidence based on number and types of signals
  const phraseCount = matchedSignals.filter(s => s.startsWith('phrase:')).length;
  const keywordCount = matchedSignals.filter(s => s.startsWith('keyword:') || s.startsWith('compound:')).length;
  
  const confidence = Math.min(1.0, (phraseCount * 0.3 + keywordCount * 0.15));
  
  // Require at least 1 signal to proceed
  const isValid = matchedSignals.length >= 1;

  if (!isValid) {
    return {
      isValid: false,
      confidence,
      matchedSignals,
      message: `I couldn't detect any system architecture intent in your input. Please describe the application or system you want to design — for example:\n• "a real-time chat application with group messaging"\n• "an e-commerce platform with payment processing"\n• "a social media app with news feed and notifications"\n• "a food delivery system with live tracking"`
    };
  }

  return {
    isValid: true,
    confidence,
    matchedSignals
  };
}

module.exports = { validateArchitecturalIntent };
