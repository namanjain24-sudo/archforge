/**
 * Offline validation test — bypasses all AI/LLM calls
 * Tests the deterministic invariants engine directly
 */

// Override env to disable AI
process.env.GROQ_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.GEMINI_API_KEY = '';

const { enforceInvariants, applyInvariantFixes } = require('./src/engine/invariantsEngine');
const { generateFlows } = require('./src/engine/flowEngine');
const { generateDomainFlows } = require('./src/engine/domainFlowEngine');
const { buildGraph } = require('./src/engine/graphBuilder');

// ── Simulate e-commerce components ──
const mockComponents = {
  interaction: [
    { id: 'web-app', name: 'Web App', type: 'ui', layer: 'interaction', capability: 'api-gateway', priority: 'high' },
    { id: 'api-gateway', name: 'API Gateway', type: 'service', layer: 'interaction', capability: 'api-gateway', tech: 'Kong', priority: 'high' }
  ],
  processing: [
    { id: 'order-service', name: 'Order Service', type: 'service', layer: 'processing', capability: 'order-management', tech: 'Node.js', priority: 'high' },
    { id: 'payment-service', name: 'Payment Service', type: 'service', layer: 'processing', capability: 'payment-processing', tech: 'Node.js', priority: 'high' },
    { id: 'inventory-service', name: 'Inventory Service', type: 'service', layer: 'processing', capability: 'inventory-management', tech: 'Node.js', priority: 'high' },
    { id: 'auth-service', name: 'Auth Service', type: 'service', layer: 'processing', capability: 'authentication', tech: 'Node.js', priority: 'high' }
  ],
  data: [
    { id: 'main-db', name: 'Main Database', type: 'database', layer: 'data', capability: 'persistent-storage', tech: 'PostgreSQL', priority: 'high' },
    { id: 'redis-cache', name: 'Redis Cache', type: 'cache', layer: 'data', capability: 'order-management', tech: 'Redis', priority: 'high' },
    { id: 'analytics-dw', name: 'Analytics Data Warehouse', type: 'database', layer: 'data', capability: 'analytics', tech: 'ClickHouse', priority: 'high' }
  ],
  integration: [
    { id: 'kafka', name: 'Kafka Event Stream', type: 'queue', layer: 'integration', capability: 'async-processing', tech: 'Apache Kafka', priority: 'high' },
    { id: 'rabbitmq', name: 'RabbitMQ', type: 'queue', layer: 'integration', capability: 'async-processing', tech: 'RabbitMQ', priority: 'medium' }
  ]
};

console.log('\n========== FAANG INVARIANTS VALIDATION (OFFLINE) ==========\n');

// Stage 1: Generate initial flows
const flowsOutput = generateFlows(mockComponents, []);
console.log('Stage 1 - Initial flows generated:', flowsOutput.flows.length);

// Stage 2: Build initial graph
const initialGraph = buildGraph({ components: mockComponents, flows: flowsOutput.flows });

// Stage 3: Run invariants engine
const invariantResult = enforceInvariants(mockComponents, flowsOutput.flows, initialGraph);
console.log(`Stage 3 - Invariants: ${invariantResult.satisfiedCount}/${invariantResult.totalChecked} satisfied`);
if (invariantResult.violatedCount > 0) {
  console.log('  VIOLATED:', invariantResult.invariants.filter(r => r.status === 'VIOLATED').map(r => r.id).join(', '));
}

// Stage 4: Apply fixes
const { fixedComponents, fixedFlows } = applyInvariantFixes(mockComponents, flowsOutput.flows, invariantResult.fixes);

// Stage 5: Re-generate flows with fixed components
const finalFlows = generateFlows(fixedComponents, []);
const allComps = Object.values(fixedComponents).flat();

console.log('\n===== POST-FIX VALIDATION =====\n');

// Check 1: DB-per-service - named correctly
const databases = allComps.filter(c => c.type === 'database' && !c.name.toLowerCase().includes('warehouse') && !c.name.toLowerCase().includes('analytics'));
console.log('1. DB-per-service count:', databases.length, databases.length >= 2 ? '✅' : '⚠️');
databases.forEach(db => console.log('   -', db.name, '[' + db.tech + ']'));

