/**
 * Pre-baked answers for the prompts the UI itself offers.
 * --------------------------------------------------------
 * Most visitors to a demo click an example chip or a gallery card rather than
 * typing their own idea. Spending a model call on a question we already know
 * the answer to is the single most wasteful thing a fixed daily budget can do.
 *
 * We store only the ARCHITECTURE, never the finished response: at request time
 * it goes through the same assess() as a user edit, so verification, capacity,
 * layout and the explanation are all recomputed. That means a verifier
 * improvement reaches these instantly, and a stale diagram can never be served.
 * Cost: zero tokens, and the answer is immediate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('./data/', import.meta.url));

/** Prompts differ only by case/spacing between the UI and this store. */
export const normalizePrompt = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

let index = null;

function load() {
  if (index) return index;
  index = new Map();
  let files = [];
  try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')); } catch { return index; }
  for (const f of files) {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      if (entry?.prompt && entry?.architecture) index.set(normalizePrompt(entry.prompt), entry);
    } catch { /* a corrupt fixture must never break serving */ }
  }
  return index;
}

/** The stored architecture for a curated prompt, or null. */
export function lookup(promptText) {
  return load().get(normalizePrompt(promptText)) || null;
}

export function count() { return load().size; }

/** Test seam — forget the cached index so a fresh read happens. */
export function reload() { index = null; return load().size; }
