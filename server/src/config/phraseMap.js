/**
 * ============================================================================
 * ARCHFORGE — PHRASE MAP CONFIGURATION
 * ============================================================================
 * 
 * Multi-word phrases that carry specific architectural meaning.
 * These are detected BEFORE tokenization so that "real time" isn't split
 * into two meaningless tokens.
 * 
 * STRUCTURE: Each entry is a phrase pattern and its canonical form.
 * 
 * ORDER MATTERS: Longer phrases are matched first to avoid partial matches.
 * The parser sorts by length descending before matching, so you don't need
 * to worry about ordering here.
 * 
 * EXTENDING: Add new { pattern, canonical, capability } entries.
 *   - pattern:    lowercase string to search for (can include spaces/hyphens)
 *   - canonical:  the normalized form of this phrase (used as a single token)
 *   - capability: the architectural capability this phrase maps to
 * ============================================================================
 */

const PHRASE_MAP = [
  // ── Real-time patterns ──
  { pattern: 'real-time updates',     canonical: 'real-time-updates',     capability: 'real-time-streaming' },
  { pattern: 'real time updates',     canonical: 'real-time-updates',     capability: 'real-time-streaming' },
  { pattern: 'realtime updates',      canonical: 'real-time-updates',     capability: 'real-time-streaming' },
  { pattern: 'live updates',          canonical: 'real-time-updates',     capability: 'real-time-streaming' },
  { pattern: 'instant updates',       canonical: 'real-time-updates',     capability: 'real-time-streaming' },
  { pattern: 'real-time',             canonical: 'real-time',             capability: 'real-time-streaming' },
  { pattern: 'real time',             canonical: 'real-time',             capability: 'real-time-streaming' },
  { pattern: 'low latency',           canonical: 'low-latency',           capability: 'real-time-streaming' },
  { pattern: 'live streaming',        canonical: 'live-streaming',        capability: 'real-time-streaming' },

  // ── Chat / Communication patterns ──
  { pattern: 'chat-first',            canonical: 'chat-first',            capability: 'bidirectional-messaging' },
  { pattern: 'chat first',            canonical: 'chat-first',            capability: 'bidirectional-messaging' },
  { pattern: 'chat based',            canonical: 'chat-based',            capability: 'bidirectional-messaging' },
  { pattern: 'chat-based',            canonical: 'chat-based',            capability: 'bidirectional-messaging' },
  { pattern: 'group chat',            canonical: 'group-chat',            capability: 'bidirectional-messaging' },
  { pattern: 'direct messaging',      canonical: 'direct-messaging',      capability: 'bidirectional-messaging' },
  { pattern: 'private messaging',     canonical: 'private-messaging',     capability: 'bidirectional-messaging' },
  { pattern: 'video calling',         canonical: 'video-calling',         capability: 'video-communication' },
  { pattern: 'video call',            canonical: 'video-calling',         capability: 'video-communication' },
  { pattern: 'voice call',            canonical: 'voice-calling',         capability: 'voice-communication' },
  { pattern: 'voice calling',         canonical: 'voice-calling',         capability: 'voice-communication' },

  // ── Authentication patterns ──
  { pattern: 'user authentication',   canonical: 'user-auth',             capability: 'authentication' },
  { pattern: 'user authorization',    canonical: 'user-auth',             capability: 'authorization' },
  { pattern: 'role based access',     canonical: 'rbac',                  capability: 'authorization' },
  { pattern: 'role-based access',     canonical: 'rbac',                  capability: 'authorization' },
  { pattern: 'access control',        canonical: 'access-control',        capability: 'authorization' },
  { pattern: 'single sign on',        canonical: 'sso',                   capability: 'authentication' },
  { pattern: 'single sign-on',        canonical: 'sso',                   capability: 'authentication' },
  { pattern: 'two factor',            canonical: 'two-factor-auth',       capability: 'authentication' },
  { pattern: 'multi factor',          canonical: 'multi-factor-auth',     capability: 'authentication' },
  { pattern: 'social login',          canonical: 'social-login',          capability: 'authentication' },

  // ── Data / Storage patterns ──
  { pattern: 'data storage',          canonical: 'data-storage',          capability: 'persistent-storage' },
  { pattern: 'data persistence',      canonical: 'data-persistence',      capability: 'persistent-storage' },
  { pattern: 'file upload',           canonical: 'file-upload',           capability: 'file-storage' },
  { pattern: 'file uploads',          canonical: 'file-upload',           capability: 'file-storage' },
  { pattern: 'file storage',          canonical: 'file-storage',          capability: 'file-storage' },
  { pattern: 'object storage',        canonical: 'object-storage',        capability: 'file-storage' },
  { pattern: 'image upload',          canonical: 'image-upload',          capability: 'file-storage' },
  { pattern: 'media storage',         canonical: 'media-storage',         capability: 'file-storage' },
  { pattern: 'full text search',      canonical: 'full-text-search',      capability: 'search-indexing' },
  { pattern: 'full-text search',      canonical: 'full-text-search',      capability: 'search-indexing' },
  { pattern: 'search engine',         canonical: 'search-engine',         capability: 'search-indexing' },

  // ── Infrastructure patterns ──
  { pattern: 'load balancing',        canonical: 'load-balancing',        capability: 'horizontal-scaling' },
  { pattern: 'load balancer',         canonical: 'load-balancing',        capability: 'horizontal-scaling' },
  { pattern: 'auto scaling',          canonical: 'auto-scaling',          capability: 'horizontal-scaling' },
  { pattern: 'auto-scaling',          canonical: 'auto-scaling',          capability: 'horizontal-scaling' },
  { pattern: 'message queue',         canonical: 'message-queue',         capability: 'async-processing' },
  { pattern: 'message queuing',       canonical: 'message-queue',         capability: 'async-processing' },
  { pattern: 'event driven',          canonical: 'event-driven',          capability: 'async-processing' },
  { pattern: 'event-driven',          canonical: 'event-driven',          capability: 'async-processing' },
  { pattern: 'background jobs',       canonical: 'background-jobs',       capability: 'async-processing' },
  { pattern: 'background processing', canonical: 'background-processing', capability: 'async-processing' },
  { pattern: 'task queue',            canonical: 'task-queue',            capability: 'async-processing' },

  // ── E-commerce patterns ──
  { pattern: 'shopping cart',         canonical: 'shopping-cart',         capability: 'e-commerce' },
  { pattern: 'payment processing',    canonical: 'payment-processing',    capability: 'payment-processing' },
  { pattern: 'payment gateway',       canonical: 'payment-gateway',       capability: 'payment-processing' },
  { pattern: 'order management',      canonical: 'order-management',      capability: 'order-management' },
  { pattern: 'order tracking',        canonical: 'order-tracking',        capability: 'order-management' },
  { pattern: 'product catalog',       canonical: 'product-catalog',       capability: 'catalog-management' },
  { pattern: 'inventory management',  canonical: 'inventory-management',  capability: 'inventory-management' },

  // ── Content patterns ──
  { pattern: 'content management',    canonical: 'content-management',    capability: 'content-management' },
  { pattern: 'content delivery',      canonical: 'content-delivery',      capability: 'content-distribution' },
  { pattern: 'news feed',             canonical: 'news-feed',             capability: 'content-distribution' },
  { pattern: 'activity feed',         canonical: 'activity-feed',         capability: 'content-distribution' },
  { pattern: 'social feed',           canonical: 'social-feed',           capability: 'content-distribution' },
  { pattern: 'user generated content',canonical: 'ugc',                   capability: 'content-management' },

  // ── AI / ML patterns ──
  { pattern: 'machine learning',      canonical: 'machine-learning',      capability: 'ml-pipeline' },
  { pattern: 'recommendation engine', canonical: 'recommendation-engine', capability: 'recommendation-system' },
  { pattern: 'recommendation system', canonical: 'recommendation-system', capability: 'recommendation-system' },
  { pattern: 'natural language',      canonical: 'nlp',                   capability: 'nlp-processing' },
  { pattern: 'sentiment analysis',    canonical: 'sentiment-analysis',    capability: 'nlp-processing' },

  // ── Notification patterns ──
  { pattern: 'push notification',     canonical: 'push-notification',     capability: 'push-notification' },
  { pattern: 'push notifications',    canonical: 'push-notification',     capability: 'push-notification' },
  { pattern: 'email notification',    canonical: 'email-notification',    capability: 'email-delivery' },
  { pattern: 'sms notification',      canonical: 'sms-notification',      capability: 'sms-delivery' },
  { pattern: 'in-app notification',   canonical: 'in-app-notification',   capability: 'push-notification' },

  // ── Scheduling patterns ──
  { pattern: 'appointment booking',   canonical: 'appointment-booking',   capability: 'scheduling' },
  { pattern: 'booking system',        canonical: 'booking-system',        capability: 'scheduling' },
  { pattern: 'task scheduling',       canonical: 'task-scheduling',       capability: 'scheduling' },
  { pattern: 'cron job',              canonical: 'cron-job',              capability: 'scheduling' },
  { pattern: 'cron jobs',             canonical: 'cron-job',              capability: 'scheduling' },

  // ── Geo / Location patterns ──
  { pattern: 'location based',        canonical: 'location-based',        capability: 'geolocation' },
  { pattern: 'location-based',        canonical: 'location-based',        capability: 'geolocation' },
  { pattern: 'real-time tracking',    canonical: 'real-time-tracking',    capability: 'geolocation' },
  { pattern: 'live tracking',         canonical: 'live-tracking',         capability: 'geolocation' },
  { pattern: 'gps tracking',          canonical: 'gps-tracking',          capability: 'geolocation' },

  // ── Compliance / Regulatory ──
  { pattern: 'gdpr compliant',        canonical: 'gdpr-compliant',        capability: 'compliance' },
  { pattern: 'hipaa compliant',       canonical: 'hipaa-compliant',       capability: 'compliance' },
  { pattern: 'pci compliant',         canonical: 'pci-compliant',         capability: 'compliance' },
  { pattern: 'data privacy',          canonical: 'data-privacy',          capability: 'compliance' },
  { pattern: 'audit trail',           canonical: 'audit-trail',           capability: 'audit-logging' },
  { pattern: 'audit log',             canonical: 'audit-log',             capability: 'audit-logging' },

  // ── Priority / Modifier patterns ──
  { pattern: 'mobile first',          canonical: 'mobile-first',          capability: 'mobile-optimization' },
  { pattern: 'mobile-first',          canonical: 'mobile-first',          capability: 'mobile-optimization' },
  { pattern: 'offline first',         canonical: 'offline-first',         capability: 'offline-support' },
  { pattern: 'offline-first',         canonical: 'offline-first',         capability: 'offline-support' },
  { pattern: 'api first',             canonical: 'api-first',             capability: 'api-gateway' },
  { pattern: 'api-first',             canonical: 'api-first',             capability: 'api-gateway' },

  // ── Natural Language / Descriptive patterns ──
  { pattern: 'web application',       canonical: 'web-application',       capability: 'api-gateway' },
  { pattern: 'web app',               canonical: 'web-application',       capability: 'api-gateway' },
  { pattern: 'mobile application',    canonical: 'mobile-app',            capability: 'api-gateway' },
  { pattern: 'mobile app',            canonical: 'mobile-app',            capability: 'api-gateway' },
  { pattern: 'social media',          canonical: 'social-media',          capability: 'bidirectional-messaging' },
  { pattern: 'social network',        canonical: 'social-network',        capability: 'bidirectional-messaging' },
  { pattern: 'social platform',       canonical: 'social-platform',       capability: 'bidirectional-messaging' },
  { pattern: 'food delivery',         canonical: 'food-delivery',         capability: 'geolocation' },
  { pattern: 'ride sharing',          canonical: 'ride-sharing',          capability: 'geolocation' },
  { pattern: 'ride-sharing',          canonical: 'ride-sharing',          capability: 'geolocation' },
  { pattern: 'system design',         canonical: 'system-design',         capability: 'api-gateway' },
  { pattern: 'design diagram',        canonical: 'design-diagram',        capability: 'api-gateway' },
  { pattern: 'project management',    canonical: 'project-management',    capability: 'scheduling' },
  { pattern: 'task management',       canonical: 'task-management',       capability: 'scheduling' },
  { pattern: 'user management',       canonical: 'user-management',       capability: 'authentication' },
  { pattern: 'user profile',          canonical: 'user-profile',          capability: 'authentication' },
  { pattern: 'user account',          canonical: 'user-account',          capability: 'authentication' },
  { pattern: 'sign up',               canonical: 'sign-up',               capability: 'authentication' },
  { pattern: 'log in',                canonical: 'log-in',                capability: 'authentication' },
  { pattern: 'online store',          canonical: 'online-store',          capability: 'e-commerce' },
  { pattern: 'online shop',           canonical: 'online-shop',           capability: 'e-commerce' },
  { pattern: 'learning platform',     canonical: 'learning-platform',     capability: 'content-management' },
  { pattern: 'learning management',   canonical: 'learning-management',   capability: 'content-management' },
  { pattern: 'video streaming',       canonical: 'video-streaming',       capability: 'video-communication' },
  { pattern: 'music streaming',       canonical: 'music-streaming',       capability: 'real-time-streaming' },
  { pattern: 'live chat',             canonical: 'live-chat',             capability: 'bidirectional-messaging' },
  { pattern: 'customer support',      canonical: 'customer-support',      capability: 'bidirectional-messaging' },
  { pattern: 'help desk',             canonical: 'help-desk',             capability: 'bidirectional-messaging' },
  { pattern: 'bug tracker',           canonical: 'bug-tracker',           capability: 'content-management' },
  { pattern: 'issue tracker',         canonical: 'issue-tracker',         capability: 'content-management' },
  { pattern: 'inventory management',  canonical: 'inventory-management',  capability: 'inventory-management' },
  { pattern: 'supply chain',          canonical: 'supply-chain',          capability: 'e-commerce' },
  { pattern: 'ai powered',            canonical: 'ai-powered',            capability: 'ml-pipeline' },
  { pattern: 'ai-powered',            canonical: 'ai-powered',            capability: 'ml-pipeline' },
  { pattern: 'machine learning',      canonical: 'machine-learning',      capability: 'ml-pipeline' },
  { pattern: 'deep learning',         canonical: 'deep-learning',         capability: 'ml-pipeline' },
  { pattern: 'data pipeline',         canonical: 'data-pipeline',         capability: 'async-processing' },
  { pattern: 'data processing',       canonical: 'data-processing',       capability: 'async-processing' },
  { pattern: 'data analysis',         canonical: 'data-analysis',         capability: 'analytics' },
  { pattern: 'data visualization',    canonical: 'data-visualization',    capability: 'analytics' },
  { pattern: 'url shortener',         canonical: 'url-shortener',         capability: 'api-gateway' },
  { pattern: 'link shortener',        canonical: 'link-shortener',        capability: 'api-gateway' },
  { pattern: 'password manager',      canonical: 'password-manager',      capability: 'authentication' },
  { pattern: 'content management',    canonical: 'content-management',    capability: 'content-management' },
  { pattern: 'crm system',            canonical: 'crm-system',            capability: 'content-management' },
  { pattern: 'crm',                   canonical: 'crm-system',            capability: 'content-management' },
  { pattern: 'erp system',            canonical: 'erp-system',            capability: 'content-management' },
  { pattern: 'cloud storage',         canonical: 'cloud-storage',         capability: 'file-storage' },
  { pattern: 'note taking',           canonical: 'note-taking',           capability: 'persistent-storage' },
  { pattern: 'note-taking',           canonical: 'note-taking',           capability: 'persistent-storage' },
  { pattern: 'todo app',              canonical: 'todo-app',              capability: 'persistent-storage' },
  { pattern: 'to do',                 canonical: 'todo-app',              capability: 'persistent-storage' },
  
  // ── Ride-sharing / Logistics phrases ──
  { pattern: 'surge pricing',         canonical: 'surge-pricing',         capability: 'real-time-streaming' },
  { pattern: 'dynamic pricing',       canonical: 'dynamic-pricing',       capability: 'real-time-streaming' },
  { pattern: 'ride matching',         canonical: 'ride-matching',         capability: 'geolocation' },
  { pattern: 'driver matching',       canonical: 'driver-matching',       capability: 'geolocation' },
  { pattern: 'eta calculation',       canonical: 'eta-calculation',       capability: 'geolocation' },
  { pattern: 'driver tracking',       canonical: 'driver-tracking',       capability: 'geolocation' },
  { pattern: 'fleet management',      canonical: 'fleet-management',      capability: 'geolocation' },
  { pattern: 'route optimization',    canonical: 'route-optimization',    capability: 'geolocation' },
  { pattern: 'warehouse management',  canonical: 'warehouse-management',  capability: 'inventory-management' },
  { pattern: 'order fulfillment',     canonical: 'order-fulfillment',     capability: 'order-management' },
  { pattern: 'last mile delivery',    canonical: 'last-mile',             capability: 'geolocation' },

  // ── Fintech / Banking phrases ──
  { pattern: 'transaction processing', canonical: 'transaction-processing', capability: 'payment-processing' },
  { pattern: 'fraud detection',       canonical: 'fraud-detection',       capability: 'payment-processing' },
  { pattern: 'kyc verification',      canonical: 'kyc-verification',      capability: 'compliance' },
  { pattern: 'money transfer',        canonical: 'money-transfer',        capability: 'payment-processing' },
  { pattern: 'digital wallet',        canonical: 'digital-wallet',        capability: 'payment-processing' },
  { pattern: 'subscription billing',  canonical: 'subscription-billing',  capability: 'payment-processing' },

  // ── Streaming & Media phrases ──
  { pattern: 'video on demand',       canonical: 'video-on-demand',       capability: 'video-communication' },
  { pattern: 'live broadcast',        canonical: 'live-broadcast',        capability: 'video-communication' },
  { pattern: 'adaptive bitrate',      canonical: 'adaptive-bitrate',      capability: 'video-communication' },
  { pattern: 'content moderation',    canonical: 'content-moderation',    capability: 'content-management' },

  // ── SaaS & Cloud-native phrases ──
  { pattern: 'multi tenant',          canonical: 'multi-tenant',          capability: 'authentication' },
  { pattern: 'multi-tenant',          canonical: 'multi-tenant',          capability: 'authentication' },
  { pattern: 'api rate limiting',     canonical: 'api-rate-limiting',     capability: 'rate-limiting' },
  { pattern: 'rate limiting',         canonical: 'rate-limiting',         capability: 'rate-limiting' },
  { pattern: 'service mesh',          canonical: 'service-mesh',          capability: 'service-mesh' },
  { pattern: 'blue green deployment', canonical: 'blue-green',            capability: 'horizontal-scaling' },
  { pattern: 'canary deployment',     canonical: 'canary-deployment',     capability: 'horizontal-scaling' },
  { pattern: 'zero downtime',         canonical: 'zero-downtime',         capability: 'horizontal-scaling' },
  { pattern: 'circuit breaker',       canonical: 'circuit-breaker',       capability: 'circuit-breaker' },
  
  // ── Healthcare phrases ──
  { pattern: 'patient management',    canonical: 'patient-management',    capability: 'content-management' },
  { pattern: 'electronic health',     canonical: 'ehr-system',            capability: 'content-management' },
  { pattern: 'telemedicine',          canonical: 'telemedicine',          capability: 'video-communication' },
  
  // ── Descriptive action phrases ──
  { pattern: 'user auth',             canonical: 'user-auth',             capability: 'authentication' },
  { pattern: 'live location',         canonical: 'live-location',         capability: 'geolocation' },
  { pattern: 'live presence',         canonical: 'live-presence',         capability: 'real-time-streaming' },
  { pattern: 'presence tracking',     canonical: 'presence-tracking',     capability: 'real-time-streaming' },
  { pattern: 'product search',        canonical: 'product-search',        capability: 'search-indexing' },
  { pattern: 'analytics dashboard',   canonical: 'analytics-dashboard',   capability: 'analytics' },
];

module.exports = { PHRASE_MAP };
