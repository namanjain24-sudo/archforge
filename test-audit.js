/**
 * Deep architecture audit — validates every flow and component
 */
require('dotenv').config({ path: '.env' });
const { runPipeline } = require('./server/src/engine/index.js');

const PROMPTS = [
  'build an ecommerce platform with payments, inventory management and user authentication',
  'build a real-time chat app with notifications and file sharing',
];

function isInfraName(name) {
  const n = (name || '').toLowerCase();
  return n.includes('gateway') || n.includes('cdn') || n.includes('balancer') ||
    n.includes('rate') || n.includes('circuit') || n.includes('registry') ||
    n.includes('config') || n.includes('mesh') || n.includes('observab') ||
    n.includes('collector') || n.includes('saga') || n.includes('waf') ||
    n.includes('firewall') || n.includes('monitor') || n.includes('jaeger') ||
    n.includes('prometheus') || n.includes('loki') || n.includes('grafana');
}

async function audit(prompt) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`AUDIT: "${prompt}"`);
  console.log('='.repeat(80));

  const r = await runPipeline(prompt);
  const nodeMap = new Map();
  for (const layer in r.components) {
    for (const c of r.components[layer]) nodeMap.set(c.id, c);
  }

  const issues = [];

  // 1. Check saga → DB direct (violation: saga should coordinate, not own data)
  for (const f of r.flows) {
    const src = nodeMap.get(f.source);
    const tgt = nodeMap.get(f.target);
    if (!src || !tgt) {
      issues.push(`DANGLING: ${f.source} -> ${f.target}`);
      continue;
    }
    // Saga orchestrator connecting to DB directly
    if ((src.name || '').toLowerCase().includes('saga') && tgt.type === 'database') {
      issues.push(`SAGA_DB_DIRECT: ${src.name} -> ${tgt.name} (Saga should only coordinate services, not write to DB)`);
    }
    // Saga connecting to cache directly
    if ((src.name || '').toLowerCase().includes('saga') && tgt.type === 'cache') {
      issues.push(`SAGA_CACHE_DIRECT: ${src.name} -> ${tgt.name} (Saga should coordinate services only)`);
    }
    // Gateway routed to Saga (saga is not a user-facing service)
    if ((src.name || '').toLowerCase().includes('gateway') && (tgt.name || '').toLowerCase().includes('saga')) {
      issues.push(`GATEWAY_TO_SAGA: ${src.name} -> ${tgt.name} (Saga is internal; gateway should not route to it directly)`);
    }
  }

  // 2. Check core services without dedicated DB (db-per-service)
  const svcWithDB = new Set();
  for (const f of r.flows) {
    const tgt = nodeMap.get(f.target);
    if (tgt && tgt.type === 'database') svcWithDB.add(f.source);
  }
  const coreServices = [];
  for (const [id, c] of nodeMap) {
    if (c.type === 'service' && !isInfraName(c.name)) {
      coreServices.push(c);
    }
  }
  for (const s of coreServices) {
    if (!svcWithDB.has(s.id)) {
      issues.push(`NO_DB: ${s.name} has no database connection`);
    }
  }

  // 3. Check for auth service NOT wired from gateway
  const authSvc = [...nodeMap.values()].find(c => (c.capability || '') === 'authentication' && c.type === 'service');
  const gateway = [...nodeMap.values()].find(c => (c.capability || '') === 'api-gateway');
  if (authSvc && gateway) {
    const gwToAuth = r.flows.some(f => f.source === gateway.id && f.target === authSvc.id);
    if (!gwToAuth) {
      issues.push(`AUTH_NOT_AT_GATEWAY: Gateway does not route to ${authSvc.name}`);
    }
  }

  // 4. Check for async-pipeline without queue consumer
  const queues = [...nodeMap.values()].filter(c => c.type === 'queue');
  for (const q of queues) {
    const hasConsumer = r.flows.some(f => f.source === q.id);
    if (!hasConsumer) {
      issues.push(`QUEUE_NO_CONSUMER: ${q.name} has no consumer`);
    }
  }

  // 5. Check: payment service should use circuit breaker for external calls
  const paymentSvc = [...nodeMap.values()].find(c => (c.capability || '') === 'payment-processing' && c.type === 'service');
  const paymentExt = [...nodeMap.values()].find(c => (c.capability || '') === 'payment-processing' && c.type === 'external');
  if (paymentSvc && paymentExt) {
    const directCall = r.flows.some(f => f.source === paymentSvc.id && f.target === paymentExt.id);
    if (directCall) {
      issues.push(`PAYMENT_NO_CB: Payment service calls external gateway directly without circuit breaker`);
    }
  }

  // 6. Invariants still violated after pipeline
  console.log('\n--- INVARIANT STATUS ---');
  for (const inv of r.insights.invariants.results) {
    if (inv.status === 'VIOLATED') {
      console.log(`  ❌ ${inv.id} (${inv.severity})`);
      issues.push(`INVARIANT_STILL_VIOLATED: ${inv.id}`);
    } else if (inv.status === 'SATISFIED') {
      console.log(`  ✅ ${inv.id}`);
    }
  }

  // Print issues
  console.log('\n--- ISSUES FOUND ---');
  if (issues.length === 0) {
    console.log('  ✅ No issues found!');
  } else {
    for (const issue of issues) {
      console.log(`  ❌ ${issue}`);
    }
  }
  console.log(`\nTotal issues: ${issues.length}`);
  console.log(`Components: ${nodeMap.size}, Flows: ${r.flows.length}`);
  console.log(`AI: ${r.aiUsed ? r.aiProvider : 'none'}`);

  return issues;
}

(async () => {
  const allIssues = [];
  for (const p of PROMPTS) {
    const issues = await audit(p);
    allIssues.push(...issues);
  }
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TOTAL ISSUES ACROSS ALL PROMPTS: ${allIssues.length}`);
  console.log('='.repeat(80));
})();
