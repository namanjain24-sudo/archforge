/**
 * Refine — evolve an existing architecture with a natural-language instruction
 * ("add caching", "make it multi-region", "use Cassandra instead of Postgres").
 * The model edits the design; the caller then re-verifies via assess(), so a
 * refinement can never leave the diagram invalid.
 */
import { availableProviders, byoProviderFromKey } from './providers.js';
import { buildSystemPrompt } from './prompt.js';
import { extractJson } from './json.js';
import { normalizeArchitecture } from './normalize.js';

export async function refineArchitecture(arch, instruction, byo = null) {
  const byoProvider = byo?.key ? byoProviderFromKey(byo.key.trim(), byo.provider) : null;
  const providers = byoProvider ? [byoProvider, ...availableProviders()] : availableProviders();
  if (!providers.length) throw new Error('No LLM provider configured. Add your own API key.');

  const system = buildSystemPrompt([]); // the vocabulary + rules, no few-shot
  const user = `Here is an existing architecture as JSON:

${JSON.stringify(arch)}

Apply this change: "${instruction}"

Return the COMPLETE updated architecture as a JSON object in the same schema. Keep everything that should not change (same ids where possible), and only modify what the instruction requires. Output ONLY the JSON object.`;

  let lastErr;
  for (const provider of providers) {
    try {
      const raw = await provider.complete({ system, user, temperature: 0.3 });
      const next = normalizeArchitecture(extractJson(raw));
      if (next.nodes.length) return next;
      lastErr = new Error('empty result');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('refine failed');
}
