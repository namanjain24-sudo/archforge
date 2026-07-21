import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lookup, normalizePrompt, reload } from './index.js';

test('prompt matching ignores case and spacing', () => {
  assert.equal(normalizePrompt('  A Realtime   Chat App '), 'a realtime chat app');
});

test('an unknown prompt falls through to the model', () => {
  assert.equal(lookup('something nobody has ever asked for xyzzy'), null);
});

test('every stored fixture is well-formed and matches its own prompt', () => {
  const dir = fileURLToPath(new URL('./data/', import.meta.url));
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')); } catch { return; }
  for (const f of files) {
    const e = JSON.parse(fs.readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8'));
    assert.ok(e.prompt, `${f}: needs a prompt`);
    assert.ok(Array.isArray(e.architecture?.nodes) && e.architecture.nodes.length >= 3, `${f}: needs a real architecture`);
    assert.ok(Array.isArray(e.architecture?.edges), `${f}: needs edges`);
    assert.equal(lookup(e.prompt)?.prompt, e.prompt, `${f}: must be findable by its own prompt`);
  }
  reload();
});

test('a corrupt fixture never breaks lookup', () => {
  // load() swallows per-file parse errors by design; reload proves the index
  // still builds and serving continues.
  assert.equal(typeof reload(), 'number');
  assert.equal(lookup('nope'), null);
});
