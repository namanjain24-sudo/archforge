/**
 * ArchForge HTTP API (Express app).
 * Exported without listening so it can run both as a long-lived server
 * (src/index.js) and as a serverless function (../api/index.js on Vercel).
 *
 * POST /api/generate { prompt, apiKey? } → full pipeline result.
 * POST /api/verify   { architecture }    → re-verify + re-lay-out (no model).
 * POST /api/refine   { architecture, instruction, apiKey? } → LLM edit + verify.
 * GET  /api/health                       → liveness + active providers.
 * GET  /api/examples                     → example prompts for the UI.
 */
import './config/env.js';
import express from 'express';
import cors from 'cors';
import { runPipeline } from './engine/pipeline.js';
import { assess } from './engine/assess.js';
import { refineArchitecture } from './engine/refine.js';
import { availableProviders } from './engine/providers.js';
import { detectCapabilities } from './engine/capabilities.js';
import { lookup } from './precomputed/index.js';
import { limitModelUse } from './rateLimit.js';

export const app = express();
app.set('trust proxy', true); // behind Vercel/any proxy, so x-forwarded-for is the client
app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, providers: availableProviders().map((p) => p.name) });
});

app.get('/api/examples', (_req, res) => {
  res.json({
    examples: [
      'A scalable e-commerce platform with payments, product search and analytics',
      'A realtime chat app like WhatsApp with group messaging and presence',
      'A ride-sharing app with driver matching, live tracking and payments',
      'An AI customer support chatbot that answers from our help docs using RAG',
      'A video streaming platform like YouTube with upload and transcoding',
      'A healthcare platform with appointment booking, telemedicine video calls, records and billing',
    ],
  });
});

/** Pull an optional Bring-Your-Own-Key from the request body. Never logged. */
function readByo(body) {
  const key = (body?.apiKey || '').toString().trim();
  if (!key) return null;
  return { key, provider: (body?.provider || '').toString().trim() || undefined };
}

app.post('/api/generate', limitModelUse, async (req, res) => {
  // Reject non-strings outright: coercing an object gives "[object Object]",
  // which is long enough to pass a length check and would burn a real
  // generation on nonsense.
  if (req.body?.prompt !== undefined && typeof req.body.prompt !== 'string') {
    return res.status(400).json({ error: 'Please describe the system you want to design.' });
  }
  const prompt = (req.body?.prompt || '').toString().trim();
  if (prompt.length < 3) return res.status(400).json({ error: 'Please describe the system you want to design.' });
  if (prompt.length > 2000) return res.status(400).json({ error: 'Prompt is too long.' });
  try {
    // The prompts our own UI offers are pre-baked. Re-verified on the way out,
    // so they benefit from every engine improvement while costing no tokens.
    const baked = lookup(prompt);
    if (baked) {
      const result = await assess(baked.architecture, { promptText: prompt });
      return res.json({
        ...result,
        prompt,
        generatedAt: new Date().toISOString(),
        capabilities: detectCapabilities(prompt),
        grounding: baked.grounding || [],
        meta: { provider: 'precomputed', ms: 0, precomputed: true },
      });
    }
    const result = await runPipeline(prompt, { byo: readByo(req.body) });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: e.message, details: e.details });
  }
});

// Re-verify + re-lay-out an edited architecture (no model call).
app.post('/api/verify', async (req, res) => {
  const arch = req.body?.architecture;
  if (!arch || !Array.isArray(arch.nodes)) return res.status(400).json({ error: 'An architecture is required.' });
  if (!arch.nodes.length) return res.status(400).json({ error: 'The diagram has no components to verify.' });
  try {
    const result = await assess(arch, { promptText: req.body.prompt || '' });
    // Every node had an unrecognised type, so normalization emptied the design.
    if (!result.architecture.nodes.length) {
      return res.status(400).json({ error: 'None of these components are recognized types.' });
    }
    res.json({ ...result, prompt: req.body.prompt || '', generatedAt: new Date().toISOString(), edited: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Refine an existing architecture with a natural-language instruction, then re-verify.
app.post('/api/refine', limitModelUse, async (req, res) => {
  const arch = req.body?.architecture;
  const instruction = (req.body?.instruction || '').toString().trim();
  if (!arch || !Array.isArray(arch.nodes)) return res.status(400).json({ error: 'An architecture is required.' });
  if (instruction.length < 2) return res.status(400).json({ error: 'Describe the change you want.' });
  try {
    const refined = await refineArchitecture(arch, instruction, readByo(req.body));
    const result = await assess(refined, { promptText: req.body.prompt || '' });
    res.json({ ...result, prompt: req.body.prompt || '', generatedAt: new Date().toISOString(), edited: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default app;
