/**
 * ============================================================================
 * ARCHFORGE — FLOW SIMULATOR v1 (FAANG-GRADE PATH TRACER)
 * ============================================================================
 *
 * Simulates 3 flow paths through the architecture for each domain pipeline:
 *   1. REQUEST path  — happy path forward (client → backend → response)
 *   2. RESPONSE path — data flowing back to client
 *   3. ASYNC path    — event-driven side effects (queue → worker → DB)
 *
 * Produces:
 *   - Step-by-step path traces with latency estimates
 *   - Bottleneck identification
 *   - Pipeline completeness scores
 *   - Cache hit/miss simulation
 *
 * DESIGN:
 *   Fully deterministic. No LLM calls. Uses graph traversal with
 *   latency models based on component types.
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════
// LATENCY MODELS (p50 in milliseconds)
// ═══════════════════════════════════════════════════════════════

const LATENCY_MODEL = {
  'ui':        { hop: 0, label: 'Client' },
  'service':   { hop: 5, label: 'Service' },
  'cache':     { hop: 1, label: 'Cache (in-memory)' },
  'database':  { hop: 15, label: 'Database (OLTP)' },
  'queue':     { hop: 3, label: 'Message Queue' },
  'worker':    { hop: 50, label: 'Async Worker' },
  'external':  { hop: 100, label: 'External API' }
};

const PROTOCOL_OVERHEAD = {
  'HTTPS':    2,
  'gRPC':     1,
  'WSS':      1,
  'TCP':      0.5,
  'TCP/SQL':  2,
  'TCP/TLS':  1.5,
  'AMQP':     1,
  'HTTP':     2
};

// ═══════════════════════════════════════════════════════════════
// GRAPH TRAVERSAL — Build adjacency lists from flows
// ═══════════════════════════════════════════════════════════════

function buildAdjacencyList(flows) {
  const forward = {};  // source → [{ target, flow }]
  const reverse = {};  // target → [{ source, flow }]

  for (const flow of flows) {
    if (!forward[flow.source]) forward[flow.source] = [];
    if (!reverse[flow.target]) reverse[flow.target] = [];
    forward[flow.source].push({ target: flow.target, flow });
    reverse[flow.target].push({ source: flow.source, flow });
  }

  return { forward, reverse };
}

// ═══════════════════════════════════════════════════════════════
// PATH TRACER — Follows a chain through the graph
// ═══════════════════════════════════════════════════════════════

function traceRequestPath(startId, adjacency, nodeMap, pipelineFilter, maxHops = 12) {
  const path = [];
  const visited = new Set();
  let current = startId;
  let totalLatency = 0;

  while (current && path.length < maxHops) {
    if (visited.has(current)) break;
    visited.add(current);

    const node = nodeMap.get(current);
    if (!node) break;

    const hopLatency = (LATENCY_MODEL[node.type] || { hop: 5 }).hop;
    totalLatency += hopLatency;

    path.push({
      nodeId: current,
      nodeName: node.name,
      nodeType: node.type,
      layer: node.layer,
      hopLatency,
      cumulativeLatency: totalLatency
    });

    // Find next hop (prefer pipeline-matching edges)
    const neighbors = adjacency.forward[current] || [];
    const pipelineEdges = pipelineFilter
      ? neighbors.filter(n => n.flow.pipelineId && n.flow.pipelineId.includes(pipelineFilter))
      : [];
    const requestEdges = neighbors.filter(n => n.flow.type === 'request' || n.flow.type === 'event');

    const nextEdge = pipelineEdges[0] || requestEdges[0] || neighbors[0];
    if (!nextEdge) break;

    // Add protocol overhead
    const protocolOverhead = PROTOCOL_OVERHEAD[nextEdge.flow.protocol] || 2;
    totalLatency += protocolOverhead;

    if (path.length > 0) {
      path[path.length - 1].nextEdge = {
        label: nextEdge.flow.label,
        protocol: nextEdge.flow.protocol,
        protocolLatency: protocolOverhead
      };
    }

    current = nextEdge.target;
  }

  return { path, totalLatency };
}

function traceResponsePath(endId, adjacency, nodeMap, maxHops = 8) {
  const path = [];
  const visited = new Set();
  let current = endId;
  let totalLatency = 0;

  while (current && path.length < maxHops) {
    if (visited.has(current)) break;
    visited.add(current);

    const node = nodeMap.get(current);
    if (!node) break;

    const hopLatency = (LATENCY_MODEL[node.type] || { hop: 5 }).hop;
    totalLatency += hopLatency;

    path.push({
      nodeId: current,
      nodeName: node.name,
      nodeType: node.type,
      direction: 'response',
      hopLatency,
      cumulativeLatency: totalLatency
    });

    // Follow response-type edges or reverse edges
    const responseEdges = (adjacency.forward[current] || []).filter(n => n.flow.type === 'response');
    const reverseEdges = (adjacency.reverse[current] || [])
      .filter(n => !visited.has(n.source))
      .filter(n => {
        const srcNode = nodeMap.get(n.source);
        return srcNode && (srcNode.type === 'service' || srcNode.type === 'ui');
      });

    const nextEdge = responseEdges[0];
    if (nextEdge) {
      totalLatency += PROTOCOL_OVERHEAD[nextEdge.flow.protocol] || 2;
      current = nextEdge.target;
    } else if (reverseEdges[0]) {
      totalLatency += 2; // Response overhead
      current = reverseEdges[0].source;
    } else {
      break;
    }
  }

  return { path, totalLatency };
}

function traceAsyncPath(queueNodeId, adjacency, nodeMap, maxHops = 8) {
  const path = [];
  const visited = new Set();
  let current = queueNodeId;
  let totalLatency = 0;

  while (current && path.length < maxHops) {
    if (visited.has(current)) break;
    visited.add(current);

    const node = nodeMap.get(current);
    if (!node) break;

    const hopLatency = (LATENCY_MODEL[node.type] || { hop: 5 }).hop;
    totalLatency += hopLatency;

    path.push({
      nodeId: current,
      nodeName: node.name,
      nodeType: node.type,
      direction: 'async',
      hopLatency,
      cumulativeLatency: totalLatency
    });

    // Follow async/event edges
    const asyncEdges = (adjacency.forward[current] || []).filter(n =>
      n.flow.type === 'async' || n.flow.type === 'event'
    );

    const nextEdge = asyncEdges[0];
    if (nextEdge) {
      totalLatency += PROTOCOL_OVERHEAD[nextEdge.flow.protocol] || 1;
      current = nextEdge.target;
    } else {
      break;
    }
  }

  return { path, totalLatency };
}

// ═══════════════════════════════════════════════════════════════
// BOTTLENECK DETECTION
// ═══════════════════════════════════════════════════════════════

function identifyBottlenecks(paths) {
  const bottlenecks = [];

  for (const trace of paths) {
    for (const step of trace.path) {
      if (step.hopLatency >= 50) {
        bottlenecks.push({
          node: step.nodeName,
          type: step.nodeType,
          latency: step.hopLatency,
          severity: step.hopLatency >= 100 ? 'high' : 'medium',
          suggestion: step.nodeType === 'external'
            ? 'Add circuit breaker + cache for external API calls'
            : step.nodeType === 'database'
              ? 'Add read replica or cache-aside pattern'
              : 'Consider async processing or batching'
        });
      }
    }
  }

  return bottlenecks;
}

// ═══════════════════════════════════════════════════════════════
// CACHE INVALIDATION SIMULATION
// ═══════════════════════════════════════════════════════════════

function simulateCacheInvalidation(flows, nodeMap) {
  // Find write paths: Service → DB
  const writePaths = flows.filter(f => {
    const src = nodeMap.get(f.source);
    const tgt = nodeMap.get(f.target);
    return src && tgt && src.type === 'service' && tgt.type === 'database' &&
           (f.pipelineId === 'data-access' || f.pipelineId === 'cache-invalidation');
  });

  // Find cache connections: Service → Cache
  const cachePaths = flows.filter(f => {
    const src = nodeMap.get(f.source);
    const tgt = nodeMap.get(f.target);
    return src && tgt && src.type === 'service' && tgt.type === 'cache';
  });

  if (writePaths.length === 0 || cachePaths.length === 0) {
    return { hasCacheInvalidation: false, flows: [] };
  }

  const invalidationFlows = [];
  for (const write of writePaths) {
    const service = nodeMap.get(write.source);
    const db = nodeMap.get(write.target);

    // Find matching cache for this service
    const cacheFlow = cachePaths.find(cf => cf.source === write.source);
    if (cacheFlow) {
      const cache = nodeMap.get(cacheFlow.target);
      invalidationFlows.push({
        trigger: `${service.name} writes to ${db.name}`,
        step1: `${db.name} acknowledges write`,
        step2: `${service.name} invalidates key in ${cache.name}`,
        step3: `${cache.name} confirms invalidation`,
        latency: '~18ms (15ms DB write + 1ms cache invalidation + 2ms overhead)',
        pattern: 'Write-through with pub/sub invalidation'
      });
    }
  }

  return {
    hasCacheInvalidation: invalidationFlows.length > 0,
    flows: invalidationFlows
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: SIMULATE FLOWS
// ═══════════════════════════════════════════════════════════════

/**
 * Runs flow simulation for all detected domain pipelines.
 *
 * @param {object} graph - { nodes, edges }
 * @param {Array} flows - Flow array
 * @param {string[]} detectedDomains - Detected domains
 * @returns {object} Simulation results
 */
