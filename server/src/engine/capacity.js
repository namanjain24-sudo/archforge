/**
 * Capacity estimator — deterministic back-of-the-envelope math.
 * -------------------------------------------------------------
 * Turns the design's assumptions into the numbers a system-design interview
 * would compute: QPS (avg + peak), read/write split, storage growth and total,
 * egress bandwidth, cache working set, and a rough server count. Pure arithmetic
 * — no model involved, so these numbers are exact and reproducible.
 *
 * Formulas follow the standard canon:
 *   avg QPS  = DAU × actions/user/day ÷ 86,400
 *   peak QPS = avg × PEAK_FACTOR (traffic is bursty)
 *   writes   = actions ÷ (readWriteRatio + 1)   (ratio = reads per write)
 *   storage  = writes/day × item size × retention
 *   cache    = ~20% of the daily read working set
 */

const SECONDS_PER_DAY = 86_400;
const PEAK_FACTOR = 3;             // peak is ~3× average
const SERVER_QPS = 1_000;          // sustainable QPS per commodity app instance

const KB = 1_024, MB = KB * 1_024, GB = MB * 1_024, TB = GB * 1_024, PB = TB * 1_024;

function humanCount(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function humanBytes(n) {
  if (n >= PB) return `${(n / PB).toFixed(1)} PB`;
  if (n >= TB) return `${(n / TB).toFixed(1)} TB`;
  if (n >= GB) return `${(n / GB).toFixed(1)} GB`;
  if (n >= MB) return `${(n / MB).toFixed(1)} MB`;
  if (n >= KB) return `${(n / KB).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

function humanQps(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M/s`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K/s`;
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}/s`;
}

/**
 * @param {object} assumptions  from the architecture (already defaulted)
 * @returns a structured estimate with raw numbers and display strings.
 */
export function estimateCapacity(assumptions) {
  const {
    dailyActiveUsers: dau,
    actionsPerUserPerDay: actions,
    readWriteRatio: rw,
    avgItemSizeBytes: itemSize,
    retentionDays: retention,
  } = assumptions;

  const actionsPerDay = dau * actions;
  const avgQps = actionsPerDay / SECONDS_PER_DAY;
  const peakQps = avgQps * PEAK_FACTOR;

  const writeFraction = 1 / (rw + 1);
  const writeQps = avgQps * writeFraction;
  const readQps = avgQps - writeQps;

  const writesPerDay = actionsPerDay * writeFraction;
  const readsPerDay = actionsPerDay - writesPerDay;

  const storagePerDayBytes = writesPerDay * itemSize;
  const totalStorageBytes = storagePerDayBytes * retention;

  const bandwidthOutBps = readQps * itemSize;                 // bytes/sec served on reads
  const cacheBytes = 0.2 * readsPerDay * itemSize;            // ~20% hot working set
  const appServers = Math.max(2, Math.ceil(peakQps / SERVER_QPS)); // ≥2 for redundancy

  const raw = {
    avgQps, peakQps, readQps, writeQps,
    storagePerDayBytes, totalStorageBytes, bandwidthOutBps, cacheBytes, appServers,
  };

  return {
    raw,
    // Display-ready metrics for the insights panel.
    metrics: [
      { label: 'Average QPS',      value: humanQps(avgQps),   hint: `${humanCount(dau)} DAU × ${actions} actions/day` },
      { label: 'Peak QPS',         value: humanQps(peakQps),  hint: `${PEAK_FACTOR}× average (bursty traffic)` },
      { label: 'Read : Write',     value: `${humanQps(readQps)} : ${humanQps(writeQps)}`, hint: `${rw}:1 ratio` },
      { label: 'New data / day',   value: humanBytes(storagePerDayBytes), hint: `${humanCount(writesPerDay)} writes × ${humanBytes(itemSize)}` },
      { label: 'Total storage',    value: humanBytes(totalStorageBytes), hint: `over ${retention}-day retention` },
      { label: 'Read bandwidth',   value: `${humanBytes(bandwidthOutBps)}/s`, hint: 'egress on reads' },
      { label: 'Cache working set', value: humanBytes(cacheBytes), hint: '~20% of daily reads' },
      { label: 'App instances',    value: `~${appServers}`, hint: `peak ÷ ${SERVER_QPS} QPS/instance` },
    ],
  };
}

export { humanBytes, humanCount, humanQps, PEAK_FACTOR, SERVER_QPS };
