/**
 * ============================================================================
 * ARCHFORGE — ENGINE PIPELINE ORCHESTRATOR v4 (FAANG-GRADE SYSTEM DESIGN COMPILER)
 * ============================================================================
 *
 * Complete pipeline with domain-aware flows, invariants engine, validation,
 * agentic AI loop, and flow simulation:
 *
 *   Parser → Mapper → Generator → AI Enhancer (deterministic)
 *   → LLM AI (optional, 4-layer failover: Groq→OpenAI→Gemini→Ollama)
 *   → ★ INVARIANTS ENGINE (system design compiler) ★
 *   → Flow Engine (STRICT canConnect rules)
 *   → ★ DOMAIN FLOW ENGINE (e-commerce/chat/analytics pipelines) ★
 *   → Graph Builder
 *   → Validation Engine (auto-fix + TRIPLE PASS)
 *   → Agentic AI Loop (Planner→Builder→Critic→Fixer)
 *   → ★ FLOW SIMULATOR (request/response/async path tracing) ★
 *   → View Engine → Intelligence → Explanation
 *
 * NEW IN v4:
 *   - Domain-specific pipeline injection (E-commerce, Chat, Analytics)
 *   - Cache invalidation flow chain (DB write → invalidate → update)
 *   - Stream vs Batch separation (Kafka→Flink, Kafka→Spark)
 *   - CDN flow split (static vs API paths)
 *   - Service discovery loop (Consul→Gateway routing updates)
 *   - Flow simulation (request/response/async path tracing)
 *   - Final validation layer (triple pass: connection + flow + invariant)
 *   - API versioning metadata injection (/v1, /v2)
 *   - Groq API as primary LLM layer
 * ============================================================================
 */

const { parseInput } = require('./parser');
const { mapCapabilitiesToLayers } = require('./capabilityMapper');
const { generateComponents } = require('./componentGenerator');
const { enhanceArchitecture } = require('./aiEnhancer');
const { enhanceWithAI } = require('./aiWrapper');
const { enforceInvariants, applyInvariantFixes } = require('./invariantsEngine');
const { generateFlows } = require('./flowEngine');
const { generateDomainFlows } = require('./domainFlowEngine');
const { buildGraph } = require('./graphBuilder');
const { validateArchitecture } = require('./validationEngine');
const { runAgentLoop } = require('./agentSystem');
const { simulateFlows } = require('./flowSimulator');
const { generateViews } = require('./viewEngine');
const { analyzeSystem } = require('./intelligence');
const { explainArchitecture } = require('./explainArchitecture');
const { validateArchitectureGraph } = require('./connectionValidator');

/**
 * Executes the complete ArchForge multi-stage architecture pipeline.
 *
 * @param {string} input - Raw user semantic intent
 * @returns {object} Final system-wide architecture configuration
 */
