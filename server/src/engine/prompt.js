/**
 * Prompt builder.
 * ---------------
 * Teaches the model the finite vocabulary, the call-rules and the core
 * principles up-front so the *base* output is already sound — then the
 * deterministic verifier guarantees the rules. Few-shot reference
 * architectures (from the golden library) ground the model in real designs.
 */

import {
  NODE_TYPES, LAYERS, PROTOCOLS, PRINCIPLES,
  ALLOWED_LAYER_EDGES, FORBIDDEN_LAYER_EDGES,
} from '../contracts/index.js';
import { capabilityRequirements } from './capabilities.js';

function nodeTypeCatalog() {
  // Group types by layer for a compact, readable menu.
  const byLayer = {};
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    (byLayer[def.layer] ??= []).push(type);
  }
  return Object.entries(LAYERS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([layer, meta]) => `  ${layer} (${meta.label}): ${(byLayer[layer] || []).join(', ')}`)
    .join('\n');
}

function callRulesText() {
  const allow = Object.entries(ALLOWED_LAYER_EDGES)
    .filter(([, tos]) => tos.length)
    .map(([from, tos]) => `  ${from} → ${tos.join(', ')}`)
    .join('\n');
  const forbid = FORBIDDEN_LAYER_EDGES.map(([a, b]) => `${a}→${b}`).join(', ');
  return `ALLOWED connections (source layer → target layer):\n${allow}\n\nNEVER create these connections: ${forbid}.`;
}

function principlesText() {
  return PRINCIPLES
    .filter((p) => p.severity !== 'info')
    .map((p) => `  - ${p.title}: ${p.message}`)
    .join('\n');
}

const PROTOCOL_HELP = Object.entries(PROTOCOLS)
  .map(([id, m]) => `${id} (${m.label})`).join(', ');

/**
 * Compact a reference to the structural skeleton the model needs for grounding
 * — ids, labels, types, layers, tech and wiring — dropping prose fields (`why`,
 * `tradeoffs`, `notes`, `assumptions`) that roughly double the token cost with
 * little grounding value. Halving the few-shot footprint keeps generation
 * within free-tier token-per-minute budgets, which is why the model stayed
 * reliable under load.
 */
function compactReference(r) {
  return {
    system: { name: r.system?.name, domain: r.system?.domain, scale: r.system?.scale },
    nodes: (r.nodes || []).map((n) => ({
      id: n.id, label: n.label, type: n.type, layer: n.layer,
      ...(n.tech ? { tech: n.tech } : {}), ...(n.redundant ? { redundant: true } : {}),
    })),
    edges: (r.edges || []).map((e) => ({ source: e.source, target: e.target, protocol: e.protocol, label: e.label })),
  };
}

/**
 * The system prompt. Stable across a request (good for prompt caching) except
 * for the injected few-shot references.
 * @param {object[]} references  golden reference architectures to show as examples
 */
