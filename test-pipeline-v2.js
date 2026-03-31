const { runPipeline } = require('./server/src/engine');

async function test() {
  try {
    const result = await runPipeline('i want to create a web app in which user enters the transcript/message');
    
    console.log('=== COMPONENTS ===');
    for (const [layer, comps] of Object.entries(result.components)) {
      if (comps.length > 0) {
        console.log(`\n[${layer}] (${comps.length} components):`);
        comps.forEach(c => console.log(`  - ${c.name} (${c.type}, cap: ${c.capability})`));
      }
    }
    
    console.log('\n=== GRAPH STATS ===');
    console.log(`Nodes: ${result.graph.nodes.length}`);
    console.log(`Edges: ${result.graph.edges.length}`);
    
    // Check for orphan nodes
    const connectedNodes = new Set();
    result.graph.edges.forEach(e => { connectedNodes.add(e.source); connectedNodes.add(e.target); });
    const orphans = result.graph.nodes.filter(n => !connectedNodes.has(n.id));
    console.log(`Orphan nodes: ${orphans.length}`);
    if (orphans.length > 0) console.log('  Orphans:', orphans.map(n => n.name));
    
    console.log('\n=== EDGES ===');
    result.graph.edges.forEach(e => {
      const src = result.graph.nodes.find(n => n.id === e.source)?.name || e.source;
      const tgt = result.graph.nodes.find(n => n.id === e.target)?.name || e.target;
      console.log(`  ${src} --[${e.label}]--> ${tgt}`);
    });
    
    console.log('\n=== INTELLIGENCE ===');
    console.log('Classification:', JSON.stringify(result.insights.classification, null, 2));
    
    console.log('\nScaling:', result.insights.scaling?.length, 'suggestions');
    result.insights.scaling?.forEach(s => console.log(`  - ${s.suggestion.substring(0, 100)}...`));
    
    console.log('\nMissing:', result.insights.missing?.length, 'warnings');
    result.insights.missing?.forEach(s => console.log(`  - ${s.suggestion.substring(0, 100)}...`));
    
    console.log('\nRisks:', result.insights.risks?.length, 'risks');
    result.insights.risks?.forEach(s => console.log(`  [${s.severity}] ${s.suggestion.substring(0, 100)}...`));
    
  } catch (err) {
    console.error('Pipeline error:', err.message);
    console.error(err.stack);
  }
}

test();
