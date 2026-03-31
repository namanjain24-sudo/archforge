const { runPipeline } = require('./server/src/engine/index.js');

try {
  console.log(`\n==== ARCHFORGE DEEP PIPELINE ENGINE TEST ====\n`);

  const result = runPipeline("scalable microservices ecommerce platform with chat analytics");
  
  console.log(`\n[!] EXPLICIT DEEP-HOP PIPELINES DETECTED:`);
  console.log(result.graph.pipelines.map(p => `   [+] ${p}`).join('\n') + '\n');

  console.log(`[!] EXPLAINABLE FLOW TRACE EXPLORATION:`);
  
  // Pick one specific pipeline to trace thoroughly matching user intents:
  const targetPipeline = result.graph.pipelines.find(p => p.includes('chat')) || result.graph.pipelines[0];
  console.log(`Tracing: ${targetPipeline}`);

  const subFlows = result.graph.edges.filter(e => e.pipelineId === targetPipeline);
  
  subFlows.forEach((flow, i) => {
    console.log(`\n   Hop ${i+1}: \x1b[36m${flow.source}\x1b[0m --(${flow.type}: ${flow.label})--> \x1b[36m${flow.target}\x1b[0m`);
    console.log(`     > Reason: \x1b[32m${flow.reason}\x1b[0m`);
  });

  console.log(`\n[!] VISUAL HIERARCHY TESTS:`);
  const critNodes = result.graph.nodes.filter(n => n.priority === 'high');
  console.log(`   Found ${critNodes.length} High-priority Critical Infra nodes.`);
  critNodes.slice(0, 3).forEach(n => {
    console.log(`     -> [${n.name}] rendered at Size x${n.size} explicitly with color: ${n.color}`);
  });

  if (critNodes.length && critNodes[0].color === '#ef4444' && critNodes[0].size > 1.25) {
      console.log(`\n✅ "Production-Grade System Design Simulator" Logic Operational.`);
  }

} catch(err) {
  console.error("Test Failed!", err);
}
