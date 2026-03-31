// Direct pipeline audit — completely bypasses LLM by mocking enhanceWithAI
const Module = require('module');
const origResolve = Module._resolveFilename;

// Mock the AI wrapper to return immediately
Module._resolveFilename = function(request, parent, ...args) {
  return origResolve.call(this, request, parent, ...args);
};

// Monkey-patch aiWrapper before pipeline loads it
const aiWrapperPath = require.resolve('./server/src/engine/aiWrapper.js');
require.cache[aiWrapperPath] = {
  id: aiWrapperPath,
  filename: aiWrapperPath,
  loaded: true,
  exports: {
    enhanceWithAI: async () => ({ success: false, data: null })
  }
};

const { runPipeline } = require('./server/src/engine/index.js');

(async () => {
  const start = Date.now();
  const result = await runPipeline('Design an e-commerce platform with payment processing, product catalog, user authentication, and real-time order tracking');
  console.log('Pipeline time:', Date.now() - start, 'ms');
  
  const comps = Object.values(result.components).flat();
  
  console.log('\n=== COMPONENT AUDIT ===');
  console.log('Total:', comps.length);
  
  const infraPattern = /gateway|balancer|waf|cdn|rate|circuit|registry|consul|mesh|monitor|jaeger|prometheus|loki|grafana|collector|observability|config|saga/i;
  const services = comps.filter(c => c.type === 'service' && !infraPattern.test(c.name));
  const dbs = comps.filter(c => c.type === 'database');
  console.log('\nCore services:', services.map(s => s.name));
  console.log('Databases:', dbs.map(d => d.name));
  console.log('Queues:', comps.filter(c => c.type === 'queue').map(q => q.name));
  console.log('Workers:', comps.filter(c => c.type === 'worker').map(w => w.name));
  console.log('Externals:', comps.filter(c => c.type === 'external').map(e => e.name));
  console.log('Caches:', comps.filter(c => c.type === 'cache').map(c => c.name));
  console.log('UIs:', comps.filter(c => c.type === 'ui').map(u => u.name));

  console.log('\n=== FLOW AUDIT ===');
  console.log('Total flows:', result.flows.length);
  const protocols = {};
  result.flows.forEach(f => { protocols[f.protocol] = (protocols[f.protocol] || 0) + 1; });
  console.log('Protocols:', JSON.stringify(protocols));

  const { canConnect } = require('./server/src/engine/connectionValidator.js');
  const nodeMap = new Map(comps.map(c => [c.id, c]));
  let illegal = 0;
  for (const flow of result.flows) {
    const s = nodeMap.get(flow.source);
    const t = nodeMap.get(flow.target);
    if (s && t && !canConnect(s, t)) {
      console.log('ILLEGAL:', s.name, '->', t.name);
      illegal++;
    }
  }
  console.log('Illegal connections:', illegal);

  console.log('\n=== INVARIANTS ===');
  result.insights.invariants.results.forEach(r => {
    console.log(' ', r.status.padEnd(16), r.name);
  });

  const dbUsers = {};
  for (const flow of result.flows) {
    const s = nodeMap.get(flow.source);
    const t = nodeMap.get(flow.target);
    if (s && t && s.type === 'service' && t.type === 'database') {
      if (!dbUsers[t.name]) dbUsers[t.name] = new Set();
      dbUsers[t.name].add(s.name);
    }
  }
  console.log('\n=== DB OWNERSHIP ===');
  for (const [db, users] of Object.entries(dbUsers)) {
    const arr = [...users];
    console.log(db, ':', arr.join(', '), arr.length > 1 ? 'SHARED!' : 'OK');
  }

  console.log('\n=== AGENT REPORT ===');
  console.log('Score:', result.insights.agentReport.critique.score);
  result.insights.agentReport.critique.flaws.forEach(f => {
    console.log(' ', f.severity, f.type, f.node || f.service || f.database || f.component || f.flow || '');
  });

  const connected = new Set();
  result.flows.forEach(f => { connected.add(f.source); connected.add(f.target); });
  const orphans = comps.filter(c => !connected.has(c.id));
  console.log('\nOrphans:', orphans.length ? orphans.map(o => o.name) : 'NONE');

  console.log('\n=== INFRA CHECKLIST ===');
  const ck = (l, t) => console.log(' [' + (t ? 'Y' : 'N') + ']', l);
  ck('CDN', comps.some(c => c.name.toLowerCase().includes('cdn')));
  ck('WAF', comps.some(c => c.name.toLowerCase().includes('waf')));
  ck('LB', comps.some(c => c.name.toLowerCase().includes('balancer') || c.name.toLowerCase().includes('load')));
  ck('Gateway', comps.some(c => c.name.toLowerCase().includes('gateway')));
  ck('Secrets', comps.some(c => c.name.toLowerCase().includes('vault') || c.name.toLowerCase().includes('secrets')));
  ck('Saga', comps.some(c => c.name.toLowerCase().includes('saga')));
  ck('Queue', comps.some(c => c.type === 'queue'));
  ck('Cache', comps.some(c => c.type === 'cache'));
  ck('Circuit Breaker', comps.some(c => c.name.toLowerCase().includes('circuit')));
  ck('Registry', comps.some(c => c.name.toLowerCase().includes('registry') || c.name.toLowerCase().includes('consul')));
  ck('Observability', comps.some(c => c.name.toLowerCase().includes('observability') || c.name.toLowerCase().includes('collector')));

  console.log('\n=== ALL FLOWS ===');
  result.flows.forEach((f, i) => {
    const sN = nodeMap.get(f.source)?.name || f.source;
    const tN = nodeMap.get(f.target)?.name || f.target;
    console.log((i+1) + '. ' + sN + ' -> ' + tN + ' [' + f.protocol + '] (' + f.pipelineId + ')');
  });

  console.log('\nDONE');
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
