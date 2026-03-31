const { parseInput } = require('./server/src/engine/parser.js');

const inputs = [
  "chat-first news system with real-time updates and push notifications",
  "  ", // empty input edge case
  "Realtime realtime REAL-TIME", // duplicate words and mixed casing
  "some completely unknown words here", // unknown tokens
  "ecommerce platform with login and database" // synonym mapping
];

for (const input of inputs) {
  console.log(`\n--- PARSING: "${input}" ---\n`);
  const result = parseInput(input);
  console.log(JSON.stringify(result, null, 2));
}

console.log(`\n--------------------------------\n`);
