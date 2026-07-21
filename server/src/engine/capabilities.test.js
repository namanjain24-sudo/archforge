import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCapabilityIds, capabilitiesOfArch, capabilityRequirements } from './capabilities.js';

test('detects requested capabilities from a prompt', () => {
  const caps = detectCapabilityIds('a shop with checkout, payments, product search and analytics dashboards');
  assert.ok(caps.includes('payments'));
  assert.ok(caps.includes('search'));
  assert.ok(caps.includes('analytics'));
});

test('word-boundary avoids false capability hits', () => {
  // "email" → notifications, but "females" must not trigger it
  const caps = detectCapabilityIds('a directory of females and males');
  assert.ok(!caps.includes('notifications'));
});

test('derives capabilities an architecture provides from its node types', () => {
  const arch = {
    nodes: [
      { type: 'payment_gateway' }, { type: 'search_index' },
      { type: 'model_serving' }, { type: 'service' },
    ],
  };
  const caps = capabilitiesOfArch(arch);
  assert.ok(caps.has('payments'));
  assert.ok(caps.has('search'));
  assert.ok(caps.has('ml'));
  assert.ok(!caps.has('geo'));
});

test('capabilityRequirements lists the node types that satisfy each requested capability', () => {
  const reqs = capabilityRequirements('telemedicine video calls with real-time presence');
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));
  // realtime maps to concrete types the model must include
  assert.ok(byId.realtime, 'realtime should be required');
  assert.ok(byId.realtime.types.includes('websocket_server'));
  // every requirement carries at least one node type (no empty structural asks)
  assert.ok(reqs.every((r) => r.types.length > 0));
});

test('capabilityRequirements is empty for a prompt with no specific capability', () => {
  assert.equal(capabilityRequirements('a simple url shortener').length, 0);
});

test('every capabilityRequirements entry is checkable by the verifier coverage map', () => {
  // The prompt nudge and the verifier must read the SAME source: any type the
  // nudge lists must be one capabilitiesOfArch would credit.
  const reqs = capabilityRequirements('payments, search, analytics, notifications, video upload');
  for (const r of reqs) {
    const arch = { nodes: [{ type: r.types[0] }] };
    assert.ok(capabilitiesOfArch(arch).has(r.id), `${r.id} via ${r.types[0]} should satisfy coverage`);
  }
});

// ── Vocabulary audit ───────────────────────────────────────────────────────
// Detection drives both the prompt nudge and the verifier's coverage check, so
// a missed phrasing silently costs a whole component. These two tables pin the
// vocabulary in BOTH directions: real wording must fire, generic engineering
// words must not.

const SHOULD_FIRE = [
  ['order placement', 'payments'], ['orders', 'payments'], ['marketplace', 'payments'],
  ['invoicing', 'payments'], ['refunds', 'payments'], ['escrow', 'payments'],
  ['courier dispatch', 'geo'], ['live eta', 'geo'], ['delivery tracking', 'geo'],
  ['route optimisation', 'geo'], ['route optimization', 'geo'], ['driver dispatch', 'geo'],
  ['nearby restaurants', 'geo'], ['shipment tracking', 'geo'],
  ['merchant catalogues', 'search'], ['product catalog', 'search'],
  ['browse listings', 'search'], ['filtering and facets', 'search'],
  ['collaborative editing', 'realtime'], ['live updates', 'realtime'], ['presence', 'realtime'],
  ['dashboards', 'analytics'], ['reporting', 'analytics'], ['clickstream', 'analytics'],
  ['push notifications', 'notifications'], ['email alerts', 'notifications'], ['sms otp', 'notifications'],
  ['photo uploads', 'media'], ['video transcoding', 'media'], ['audio streaming', 'media'],
  ['recommendations', 'ml'], ['fraud detection', 'ml'], ['semantic search', 'ml'],
  ['single sign-on', 'auth'], ['role-based access', 'auth'], ['user accounts', 'auth'],
];

const SHOULD_NOT_FIRE = [
  ['a chat app with delivery receipts and read status', 'geo'],
  ['an API gateway that handles request routing', 'geo'],
  ['a service using a postgres database driver', 'geo'],
  ['an event dispatch system for internal services', 'geo'],
  ['a blog with posts sorted in reverse chronological order', 'payments'],
  ['a flashcard study app', 'payments'],
  ['a simple todo list app', 'payments'],
  ['a URL shortener', 'payments'],
  ['a data model for user profiles', 'ml'],
  ['a static documentation site', 'search'],
];

test('every realistic phrasing maps to its capability', () => {
  const missed = SHOULD_FIRE.filter(([phrase, cap]) => !detectCapabilityIds(phrase).includes(cap));
  assert.deepEqual(missed, [], `missed phrasings: ${missed.map(([p, c]) => `"${p}"→${c}`).join(', ')}`);
});

test('generic engineering wording never triggers a domain capability', () => {
  const fired = SHOULD_NOT_FIRE.filter(([phrase, cap]) => detectCapabilityIds(phrase).includes(cap));
  assert.deepEqual(fired, [], `false positives: ${fired.map(([p, c]) => `"${p}"→${c}`).join(', ')}`);
});

test('singular keywords still match natural plurals', () => {
  assert.ok(detectCapabilityIds('dashboards').includes('analytics'));
  assert.ok(detectCapabilityIds('alerts').includes('notifications'));
  assert.ok(detectCapabilityIds('listings').includes('search'));
});
