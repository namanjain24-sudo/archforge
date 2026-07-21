/**
 * Local / long-lived server entry — starts the ArchForge API listening.
 * (The Express app itself lives in app.js so it can also run serverless.)
 */
import { app } from './app.js';
import { availableProviders } from './engine/providers.js';

const PORT = Number(process.env.PORT || 8799);
app.listen(PORT, () => {
  const providers = availableProviders().map((p) => p.name).join(', ') || 'NONE (set an API key)';
  console.log(`ArchForge API on http://localhost:${PORT}  · providers: ${providers}`);
});
