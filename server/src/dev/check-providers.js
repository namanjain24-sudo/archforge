/**
 * Provider diagnostic — tests every key and every failover branch with real
 * calls, so we know exactly which providers work.
 *   node src/dev/check-providers.js
 */
import '../config/env.js';
import { availableProviders } from '../engine/providers.js';

async function testGroqKey(key, label) {
  if (!key) return console.log(`${label.padEnd(12)} — not set`);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', max_tokens: 5, messages: [{ role: 'user', content: 'reply with OK' }] }),
    });
    const d = await r.json().catch(() => ({}));
    console.log(`${label.padEnd(12)} ${r.ok ? '✓ WORKS' : '✗ FAIL ' + r.status}  ${r.ok ? JSON.stringify(d.choices?.[0]?.message?.content) : JSON.stringify(d.error || d).slice(0, 140)}`);
    return r.ok;
  } catch (e) { console.log(`${label.padEnd(12)} ✗ ERROR ${e.message}`); return false; }
}

async function testGemini(key) {
  if (!key) return console.log('Gemini       — not set');
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'reply with OK' }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    });
    const d = await r.json().catch(() => ({}));
    console.log(`Gemini       ${r.ok ? '✓ WORKS' : '✗ FAIL ' + r.status}  ${r.ok ? JSON.stringify(d.candidates?.[0]?.content?.parts?.[0]?.text)?.slice(0, 80) : JSON.stringify(d.error || d).slice(0, 180)}`);
    return r.ok;
  } catch (e) { console.log(`Gemini       ✗ ERROR ${e.message}`); return false; }
}

console.log('Configured provider order:', availableProviders().map((p) => p.name).join(', ') || 'NONE', '\n');
const g1 = await testGroqKey(process.env.GROQ_API_KEY, 'Groq key 1:');
const g2 = await testGroqKey(process.env.GROQ_API_KEY2, 'Groq key 2:');
const gem = await testGemini(process.env.GEMINI_API_KEY);

console.log('\nSummary:');
console.log(`  Groq usable keys : ${[g1, g2].filter(Boolean).length}/2`);
console.log(`  Gemini fallback  : ${gem ? 'available' : 'NOT usable (fix the key/format)'}`);
console.log(`  → the engine will ${g1 || g2 ? 'work on Groq' : (gem ? 'work on Gemini only' : 'FAIL — no working provider')}`);
