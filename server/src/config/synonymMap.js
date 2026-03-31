/**
 * ============================================================================
 * ARCHFORGE — SYNONYM MAP CONFIGURATION
 * ============================================================================
 * 
 * Maps alternative/informal terms to their canonical architectural tokens.
 * This allows the parser to understand that "realtime" and "live" both
 * mean the same architectural concept: "real-time".
 * 
 * STRUCTURE:   synonym → canonical_term
 * 
 * EXTENDING: Add new synonym→canonical pairs. The canonical term MUST exist
 * as a key in the capabilityMap or phraseMap for capability detection to work.
 * If a synonym maps to a term that isn't in any capability map, it will
 * still normalize the token but won't produce a capability.
 * 
 * CONVENTION: 
 *   - All keys (synonyms) must be lowercase, single words.
 *   - All values (canonical terms) must be lowercase, single words or 
 *     hyphenated compounds (e.g., "real-time").
 *   - A canonical term should NEVER appear as a key (no self-mapping).
 * ============================================================================
 */

const SYNONYM_MAP = new Map([
  // ── Real-time / Live ──
  ['realtime',      'real-time'],
  ['live',          'real-time'],
  ['instant',       'real-time'],
  ['instantaneous', 'real-time'],
  ['low-latency',   'real-time'],
  ['lowlatency',    'real-time'],

  // ── Chat / Messaging ──
  ['messaging',     'chat'],
  ['im',            'chat'],
  ['messenger',     'chat'],
  ['conversation',  'chat'],
  ['conversations', 'chat'],
  ['dm',            'chat'],
  ['dms',           'chat'],
  ['texting',       'chat'],

  // ── Authentication ──
  ['login',         'auth'],
  ['signin',        'auth'],
  ['sign-in',       'auth'],
  ['signup',        'auth'],
  ['sign-up',       'auth'],
  ['register',      'auth'],
  ['registration',  'auth'],
  ['authentication','auth'],
  ['authorization', 'auth'],
  ['oauth',         'auth'],
  ['sso',           'auth'],
  ['jwt',           'auth'],

  // ── Database / Storage ──
  ['database',      'storage'],
  ['db',            'storage'],
  ['datastore',     'storage'],
  ['data-store',    'storage'],
  ['persistence',   'storage'],
  ['persist',       'storage'],
  ['storing',       'storage'],
  ['repository',    'storage'],
  ['warehouse',     'storage'],

  // ── Cache / Caching ──
  ['caching',       'cache'],
  ['cached',        'cache'],
  ['memoize',       'cache'],
  ['memoization',   'cache'],
  ['redis',         'cache'],
  ['memcached',     'cache'],

  // ── Search ──
  ['searching',     'search'],
  ['find',          'search'],
  ['lookup',        'search'],
  ['query',         'search'],
  ['querying',      'search'],
  ['elasticsearch', 'search'],
  ['fulltext',      'search'],
  ['full-text',     'search'],

  // ── Notification ──
  ['notifications', 'notification'],
  ['notify',        'notification'],
  ['alert',         'notification'],
  ['alerts',        'notification'],
  ['push-notification', 'notification'],

  // ── Payment ──
  ['payments',      'payment'],
  ['pay',           'payment'],
  ['billing',       'payment'],
  ['checkout',      'payment'],
  ['transaction',   'payment'],
  ['transactions',  'payment'],
  ['stripe',        'payment'],
  ['paypal',        'payment'],

  // ── API ──
  ['apis',          'api'],
  ['rest',          'api'],
  ['restful',       'api'],
  ['graphql',       'api'],
  ['grpc',          'api'],
  ['endpoint',      'api'],
  ['endpoints',     'api'],
  ['webhook',       'api'],
  ['webhooks',      'api'],

  // ── Queue / Async Processing ──
  ['queue',         'queue'],
  ['queues',        'queue'],
  ['kafka',         'queue'],
  ['rabbitmq',      'queue'],
  ['pubsub',        'queue'],
  ['pub-sub',       'queue'],
  ['event-driven',  'queue'],
  ['message-queue', 'queue'],
  ['async',         'queue'],
  ['asynchronous',  'queue'],
  ['worker',        'queue'],
  ['workers',       'queue'],
  ['background',    'queue'],

  // ── File / Media ──
  ['upload',        'file-storage'],
  ['uploads',       'file-storage'],
  ['download',      'file-storage'],
  ['downloads',     'file-storage'],
  ['files',         'file-storage'],
  ['file',          'file-storage'],
  ['media',         'file-storage'],
  ['images',        'file-storage'],
  ['image',         'file-storage'],
  ['photos',        'file-storage'],
  ['video',         'video'],
  ['videos',        'video'],
  ['streaming',     'video'],
  ['stream',        'video'],

  // ── Analytics / Monitoring ──
  ['analytics',     'analytics'],
  ['tracking',      'analytics'],
  ['metrics',       'analytics'],
  ['monitoring',    'monitoring'],
  ['observability', 'monitoring'],
  ['logging',       'monitoring'],
  ['logs',          'monitoring'],
  ['tracing',       'monitoring'],

  // ── E-commerce ──
  ['ecommerce',     'e-commerce'],
  ['shop',          'e-commerce'],
  ['shopping',      'e-commerce'],
  ['marketplace',   'e-commerce'],
  ['store',         'e-commerce'],
  ['buy',           'e-commerce'],
  ['catalog',       'e-commerce'],
  ['inventory',     'e-commerce'],
  ['cart',          'e-commerce'],

  // ── Security ──
  ['encryption',    'security'],
  ['encrypted',     'security'],
  ['ssl',           'security'],
  ['tls',           'security'],
  ['https',         'security'],
  ['firewall',      'security'],
  ['secure',        'security'],
  ['security',      'security'],

  // ── Scaling ──
  ['scalable',      'scaling'],
  ['scalability',   'scaling'],
  ['scale',         'scaling'],
  ['horizontal',    'scaling'],
  ['vertical',      'scaling'],
  ['distributed',   'scaling'],
  ['cluster',       'scaling'],
  ['clustering',    'scaling'],
  ['load-balancer', 'scaling'],
  ['loadbalancer',  'scaling'],
  ['cdn',           'scaling'],

  // ── Location / Geo ──
  ['geolocation',   'geo'],
  ['location',      'geo'],
  ['gps',           'geo'],
  ['map',           'geo'],
  ['maps',          'geo'],
  ['mapping',       'geo'],
  ['nearby',        'geo'],

  // ── Scheduling ──
  ['schedule',      'scheduling'],
  ['scheduler',     'scheduling'],
  ['cron',          'scheduling'],
  ['timed',         'scheduling'],
  ['recurring',     'scheduling'],
  ['booking',       'scheduling'],
  ['appointment',   'scheduling'],
  ['appointments',  'scheduling'],
  ['calendar',      'scheduling'],

  // ── Collaboration ──
  ['collaborate',   'collaboration'],
  ['collaborative', 'collaboration'],
  ['shared',        'collaboration'],
  ['sharing',       'collaboration'],
  ['teamwork',      'collaboration'],
  ['multiplayer',   'collaboration'],
  ['multi-user',    'collaboration'],
  ['multiuser',     'collaboration'],

  // ── Email ──
  ['email',         'email'],
  ['emails',        'email'],
  ['mail',          'email'],
  ['mailing',       'email'],
  ['smtp',          'email'],

  // ── Admin / Dashboard ──
  ['admin',         'admin'],
  ['administrator', 'admin'],
  ['dashboard',     'dashboard'],
  ['panel',         'dashboard'],
  ['backoffice',    'dashboard'],
  ['back-office',   'dashboard'],

  // ── AI / ML ──
  ['ai',            'ai'],
  ['ml',            'ai'],
  ['machine-learning', 'ai'],
  ['recommendation','ai'],
  ['recommendations','ai'],
  ['personalized',  'ai'],
  ['personalization','ai'],
  ['intelligent',   'ai'],
  ['smart',         'ai'],
  ['nlp',           'ai'],
  ['chatbot',       'ai'],
  ['bot',           'ai'],
  ['gpt',           'ai'],
  ['openai',        'ai'],
  ['gemini',        'ai'],
  ['llm',           'ai'],
  ['model',         'ai'],
  ['predict',       'ai'],
  ['prediction',    'ai'],
  ['classify',      'ai'],
  ['classification','ai'],
  ['generate',      'ai'],
  ['generates',     'ai'],
  ['generator',     'ai'],

  // ── Web App / Platform (maps to API since it implies a backend) ──
  ['app',           'api'],
  ['application',   'api'],
  ['website',       'api'],
  ['webapp',        'api'],
  ['web-app',       'api'],
  ['platform',      'api'],
  ['system',        'api'],
  ['portal',        'api'],
  ['service',       'api'],
  ['backend',       'api'],
  ['server',        'api'],
  ['microservice',  'api'],
  ['microservices', 'api'],
  ['saas',          'api'],

  // ── User / Account (maps to auth) ──
  ['user',          'auth'],
  ['users',         'auth'],
  ['account',       'auth'],
  ['accounts',      'auth'],
  ['profile',       'auth'],
  ['profiles',      'auth'],
  ['member',        'auth'],
  ['members',       'auth'],
  ['membership',    'auth'],
  ['customer',      'auth'],
  ['customers',     'auth'],
  ['subscriber',    'auth'],
  ['subscribers',   'auth'],
  ['role',          'auth'],
  ['roles',         'auth'],
  ['permission',    'auth'],
  ['permissions',   'auth'],

  // ── Data / Content (maps to storage) ──
  ['data',          'storage'],
  ['save',          'storage'],
  ['saves',         'storage'],
  ['saved',         'storage'],
  ['record',        'storage'],
  ['records',       'storage'],
  ['table',         'storage'],
  ['tables',        'storage'],
  ['collection',    'storage'],
  ['collections',   'storage'],
  ['document',      'storage'],
  ['documents',     'storage'],
  ['history',       'storage'],
  ['archive',       'storage'],
  ['backup',        'storage'],

  // ── Social / Community ──
  ['social',        'chat'],
  ['community',     'chat'],
  ['forum',         'chat'],
  ['forums',        'chat'],
  ['discussion',    'chat'],
  ['comments',      'chat'],
  ['comment',       'chat'],
  ['reply',         'chat'],
  ['replies',       'chat'],
  ['post',          'feed'],
  ['posts',         'feed'],
  ['blog',          'feed'],
  ['blogs',         'feed'],
  ['article',       'feed'],
  ['articles',      'feed'],
  ['content',       'feed'],
  ['timeline',      'feed'],
  ['updates',       'feed'],

  // ── Tools / Diagram / Design ──
  ['tool',          'api'],
  ['tools',         'api'],
  ['diagram',       'api'],
  ['diagrams',      'api'],
  ['design',        'api'],
  ['architecture',  'api'],
  ['blueprint',     'api'],
  ['schema',        'api'],
  ['editor',        'api'],
  ['builder',       'api'],
  ['creator',       'api'],
  ['composer',      'api'],
  ['canvas',        'api'],
  ['workspace',     'collaboration'],
  ['project',       'api'],
  ['projects',      'api'],

  // ── CRUD / Operations ──
  ['create',        'api'],
  ['read',          'api'],
  ['update',        'api'],
  ['delete',        'api'],
  ['list',          'api'],
  ['manage',        'admin'],
  ['management',    'admin'],
  ['managing',      'admin'],
  ['submit',        'api'],
  ['enter',         'api'],
  ['input',         'api'],
  ['output',        'api'],
  ['display',       'api'],
  ['show',          'api'],
  ['view',          'api'],
  ['render',        'api'],
  ['fetch',         'api'],
  ['request',       'api'],
  ['response',      'api'],

  // ── E-commerce expanded ──
  ['order',         'e-commerce'],
  ['orders',        'e-commerce'],
  ['product',       'e-commerce'],
  ['products',      'e-commerce'],
  ['subscription',  'payment'],
  ['subscriptions', 'payment'],
  ['plan',          'payment'],
  ['plans',         'payment'],
  ['invoice',       'payment'],
  ['invoices',      'payment'],
  ['buy',           'e-commerce'],
  ['sell',          'e-commerce'],
  ['purchase',      'e-commerce'],

  // ── Notification expanded ──
  ['remind',        'notification'],
  ['reminder',      'notification'],
  ['reminders',     'notification'],
  ['message',       'notification'],
  ['messages',      'notification'],
  ['inbox',         'notification'],

  // ── Report ──
  ['report',        'analytics'],
  ['reports',       'analytics'],
  ['reporting',     'analytics'],
  ['statistics',    'analytics'],
  ['stats',         'analytics'],
  ['chart',         'analytics'],
  ['charts',        'analytics'],
  ['graph',         'analytics'],
  ['graphs',        'analytics'],
  ['visualization', 'analytics'],
  ['visualize',     'analytics'],

  // ── Mobile / Responsive ──
  ['mobile',        'api'],
  ['ios',           'api'],
  ['android',       'api'],
  ['responsive',    'api'],
  ['pwa',           'api'],

  // ── Cloud / Deploy ──
  ['cloud',         'scaling'],
  ['deploy',        'scaling'],
  ['deployment',    'scaling'],
  ['docker',        'scaling'],
  ['kubernetes',    'scaling'],
  ['k8s',           'scaling'],
  ['aws',           'scaling'],
  ['gcp',           'scaling'],
  ['azure',         'scaling'],
  ['serverless',    'scaling'],
  ['lambda',        'scaling'],

  // ── Testing / CI ──
  ['test',          'monitoring'],
  ['testing',       'monitoring'],
  ['ci',            'monitoring'],
  ['cd',            'monitoring'],
  ['pipeline',      'monitoring'],

  // ── Domain specific expanded ──
  ['healthcare',    'api'],
  ['medical',       'api'],
  ['fitness',       'api'],
  ['education',     'api'],
  ['learning',      'api'],
  ['course',        'api'],
  ['courses',       'api'],
  ['student',       'auth'],
  ['teacher',       'auth'],
  ['school',        'api'],
  ['university',    'api'],
  ['restaurant',    'e-commerce'],
  ['food',          'e-commerce'],
  ['delivery',      'geo'],
  ['ride',          'geo'],
  ['taxi',          'geo'],
  ['uber',          'geo'],
  ['hotel',         'e-commerce'],
  ['booking',       'scheduling'],
  ['travel',        'e-commerce'],
  ['flight',        'e-commerce'],
  ['real-estate',   'e-commerce'],
  ['property',      'e-commerce'],
  ['rental',        'e-commerce'],
  ['finance',       'payment'],
  ['banking',       'payment'],
  ['trading',       'payment'],
  ['crypto',        'payment'],
  ['wallet',        'payment'],
  ['gaming',        'real-time'],
  ['game',          'real-time'],
  ['multiplayer',   'real-time'],
]);

module.exports = { SYNONYM_MAP };