export function buildSystemPrompt(references = []) {
  const examples = references.length
    ? `\n\nREFERENCE ARCHITECTURES (proven designs for similar problems — adapt, do not copy blindly):\n${
        references.map((r, i) => `Example ${i + 1} — ${r.system?.name}:\n${JSON.stringify(compactReference(r), null, 0)}`).join('\n\n')
      }`
    : '';

  return `You are ArchForge, a principal engineer who designs the systems that large technology companies actually run in production. Given a product prompt, you output a single JSON object describing a correct, production-grade system architecture at the C4 "container" level (deployable units + how they connect).

PRODUCTION MANDATE — design what a big tech company would REALLY run, even when the prompt sounds simple. NEVER output a minimal, toy or "student" diagram (three or four boxes is always wrong). Every design must include, wherever the domain makes them relevant:
  • High availability — redundant instances behind a load balancer / gateway; no single point of failure on any critical path.
  • Caching for read-heavy access, and a CDN for user-facing content / static assets.
  • Asynchronous processing (queue + workers, or a stream) for slow, spiky, or fan-out work.
  • An authentication boundary and rate limiting at the edge.
  • Observability — logging, metrics AND tracing.
  • The right specialized datastore per need (relational / KV / wide-column / search / blob / warehouse), one database per service.
A "URL shortener" is NOT three boxes — it is CDN + load balancer + a stateless service fleet + cache + a partitioned datastore + an analytics path + observability, the way it actually runs at scale. Aim for the complete, real design (typically 8–30 components).

You MUST follow these rules exactly:

VOCABULARY — use only these node "type" values, each in its listed "layer":
${nodeTypeCatalog()}

CONNECTIONS — "protocol" is one of: ${PROTOCOL_HELP}.
${callRulesText()}

DESIGN PRINCIPLES (follow all of them):
${principlesText()}

REQUIRED OUTPUT — a JSON object with:
- system: { name, summary, domain, scale ("small"|"medium"|"large"|"hyperscale") }
- assumptions: { dailyActiveUsers, actionsPerUserPerDay, readWriteRatio, avgItemSizeBytes, retentionDays, latencySloMs, consistency ("strong"|"eventual") } — extract any numbers stated in the prompt; otherwise choose sensible values for the described scale.
- nodes: [ { id (kebab-case), label, type, layer, tech (concrete technology, e.g. "PostgreSQL"|"Redis"|"Kafka"), why (one line), redundant (bool), stateful (bool) } ]
- edges: [ { id, source (node id), target (node id), label (what flows), protocol, why (one line) } ]
- tradeoffs: [ { decision, choice, alternative, why } ]  — the key decisions
- notes: [ string ]  — scaling notes / caveats

Rules of thumb: put a load balancer / gateway in front of services; cache read-heavy datastores; offload email/notifications/analytics to a queue+worker; use a dedicated search index for full-text search; feed analytics/warehouses via streams, never direct OLTP writes; give critical stateful components redundancy. Every node and edge needs a concrete, specific "why".

MANDATORY for any production system: (a) an authentication boundary — an auth_service (or auth at the gateway); (b) at least one observability component — logging and/or metrics. Include both unless the prompt is explicitly a tiny prototype. (c) Set "redundant": true on every component that should run multiple instances or have failover — gateways, load balancers, primary datastores, caches and stateful services.

"tech" MUST be a specific, real technology (e.g. PostgreSQL, Redis, Kafka, Elasticsearch, S3) — never a generic word like "Database", "Cache" or "various".

When a reference architecture below matches the domain, prefer its structure and technology choices; adapt only what the specific prompt changes.

For a COMPLEX prompt that names several distinct features or subsystems (e.g. booking + video calls + records + billing + AI): treat each feature as its own subsystem with its own service(s) and datastore(s) — do NOT collapse them into one generic service. Cover EVERY feature named in the prompt, reuse shared infrastructure (gateway, auth, cache, observability), and connect the subsystems where they interact. A real production design for such a system typically has 12–30 components.

Before you answer, silently verify your design:
  1. Requirements: does every capability the prompt asks for map to a component?
  2. Entry: is there a client and a gateway/load balancer in front of the services?
  3. Data: does each service own its datastore? Is a cache present for read-heavy paths?
  4. Async: is slow/decoupled work (email, notifications, analytics, transcoding) behind a queue/worker?
  5. Connections: do all edges follow the call rules and use the right protocol?
  6. Cross-cutting: is there an auth boundary and basic observability?
Fix any gaps, then output the final design.

Output ONLY the JSON object. No markdown, no commentary.${examples}`;
}

/** A human-readable name for a node type, falling back to the raw value. */
const typeLabel = (t) => NODE_TYPES[t]?.label || t;

/**
 * Turns the prompt's detected capabilities into an explicit, per-request
 * checklist of components the design MUST include — each phrased as "any one
 * of these types satisfies it", mirroring the verifier's coverage check. Data-
 * driven from the capability map, so it stays correct for every prompt without
 * per-domain hardcoding. Returns '' when the prompt asks for nothing specific.
 */
function requirementsText(promptText) {
  const reqs = capabilityRequirements(promptText);
  if (!reqs.length) return '';
  const lines = reqs.map((c) => {
    const opts = c.types.map((t) => `${typeLabel(t)} (type: ${t})`).join(' OR ');
    return `  • ${c.label}: include ${opts}.`;
  });
  return `\n\nThis prompt explicitly asks for the capabilities below. Each MUST be satisfied by a dedicated component of the stated type — do not fold it into a generic service or leave it implicit:\n${lines.join('\n')}`;
}

/** The per-request user message. */
export function buildUserPrompt(promptText) {
  return `Design the system architecture for:\n\n"${promptText.trim()}"${requirementsText(promptText)}\n\nReturn the JSON object.`;
}

/**
 * A targeted repair message. Used only when a candidate failed schema/normalize
 * validation — we hand back the exact problems and the model's own output and
 * ask for a corrected object. This repairs *format*, not reasoning, so it does
 * not suffer the accuracy loss of iterative self-critique.
 */
export function buildRepairPrompt(previousRaw, errors) {
  return `Your previous response did not satisfy the required schema.

Problems found:
${errors.map((e) => `  - ${e}`).join('\n')}

Your previous output was:
${String(previousRaw).slice(0, 6000)}

Return a corrected JSON object that fixes ONLY these problems and still matches the required schema. Output ONLY the JSON object.`;
}
