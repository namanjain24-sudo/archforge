/**
 * The golden library is an accuracy asset, so it must itself be provably
 * correct: every reference is schema-valid AND obeys the call-rules. If any
 * authored reference had an invalid node type, a dangling edge, or a forbidden
 * connection, these tests fail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from './library.js';
import { rankReferences, selectReferences, selectReferencesForPrompt } from './select.js';
import { cloudServicesFor } from './cloudMap.js';
import { detectCapabilityIds, capabilitiesOfArch, CAPABILITIES } from '../engine/capabilities.js';
import { normalizeArchitecture } from '../engine/normalize.js';
import { validateSchema } from '../engine/validateSchema.js';
import { isEdgeAllowed, isTypeEdgeForbidden } from '../contracts/index.js';

test('every reference is schema-valid and survives normalization intact', () => {
  for (const { meta, arch } of LIBRARY) {
    const norm = normalizeArchitecture(arch);
    const { valid, errors } = validateSchema(norm);
    assert.ok(valid, `${meta.title} invalid: ${JSON.stringify(errors)}`);
    // No node/edge was dropped → the authored data uses only known types and
    // has no dangling edges.
    assert.equal(norm.nodes.length, arch.nodes.length, `${meta.title}: nodes dropped in normalize`);
    assert.equal(norm.edges.length, arch.edges.length, `${meta.title}: edges dropped in normalize`);
  }
});

test('every reference edge obeys the call-rules', () => {
  for (const { meta, arch } of LIBRARY) {
    const norm = normalizeArchitecture(arch);
    const layer = Object.fromEntries(norm.nodes.map((n) => [n.id, n.layer]));
    const type = Object.fromEntries(norm.nodes.map((n) => [n.id, n.type]));
    for (const e of norm.edges) {
      assert.ok(
        isEdgeAllowed(layer[e.source], layer[e.target]),
        `${meta.title}: forbidden edge ${layer[e.source]}→${layer[e.target]} (${e.source}→${e.target})`,
      );
      assert.ok(
        !isTypeEdgeForbidden(type[e.source], type[e.target]),
        `${meta.title}: forbidden type edge ${type[e.source]}→${type[e.target]}`,
      );
    }
  }
});

test('every reference has a unique domain', () => {
  const domains = LIBRARY.map((r) => r.meta.domain);
  assert.equal(new Set(domains).size, domains.length);
});

test('selector grounds relevant prompts and abstains on novel ones', () => {
  const ec = selectReferences('a scalable e-commerce platform with cart and payments');
  assert.equal(ec[0].system.domain, 'e-commerce');

  const chat = rankReferences('build a realtime chat app like whatsapp');
  assert.equal(chat[0].domain, 'chat');

  const none = selectReferences('a recipe for chocolate cake');
  assert.equal(none.length, 0); // no false grounding on unrelated prompts

  // word-boundary precision: "blink" must not match the "link" keyword
  assert.equal(rankReferences('a blink detection health app').length, 0);

  // modern domains are covered
  assert.equal(rankReferences('an AI chatbot with RAG over our docs')[0].domain, 'rag-chatbot');
  assert.equal(rankReferences('ingest IoT sensor telemetry')[0].domain, 'iot');
});

test('library has grown to broaden grounding coverage', () => {
  assert.ok(LIBRARY.length >= 15, `expected >= 15 references, got ${LIBRARY.length}`);
});

test('capability set-cover grounds every derivable facet of a complex prompt', () => {
  const prompt = 'a platform with appointment booking, telemedicine video calls, patient records, billing and an AI symptom checker';
  const chosen = selectReferencesForPrompt(prompt, { maxRefs: 4 });
  const need = new Set(detectCapabilityIds(prompt));
  const covered = new Set();
  chosen.forEach((r) => capabilitiesOfArch(r.arch).forEach((c) => need.has(c) && covered.add(c)));
  // every capability that CAN be derived from node types is grounded
  const derivable = [...need].filter((c) => CAPABILITIES[c].nodeTypes.length);
  for (const c of derivable) assert.ok(covered.has(c), `complex facet not grounded: ${c}`);
  assert.ok(chosen.length >= 2, 'complex prompt should ground on multiple references');
});

test('simple prompt grounds on a single reference', () => {
  const chosen = selectReferencesForPrompt('a url shortener', { maxRefs: 4 });
  assert.equal(chosen.length, 1);
});

test('cloud map covers the core data & service types', () => {
  for (const t of ['sql_db', 'nosql_db', 'cache', 'message_queue', 'service', 'api_gateway', 'blob_storage']) {
    const s = cloudServicesFor(t);
    assert.ok(s && s.aws && s.gcp && s.azure, `missing cloud mapping for ${t}`);
  }
});
