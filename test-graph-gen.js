const { parseInput } = require('./server/src/engine/parser.js');
const { mapCapabilitiesToLayers } = require('./server/src/engine/capabilityMapper.js');
const { generateComponents } = require('./server/src/engine/componentGenerator.js');
const { buildGraph } = require('./server/src/engine/graphBuilder.js');

const input = "scalable chat app with live location tracking and analytics dashboard";
console.log(`\n--- [1/4] PARSER STAGE ---\n`);
const parserOut = parseInput(input);
console.log(`${parserOut.capabilities.length} capabilities detected.`);

console.log(`\n--- [2/4] LAYER STAGE ---\n`);
const layersOut = mapCapabilitiesToLayers(parserOut);

console.log(`\n--- [3/4] COMPONENT GENERATION STAGE ---\n`);
const compOut = generateComponents(layersOut);
const totalComponents = Object.values(compOut.components).reduce((sum, list) => sum + list.length, 0);
console.log(`Generated ${totalComponents} architecture components across tiers.`);

console.log(`\n--- [4/4] GRAPH BUILDER STAGE ---\n`);
const graphOut = buildGraph(compOut);

console.log(JSON.stringify(graphOut, null, 2));

console.log(`\n--------------------------------\n`);
