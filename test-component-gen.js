const { parseInput } = require('./server/src/engine/parser.js');
const { mapCapabilitiesToLayers } = require('./server/src/engine/capabilityMapper.js');
const { generateComponents } = require('./server/src/engine/componentGenerator.js');

const input = "scalable chat app with live location tracking and analytics dashboard";
console.log(`\n--- [1/3] PARSER STAGE: "${input}" ---\n`);
const parserOut = parseInput(input);
console.log(`${parserOut.capabilities.length} capabilities detected.`);

console.log(`\n--- [2/3] LAYER STAGE ---\n`);
const layersOut = mapCapabilitiesToLayers(parserOut);
console.log(`Mapped active layers successfully across structural boundaries.`);

console.log(`\n--- [3/3] COMPONENT GENERATION STAGE ---\n`);
const compOut = generateComponents(layersOut);

console.log(JSON.stringify(compOut, null, 2));

console.log(`\n--------------------------------\n`);
