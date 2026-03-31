/**
 * ============================================================================
 * ARCHFORGE — SERVER & API GATEWAY
 * ============================================================================
 * 
 * Central Express.js application exposing ArchForge architectural endpoints.
 * Separates route definitions and business logic completely. 
 * Provides global middleware configurations.
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const generateRoute = require('./src/api/generate');

const app = express();
const PORT = process.env.PORT || 3000;

// ── GLOBAL MIDDLEWARES ──
app.use(cors());
app.use(express.json());

// Universal System Operational Logging 
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  // Records the intent endpoint immediately
  console.log(`[${timestamp}] ${req.method} ${req.url} — BODY: ${JSON.stringify(req.body)}`);
  next();
});

// FUTURE-READY PLACEHOLDERS:
// 1. Rate Limiting: Insert `express-rate-limit` middleware config here to defend compute.
// 2. Authentication: Add API Key or JWT middleware guards if monetizing endpoint access.
// 3. Caching: Intercept request body hashing via Redis matching exact prompts pre-engine.

// ── API ROUTES ──
// /api/generate
app.use('/api', generateRoute);

// Catch-all unhandled fallback routing
app.use((req, res) => {
  res.status(404).json({ error: 'ArchForge Route not recognized in API Registry.' });
});

const http = require('http');
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
================================================
🚀 ARCHFORGE
Capability-Driven Architecture Engine Online
Listening securely on port: ${PORT}
================================================
  `);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ArchForge server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
