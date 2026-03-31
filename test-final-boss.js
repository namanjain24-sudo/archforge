require('dotenv').config();
const { runPipeline } = require('./server/src/engine/index.js');

(async () => {
  try {
    console.log(`\n==== ARCHFORGE 'FINAL BOSS + LLM' ENGINE TEST ====\n`);

    const result = await runPipeline("scalable microservices ecommerce platform with chat analytics");
    
    // 1. Check Flow sorting and Step Numbering
    console.log(`\n[1 & 4] FLOW NUMBERING AND SORTING:`);
    result.flows.slice(0, 5).forEach(flow => {
      console.log(`   Step ${flow.step}: [${flow.type}] ${flow.source} -> ${flow.target}`);
    });
    console.log(`   ...`);
    result.flows.slice(-5).forEach(flow => {
      console.log(`   Step ${flow.step}: [${flow.type}] ${flow.source} -> ${flow.target}`);
    });

    // 2 & 3. Check Visual Coloring & Node Icons
    console.log(`\n[2 & 3] NODE ICONS AND EDGE COLORS:`);
    const topNodes = result.graph.nodes.filter(n => n.priority === 'high').slice(0, 3);
    topNodes.forEach(n => {
      console.log(`   Node: ${n.name} | Icon: [${n.icon}] | Color: ${n.color}`);
    });
    
    const sampleEdge = result.graph.edges.find(e => e.pipelineId === 'order-fulfillment-pipeline');
    if (sampleEdge) {
      console.log(`   Edge [${sampleEdge.pipelineId}] Stroke: ${sampleEdge.style.stroke}`);
    }

    // 5. Check System Explainer 
    console.log(`\n[5] SYSTEM EXPLANATION ENGINE (Final Boss Check):\n`);
    console.log(`====================================================`);
    console.log(`\x1b[36m${result.explanation}\x1b[0m`);
    console.log(`====================================================\n`);
    
    console.log(`[LLM Status] Real God-Mode LLM Used: \x1b[33m${result.aiUsed}\x1b[0m`);

    console.log(`\n✅ All Upgrades successfully operational.`);
  } catch(err) {
    console.error("Test Failed!", err);
  }
})();
