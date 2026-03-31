const { parseInput } = require('./server/src/engine/parser.js');
const { mapCapabilitiesToLayers } = require('./server/src/engine/capabilityMapper.js');
const { generateComponents } = require('./server/src/engine/componentGenerator.js');
const { buildGraph } = require('./server/src/engine/graphBuilder.js');
const { analyzeSystem } = require('./server/src/engine/intelligence.js');

const input = "scalable chat app with live location tracking and analytics dashboard";
console.log(`\n--- ENGINE STAGES 1 TO 4 ---\n`);

const parserOut = parseInput(input);
const layersOut = mapCapabilitiesToLayers(parserOut);
const compOut = generateComponents(layersOut);
const graphOut = buildGraph(compOut);

console.log(`Architecture Baseline securely assembled: ${graphOut.nodes.length} nodes, ${graphOut.edges.length} edges.`);

console.log(`\n--- [6/6] INTELLIGENCE ENGINE STAGE ---\n`);

// Evaluate topology via Config Heuristics
const systemData = {
  graph: graphOut,
  components: compOut.components,
  layers: layersOut.layers
};

const analysis = analyzeSystem(systemData);

console.log(JSON.stringify(analysis, null, 2));

console.log(`\n--------------------------------\n`);
