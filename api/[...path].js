/**
 * Vercel serverless entry — routes every /api/* request to the Express app.
 * On Vercel, provider keys (GROQ_API_KEY, GROQ_API_KEY2, …, GEMINI_API_KEY,
 * CEREBRAS_API_KEY) come from the project's Environment Variables, not a .env
 * file. Locally, `npm run dev` uses server/src/index.js instead.
 */
import app from '../server/src/app.js';

export default app;
