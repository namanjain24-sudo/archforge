/**
 * Zero-dependency .env loader.
 * Reads server/.env (if present) into process.env without overriding variables
 * already set in the real environment. Import this once at an entry point.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(here, '../../.env'); // → server/.env

export function loadEnv() {
  let text;
  try { text = fs.readFileSync(ENV_PATH, 'utf8'); }
  catch { return; } // no .env — rely on the real environment
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadEnv();