async function runPipeline(input) {
  const pipelineStart = Date.now();

  // ══════════════════════════════════════════════════════════════
  // STAGE 1: PARSING — Extract semantic intent
  // ══════════════════════════════════════════════════════════════
  const parserOutput = parseInput(input);
  if (parserOutput.error) {
    console.warn("[Pipeline] Parser returned soft error, continuing with baseline:", parserOutput.error);
  }

  // ══════════════════════════════════════════════════════════════
  // STAGE 2: CAPABILITY MAPPING — Map to architectural layers
  // ══════════════════════════════════════════════════════════════
  const layersOutput = mapCapabilitiesToLayers(parserOutput);

  // ══════════════════════════════════════════════════════════════
  // STAGE 3: COMPONENT GENERATION — Concrete component translation
  // ══════════════════════════════════════════════════════════════
  const rawComponentsOutput = generateComponents(layersOutput);

  // ══════════════════════════════════════════════════════════════
  // STAGE 4a: DETERMINISTIC AI ENHANCEMENT — Rule-based enrichment
  // ══════════════════════════════════════════════════════════════
  const baseAiOutput = enhanceArchitecture(parserOutput, rawComponentsOutput);

  // ══════════════════════════════════════════════════════════════
  // STAGE 4b: LLM AI ENHANCEMENT — Optional, safe, 4-layer failover
  //   Groq → OpenAI → Gemini → Ollama → Rule Engine (always works)
  // ══════════════════════════════════════════════════════════════
  const llmResult = await enhanceWithAI(input, { components: baseAiOutput.refinedComponents });

  let preInvariantComponents = baseAiOutput.refinedComponents;
  let finalSuggestions = baseAiOutput.suggestions;
  const aiUsed = llmResult.success;
  const aiProvider = llmResult.provider || 'none';

  if (llmResult.success && llmResult.data) {
    preInvariantComponents = llmResult.data.components;
    finalSuggestions = [...finalSuggestions, ...llmResult.data.suggestions];
    console.log(`\x1b[35m[Pipeline] AI provider used: ${aiProvider}\x1b[0m`);
  } else {
    console.log(`\x1b[36m[Pipeline] Running in self-sufficient mode (no AI). Provider: ${aiProvider}\x1b[0m`);
  }

  // ══════════════════════════════════════════════════════════════
  // ★ STAGE 5: INVARIANTS ENGINE — System Design Compiler ★
  // Enforces 17 hard architectural invariants BEFORE flow generation.
  // ══════════════════════════════════════════════════════════════

  // First pass: generate initial flows to check data ownership invariants
  const initialFlows = generateFlows(preInvariantComponents, baseAiOutput.architecturePatternsList);
  const initialGraph = buildGraph({ components: preInvariantComponents, flows: initialFlows.flows });

  // Run invariants check
  const invariantResult = enforceInvariants(preInvariantComponents, initialFlows.flows, initialGraph);

  if (invariantResult.violatedCount > 0) {
    console.log(`\x1b[31m[INVARIANTS] ${invariantResult.violatedCount}/${invariantResult.totalChecked} invariants VIOLATED — applying ${invariantResult.fixes.length} fixes\x1b[0m`);
  } else {
    console.log(`\x1b[32m[INVARIANTS] ${invariantResult.satisfiedCount}/${invariantResult.totalChecked} invariants SATISFIED\x1b[0m`);
  }

  // Apply invariant fixes (inject missing components, rewire flows, enrich descriptions)
  const { fixedComponents: invariantComponents, fixedFlows: invariantFlows } =
    applyInvariantFixes(preInvariantComponents, initialFlows.flows, invariantResult.fixes);

  // ══════════════════════════════════════════════════════════════
  // STAGE 6: RE-GENERATE FLOWS — With invariant-injected components
  // ══════════════════════════════════════════════════════════════
  const flowsOutput = generateFlows(invariantComponents, baseAiOutput.architecturePatternsList);

  // ══════════════════════════════════════════════════════════════
  // ★ STAGE 6b: DOMAIN FLOW ENGINE — Inject domain-specific pipelines ★
  // E-commerce: User → CDN → Gateway → Cart → Order → Payment → Saga → Inventory → Kafka
  // Chat: User → WebSocket → Gateway → Chat Service → Redis → Fanout
  // Analytics: Service → Kafka → Flink/Spark → Warehouse
  // ══════════════════════════════════════════════════════════════
  const { domainFlows, detectedDomains } = generateDomainFlows(invariantComponents, input);

  // Merge domain flows with generic flows (dedup by source→target key)
  const existingEdgeKeys = new Set(flowsOutput.flows.map(f => `${f.source}->${f.target}`));
  const uniqueDomainFlows = domainFlows.filter(f => !existingEdgeKeys.has(`${f.source}->${f.target}`));
  const mergedFlows = [...flowsOutput.flows, ...uniqueDomainFlows];

  if (uniqueDomainFlows.length > 0) {
    console.log(`\x1b[35m[DOMAIN] Injected ${uniqueDomainFlows.length} domain-specific flows for: ${detectedDomains.join(', ')}\x1b[0m`);
  }

  // ══════════════════════════════════════════════════════════════
  // STAGE 7: GRAPH BUILDER — Spatial topology linking
  // ══════════════════════════════════════════════════════════════
  const graphOutput = buildGraph({
    components: invariantComponents,
    flows: mergedFlows
  });

  // ══════════════════════════════════════════════════════════════
  // STAGE 8: VALIDATION ENGINE — Auto-fix + TRIPLE PASS
  //          (connection + flow + invariant validation)
  // ══════════════════════════════════════════════════════════════
  const validation = validateArchitecture(graphOutput, mergedFlows, invariantComponents);

  if (!validation.valid) {
    console.log(`\x1b[31m[VALIDATOR] Found ${validation.violations.length} violations, ${validation.fixes.length} auto-fixes applied\x1b[0m`);
  } else {
    console.log(`\x1b[32m[VALIDATOR] Architecture validated — 0 critical violations\x1b[0m`);
  }

  let currentFlows = validation.fixedFlows;
  let currentComponents = validation.fixedComponents;

  // ══════════════════════════════════════════════════════════════
  // STAGE 9: AGENTIC AI LOOP — Planner→Builder→Critic→Fixer
  // ══════════════════════════════════════════════════════════════
  const agentResult = runAgentLoop(graphOutput, currentFlows, currentComponents, input);

  currentFlows = agentResult.fixedFlows;
  currentComponents = agentResult.enrichedComponents;

  // Rebuild graph with all fixes applied
  const finalGraph = buildGraph({
    components: currentComponents,
    flows: currentFlows
  });

  // ══════════════════════════════════════════════════════════════
  // ★ STAGE 9b: FINAL GRAPH VALIDATION — Post-build triple check ★
  // ══════════════════════════════════════════════════════════════
  const finalGraphValidation = validateArchitectureGraph(
    currentFlows,
    finalGraph.nodes,
    detectedDomains
  );

  if (!finalGraphValidation.valid) {
    console.log(`\x1b[31m[FINAL CHECK] ${finalGraphValidation.violations.filter(v => v.severity === 'critical').length} critical violations in final graph — auto-removing\x1b[0m`);
    // Auto-remove any remaining illegal connections
    const nodeMap = new Map(finalGraph.nodes.map(n => [n.id, n]));
    const { canConnect } = require('./connectionValidator');
    currentFlows = currentFlows.filter(f => {
      const src = nodeMap.get(f.source);
      const tgt = nodeMap.get(f.target);
      if (!src || !tgt) return false;
      return canConnect(src, tgt);
    });
    currentFlows.forEach((f, i) => { f.step = i + 1; });
  } else {
    console.log(`\x1b[32m[FINAL CHECK] Graph validation PASSED — zero illegal connections\x1b[0m`);
  }

  // ══════════════════════════════════════════════════════════════
  // ★ STAGE 10: FLOW SIMULATOR — Path tracing & bottleneck detection ★
  // ══════════════════════════════════════════════════════════════
  const simulationResult = simulateFlows(finalGraph, currentFlows, detectedDomains);
  console.log(`\x1b[36m[SIMULATOR] Simulated ${simulationResult.totalFlowsSimulated} flow steps across ${detectedDomains.length || 1} domain(s). Pipeline completeness: ${simulationResult.pipelineCompleteness}%\x1b[0m`);

  // ══════════════════════════════════════════════════════════════
  // STAGE 11: VIEW ENGINE — Multi-view generation
  // ══════════════════════════════════════════════════════════════
  const viewsOutput = generateViews(finalGraph);

  // ══════════════════════════════════════════════════════════════
  // STAGE 12: INTELLIGENCE — Analytical deductions
  // ══════════════════════════════════════════════════════════════
  const systemData = {
    graph: finalGraph,
    components: currentComponents,
    layers: layersOutput.layers,
    input: input
  };

  const intelligenceOutput = analyzeSystem(systemData);

  // ══════════════════════════════════════════════════════════════
  // STAGE 13: EXPLANATION — Natural language architecture doc
  // ══════════════════════════════════════════════════════════════
  const explanationOutput = explainArchitecture(finalGraph, baseAiOutput.architecturePatternsList);

  // ══════════════════════════════════════════════════════════════
  // FINAL OUTPUT COMPOSITION
  // ══════════════════════════════════════════════════════════════
  const pipelineDuration = Date.now() - pipelineStart;
  
  // ★ FINAL METRICS ★
  const totalNodes = Object.values(currentComponents).flat().length;
  const totalFlows = currentFlows.length;
  console.log(`\x1b[36m[Pipeline] Total execution: ${pipelineDuration}ms — ${totalNodes} nodes, ${totalFlows} flows\x1b[0m`);

  // Collect all removed components for transparency
  const removedComponents = [
    ...(baseAiOutput.removedComponents || []),
    ...(agentResult.prunedComponentIds || []).map(id => ({ name: id, reason: 'Agent pruned (orphan/unnecessary/duplicate)' }))
  ];

  return {
    parser: parserOutput,
    layers: layersOutput.layers,
    components: currentComponents,
    flows: currentFlows,
    graph: finalGraph,
    views: viewsOutput,
    insights: {
      ...intelligenceOutput.insights,
      suggestions: finalSuggestions,
      invariants: {
        results: invariantResult.invariants,
        satisfiedCount: invariantResult.satisfiedCount,
        violatedCount: invariantResult.violatedCount,
        totalChecked: invariantResult.totalChecked,
        fixes: invariantResult.fixes.map(f => ({
          type: f.type,
          reason: f.reason,
          component: f.component?.name || f.componentId || 'flow'
        }))
      },
      validation: {
        valid: validation.valid,
        violations: validation.violations,
        fixes: validation.fixes,
        finalValidation: validation.finalValidation || {}
      },
      agentReport: {
        plan: agentResult.plan,
        critique: agentResult.critique,
        fixActions: agentResult.fixActions,
        iterations: agentResult.iterations
      },
      simulation: simulationResult,
      domainPipelines: {
        detectedDomains,
        domainFlowCount: uniqueDomainFlows.length
      },
      finalGraphValidation: {
        valid: finalGraphValidation.valid,
        passResults: finalGraphValidation.passResults,
        violationCount: finalGraphValidation.violations.length
      }
    },
    explanation: explanationOutput,
    enhancements: baseAiOutput,
    primaryPipeline: flowsOutput.primaryPipeline || [],
    removedComponents,
    aiUsed,
    aiProvider
  };
}

module.exports = { runPipeline };
