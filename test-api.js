const BASE_URL = 'http://localhost:3000/api/generate';

async function simulateClientRequest(input, viewQuery = '') {
  const url = viewQuery ? `${BASE_URL}?view=${viewQuery}` : BASE_URL;
  console.log(`\n==== POST REQUEST TO ${url} ====\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });

    const data = await response.json();

    if (!response.ok) {
       console.error(`Status ${response.status} Error:`, data.error);
       return;
    } 

    console.log('✅ Pipeline Execution Success!');
    console.log(`- Detected Capabilities: ${data.parser.capabilities.length}`);
    console.log(`- Architecture Layers:   ${Object.keys(data.layers).length} registered`);
    console.log(`- Graph Nodes Mapped:    ${data.graph.nodes.length}`);
    console.log(`- Graph Edges Mapped:    ${data.graph.edges.length}`);
    console.log(`- UI Render Views:       ${Object.keys(data.views).join(', ')}`);
    console.log(`- Archetype Identified:  ${data.insights.classification.primaryArchetype}`);
    console.log(`\n[Intelligence Report Insight Example:]\n"${data.insights.missing[0]?.suggestion || 'None Found'}"`);
    
  } catch (e) {
    console.error('Network Error (Is the Express Server running?):', e.message);
  }
}

async function runTests() {
  // Test 1: Complete Default Execution
  await simulateClientRequest('chat app with real-time updates and an admin dashboard');

  // Test 2: Filtered execution retrieving exclusively the 'simple' view via Query Parameter
  await simulateClientRequest('video distribution microservices platform', 'simple');
  
  // Test 3: Rejection error test on strict API constraints
  await simulateClientRequest('   '); // Empty string validates middleware defense
}

runTests();
