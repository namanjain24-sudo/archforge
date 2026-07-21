import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, reset, clientIp, limitModelUse } from './rateLimit.js';

test('allows requests up to the per-minute burst, then blocks', () => {
  reset();
  const now = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 3);
  for (let i = 0; i < max; i++) {
    assert.equal(check('1.1.1.1', now).allowed, true, `request ${i + 1} should pass`);
  }
  const blocked = check('1.1.1.1', now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.scope, 'burst');
  assert.ok(blocked.retryAfterSec > 0 && blocked.retryAfterSec <= 60);
});

test('the window slides — the same IP is allowed again later', () => {
  reset();
  const t0 = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 3);
  for (let i = 0; i < max; i++) check('2.2.2.2', t0);
  assert.equal(check('2.2.2.2', t0).allowed, false);
  assert.equal(check('2.2.2.2', t0 + 61_000).allowed, true, 'allowed once the minute has passed');
});

test('limits are per IP, not global', () => {
  reset();
  const now = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 3);
  for (let i = 0; i < max; i++) check('3.3.3.3', now);
  assert.equal(check('3.3.3.3', now).allowed, false);
  assert.equal(check('4.4.4.4', now).allowed, true, 'a different visitor is unaffected');
});

test('a caller supplying their own key is never throttled', () => {
  reset();
  const now = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 3);
  for (let i = 0; i < max + 5; i++) check('5.5.5.5', now); // exhaust the shared allowance

  let nexted = 0;
  const req = { body: { apiKey: 'gsk_theirown' }, headers: { 'x-forwarded-for': '5.5.5.5' }, socket: {} };
  const res = { set() {}, status() { throw new Error('must not reject a BYO-key request'); } };
  limitModelUse(req, res, () => { nexted++; });
  assert.equal(nexted, 1, 'BYO-key requests pass straight through');
});

test('a throttled request returns 429 with Retry-After and actionable copy', () => {
  reset();
  const now = Date.now();
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 3);
  for (let i = 0; i < max; i++) check('6.6.6.6', now);

  let status = 0, body = null, headers = {};
  const req = { body: {}, headers: { 'x-forwarded-for': '6.6.6.6' }, socket: {} };
  const res = {
    set(k, v) { headers[k] = v; },
    status(s) { status = s; return { json(b) { body = b; } }; },
  };
  limitModelUse(req, res, () => { throw new Error('should not have called next()'); });
  assert.equal(status, 429);
  assert.ok(headers['Retry-After'], 'sets Retry-After');
  assert.match(body.error, /own .*api key/i, 'tells the user how to remove the limit');
});

test('clientIp prefers the proxy header', () => {
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }, socket: {} }), '9.9.9.9');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '8.8.8.8' } }), '8.8.8.8');
});
