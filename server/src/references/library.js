/**
 * Golden reference library — the accuracy asset.
 * ----------------------------------------------
 * Hand-authored, correct reference architectures grounded in the well-known
 * system-design canon (Alex Xu / ByteByteGo). Each entry is a real, sound
 * design that obeys the call-rules and principles. The selector picks the
 * closest one or two to ground the model — research shows this grounding is
 * the single biggest lever on output accuracy.
 *
 * Every architecture here is checked in references.test.js against the schema
 * AND the call-rules, so the asset itself is provably correct.
 *
 * Entry shape: { meta: { title, domain, keywords[] }, arch: <architecture> }
 */

import { EXTENDED } from './library-extended.js';

const CORE = [
  // ── URL shortener ───────────────────────────────────────────────
  {
    meta: { title: 'URL Shortener', domain: 'url-shortener',
      keywords: ['url', 'shorten', 'link', 'redirect', 'tinyurl', 'short code', 'read heavy'] },
    arch: {
      system: { name: 'URL Shortener', summary: 'Create short links and redirect them at very high read volume.', domain: 'url-shortener', scale: 'large' },
      assumptions: { dailyActiveUsers: 10_000_000, actionsPerUserPerDay: 10, readWriteRatio: 100, avgItemSizeBytes: 500, retentionDays: 730, latencySloMs: 80, consistency: 'eventual' },
      nodes: [
        { id: 'web', label: 'Web / Mobile', type: 'web_app', layer: 'client', why: 'Users create and open short links.', redundant: true, stateful: false },
        { id: 'cdn', label: 'CDN', type: 'cdn', layer: 'edge', tech: 'CloudFront', why: 'Cache redirects close to users.', redundant: true, stateful: false },
        { id: 'lb', label: 'Load Balancer', type: 'load_balancer', layer: 'gateway', tech: 'NGINX', why: 'Spread traffic across service instances.', redundant: true, stateful: false },
        { id: 'svc', label: 'Link Service', type: 'service', layer: 'service', tech: 'Go', why: 'Encode/decode short codes and redirect.', redundant: true, stateful: false },
        { id: 'cache', label: 'Redirect Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Serve the 99% hot reads without hitting the DB.', redundant: true, stateful: true },
        { id: 'db', label: 'Mapping Store', type: 'nosql_db', layer: 'data', tech: 'DynamoDB', why: 'Key-value short-code → URL at scale.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'web', target: 'cdn', label: 'GET /:code', protocol: 'sync', why: 'Redirects served from the edge.' },
        { id: 'e2', source: 'cdn', target: 'lb', label: 'cache miss', protocol: 'sync', why: 'Fall back to origin on miss.' },
        { id: 'e3', source: 'lb', target: 'svc', label: 'route', protocol: 'sync', why: 'Dispatch to a healthy instance.' },
        { id: 'e4', source: 'svc', target: 'cache', label: 'lookup code', protocol: 'sync', why: 'Hot path for reads.' },
        { id: 'e5', source: 'svc', target: 'db', label: 'read/write mapping', protocol: 'sync', why: 'Source of truth on cache miss / create.' },
      ],
      tradeoffs: [
        { decision: 'Primary datastore', choice: 'DynamoDB (KV)', alternative: 'PostgreSQL', why: 'Access is a simple key lookup at massive scale; KV shards trivially.' },
        { decision: 'Short-code generation', choice: 'Base62 of a counter', alternative: 'Hash of URL', why: 'Counter guarantees uniqueness without collision checks.' },
      ],
      notes: ['Read-heavy (100:1) — cache is essential.', 'Shard the KV store by short code.'],
    },
  },

  // ── Chat / messaging ────────────────────────────────────────────
  {
    meta: { title: 'Realtime Chat', domain: 'chat',
      keywords: ['chat', 'messaging', 'realtime', 'websocket', 'direct message', 'presence', 'whatsapp', 'slack'] },
    arch: {
      system: { name: 'Realtime Chat', summary: 'One-to-one and group messaging with realtime delivery and history.', domain: 'chat', scale: 'large' },
      assumptions: { dailyActiveUsers: 5_000_000, actionsPerUserPerDay: 60, readWriteRatio: 3, avgItemSizeBytes: 300, retentionDays: 3650, latencySloMs: 150, consistency: 'eventual' },
      nodes: [
        { id: 'app', label: 'Mobile App', type: 'mobile_app', layer: 'client', why: 'Send/receive messages, show presence.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth, rate-limit and route REST + WS.', redundant: true, stateful: false },
        { id: 'ws', label: 'WebSocket Service', type: 'websocket_server', layer: 'service', tech: 'Elixir', why: 'Hold persistent connections and push messages.', redundant: true, stateful: true },
        { id: 'msg', label: 'Message Service', type: 'service', layer: 'service', tech: 'Java', why: 'Persist and fan-out messages.', redundant: true, stateful: false },
        { id: 'auth', label: 'Auth Service', type: 'auth_service', layer: 'security', tech: 'OAuth2', why: 'Authenticate users and sessions.', redundant: true, stateful: false },
        { id: 'bus', label: 'Message Bus', type: 'event_bus', layer: 'async', tech: 'Kafka', why: 'Decouple delivery and enable fan-out.', redundant: true, stateful: true },
        { id: 'store', label: 'Message Store', type: 'wide_column_db', layer: 'data', tech: 'Cassandra', why: 'Append-heavy history keyed by conversation.', redundant: true, stateful: true },
        { id: 'presence', label: 'Presence Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Track who is online.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'REST + WS', protocol: 'sync', why: 'All client traffic enters here.' },
        { id: 'e2', source: 'gw', target: 'auth', label: 'verify token', protocol: 'sync', why: 'Auth boundary before service access.' },
        { id: 'e3', source: 'gw', target: 'ws', label: 'upgrade WS', protocol: 'sync', why: 'Establish the realtime channel.' },
        { id: 'e4', source: 'gw', target: 'msg', label: 'send message', protocol: 'sync', why: 'Write path for new messages.' },
        { id: 'e5', source: 'msg', target: 'store', label: 'persist', protocol: 'sync', why: 'Durable conversation history.' },
        { id: 'e6', source: 'msg', target: 'bus', label: 'publish', protocol: 'async', why: 'Fan-out to recipients.' },
        { id: 'e7', source: 'bus', target: 'ws', label: 'deliver', protocol: 'async', why: 'Push to connected recipients.' },
        { id: 'e8', source: 'ws', target: 'presence', label: 'online state', protocol: 'sync', why: 'Update/read presence.' },
      ],
      tradeoffs: [
        { decision: 'Message storage', choice: 'Cassandra (wide-column)', alternative: 'PostgreSQL', why: 'Write-heavy, time-ordered per conversation — fits wide-column.' },
        { decision: 'Delivery', choice: 'Event bus fan-out', alternative: 'Direct DB polling', why: 'Push beats polling for realtime latency.' },
      ],
      notes: ['WebSocket layer is stateful — use sticky routing + a presence store.', 'Retain history long-term; storage grows fast.'],
    },
  },

  // ── Social news feed ────────────────────────────────────────────
  {
    meta: { title: 'News Feed', domain: 'news-feed',
      keywords: ['feed', 'timeline', 'news feed', 'social', 'twitter', 'instagram', 'fan-out', 'followers', 'posts'] },
    arch: {
      system: { name: 'Social News Feed', summary: 'Users post content and see a ranked feed from people they follow.', domain: 'news-feed', scale: 'hyperscale' },
      assumptions: { dailyActiveUsers: 50_000_000, actionsPerUserPerDay: 40, readWriteRatio: 100, avgItemSizeBytes: 1_500, retentionDays: 1825, latencySloMs: 200, consistency: 'eventual' },
      nodes: [
        { id: 'app', label: 'Mobile / Web', type: 'mobile_app', layer: 'client', why: 'Post and scroll the feed.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Kong', why: 'Auth, rate-limit, route.', redundant: true, stateful: false },
        { id: 'post', label: 'Post Service', type: 'service', layer: 'service', tech: 'Go', why: 'Create posts and trigger fan-out.', redundant: true, stateful: false },
        { id: 'feed', label: 'Feed Service', type: 'service', layer: 'service', tech: 'Go', why: 'Assemble/read a user timeline.', redundant: true, stateful: false },
        { id: 'queue', label: 'Fan-out Queue', type: 'message_queue', layer: 'async', tech: 'Kafka', why: 'Async fan-out of a post to followers.', redundant: true, stateful: true },
        { id: 'worker', label: 'Fan-out Worker', type: 'worker', layer: 'async', tech: 'Go', why: 'Write posts into follower feed caches.', redundant: true, stateful: false },
        { id: 'feedcache', label: 'Feed Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Precomputed timelines for fast reads.', redundant: true, stateful: true },
        { id: 'posts', label: 'Post Store', type: 'nosql_db', layer: 'data', tech: 'Cassandra', why: 'Durable post content at scale.', redundant: true, stateful: true },
        { id: 'blob', label: 'Media Store', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Images/video for posts.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'post / read feed', protocol: 'sync', why: 'All client traffic.' },
        { id: 'e2', source: 'gw', target: 'post', label: 'create post', protocol: 'sync', why: 'Write path.' },
        { id: 'e3', source: 'gw', target: 'feed', label: 'get feed', protocol: 'sync', why: 'Read path.' },
        { id: 'e4', source: 'post', target: 'posts', label: 'store post', protocol: 'sync', why: 'Persist content.' },
        { id: 'e5', source: 'post', target: 'blob', label: 'store media', protocol: 'sync', why: 'Offload large media.' },
        { id: 'e6', source: 'post', target: 'queue', label: 'enqueue fan-out', protocol: 'async', why: 'Push to followers without blocking.' },
        { id: 'e7', source: 'queue', target: 'worker', label: 'consume', protocol: 'async', why: 'Process fan-out jobs.' },
        { id: 'e8', source: 'worker', target: 'feedcache', label: 'write timelines', protocol: 'sync', why: 'Precompute follower feeds.' },
        { id: 'e9', source: 'feed', target: 'feedcache', label: 'read timeline', protocol: 'sync', why: 'Serve feed from cache.' },
      ],
      tradeoffs: [
        { decision: 'Feed model', choice: 'Fan-out on write', alternative: 'Fan-out on read', why: 'Reads dominate (100:1); precompute to keep reads cheap. Use fan-out-on-read for celebrities.' },
        { decision: 'Media', choice: 'Object storage + CDN', alternative: 'Store in DB', why: 'Never put large binaries in the primary DB.' },
      ],
      notes: ['Hybrid fan-out: precompute for normal users, pull for celebrities with millions of followers.'],
    },
  },

  // ── E-commerce + payments ───────────────────────────────────────
  {
    meta: { title: 'E-commerce Platform', domain: 'e-commerce',
      keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'payments', 'orders', 'catalog', 'inventory'] },
    arch: {
      system: { name: 'E-commerce Platform', summary: 'Browse a catalog, manage a cart, check out with payments, fulfil orders.', domain: 'e-commerce', scale: 'large' },
      assumptions: { dailyActiveUsers: 2_000_000, actionsPerUserPerDay: 30, readWriteRatio: 20, avgItemSizeBytes: 2_000, retentionDays: 3650, latencySloMs: 250, consistency: 'strong' },
      nodes: [
        { id: 'web', label: 'Storefront', type: 'web_app', layer: 'client', why: 'Browse, cart, checkout.', redundant: true, stateful: false },
        { id: 'cdn', label: 'CDN', type: 'cdn', layer: 'edge', tech: 'Fastly', why: 'Serve product images/static assets.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Kong', why: 'Auth, rate-limit, route.', redundant: true, stateful: false },
        { id: 'catalog', label: 'Catalog Service', type: 'service', layer: 'service', tech: 'Java', why: 'Products, pricing, browsing.', redundant: true, stateful: false },
        { id: 'search', label: 'Search Service', type: 'service', layer: 'service', tech: 'Java', why: 'Full-text product search.', redundant: true, stateful: false },
        { id: 'order', label: 'Order Service', type: 'service', layer: 'service', tech: 'Java', why: 'Create and track orders.', redundant: true, stateful: false },
        { id: 'catalogdb', label: 'Catalog DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'Products and inventory (per-service DB).', redundant: true, stateful: true },
        { id: 'orderdb', label: 'Order DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'Orders with strong consistency (per-service DB).', redundant: true, stateful: true },
        { id: 'cache', label: 'Catalog Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Hot product reads.', redundant: true, stateful: true },
        { id: 'index', label: 'Search Index', type: 'search_index', layer: 'data', tech: 'Elasticsearch', why: 'Fast full-text queries, not DB scans.', redundant: true, stateful: true },
        { id: 'queue', label: 'Order Events', type: 'message_queue', layer: 'async', tech: 'RabbitMQ', why: 'Async fulfilment/email after checkout.', redundant: true, stateful: true },
        { id: 'worker', label: 'Fulfilment Worker', type: 'worker', layer: 'async', tech: 'Java', why: 'Process orders, notify.', redundant: true, stateful: false },
        { id: 'pay', label: 'Payment Gateway', type: 'payment_gateway', layer: 'external', tech: 'Stripe', why: 'Charge cards (PCI offloaded).', redundant: false, stateful: false },
        { id: 'email', label: 'Email Service', type: 'email_service', layer: 'external', tech: 'SES', why: 'Order confirmations.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'web', target: 'cdn', label: 'assets', protocol: 'sync', why: 'Static content from edge.' },
        { id: 'e2', source: 'web', target: 'gw', label: 'API', protocol: 'sync', why: 'Dynamic requests.' },
        { id: 'e3', source: 'gw', target: 'catalog', label: 'browse', protocol: 'sync', why: 'Product reads.' },
        { id: 'e4', source: 'gw', target: 'search', label: 'search', protocol: 'sync', why: 'Search queries.' },
        { id: 'e5', source: 'gw', target: 'order', label: 'checkout', protocol: 'sync', why: 'Order writes.' },
        { id: 'e6', source: 'catalog', target: 'cache', label: 'read-through', protocol: 'sync', why: 'Hot reads.' },
        { id: 'e7', source: 'catalog', target: 'catalogdb', label: 'read/write', protocol: 'sync', why: 'Source of truth.' },
        { id: 'e8', source: 'search', target: 'index', label: 'query', protocol: 'sync', why: 'Dedicated search index.' },
        { id: 'e9', source: 'order', target: 'orderdb', label: 'read/write', protocol: 'sync', why: 'Strongly-consistent orders.' },
        { id: 'e10', source: 'order', target: 'pay', label: 'charge', protocol: 'sync', why: 'Synchronous payment authorization.' },
        { id: 'e11', source: 'order', target: 'queue', label: 'order placed', protocol: 'async', why: 'Kick off async fulfilment.' },
        { id: 'e12', source: 'queue', target: 'worker', label: 'consume', protocol: 'async', why: 'Process fulfilment.' },
        { id: 'e13', source: 'worker', target: 'email', label: 'send receipt', protocol: 'async', why: 'Notify the customer.' },
      ],
      tradeoffs: [
        { decision: 'Order datastore', choice: 'PostgreSQL (strong)', alternative: 'Eventually-consistent NoSQL', why: 'Money and inventory need strong consistency.' },
        { decision: 'Payments', choice: 'External gateway (Stripe)', alternative: 'Self-host card handling', why: 'Offload PCI scope and fraud handling.' },
        { decision: 'Service boundaries', choice: 'DB-per-service', alternative: 'Shared database', why: 'Independent scaling and deployment; avoids coupling.' },
      ],
      notes: ['Payment writes must be idempotent (retry-safe).', 'Search uses a dedicated index, kept in sync from the catalog DB.'],
    },
  },

  // ── Video streaming ─────────────────────────────────────────────
  {
    meta: { title: 'Video Streaming', domain: 'video-streaming',
      keywords: ['video', 'streaming', 'youtube', 'netflix', 'transcode', 'upload', 'watch', 'hls', 'vod'] },
    arch: {
      system: { name: 'Video Streaming', summary: 'Upload, transcode and stream video to a global audience.', domain: 'video-streaming', scale: 'hyperscale' },
      assumptions: { dailyActiveUsers: 20_000_000, actionsPerUserPerDay: 15, readWriteRatio: 500, avgItemSizeBytes: 50_000_000, retentionDays: 3650, latencySloMs: 300, consistency: 'eventual' },
      nodes: [
        { id: 'app', label: 'Client Player', type: 'web_app', layer: 'client', why: 'Upload and watch video.', redundant: true, stateful: false },
        { id: 'cdn', label: 'CDN', type: 'cdn', layer: 'edge', tech: 'CloudFront', why: 'Stream video segments from the edge.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth and route control-plane calls.', redundant: true, stateful: false },
        { id: 'upload', label: 'Upload Service', type: 'service', layer: 'service', tech: 'Go', why: 'Accept raw uploads, kick off transcoding.', redundant: true, stateful: false },
        { id: 'meta', label: 'Metadata Service', type: 'service', layer: 'service', tech: 'Go', why: 'Titles, thumbnails, playback manifests.', redundant: true, stateful: false },
        { id: 'queue', label: 'Transcode Queue', type: 'message_queue', layer: 'async', tech: 'SQS', why: 'Decouple heavy transcoding.', redundant: true, stateful: true },
        { id: 'transcoder', label: 'Transcoder', type: 'worker', layer: 'async', tech: 'FFmpeg fleet', why: 'Produce multiple bitrates (HLS/DASH).', redundant: true, stateful: false },
        { id: 'raw', label: 'Raw Storage', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Original uploads.', redundant: true, stateful: true },
        { id: 'encoded', label: 'Encoded Storage', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Transcoded segments served via CDN.', redundant: true, stateful: true },
        { id: 'metadb', label: 'Metadata DB', type: 'nosql_db', layer: 'data', tech: 'DynamoDB', why: 'Video metadata at scale.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'cdn', label: 'stream segments', protocol: 'sync', why: 'Playback from edge.' },
        { id: 'e2', source: 'cdn', target: 'encoded', label: 'origin fetch', protocol: 'sync', why: 'CDN pulls encoded segments.' },
        { id: 'e3', source: 'app', target: 'gw', label: 'upload / browse', protocol: 'sync', why: 'Control plane.' },
        { id: 'e4', source: 'gw', target: 'upload', label: 'upload', protocol: 'sync', why: 'Ingest raw video.' },
        { id: 'e5', source: 'gw', target: 'meta', label: 'get metadata', protocol: 'sync', why: 'Titles/manifests.' },
        { id: 'e6', source: 'upload', target: 'raw', label: 'store original', protocol: 'sync', why: 'Durable raw copy.' },
        { id: 'e7', source: 'upload', target: 'queue', label: 'enqueue transcode', protocol: 'async', why: 'Offload heavy work.' },
        { id: 'e8', source: 'queue', target: 'transcoder', label: 'consume', protocol: 'async', why: 'Transcode jobs.' },
        { id: 'e9', source: 'transcoder', target: 'encoded', label: 'write segments', protocol: 'sync', why: 'Store playable renditions.' },
        { id: 'e10', source: 'meta', target: 'metadb', label: 'read/write', protocol: 'sync', why: 'Metadata store.' },
      ],
      tradeoffs: [
        { decision: 'Delivery', choice: 'CDN + adaptive bitrate (HLS)', alternative: 'Direct origin streaming', why: 'Global scale and smooth playback require edge caching + ABR.' },
        { decision: 'Transcoding', choice: 'Async worker fleet', alternative: 'Transcode on upload request', why: 'Transcoding is minutes-long; never block the request.' },
      ],
      notes: ['Extremely read-heavy (500:1) — the CDN carries almost all traffic.'],
    },
  },

  // ── Ride sharing / geospatial ───────────────────────────────────
  {
    meta: { title: 'Ride Sharing', domain: 'ride-sharing',
      keywords: ['ride', 'uber', 'lyft', 'taxi', 'driver', 'rider', 'matching', 'location', 'geospatial', 'nearby', 'maps'] },
    arch: {
      system: { name: 'Ride Sharing', summary: 'Match riders to nearby drivers in real time with live location tracking.', domain: 'ride-sharing', scale: 'large' },
      assumptions: { dailyActiveUsers: 3_000_000, actionsPerUserPerDay: 25, readWriteRatio: 5, avgItemSizeBytes: 400, retentionDays: 1825, latencySloMs: 150, consistency: 'strong' },
      nodes: [
        { id: 'rider', label: 'Rider App', type: 'mobile_app', layer: 'client', why: 'Request rides, track drivers.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth and routing.', redundant: true, stateful: false },
        { id: 'location', label: 'Location Service', type: 'service', layer: 'service', tech: 'Go', why: 'Ingest high-frequency driver GPS.', redundant: true, stateful: false },
        { id: 'match', label: 'Matching Service', type: 'service', layer: 'service', tech: 'Go', why: 'Find nearby drivers and assign.', redundant: true, stateful: false },
        { id: 'trip', label: 'Trip Service', type: 'service', layer: 'service', tech: 'Java', why: 'Manage trip lifecycle and fares.', redundant: true, stateful: false },
        { id: 'geocache', label: 'Geo Index', type: 'cache', layer: 'data', tech: 'Redis (geohash)', why: 'Fast nearby-driver lookups.', redundant: true, stateful: true },
        { id: 'tripdb', label: 'Trip DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'Trips and fares, strongly consistent.', redundant: true, stateful: true },
        { id: 'stream', label: 'Location Stream', type: 'stream_processor', layer: 'async', tech: 'Kafka + Flink', why: 'Process the firehose of GPS updates.', redundant: true, stateful: true },
        { id: 'maps', label: 'Maps / ETA', type: 'maps_service', layer: 'external', tech: 'Google Maps', why: 'Routing and ETA.', redundant: false, stateful: false },
        { id: 'push', label: 'Push Notifications', type: 'push_service', layer: 'external', tech: 'FCM / APNs', why: 'Notify riders and drivers of trip status.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'rider', target: 'gw', label: 'request ride', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'location', label: 'driver GPS', protocol: 'stream', why: 'High-frequency location ingest.' },
        { id: 'e3', source: 'gw', target: 'match', label: 'find driver', protocol: 'sync', why: 'Matching request.' },
        { id: 'e4', source: 'gw', target: 'trip', label: 'trip ops', protocol: 'sync', why: 'Start/track/end trips.' },
        { id: 'e5', source: 'location', target: 'stream', label: 'publish GPS', protocol: 'stream', why: 'Stream updates for processing.' },
        { id: 'e6', source: 'stream', target: 'geocache', label: 'update positions', protocol: 'stream', why: 'Keep geo index fresh.' },
        { id: 'e7', source: 'match', target: 'geocache', label: 'nearby query', protocol: 'sync', why: 'Find candidate drivers.' },
        { id: 'e8', source: 'trip', target: 'tripdb', label: 'read/write', protocol: 'sync', why: 'Persist trips.' },
        { id: 'e9', source: 'trip', target: 'maps', label: 'route/ETA', protocol: 'sync', why: 'External routing.' },
        { id: 'e10', source: 'trip', target: 'push', label: 'trip status', protocol: 'async', why: 'Push ride updates to rider and driver apps.' },
      ],
      tradeoffs: [
        { decision: 'Nearby search', choice: 'Geohash in Redis', alternative: 'PostGIS queries', why: 'In-memory geohash buckets give sub-ms nearby lookups at high write rates.' },
        { decision: 'Location ingest', choice: 'Stream processing', alternative: 'Direct DB writes', why: 'GPS is a high-volume firehose; stream it, don\'t hammer the OLTP DB.' },
      ],
      notes: ['Location writes are streamed, never written directly to the trip DB.'],
    },
  },

  // ── Notification system ─────────────────────────────────────────
  {
    meta: { title: 'Notification System', domain: 'notifications',
      keywords: ['notification', 'notify', 'push', 'email', 'sms', 'alerts', 'fan-out', 'campaign'] },
    arch: {
      system: { name: 'Notification System', summary: 'Deliver push, email and SMS notifications reliably at high fan-out.', domain: 'notifications', scale: 'large' },
      assumptions: { dailyActiveUsers: 10_000_000, actionsPerUserPerDay: 5, readWriteRatio: 1, avgItemSizeBytes: 600, retentionDays: 90, latencySloMs: 500, consistency: 'eventual' },
      nodes: [
        { id: 'svc', label: 'Producer Services', type: 'service', layer: 'service', tech: 'various', why: 'Emit notification requests.', redundant: true, stateful: false },
        { id: 'router', label: 'Notification Service', type: 'service', layer: 'service', tech: 'Go', why: 'Apply preferences, dedupe, route by channel — the internal notify API.', redundant: true, stateful: false },
        { id: 'queue', label: 'Delivery Queue', type: 'message_queue', layer: 'async', tech: 'Kafka', why: 'Buffer spikes, decouple delivery.', redundant: true, stateful: true },
        { id: 'pushw', label: 'Push Worker', type: 'worker', layer: 'async', tech: 'Go', why: 'Deliver push notifications.', redundant: true, stateful: false },
        { id: 'emailw', label: 'Email Worker', type: 'worker', layer: 'async', tech: 'Go', why: 'Deliver emails with retries.', redundant: true, stateful: false },
        { id: 'prefs', label: 'Preferences DB', type: 'nosql_db', layer: 'data', tech: 'DynamoDB', why: 'Per-user channel preferences.', redundant: true, stateful: true },
        { id: 'push', label: 'Push (APNs/FCM)', type: 'push_service', layer: 'external', tech: 'FCM', why: 'Device push delivery.', redundant: false, stateful: false },
        { id: 'email', label: 'Email Provider', type: 'email_service', layer: 'external', tech: 'SES', why: 'Email delivery.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'svc', target: 'router', label: 'notify()', protocol: 'sync', why: 'Internal services request a notification.' },
        { id: 'e3', source: 'router', target: 'prefs', label: 'read prefs', protocol: 'sync', why: 'Respect user settings.' },
        { id: 'e4', source: 'router', target: 'queue', label: 'enqueue', protocol: 'async', why: 'Buffer and decouple delivery.' },
        { id: 'e5', source: 'queue', target: 'pushw', label: 'consume push', protocol: 'async', why: 'Deliver push.' },
        { id: 'e6', source: 'queue', target: 'emailw', label: 'consume email', protocol: 'async', why: 'Deliver email.' },
        { id: 'e7', source: 'pushw', target: 'push', label: 'send', protocol: 'async', why: 'Push provider.' },
        { id: 'e8', source: 'emailw', target: 'email', label: 'send', protocol: 'async', why: 'Email provider.' },
      ],
      tradeoffs: [
        { decision: 'Delivery model', choice: 'Queue + per-channel workers', alternative: 'Synchronous send', why: 'Providers are slow/unreliable; retries and buffering need async.' },
        { decision: 'Idempotency', choice: 'Dedupe keys', alternative: 'None', why: 'Prevent duplicate notifications on retry.' },
      ],
      notes: ['Workers must retry with backoff; dedupe to avoid double-sends.'],
    },
  },

  // ── Rate limiter ────────────────────────────────────────────────
  {
    meta: { title: 'Rate Limiter', domain: 'rate-limiter',
      keywords: ['rate limit', 'rate limiter', 'throttle', 'quota', 'token bucket', 'api limit'] },
    arch: {
      system: { name: 'Distributed Rate Limiter', summary: 'Throttle API traffic fairly across a distributed fleet.', domain: 'rate-limiter', scale: 'large' },
      assumptions: { dailyActiveUsers: 5_000_000, actionsPerUserPerDay: 200, readWriteRatio: 1, avgItemSizeBytes: 50, retentionDays: 1, latencySloMs: 20, consistency: 'strong' },
      nodes: [
        { id: 'client', label: 'API Clients', type: 'cli', layer: 'client', why: 'Callers subject to limits.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Enforce limits at the edge before services.', redundant: true, stateful: false },
        { id: 'svc', label: 'Backend Services', type: 'service', layer: 'service', tech: 'various', why: 'Protected downstreams.', redundant: true, stateful: false },
        { id: 'counter', label: 'Counter Store', type: 'cache', layer: 'data', tech: 'Redis', why: 'Atomic token-bucket counters, shared across instances.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'client', target: 'gw', label: 'request', protocol: 'sync', why: 'All calls pass the gateway.' },
        { id: 'e2', source: 'gw', target: 'counter', label: 'check/decrement', protocol: 'sync', why: 'Atomic bucket check per key.' },
        { id: 'e3', source: 'gw', target: 'svc', label: 'forward if allowed', protocol: 'sync', why: 'Only allowed traffic reaches services.' },
      ],
      tradeoffs: [
        { decision: 'Algorithm', choice: 'Token bucket in Redis', alternative: 'Fixed window', why: 'Token bucket smooths bursts; Redis makes counters shared and atomic.' },
        { decision: 'Placement', choice: 'At the gateway', alternative: 'In each service', why: 'Reject early, before load hits services.' },
      ],
      notes: ['Counter store is the hot path — keep it in-memory and close to the gateway.'],
    },
  },

  // ── Analytics pipeline ──────────────────────────────────────────
  {
    meta: { title: 'Analytics Pipeline', domain: 'analytics',
      keywords: ['analytics', 'pipeline', 'etl', 'data warehouse', 'events', 'clickstream', 'dashboards', 'reporting', 'metrics'] },
    arch: {
      system: { name: 'Analytics Pipeline', summary: 'Collect product events, process them, and serve dashboards from a warehouse.', domain: 'analytics', scale: 'large' },
      assumptions: { dailyActiveUsers: 8_000_000, actionsPerUserPerDay: 50, readWriteRatio: 2, avgItemSizeBytes: 400, retentionDays: 1825, latencySloMs: 1_000, consistency: 'eventual' },
      nodes: [
        { id: 'app', label: 'Apps / Sites', type: 'web_app', layer: 'client', why: 'Emit product/usage events.', redundant: true, stateful: false },
        { id: 'gw', label: 'Ingest Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Accept event batches.', redundant: true, stateful: false },
        { id: 'collector', label: 'Event Collector', type: 'service', layer: 'service', tech: 'Go', why: 'Validate and forward events.', redundant: true, stateful: false },
        { id: 'stream', label: 'Event Stream', type: 'stream_processor', layer: 'async', tech: 'Kafka + Flink', why: 'Buffer and transform the event firehose.', redundant: true, stateful: true },
        { id: 'lake', label: 'Raw Event Lake', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Cheap durable raw events.', redundant: true, stateful: true },
        { id: 'warehouse', label: 'Warehouse', type: 'data_warehouse', layer: 'data', tech: 'BigQuery', why: 'Columnar store for analytical queries.', redundant: true, stateful: true },
        { id: 'dash', label: 'Dashboard Service', type: 'service', layer: 'service', tech: 'Node', why: 'Serve reports and dashboards.', redundant: true, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'send events', protocol: 'sync', why: 'Event ingestion.' },
        { id: 'e2', source: 'gw', target: 'collector', label: 'forward', protocol: 'sync', why: 'Validate batch.' },
        { id: 'e3', source: 'collector', target: 'stream', label: 'publish events', protocol: 'stream', why: 'Stream into the pipeline.' },
        { id: 'e4', source: 'stream', target: 'lake', label: 'archive raw', protocol: 'stream', why: 'Durable raw copy.' },
        { id: 'e5', source: 'stream', target: 'warehouse', label: 'load transformed', protocol: 'stream', why: 'Feed the warehouse via the pipeline, not direct writes.' },
        { id: 'e6', source: 'gw', target: 'dash', label: 'view dashboards', protocol: 'sync', why: 'Reporting reads.' },
        { id: 'e7', source: 'dash', target: 'warehouse', label: 'query', protocol: 'sync', why: 'Read aggregates.' },
      ],
      tradeoffs: [
        { decision: 'Ingestion', choice: 'Stream (Kafka)', alternative: 'Direct DB inserts', why: 'A firehose of events must be buffered and processed, never written straight to the warehouse.' },
        { decision: 'Raw storage', choice: 'Object-store lake + warehouse', alternative: 'Warehouse only', why: 'Keep cheap raw events for reprocessing; load curated data to the warehouse.' },
      ],
      notes: ['The warehouse is fed only by the stream/ETL — OLTP services never write to it directly.'],
    },
  },

  // ── IoT telemetry ───────────────────────────────────────────────
  {
    meta: { title: 'IoT Telemetry', domain: 'iot',
      keywords: ['iot', 'telemetry', 'sensor', 'device', 'mqtt', 'time series', 'ingestion', 'fleet'] },
    arch: {
      system: { name: 'IoT Telemetry Platform', summary: 'Ingest high-frequency device telemetry, store time-series, alert on anomalies.', domain: 'iot', scale: 'large' },
      assumptions: { dailyActiveUsers: 1_000_000, actionsPerUserPerDay: 1_440, readWriteRatio: 1, avgItemSizeBytes: 100, retentionDays: 365, latencySloMs: 500, consistency: 'eventual' },
      nodes: [
        { id: 'device', label: 'Devices', type: 'iot_device', layer: 'client', why: 'Emit sensor readings.', redundant: true, stateful: false },
        { id: 'gw', label: 'Ingest Gateway', type: 'api_gateway', layer: 'gateway', tech: 'MQTT broker', why: 'Terminate device connections.', redundant: true, stateful: false },
        { id: 'ingest', label: 'Ingestion Service', type: 'service', layer: 'service', tech: 'Go', why: 'Decode and forward telemetry.', redundant: true, stateful: false },
        { id: 'stream', label: 'Telemetry Stream', type: 'stream_processor', layer: 'async', tech: 'Kafka + Flink', why: 'Process the telemetry firehose and detect anomalies.', redundant: true, stateful: true },
        { id: 'tsdb', label: 'Time-Series DB', type: 'time_series_db', layer: 'data', tech: 'TimescaleDB', why: 'Store readings for querying.', redundant: true, stateful: true },
        { id: 'alert', label: 'Alerting Service', type: 'service', layer: 'service', tech: 'Go', why: 'Raise alerts on thresholds.', redundant: true, stateful: false },
        { id: 'push', label: 'Push / SMS', type: 'push_service', layer: 'external', tech: 'FCM', why: 'Notify operators.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'device', target: 'gw', label: 'telemetry', protocol: 'stream', why: 'Continuous device data.' },
        { id: 'e2', source: 'gw', target: 'ingest', label: 'forward', protocol: 'sync', why: 'Hand off to ingestion.' },
        { id: 'e3', source: 'ingest', target: 'stream', label: 'publish', protocol: 'stream', why: 'Stream for processing.' },
        { id: 'e4', source: 'stream', target: 'tsdb', label: 'write readings', protocol: 'stream', why: 'Persist time-series.' },
        { id: 'e5', source: 'stream', target: 'alert', label: 'anomaly', protocol: 'async', why: 'Trigger alerting.' },
        { id: 'e6', source: 'alert', target: 'push', label: 'notify', protocol: 'async', why: 'Reach operators.' },
      ],
      tradeoffs: [
        { decision: 'Storage', choice: 'Time-series DB', alternative: 'Relational DB', why: 'Telemetry is append-heavy, time-ordered — purpose-built TSDB compresses and queries it far better.' },
        { decision: 'Processing', choice: 'Stream processing', alternative: 'Batch', why: 'Anomaly alerts need near-real-time detection.' },
      ],
      notes: ['Device ingest is streamed; never write raw telemetry directly to a relational OLTP DB.'],
    },
  },

  // ── Collaborative editing ───────────────────────────────────────
  {
    meta: { title: 'Collaborative Editor', domain: 'collaborative-editing',
      keywords: ['collaborative', 'google docs', 'realtime editing', 'crdt', 'operational transform', 'document', 'co-editing', 'notion'] },
    arch: {
      system: { name: 'Collaborative Editor', summary: 'Multiple users edit a document simultaneously with realtime sync.', domain: 'collaborative-editing', scale: 'medium' },
      assumptions: { dailyActiveUsers: 1_000_000, actionsPerUserPerDay: 200, readWriteRatio: 2, avgItemSizeBytes: 200, retentionDays: 3650, latencySloMs: 100, consistency: 'strong' },
      nodes: [
        { id: 'app', label: 'Editor Client', type: 'web_app', layer: 'client', why: 'Edit documents in the browser.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth and route REST + WS.', redundant: true, stateful: false },
        { id: 'ws', label: 'Sync Service', type: 'websocket_server', layer: 'service', tech: 'Node', why: 'Realtime channel per document.', redundant: true, stateful: true },
        { id: 'collab', label: 'Merge Service', type: 'service', layer: 'service', tech: 'Rust', why: 'Resolve concurrent edits (CRDT/OT).', redundant: true, stateful: false },
        { id: 'docdb', label: 'Document Store', type: 'nosql_db', layer: 'data', tech: 'MongoDB', why: 'Store documents and revision history.', redundant: true, stateful: true },
        { id: 'cache', label: 'Active Doc Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Hold in-flight document state.', redundant: true, stateful: true },
        { id: 'bus', label: 'Ops Bus', type: 'event_bus', layer: 'async', tech: 'Redis Pub/Sub', why: 'Broadcast edit operations to peers.', redundant: true, stateful: true },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'REST + WS', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'ws', label: 'connect', protocol: 'sync', why: 'Open realtime channel.' },
        { id: 'e3', source: 'ws', target: 'collab', label: 'apply edit', protocol: 'sync', why: 'Merge concurrent ops.' },
        { id: 'e4', source: 'collab', target: 'cache', label: 'update state', protocol: 'sync', why: 'Fast in-flight state.' },
        { id: 'e5', source: 'collab', target: 'docdb', label: 'persist', protocol: 'sync', why: 'Durable document + history.' },
        { id: 'e6', source: 'collab', target: 'bus', label: 'publish op', protocol: 'async', why: 'Fan-out to other editors.' },
        { id: 'e7', source: 'bus', target: 'ws', label: 'deliver op', protocol: 'async', why: 'Push to connected peers.' },
      ],
      tradeoffs: [
        { decision: 'Conflict resolution', choice: 'CRDT / OT', alternative: 'Last-write-wins', why: 'Concurrent edits must merge without losing work.' },
        { decision: 'In-flight state', choice: 'Redis + periodic persist', alternative: 'Write every keystroke to DB', why: 'Keystroke-rate DB writes don\'t scale; snapshot to the store.' },
      ],
      notes: ['Sync service is stateful per document — route a document\'s editors to the same node.'],
    },
  },

  // ── RAG / LLM application ───────────────────────────────────────
  {
    meta: { title: 'RAG Chatbot', domain: 'rag-chatbot',
      keywords: ['rag', 'llm', 'chatbot', 'ai assistant', 'ai customer support', 'support assistant',
        'retrieval', 'retrieval augmented', 'embeddings', 'vector', 'semantic search',
        'knowledge base', 'help docs', 'question answering', 'copilot'] },
    arch: {
      system: { name: 'RAG Chatbot', summary: 'Answer questions grounded in a private knowledge base using retrieval-augmented generation.', domain: 'rag-chatbot', scale: 'medium' },
      assumptions: { dailyActiveUsers: 200_000, actionsPerUserPerDay: 15, readWriteRatio: 8, avgItemSizeBytes: 4_000, retentionDays: 365, latencySloMs: 3_000, consistency: 'eventual' },
      nodes: [
        { id: 'app', label: 'Chat UI', type: 'web_app', layer: 'client', why: 'Users ask questions.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Kong', why: 'Auth, rate-limit, route.', redundant: true, stateful: false },
        { id: 'chat', label: 'RAG Orchestrator', type: 'service', layer: 'service', tech: 'Python', why: 'Retrieve context, build prompt, call the model.', redundant: true, stateful: false },
        { id: 'cache', label: 'Response Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Cache repeated Q&A / embeddings.', redundant: true, stateful: true },
        { id: 'vecdb', label: 'Vector DB', type: 'vector_db', layer: 'ml', tech: 'pgvector', why: 'Semantic search over documents.', redundant: true, stateful: true },
        { id: 'llm', label: 'Model Serving', type: 'model_serving', layer: 'ml', tech: 'vLLM', why: 'Generate grounded answers.', redundant: true, stateful: false },
        { id: 'docs', label: 'Document Store', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Source knowledge-base files.', redundant: true, stateful: true },
        { id: 'queue', label: 'Ingest Queue', type: 'message_queue', layer: 'async', tech: 'SQS', why: 'Async document ingestion.', redundant: true, stateful: true },
        { id: 'worker', label: 'Ingest Worker', type: 'worker', layer: 'async', tech: 'Python', why: 'Chunk, embed and index documents.', redundant: true, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'ask', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'chat', label: 'query', protocol: 'sync', why: 'Handle the question.' },
        { id: 'e3', source: 'chat', target: 'cache', label: 'check cache', protocol: 'sync', why: 'Skip work on repeats.' },
        { id: 'e4', source: 'chat', target: 'vecdb', label: 'retrieve context', protocol: 'sync', why: 'Fetch relevant chunks.' },
        { id: 'e5', source: 'chat', target: 'llm', label: 'generate', protocol: 'sync', why: 'Produce the grounded answer.' },
        { id: 'e6', source: 'chat', target: 'queue', label: 'enqueue ingest', protocol: 'async', why: 'Index new documents off the hot path.' },
        { id: 'e7', source: 'queue', target: 'worker', label: 'consume', protocol: 'async', why: 'Process ingestion jobs.' },
        { id: 'e8', source: 'worker', target: 'docs', label: 'read source', protocol: 'async', why: 'Load documents to embed.' },
        { id: 'e9', source: 'worker', target: 'llm', label: 'embed', protocol: 'async', why: 'Compute embeddings.' },
        { id: 'e10', source: 'worker', target: 'vecdb', label: 'upsert vectors', protocol: 'async', why: 'Index for retrieval.' },
      ],
      tradeoffs: [
        { decision: 'Retrieval', choice: 'Vector DB + RAG', alternative: 'Fine-tuning', why: 'RAG keeps answers current and grounded without retraining.' },
        { decision: 'Ingestion', choice: 'Async worker', alternative: 'Embed on request', why: 'Chunking/embedding is heavy; do it offline so queries stay fast.' },
      ],
      notes: ['Cache embeddings and frequent answers; ground every answer in retrieved context to reduce hallucination.'],
    },
  },

  // ── File storage / sync ─────────────────────────────────────────
  {
    meta: { title: 'File Storage', domain: 'file-storage',
      keywords: ['file storage', 'dropbox', 'google drive', 'upload', 'sync', 'files', 'sharing', 'chunking', 'backup'] },
    arch: {
      system: { name: 'File Storage & Sync', summary: 'Upload, store, sync and share files across devices.', domain: 'file-storage', scale: 'large' },
      assumptions: { dailyActiveUsers: 4_000_000, actionsPerUserPerDay: 20, readWriteRatio: 10, avgItemSizeBytes: 5_000_000, retentionDays: 3650, latencySloMs: 400, consistency: 'strong' },
      nodes: [
        { id: 'app', label: 'Desktop / Mobile', type: 'desktop_app', layer: 'client', why: 'Upload and sync files.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth and route.', redundant: true, stateful: false },
        { id: 'meta', label: 'Metadata Service', type: 'service', layer: 'service', tech: 'Go', why: 'Namespace, versions, sharing.', redundant: true, stateful: false },
        { id: 'block', label: 'Block Service', type: 'service', layer: 'service', tech: 'Go', why: 'Chunk, dedupe and store file blocks.', redundant: true, stateful: false },
        { id: 'blob', label: 'Block Storage', type: 'blob_storage', layer: 'data', tech: 'S3', why: 'Durable file chunks.', redundant: true, stateful: true },
        { id: 'metadb', label: 'Metadata DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'File tree and versions, strongly consistent.', redundant: true, stateful: true },
        { id: 'cache', label: 'Metadata Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Hot metadata reads.', redundant: true, stateful: true },
        { id: 'queue', label: 'Change Queue', type: 'message_queue', layer: 'async', tech: 'Kafka', why: 'Propagate changes to other devices.', redundant: true, stateful: true },
        { id: 'notifier', label: 'Sync Notifier', type: 'worker', layer: 'async', tech: 'Go', why: 'Notify devices of updates.', redundant: true, stateful: false },
        { id: 'push', label: 'Push Service', type: 'push_service', layer: 'external', tech: 'FCM', why: 'Wake devices to sync.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'upload / sync', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'meta', label: 'metadata ops', protocol: 'sync', why: 'File tree operations.' },
        { id: 'e3', source: 'gw', target: 'block', label: 'block ops', protocol: 'sync', why: 'Upload/download chunks.' },
        { id: 'e4', source: 'block', target: 'blob', label: 'store blocks', protocol: 'sync', why: 'Durable chunk storage.' },
        { id: 'e5', source: 'meta', target: 'metadb', label: 'read/write', protocol: 'sync', why: 'Source of truth.' },
        { id: 'e6', source: 'meta', target: 'cache', label: 'hot reads', protocol: 'sync', why: 'Fast metadata.' },
        { id: 'e7', source: 'meta', target: 'queue', label: 'change event', protocol: 'async', why: 'Fan-out changes.' },
        { id: 'e8', source: 'queue', target: 'notifier', label: 'consume', protocol: 'async', why: 'Process sync events.' },
        { id: 'e9', source: 'notifier', target: 'push', label: 'notify devices', protocol: 'async', why: 'Trigger device sync.' },
      ],
      tradeoffs: [
        { decision: 'File storage', choice: 'Chunked blocks + dedupe in object storage', alternative: 'Whole files in a DB', why: 'Chunking enables dedupe, delta sync and cheap durable storage.' },
        { decision: 'Metadata', choice: 'Strongly-consistent SQL', alternative: 'Eventual NoSQL', why: 'File-tree operations need consistency to avoid conflicts.' },
      ],
      notes: ['Separate metadata (small, consistent) from block storage (large, cheap).'],
    },
  },

  // ── Fintech / digital wallet / banking ──────────────────────────
  {
    meta: { title: 'Digital Wallet / Banking', domain: 'fintech',
      keywords: ['bank', 'banking', 'wallet', 'fintech', 'ledger', 'transfer', 'transfers', 'account', 'accounts', 'fraud', 'transaction', 'money', 'payments'] },
    arch: {
      system: { name: 'Digital Wallet', summary: 'Hold balances, move money between accounts, detect fraud — with strong consistency.', domain: 'fintech', scale: 'large' },
      assumptions: { dailyActiveUsers: 5_000_000, actionsPerUserPerDay: 8, readWriteRatio: 4, avgItemSizeBytes: 400, retentionDays: 3650, latencySloMs: 200, consistency: 'strong' },
      nodes: [
        { id: 'app', label: 'Banking App', type: 'mobile_app', layer: 'client', why: 'Check balance, transfer money.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Kong', why: 'Auth, rate-limit, route.', redundant: true, stateful: false },
        { id: 'auth', label: 'Auth Service', type: 'auth_service', layer: 'security', tech: 'OAuth2 + MFA', why: 'Strong auth for financial access.', redundant: true, stateful: false },
        { id: 'account', label: 'Account Service', type: 'service', layer: 'service', tech: 'Java', why: 'Balances and account state.', redundant: true, stateful: false },
        { id: 'transfer', label: 'Transfer Service', type: 'service', layer: 'service', tech: 'Java', why: 'Move money atomically between accounts.', redundant: true, stateful: false },
        { id: 'fraud', label: 'Fraud Service', type: 'service', layer: 'service', tech: 'Python', why: 'Score transactions for fraud in near-real-time.', redundant: true, stateful: false },
        { id: 'accountdb', label: 'Account DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'Balances with strong consistency.', redundant: true, stateful: true },
        { id: 'ledger', label: 'Ledger', type: 'ledger_db', layer: 'data', tech: 'QLDB', why: 'Immutable, auditable record of every transaction.', redundant: true, stateful: true },
        { id: 'cache', label: 'Balance Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Fast balance reads.', redundant: true, stateful: true },
        { id: 'stream', label: 'Transaction Stream', type: 'stream_processor', layer: 'async', tech: 'Kafka + Flink', why: 'Feed transactions to fraud detection.', redundant: true, stateful: true },
        { id: 'notify', label: 'Alerts', type: 'push_service', layer: 'external', tech: 'FCM', why: 'Notify users of transactions/fraud.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'requests', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'auth', label: 'authenticate', protocol: 'sync', why: 'Auth boundary.' },
        { id: 'e3', source: 'gw', target: 'account', label: 'balance ops', protocol: 'sync', why: 'Account reads/writes.' },
        { id: 'e4', source: 'gw', target: 'transfer', label: 'transfer', protocol: 'sync', why: 'Money movement.' },
        { id: 'e5', source: 'account', target: 'accountdb', label: 'read/write', protocol: 'sync', why: 'Source of truth.' },
        { id: 'e6', source: 'account', target: 'cache', label: 'balance cache', protocol: 'sync', why: 'Hot reads.' },
        { id: 'e7', source: 'transfer', target: 'accountdb', label: 'debit/credit', protocol: 'sync', why: 'Atomic balance update.' },
        { id: 'e8', source: 'transfer', target: 'ledger', label: 'record entry', protocol: 'sync', why: 'Immutable audit trail.' },
        { id: 'e9', source: 'transfer', target: 'stream', label: 'publish txn', protocol: 'stream', why: 'Stream for fraud analysis.' },
        { id: 'e10', source: 'stream', target: 'fraud', label: 'score', protocol: 'async', why: 'Near-real-time fraud detection.' },
        { id: 'e11', source: 'fraud', target: 'notify', label: 'alert', protocol: 'async', why: 'Warn on suspicious activity.' },
      ],
      tradeoffs: [
        { decision: 'Consistency', choice: 'Strong (PostgreSQL)', alternative: 'Eventual', why: 'Money must never be double-spent or lost.' },
        { decision: 'Audit', choice: 'Immutable ledger', alternative: 'Mutable table', why: 'Financial records must be append-only and auditable.' },
        { decision: 'Fraud', choice: 'Stream processing', alternative: 'Nightly batch', why: 'Fraud must be caught before settlement, not after.' },
      ],
      notes: ['Transfers are atomic and idempotent.', 'Every movement is written to the immutable ledger.'],
    },
  },

  // ── Food delivery (orders + geo) ────────────────────────────────
  {
    meta: { title: 'Food Delivery', domain: 'food-delivery',
      keywords: ['food delivery', 'restaurant', 'restaurants', 'order', 'orders', 'delivery', 'courier', 'doordash', 'swiggy', 'zomato', 'ubereats', 'menu'] },
    arch: {
      system: { name: 'Food Delivery', summary: 'Browse restaurants, order food, pay, and track delivery in real time.', domain: 'food-delivery', scale: 'large' },
      assumptions: { dailyActiveUsers: 3_000_000, actionsPerUserPerDay: 15, readWriteRatio: 15, avgItemSizeBytes: 1_500, retentionDays: 1825, latencySloMs: 250, consistency: 'strong' },
      nodes: [
        { id: 'app', label: 'Customer App', type: 'mobile_app', layer: 'client', why: 'Browse, order, track.', redundant: true, stateful: false },
        { id: 'gw', label: 'API Gateway', type: 'api_gateway', layer: 'gateway', tech: 'Envoy', why: 'Auth, rate-limit, route.', redundant: true, stateful: false },
        { id: 'restaurant', label: 'Restaurant Service', type: 'service', layer: 'service', tech: 'Go', why: 'Listings, menus, availability.', redundant: true, stateful: false },
        { id: 'order', label: 'Order Service', type: 'service', layer: 'service', tech: 'Java', why: 'Place and manage orders.', redundant: true, stateful: false },
        { id: 'delivery', label: 'Delivery Service', type: 'service', layer: 'service', tech: 'Go', why: 'Assign couriers and track delivery.', redundant: true, stateful: false },
        { id: 'search', label: 'Search Index', type: 'search_index', layer: 'data', tech: 'Elasticsearch', why: 'Restaurant/dish search.', redundant: true, stateful: true },
        { id: 'menucache', label: 'Menu Cache', type: 'cache', layer: 'data', tech: 'Redis', why: 'Hot menu reads.', redundant: true, stateful: true },
        { id: 'orderdb', label: 'Order DB', type: 'sql_db', layer: 'data', tech: 'PostgreSQL', why: 'Orders with strong consistency.', redundant: true, stateful: true },
        { id: 'geocache', label: 'Courier Geo Index', type: 'cache', layer: 'data', tech: 'Redis (geohash)', why: 'Live courier positions for assignment/tracking.', redundant: true, stateful: true },
        { id: 'queue', label: 'Order Events', type: 'message_queue', layer: 'async', tech: 'Kafka', why: 'Async fulfilment and notifications.', redundant: true, stateful: true },
        { id: 'worker', label: 'Fulfilment Worker', type: 'worker', layer: 'async', tech: 'Go', why: 'Progress orders, notify customers.', redundant: true, stateful: false },
        { id: 'pay', label: 'Payment Gateway', type: 'payment_gateway', layer: 'external', tech: 'Stripe', why: 'Charge for orders.', redundant: false, stateful: false },
        { id: 'maps', label: 'Maps / ETA', type: 'maps_service', layer: 'external', tech: 'Google Maps', why: 'Courier routing and ETA.', redundant: false, stateful: false },
        { id: 'push', label: 'Push Notifications', type: 'push_service', layer: 'external', tech: 'FCM', why: 'Order status updates.', redundant: false, stateful: false },
      ],
      edges: [
        { id: 'e1', source: 'app', target: 'gw', label: 'requests', protocol: 'sync', why: 'Client entry.' },
        { id: 'e2', source: 'gw', target: 'restaurant', label: 'browse', protocol: 'sync', why: 'Restaurant reads.' },
        { id: 'e3', source: 'gw', target: 'order', label: 'place order', protocol: 'sync', why: 'Order writes.' },
        { id: 'e4', source: 'gw', target: 'delivery', label: 'track', protocol: 'sync', why: 'Delivery tracking.' },
        { id: 'e5', source: 'restaurant', target: 'search', label: 'query', protocol: 'sync', why: 'Dedicated search.' },
        { id: 'e6', source: 'restaurant', target: 'menucache', label: 'read menu', protocol: 'sync', why: 'Hot reads.' },
        { id: 'e7', source: 'order', target: 'orderdb', label: 'read/write', protocol: 'sync', why: 'Order source of truth.' },
        { id: 'e8', source: 'order', target: 'pay', label: 'charge', protocol: 'sync', why: 'Payment authorization.' },
        { id: 'e9', source: 'order', target: 'queue', label: 'order placed', protocol: 'async', why: 'Async fulfilment.' },
        { id: 'e10', source: 'queue', target: 'worker', label: 'consume', protocol: 'async', why: 'Process fulfilment.' },
        { id: 'e11', source: 'worker', target: 'push', label: 'status update', protocol: 'async', why: 'Notify customer.' },
        { id: 'e12', source: 'delivery', target: 'geocache', label: 'courier positions', protocol: 'sync', why: 'Assign nearest courier / live track.' },
        { id: 'e13', source: 'delivery', target: 'maps', label: 'route / ETA', protocol: 'sync', why: 'External routing.' },
      ],
      tradeoffs: [
        { decision: 'Order consistency', choice: 'Strong SQL', alternative: 'Eventual NoSQL', why: 'Orders and payments need consistency.' },
        { decision: 'Courier tracking', choice: 'Geohash cache', alternative: 'Query DB per update', why: 'Live positions update constantly — keep them in-memory.' },
        { decision: 'Notifications', choice: 'Queue + worker', alternative: 'Synchronous', why: 'Don\'t block orders on push delivery.' },
      ],
      notes: ['Combines commerce (orders/payments) with geo (live courier tracking).'],
    },
  },
];

/** Core canon plus the extended domain set — grounding is the biggest
 *  accuracy lever, and it is pure data. */
export const LIBRARY = [...CORE, ...EXTENDED];

export default LIBRARY;