function simulateFlows(graph, flows, detectedDomains = []) {
  const nodeMap = new Map((graph.nodes || []).map(n => [n.id, n]));
  const adjacency = buildAdjacencyList(flows);

  const simulations = {};

  // Find entry points (UI nodes)
  const uiNodes = (graph.nodes || []).filter(n => n.type === 'ui');
  const queueNodes = (graph.nodes || []).filter(n => n.type === 'queue');
  const dbNodes = (graph.nodes || []).filter(n => n.type === 'database');

  // Simulate per domain
  for (const domain of detectedDomains) {
    const domainSim = {
      domain,
      requestPath: null,
      responsePath: null,
      asyncPath: null,
      totalE2ELatency: 0
    };

    // Request path: start from UI
    if (uiNodes.length > 0) {
      const reqTrace = traceRequestPath(uiNodes[0].id, adjacency, nodeMap, domain);
      domainSim.requestPath = reqTrace;
    }

    // Response path: start from deepest node in request path
    if (domainSim.requestPath && domainSim.requestPath.path.length > 0) {
      const deepestNode = domainSim.requestPath.path[domainSim.requestPath.path.length - 1];
      const respTrace = traceResponsePath(deepestNode.nodeId, adjacency, nodeMap);
      domainSim.responsePath = respTrace;
    }

    // Async path: start from queue
    if (queueNodes.length > 0) {
      const asyncTrace = traceAsyncPath(queueNodes[0].id, adjacency, nodeMap);
      domainSim.asyncPath = asyncTrace;
    }

    // Total E2E latency
    domainSim.totalE2ELatency =
      (domainSim.requestPath?.totalLatency || 0) +
      (domainSim.responsePath?.totalLatency || 0);

    simulations[domain] = domainSim;
  }

  // If no domains detected, do a generic simulation
  if (detectedDomains.length === 0 && uiNodes.length > 0) {
    const reqTrace = traceRequestPath(uiNodes[0].id, adjacency, nodeMap, null);
    const deepest = reqTrace.path[reqTrace.path.length - 1];
    const respTrace = deepest ? traceResponsePath(deepest.nodeId, adjacency, nodeMap) : { path: [], totalLatency: 0 };
    const asyncTrace = queueNodes.length > 0 ? traceAsyncPath(queueNodes[0].id, adjacency, nodeMap) : { path: [], totalLatency: 0 };

    simulations['general'] = {
      domain: 'general',
      requestPath: reqTrace,
      responsePath: respTrace,
      asyncPath: asyncTrace,
      totalE2ELatency: reqTrace.totalLatency + respTrace.totalLatency
    };
  }

  // Bottleneck analysis across all paths
  const allPaths = Object.values(simulations).flatMap(s =>
    [s.requestPath, s.responsePath, s.asyncPath].filter(Boolean)
  );
  const bottlenecks = identifyBottlenecks(allPaths);

  // Cache invalidation simulation
  const cacheInvalidation = simulateCacheInvalidation(flows, nodeMap);

  // Pipeline completeness score
  const pipelineIds = new Set(flows.map(f => f.pipelineId).filter(Boolean));
  const expectedPipelines = ['ingress', 'service-routing', 'data-access'];
  if (queueNodes.length > 0) expectedPipelines.push('async-pipeline');
  const completeness = expectedPipelines.filter(p => pipelineIds.has(p)).length / expectedPipelines.length;

  return {
    simulations,
    bottlenecks,
    cacheInvalidation,
    pipelineCompleteness: Math.round(completeness * 100),
    totalFlowsSimulated: allPaths.reduce((sum, p) => sum + p.path.length, 0),
    detectedDomains
  };
}

module.exports = { simulateFlows };