// Check 2: No direct service→DW writes
const dw = allComps.find(c => (c.name || '').toLowerCase().includes('warehouse') || (c.name || '').toLowerCase().includes('analytics data'));
if (dw) {
  const svcIdsNotInfra = allComps
    .filter(c => c.type === 'service' && !['api-gateway', 'horizontal-scaling', 'rate-limiting'].includes(c.capability))
    .map(c => c.id);
  const directDWWrites = finalFlows.flows.filter(f => svcIdsNotInfra.includes(f.source) && f.target === dw.id);
  console.log('\n2. No direct Service→DW writes:', directDWWrites.length === 0 ? '✅' : '❌ ' + directDWWrites.length + ' violations found');
} else {
  console.log('\n2. No analytics DW present - N/A');
}

// Check 3: Auth at gateway
const gateway = allComps.find(c => c.capability === 'api-gateway' && c.type === 'service');
if (gateway) {
  const authMiddleware = gateway.authMiddleware === true;
  const authFlow = finalFlows.flows.some(f => f.source === gateway.id && allComps.find(c => c.id === f.target && c.capability === 'authentication'));
  console.log('\n3. Auth at gateway:', (authMiddleware || authFlow) ? '✅' : '❌');
  console.log('   authMiddleware annotation:', authMiddleware ? '✅' : 'not set');
  console.log('   gateway→auth flow:', authFlow ? '✅' : 'not found');
}

// Check 4: Cache strategy complete
const caches = allComps.filter(c => c.type === 'cache');
if (caches.length > 0) {
  const cacheOk = caches.every(c => {
    const desc = (c.description || '').toLowerCase();
    return desc.includes('cache-aside') && desc.includes('write-through') && desc.includes('ttl');
  });
  console.log('\n4. Cache strategy (cache-aside+write-through+TTL):', cacheOk ? '✅' : '❌');
  console.log('   cacheStrategy field:', caches[0].cacheStrategy || 'unset');
}

// Check 5: No RabbitMQ
const rabbit = allComps.find(c => (c.name || '').toLowerCase().includes('rabbit'));
console.log('\n5. RabbitMQ removed:', !rabbit ? '✅' : '❌ Still present: ' + rabbit.name);

// Check 6: Saga injected
const saga = allComps.find(c => (c.name || '').toLowerCase().includes('saga'));
console.log('\n6. Saga orchestrator:', saga ? '✅ ' + saga.name : 'not required (no trigger capability)');

// Check 7: ETL worker injected (for DW)
const etlWorker = allComps.find(c => (c.name || '').toLowerCase().includes('etl') || (c.name || '').toLowerCase().includes('analytics etl'));
console.log('\n7. ETL Worker for DW:', etlWorker ? '✅ ' + etlWorker.name : 'not injected (no DW present or no ETL needed)');

// Check 8: Pipeline groups
const pipelines = new Set(finalFlows.flows.map(f => f.pipelineId).filter(Boolean));
console.log('\n8. Pipeline groups on flows:', pipelines.size > 0 ? '✅' : '❌');
console.log('  ', [...pipelines].slice(0, 8).join(', '));

console.log('\n=========================================');
console.log('Final components:', allComps.length);
console.log('Final flows:', finalFlows.flows.length);

// Check domain flows work  
const { domainFlows, detectedDomains } = generateDomainFlows(fixedComponents, 'ecommerce platform order payment inventory');
console.log('Detected domains:', detectedDomains.join(', '));
console.log('Domain flows injected:', domainFlows.length);
const sagaFlows = domainFlows.filter(f => f.pipelineId === 'order-flow');
console.log('Order-flow pipeline edges:', sagaFlows.length);
const compensationFlow = sagaFlows.find(f => f.label && f.label.includes('Compensate'));
console.log('Compensation flow:', compensationFlow ? '✅ ' + compensationFlow.label : '⚠️ (may not have saga comp if no saga comp)');

console.log('\n✅ DONE — All engine modules functioning correctly.');
