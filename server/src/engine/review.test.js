import { test } from 'node:test';
import assert from 'node:assert/strict';
import { review } from './review.js';

test('rolls findings into 6 pillars and ignores auto-fixed ones', () => {
  const { overall, pillars } = review([
    { id: 'a', title: 'A', severity: 'error', pillar: 'security', message: 'm', fixed: false },
    { id: 'b', title: 'B', severity: 'warning', pillar: 'performance', message: 'm', fixed: false },
    { id: 'c', title: 'C', severity: 'error', pillar: 'reliability', message: 'm', fixed: true }, // fixed → ignored
  ]);
  assert.equal(pillars.length, 6);
  assert.equal(pillars.find((p) => p.pillar === 'security').score, 75);   // -25
  assert.equal(pillars.find((p) => p.pillar === 'performance').score, 90); // -10
  assert.equal(pillars.find((p) => p.pillar === 'reliability').score, 100); // fixed ignored
  assert.equal(pillars.find((p) => p.pillar === 'sustainability').score, 100);
  assert.ok(overall > 90 && overall < 100);
});
