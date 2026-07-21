/**
 * Abuse protection for the model-backed endpoints.
 * -------------------------------------------------
 * The shared free keys are a fixed daily budget (~60 diagrams/day across ALL
 * visitors), so an unthrottled /api/generate is one loop away from being empty.
 * This is a dependency-free sliding-window limiter keyed by client IP.
 *
 * Two deliberate design points:
 *   - A request carrying the caller's OWN api key is never limited. They are
 *     spending their own budget, so throttling them protects nothing.
 *   - State is in-memory. On a serverless host each instance keeps its own
 *     window, so this is a best-effort brake rather than a hard global quota —
 *     which is exactly the right trade for a free-tier demo (no database, no
 *     cost). The real backstop is the daily provider budget itself.
 */

const WINDOWS = [
  { name: 'burst', ms: 60_000, max: Number(process.env.RATE_LIMIT_PER_MIN || 3) },
  { name: 'hourly', ms: 60 * 60_000, max: Number(process.env.RATE_LIMIT_PER_HOUR || 15) },
  { name: 'daily', ms: 24 * 60 * 60_000, max: Number(process.env.RATE_LIMIT_PER_DAY || 40) },
];

/** ip → array of request timestamps (ms). Pruned as it is read. */
const hits = new Map();
let lastSweep = Date.now();
const LONGEST = Math.max(...WINDOWS.map((w) => w.ms));

/** Drop IPs that have gone quiet so the map cannot grow without bound. */
function sweep(now) {
  if (now - lastSweep < 10 * 60_000) return;
  lastSweep = now;
  for (const [ip, stamps] of hits) {
    const live = stamps.filter((t) => now - t < LONGEST);
    if (live.length) hits.set(ip, live); else hits.delete(ip);
  }
}

/** Best-effort client address, honouring the proxy header hosts set. */
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * @returns {{ allowed: boolean, retryAfterSec?: number, scope?: string }}
 */
export function check(ip, now = Date.now()) {
  sweep(now);
  const stamps = (hits.get(ip) || []).filter((t) => now - t < LONGEST);
  for (const w of WINDOWS) {
    const inWindow = stamps.filter((t) => now - t < w.ms);
    if (inWindow.length >= w.max) {
      const oldest = Math.min(...inWindow);
      return { allowed: false, scope: w.name, retryAfterSec: Math.max(1, Math.ceil((w.ms - (now - oldest)) / 1000)) };
    }
  }
  stamps.push(now);
  hits.set(ip, stamps);
  return { allowed: true };
}

/** Test seam. */
export function reset() { hits.clear(); lastSweep = Date.now(); }

/**
 * Express middleware for the endpoints that cost tokens. Callers supplying
 * their own key bypass it entirely.
 */
export function limitModelUse(req, res, next) {
  if (process.env.RATE_LIMIT_DISABLED === '1') return next();
  const byoKey = (req.body?.apiKey || '').toString().trim();
  if (byoKey) return next(); // spending their own budget

  const { allowed, retryAfterSec, scope } = check(clientIp(req));
  if (allowed) return next();

  res.set('Retry-After', String(retryAfterSec));
  return res.status(429).json({
    error: `You have hit the ${scope} limit for this shared demo. Try again in ${
      retryAfterSec >= 60 ? `${Math.ceil(retryAfterSec / 60)} min` : `${retryAfterSec}s`
    }, or add your own free API key to remove the limit entirely.`,
    retryAfterSec,
  });
}
