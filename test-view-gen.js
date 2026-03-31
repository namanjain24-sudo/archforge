const { parseInput } = require('./server/src/engine/parser.js');
const { mapCapabilitiesToLayers } = require('./server/src/engine/capabilityMapper.js');
const { generateComponents } = require('./server/src/engine/componentGenerator.js');
const { buildGraph } = require('./server/src/engine/graphBuilder.js');
const { generateViews } = require('./server/src/engine/viewEngine.js');

const input = "scalable chat app with live location tracking and analytics dashboard";
console.log(`\n--- ENGINE STAGES 1 TO 4 ---\n`);

// Engine Execution Chain
const parserOut = parseInput(input);
const layersOut = mapCapabilitiesToLayers(parserOut);
const compOut = generateComponents(layersOut);
const graphOut = buildGraph(compOut);

console.log(`Pipeline generated ${graphOut.nodes.length} nodes and ${graphOut.edges.length} edges.`);

console.log(`\n--- [5/5] VIEW ENGINE STAGE ---\n`);
const views = generateViews(graphOut);

console.log("== 1. SIMPLE VIEW ==");
console.log(`Rendered Node Count: ${views.simple.nodes.length}`);
console.log(`Rendered Edge Count: ${views.simple.edges.length}\n`);
console.log(JSON.stringify(views.simple.nodes.slice(0, 2), null, 2));

console.log("\n== 2. DETAILED VIEW ==");
console.log(`Rendered Node Count: ${views.detailed.nodes.length}`);
console.log(`Rendered Edge Count: ${views.detailed.edges.length}\n`);
console.log(JSON.stringify(views.detailed.nodes.slice(0, 2), null, 2));

console.log("\n== 3. LAYERED VIEW ==");
console.log(`Rendered Node Count: ${views.layered.nodes.length} (Including layout groups)`);
console.log(`Rendered Edge Count: ${views.layered.edges.length}\n`);

// Displaying a group block and its child nested inside it
const parentSample = views.layered.nodes.find(n => n.type === 'group');
const childSample = views.layered.nodes.find(n => n.parentNode === parentSample.id);
console.log(JSON.stringify([parentSample, childSample], null, 2));

console.log(`\n--------------------------------\n`);
