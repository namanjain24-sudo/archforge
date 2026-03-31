const { runPipeline } = require('./server/src/engine/index.js');

try {
  console.log(`\n==== ARCHFORGE FLOW ENGINE TEST ====\n`);

  const inputStr = "scalable microservices ecommerce platform with chat analytics";
  console.log(`Prompt: "${inputStr}"\n`);
  
  const result = runPipeline(inputStr);
  
  console.log(`[!] DETECTED PATTERNS: `);
  console.log(result.enhancements.architecturePatternsList.join(" | "));

  console.log(`\n[!] EXPLICIT FLOWS GENERATED: ${result.flows.length}`);
  result.flows.slice(0, 10).forEach((flow, i) => {
    console.log(`   ${i+1}. [${flow.source}] --(${flow.type}: ${flow.label})--> [${flow.target}]`);
  });
  if (result.flows.length > 10) console.log(`   ...and ${result.flows.length - 10} more`);

  console.log(`\n[!] DOMAIN AWARE BOOSTS INJECTED:`);
  Object.values(result.components).flat().forEach(c => {
    if (c.capability && c.capability.includes('-boost')) {
      console.log(`   + \x1b[35m${c.name}\x1b[0m (Priority: ${c.priority})`);
    } else if (c.priority === 'high') {
      console.log(`   + \x1b[36m${c.name}\x1b[0m (CRITICAL INFRA: High Priority)`);
    }
  });

  console.log(`\n✅ "Real System Design Simulator" Pipeline complete!`);

} catch (err) {
  console.error("Test Failed!", err);
}
