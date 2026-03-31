/**
 * ============================================================================
 * ARCHFORGE — API ROUTER: GENERATE
 * ============================================================================
 * 
 * Exposes the ArchForge computational pipeline via a secure REST API.
 * Now includes input intent validation to prevent hallucinated diagrams.
 * 
 * ENDPOINT: POST /api/generate
 * BODY: { "input": string }
 * QUERY: ?view=[simple|detailed|layered] (Optional filter)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { runPipeline } = require('../engine');
const { validateArchitecturalIntent } = require('../engine/inputValidator');

router.post('/generate', async (req, res) => {
  const { input } = req.body;
  const viewType = req.query.view; 

  // Error Handling 1: Missing or invalid input constraint mapping
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return res.status(400).json({ 
      error: 'Invalid Request. A valid semantic architecture description text must be provided.' 
    });
  }

  // Error Handling 2: Validate architectural intent before running pipeline
  const intentCheck = validateArchitecturalIntent(input);
  if (!intentCheck.isValid) {
    return res.status(400).json({
      error: intentCheck.message,
      type: 'NO_ARCHITECTURE_INTENT',
      confidence: intentCheck.confidence,
      matchedSignals: intentCheck.matchedSignals
    });
  }

  try {
    // Pipeline Orchestration (Now Async)
    const result = await runPipeline(input);

    // Filter Optimization: Return exclusively requested view matrices
    if (viewType && result.views[viewType]) {
      // Overwrite the returned 'views' manifest to only host the filtered query
      result.views = { [viewType]: result.views[viewType] };
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[API PIPELINE ERROR]', error);
    // Graceful Failures: Protects backend from bubbling crashes to users
    res.status(500).json({ 
      error: error.message || 'ArchForge Internal Pipeline error resolving architecture.' 
    });
  }
});

module.exports = router;
