import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from './json.js';

test('parses clean JSON', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});

test('strips code fences', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
});

test('ignores prose preamble around the object', () => {
  assert.deepEqual(extractJson('Here you go:\n{"a":1}\nHope that helps!'), { a: 1 });
});

test('fixes trailing commas', () => {
  assert.deepEqual(extractJson('{"a":1,"b":[1,2,],}'), { a: 1, b: [1, 2] });
});

test('jsonrepair fixes single quotes and unquoted keys', () => {
  assert.deepEqual(extractJson("{ name: 'x', n: 2 }"), { name: 'x', n: 2 });
});

test('throws on genuinely empty output', () => {
  assert.throws(() => extractJson('sorry, no json here'));
});
