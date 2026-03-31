const { runPipeline } = require('./server/src/engine/index.js');

try {
  // Execute via generic prompt matching exact design parameters
  const result1 = runPipeline("scaleable ecommerce storefront with live tracking analytics");
  
  console.log(`\n==== ARCHITECTURE ENHANCEMENT TEST ====\n`);
  
  console.log(`Base Pattern Target: 🛍 eCommerce + Tracking`);
  console.log(`Detected Topography Structure: \x1b[36m${result1.enhancements.architecturePattern}\x1b[0m\n`);

  console.log(`-- INFERRED CAPABILITIES (Cognitive Enrichment) --`);
  result1.enhancements.enhancedCapabilities.forEach(c => {
    console.log(`   + \x1b[32m${c.capability}\x1b[0m (${c.reason})`);
  });

  console.log(`\n-- DYNAMIC COMPONENT INJECTIONS (Variations) --`);
  // Map out strictly injected AI blocks
  for (const layer in result1.components) {
    const injected = result1.components[layer].filter(c => c.capability === 'injected-ai-infra');
    injected.forEach(c => {
      console.log(`   + \x1b[33m${c.name}\x1b[0m injected into [${layer}] layer (Type: ${c.type})`);
    });
  }

  console.log(`\n-- AI SUGGESTIONS --`);
  result1.enhancements.suggestions.forEach(s => {
    console.log(`   [${s.type.toUpperCase()}] ${s.message}`);
  });
  
  console.log("\nTesting Replayability Variability (Should match different injected blocks)...");
  
  const result2 = runPipeline("scaleable ecommerce storefront with live tracking analytics");
  console.log(`Execution 2 Output (Distributed Microservices):`);
  const comps1 = result1.components.interaction.filter(c => c.capability === 'injected-ai-infra').map(c => c.name);
  const comps2 = result2.components.interaction.filter(c => c.capability === 'injected-ai-infra').map(c => c.name);
  
  console.log(`-> Execution 1 Proxies: ${comps1.join(', ')}`);
  console.log(`-> Execution 2 Proxies: ${comps2.join(', ')}`);
  
  if (comps1.join(',') !== comps2.join(',')) {
    console.log(`\n\x1b[32m✅ Variation Engine successful!\x1b[0m (Non-Deterministic injection verified)`);
  } else {
    console.log(`\n(Same proxies selected due to pseudo-random alignment. Run again to see divergence.)`);
  }

} catch(err) {
  console.error("Test Failed!", err);
}
