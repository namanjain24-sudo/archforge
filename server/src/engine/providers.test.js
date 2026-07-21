import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectProviderFromKey, makeProvider, byoProviderFromKey, withKeyRotation, isRateLimited } from './providers.js';

const rateLimit = () => Object.assign(new Error('HTTP 429 Too Many Requests'), { status: 429 });

test('detectProviderFromKey maps key prefixes to vendors', () => {
  assert.equal(detectProviderFromKey('gsk_abc123'), 'groq');
  assert.equal(detectProviderFromKey('csk-abc123'), 'cerebras');
  assert.equal(detectProviderFromKey('csk_abc123'), 'cerebras');
  assert.equal(detectProviderFromKey('sk-ant-abc'), 'anthropic');
  assert.equal(detectProviderFromKey('AIzaSyABC'), 'gemini');
  assert.equal(detectProviderFromKey('AQ.Ab8RN6xyz'), 'gemini');
  assert.equal(detectProviderFromKey('totally-unknown'), null);
  assert.equal(detectProviderFromKey(''), null);
});

test('makeProvider builds a working provider object for each vendor', () => {
  for (const [vendor, expected] of [['groq', 'groq(byok)'], ['cerebras', 'cerebras(byok)'], ['gemini', 'gemini(byok)'], ['anthropic', 'anthropic(byok)']]) {
    const p = makeProvider(vendor, 'test-key');
    assert.ok(p, `${vendor} provider should build`);
    assert.equal(p.name, expected);
    assert.equal(typeof p.complete, 'function');
  }
  assert.equal(makeProvider('nope', 'k'), null, 'unknown vendor → null');
  assert.equal(makeProvider('groq', ''), null, 'empty key → null');
});

test('byoProviderFromKey auto-detects the vendor from the key', () => {
  assert.equal(byoProviderFromKey('gsk_x').name, 'groq(byok)');
  assert.equal(byoProviderFromKey('csk-x').name, 'cerebras(byok)');
  assert.equal(byoProviderFromKey('AQ.Ab8x').name, 'gemini(byok)');
  assert.equal(byoProviderFromKey('mystery'), null);
  // an explicit hint overrides detection
  assert.equal(byoProviderFromKey('anything', 'cerebras').name, 'cerebras(byok)');
});

test('isRateLimited recognizes 429 by status or message', () => {
  assert.equal(isRateLimited(Object.assign(new Error('x'), { status: 429 })), true);
  assert.equal(isRateLimited(new Error('HTTP 429 Too Many Requests')), true);
  assert.equal(isRateLimited(new Error('HTTP 500 boom')), false);
  assert.equal(isRateLimited(null), false);
});

test('withKeyRotation moves to the next key on a rate-limit and succeeds', async () => {
  const tried = [];
  const out = await withKeyRotation(['k1', 'k2', 'k3'], 0, async (key) => {
    tried.push(key);
    if (key !== 'k3') throw rateLimit(); // k1, k2 rate-limited; k3 works
    return 'ok';
  });
  assert.equal(out, 'ok');
  assert.deepEqual(tried, ['k1', 'k2', 'k3']);
});

test('withKeyRotation throws immediately on a non-rate-limit error (no key burning)', async () => {
  const tried = [];
  await assert.rejects(
    withKeyRotation(['k1', 'k2'], 0, async (key) => { tried.push(key); throw new Error('HTTP 401 bad key'); }),
    /401/,
  );
  assert.deepEqual(tried, ['k1'], 'should not try k2 on a real error');
});

test('withKeyRotation throws the last error when every key is rate-limited', async () => {
  await assert.rejects(
    withKeyRotation(['k1', 'k2'], 0, async () => { throw rateLimit(); }),
    /429/,
  );
});

test('withKeyRotation honors the rotating start offset', async () => {
  const tried = [];
  await withKeyRotation(['a', 'b', 'c'], 1, async (key) => { tried.push(key); return key; });
  assert.equal(tried[0], 'b', 'should start at index 1');
});
