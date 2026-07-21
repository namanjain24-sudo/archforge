import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCapacity } from './capacity.js';

test('computes QPS, storage and server count deterministically', () => {
  const { raw, metrics } = estimateCapacity({
    dailyActiveUsers: 1_000_000, actionsPerUserPerDay: 10, readWriteRatio: 9,
    avgItemSizeBytes: 1_000, retentionDays: 100, latencySloMs: 200, consistency: 'eventual',
  });
  // 10,000,000 actions/day ÷ 86,400 ≈ 115.7 avg QPS
  assert.ok(Math.abs(raw.avgQps - 115.74) < 0.5);
  assert.ok(Math.abs(raw.peakQps - raw.avgQps * 3) < 0.001);
  // write fraction 1/10 → 1,000,000 writes/day → 1e9 B/day → 1e11 B total
  assert.ok(Math.abs(raw.totalStorageBytes - 1e11) < 1e6);
  assert.equal(raw.appServers, 2); // low QPS floors at 2 for redundancy
  assert.equal(metrics.length, 8);
});

test('scales server count with peak QPS', () => {
  const { raw } = estimateCapacity({
    dailyActiveUsers: 500_000_000, actionsPerUserPerDay: 50, readWriteRatio: 5,
    avgItemSizeBytes: 500, retentionDays: 365, latencySloMs: 100, consistency: 'eventual',
  });
  assert.ok(raw.appServers > 100, `expected many servers, got ${raw.appServers}`);
});
