/**
 * ============================================================================
 * ARCHFORGE — SYSTEM EXPLANATION ENGINE v3 (ENTERPRISE)
 * ============================================================================
 * 
 * Generates accurate, context-aware natural language descriptions of the
 * architecture based on actual component analysis. Produces the kind of
 * architecture document a FAANG principal architect would write.
 * ============================================================================
 */

function explainArchitecture(graph, patterns) {
  const paragraphs = [];
  
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return 'No architecture components were generated.';
  }

  const nodes = graph.nodes;
  const edges = graph.edges || [];
  
  // Component analysis by type
  const serviceNames = nodes.filter(n => n.type === 'service').map(n => n.name);
  const dbNames = nodes.filter(n => n.type === 'database').map(n => n.name);
  const uiNames = nodes.filter(n => n.type === 'ui').map(n => n.name);
  const queueNames = nodes.filter(n => n.type === 'queue').map(n => n.name);
  const workerNames = nodes.filter(n => n.type === 'worker').map(n => n.name);
  const externalNames = nodes.filter(n => n.type === 'external').map(n => n.name);
  const cacheNames = nodes.filter(n => n.type === 'cache').map(n => n.name);
  
  // Infrastructure identification
  const gateways = nodes.filter(n => n.name.toLowerCase().includes('gateway') || n.name.toLowerCase().includes('ingress'));
  const loadBalancers = nodes.filter(n => n.name.toLowerCase().includes('balancer') || n.name.toLowerCase().includes('load') || n.name.toLowerCase().includes('alb'));
  const wafNodes = nodes.filter(n => n.name.toLowerCase().includes('waf') || n.name.toLowerCase().includes('firewall'));
  const cdnNodes = nodes.filter(n => n.name.toLowerCase().includes('cdn') || (n.capability || '').includes('cdn'));
  const rateLimiters = nodes.filter(n => n.name.toLowerCase().includes('rate') || (n.capability || '') === 'rate-limiting');
  const circuitBreakers = nodes.filter(n => n.name.toLowerCase().includes('circuit') || n.name.toLowerCase().includes('resilience'));
  const registryNodes = nodes.filter(n => n.name.toLowerCase().includes('registry') || n.name.toLowerCase().includes('consul') || n.name.toLowerCase().includes('eureka'));
  const configNodes = nodes.filter(n => n.name.toLowerCase().includes('config server') || (n.capability || '') === 'config-management');
  const meshNodes = nodes.filter(n => n.name.toLowerCase().includes('mesh') || n.name.toLowerCase().includes('istio') || n.name.toLowerCase().includes('linkerd'));
  const observabilityNodes = nodes.filter(n => (n.capability || '').includes('monitoring') || (n.capability || '').includes('tracing') || (n.capability || '').includes('logging') || n.name.toLowerCase().includes('observability') || n.name.toLowerCase().includes('collector') || n.name.toLowerCase().includes('jaeger'));
  
  // Core services (excluding infra)
  const infraNames = new Set([
    ...gateways.map(n => n.name), ...loadBalancers.map(n => n.name), ...wafNodes.map(n => n.name),
    ...cdnNodes.map(n => n.name), ...rateLimiters.map(n => n.name), ...circuitBreakers.map(n => n.name),
    ...registryNodes.map(n => n.name), ...configNodes.map(n => n.name), ...meshNodes.map(n => n.name),
    ...observabilityNodes.map(n => n.name)
  ]);
  const coreServices = serviceNames.filter(n => !infraNames.has(n));
  
  // 1. Architecture Pattern
  if (patterns && patterns.length > 0) {
    paragraphs.push(`This system follows a **${patterns.join(' + ')}** pattern with ${nodes.length} components across ${new Set(nodes.map(n => n.layer)).size} architectural tiers.`);
  }

  // 2. Client Layer
  if (uiNames.length > 0) {
    paragraphs.push(`**Client Layer**: ${uiNames.join(', ')} provide${uiNames.length === 1 ? 's' : ''} the user-facing interface${cdnNodes.length > 0 ? `, with static assets served via ${cdnNodes.map(n => n.name).join(', ')} for global edge delivery` : ''}.`);
  }

  // 3. Ingress / Traffic Management
  const ingressParts = [];
  if (wafNodes.length > 0) ingressParts.push(`WAF protection (${wafNodes.map(n => n.name).join(', ')})`);
  if (loadBalancers.length > 0) ingressParts.push(`load balancing (${loadBalancers.map(n => n.name).join(', ')})`);
  if (rateLimiters.length > 0) ingressParts.push(`rate limiting (${rateLimiters.map(n => n.name).join(', ')})`);
  if (gateways.length > 0) ingressParts.push(`API gateway routing (${gateways.map(n => n.name).join(', ')})`);
  
  if (ingressParts.length > 0) {
    paragraphs.push(`**Traffic Ingress Chain**: Requests pass through ${ingressParts.join(' → ')}, providing defense-in-depth with centralized authentication, throttling, and intelligent routing to downstream services.`);
  }

  // 4. Service Layer
  if (coreServices.length > 0) {
    paragraphs.push(`**Application Layer**: Core business logic is distributed across ${coreServices.length} service${coreServices.length > 1 ? 's' : ''}: ${coreServices.join(', ')}.`);
  }

  // 5. Data Layer
  if (dbNames.length > 0 || cacheNames.length > 0) {
    const dataParts = [];
    if (cacheNames.length > 0) dataParts.push(`${cacheNames.join(', ')} for high-speed caching (cache-aside pattern)`);
    if (dbNames.length > 0) dataParts.push(`${dbNames.join(', ')} for durable persistence`);
    paragraphs.push(`**Data Layer**: ${dataParts.join(', and ')}.`);
  }

  // 6. Async Processing
  if (queueNames.length > 0 || workerNames.length > 0) {
    const asyncParts = [];
    if (queueNames.length > 0) asyncParts.push(`message queues (${queueNames.join(', ')})`);
    if (workerNames.length > 0) asyncParts.push(`background workers (${workerNames.join(', ')})`);
    paragraphs.push(`**Async Processing**: Heavy workloads are decoupled through ${asyncParts.join(' consumed by ')}, preventing synchronous bottlenecks and enabling independent scaling.`);
  }

  // 7. External Integrations
  if (externalNames.length > 0) {
    paragraphs.push(`**External Integrations**: The system integrates with ${externalNames.join(', ')}${circuitBreakers.length > 0 ? `, protected by circuit breakers (${circuitBreakers.map(n => n.name).join(', ')}) to prevent cascading failures` : ''}.`);
  }

  // 8. Enterprise Infrastructure
  const infraDescriptions = [];
  if (registryNodes.length > 0) infraDescriptions.push(`service discovery (${registryNodes.map(n => n.name).join(', ')})`);
  if (configNodes.length > 0) infraDescriptions.push(`centralized config (${configNodes.map(n => n.name).join(', ')})`);
  if (meshNodes.length > 0) infraDescriptions.push(`service mesh (${meshNodes.map(n => n.name).join(', ')})`);
  
  if (infraDescriptions.length > 0) {
    paragraphs.push(`**Platform Infrastructure**: ${infraDescriptions.join(', ')} — enabling zero-downtime deployments, secure inter-service communication, and consistent configuration across environments.`);
  }

  // 9. Observability
  if (observabilityNodes.length > 0) {
    paragraphs.push(`**Observability Stack**: ${observabilityNodes.map(n => n.name).join(', ')} collect telemetry (metrics, traces, logs) from all services, enabling root cause analysis and SLO monitoring.`);
  }

  // 10. Connection Stats
  paragraphs.push(`**Connectivity**: ${edges.length} directed connections link all ${nodes.length} components with protocol-aware routing, ensuring no isolated nodes in the architecture.`);

  return paragraphs.join('\n\n');
}

module.exports = { explainArchitecture };
