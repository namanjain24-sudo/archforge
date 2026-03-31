const { parseInput } = require('./server/src/engine/parser.js');
const { mapCapabilitiesToLayers } = require('./server/src/engine/capabilityMapper.js');

const input = "scalable chat app with live location tracking and analytics dashboard";
console.log(`\n--- [1/2] PARSER PIPELINE: "${input}" ---\n`);

const parserOutput = parseInput(input);
console.log(JSON.stringify(parserOutput.capabilities, null, 2));

console.log(`\n--- [2/2] LAYER MAPPING STAGE ---\n`);

const layerOutput = mapCapabilitiesToLayers(parserOutput);
console.log(JSON.stringify(layerOutput, null, 2));

console.log(`\n--------------------------------\n`);
