/**
 * ============================================================================
 * ARCHFORGE — REACT FLOW ADAPTER v3 (INDUSTRY-GRADE LAYOUT)
 * ============================================================================
 * 
 * Transforms generic mathematical graph structures into React-Flow-compatible
 * visual manifests with deterministic Dagre layout.
 *
 * v3 IMPROVEMENTS:
 *  - EXPLICIT RANK ASSIGNMENT — nodes are placed in correct tiers
 *    (UI → WAF → LB → Gateway → Services → Cache/Queue → DB → Workers)
 *  - Increased spacing (ranksep=140, nodesep=180) to prevent overlap
 *  - Group nodes sorted before children (ReactFlow mandate)
 *  - Child positions computed RELATIVE to parent groups
 *  - Deterministic layout (no Math.random())
 *  - Edge routing with better smoothstep parameters
 * ============================================================================
 */

const dagre = require('dagre');

const NODE_WIDTH = 240;
const NODE_HEIGHT = 90;
const GROUP_PADDING_X = 80;
const GROUP_PADDING_Y = 60;
const GROUP_HEADER = 50;

/**
 * Determines the dagre rank (vertical tier position) for a node.
 * This ensures nodes are placed in the correct architectural tier.
 */
function getNodeRank(node) {
  const name = (node.name || '').toLowerCase();
  const cap = (node.capability || '').toLowerCase();
  const type = node.type;
  
  // Tier 0: Client/UI
  if (type === 'ui') return 0;
  
  // Tier 1: CDN/WAF (edge security)
  if (name.includes('cdn') || name.includes('waf') || name.includes('firewall') || cap === 'cdn-delivery') return 1;
  
  // Tier 2: Load Balancer
  if (cap === 'horizontal-scaling' || name.includes('balancer') || name.includes('load') || name.includes('alb') || name.includes('nlb')) return 2;
  
  // Tier 3: Rate Limiter
  if (cap === 'rate-limiting' || name.includes('rate') || name.includes('throttl')) return 3;
  
  // Tier 4: API Gateway
  if (cap === 'api-gateway' || cap === 'backend-logic' || name.includes('gateway') || name.includes('ingress')) return 4;
  
  // Tier 5: Core Services (processing layer)
  if (type === 'service') {
    // Observability/Infra services go to tier 8
    if (cap.includes('monitoring') || cap.includes('tracing') || cap.includes('logging') ||
        name.includes('monitor') || name.includes('jaeger') || name.includes('zipkin') ||
        name.includes('prometheus') || name.includes('grafana') || name.includes('collector') ||
        name.includes('loki') || name.includes('log aggregat') || name.includes('fluentd')) return 8;
    // Service Registry, Config Server, Mesh → tier 7
    if (cap === 'service-discovery' || cap === 'config-management' || cap === 'service-mesh' ||
        name.includes('registry') || name.includes('consul') || name.includes('eureka') ||
        name.includes('config server') || name.includes('istio') || name.includes('linkerd') ||
        name.includes('service mesh')) return 7;
    // Circuit Breaker
    if (cap === 'circuit-breaker' || name.includes('circuit') || name.includes('resilience')) return 6;
    // Core services
    return 5;
  }
  
  // Tier 6: Cache
  if (type === 'cache') return 6;
  
  // Tier 6: Queue
  if (type === 'queue') return 6;
  
  // Tier 7: Database
  if (type === 'database') return 7;
  
  // Tier 8: Workers
  if (type === 'worker') return 8;
  
  // Tier 9: External integrations
  if (type === 'external') return 9;
  
  return 5; // Default to service tier
}

/**
 * Executes graph layout calculations and formats objects.
 * 
 * @param {object} graph - Abstract graph { nodes: [...], edges: [...] }
 * @param {boolean} useGroups - Layout mode for grouping/layers
 * @returns {object} React Flow consumable tree 
 */
function adaptToReactFlow(graph, useGroups = false) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  if (useGroups) {
    return buildLayeredLayout(graph);
  }

  // ── STANDARD VIEW (Simple / Detailed / Flow): Use Dagre with rank hints ──
  const rfNodes = [];
  const rfEdges = [];

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'TB', 
    ranksep: 180,       // was 140 — increased to prevent vertical overlap
    nodesep: 220,       // was 180 — increased to prevent horizontal overlap
    marginx: 60,
    marginy: 60,
    align: 'UL',
    acyclicer: 'greedy' // prevents backward edges that cross layers
  });

  // Assign nodes with rank-based sizing
  for (const node of graph.nodes) {
    const rank = getNodeRank(node);
    dagreGraph.setNode(node.id, { 
      width: NODE_WIDTH, 
      height: NODE_HEIGHT,
      rank: rank
    });
  }

  // Add edges for layout calculation
  for (const edge of graph.edges) {
    if (graph.nodes.some(n => n.id === edge.source) && graph.nodes.some(n => n.id === edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target, {
        weight: edge.type === 'request' ? 3 : 1,
        minlen: 1
      });
    }
  }

  dagre.layout(dagreGraph);

  // Build React Flow nodes
  for (const node of graph.nodes) {
    let position = { x: 0, y: 0 };
    if (dagreGraph.hasNode(node.id)) {
      const gPos = dagreGraph.node(node.id);
      position = {
        x: Math.round(gPos.x - NODE_WIDTH / 2),
        y: Math.round(gPos.y - NODE_HEIGHT / 2)
      };
    }

    rfNodes.push({
      id: node.id,
      type: 'default',
      position,
      data: {
        label: node.name,
        tech: node.tech || null,
        description: node.description || null,
        protocol: node.protocol || null,
        color: node.color || null,
        size: node.size || 1,
        icon: node.icon || node.type,
        metadata: {
          layer: node.layer,
          capability: node.capability,
          role: node.type
        }
      }
    });
  }

  // ── Edge degree cap: max 4 inbound + 4 outbound per node (by weight) ──
  // This prevents overcrowded nodes that make the diagram unreadable.
  const inDegree = {};   // nodeId -> [{edge, weight}]
  const outDegree = {};  // nodeId -> [{edge, weight}]

  // Collect all edges with their weights
  const edgesWithWeight = graph.edges.map(e => ({
    edge: e,
    weight: e.weight || (e.type === 'request' ? 3 : e.type === 'event' ? 2 : 1)
  }));

  for (const { edge, weight } of edgesWithWeight) {
    if (!inDegree[edge.target]) inDegree[edge.target] = [];
    if (!outDegree[edge.source]) outDegree[edge.source] = [];
    inDegree[edge.target].push({ edge, weight });
    outDegree[edge.source].push({ edge, weight });
  }

  // Keep only top MAX_DEGREE edges per node (prioritize by weight desc)
  const MAX_DEGREE = 4;
  const allowedEdgeIds = new Set();

  for (const nodeId of Object.keys(inDegree)) {
    const sorted = inDegree[nodeId].sort((a, b) => b.weight - a.weight);
    sorted.slice(0, MAX_DEGREE).forEach(({ edge }) => {
      allowedEdgeIds.add(`${edge.source}::${edge.target}::${edge.type || 'req'}`);
    });
  }
  for (const nodeId of Object.keys(outDegree)) {
    const sorted = outDegree[nodeId].sort((a, b) => b.weight - a.weight);
    sorted.slice(0, MAX_DEGREE).forEach(({ edge }) => {
      allowedEdgeIds.add(`${edge.source}::${edge.target}::${edge.type || 'req'}`);
    });
  }

  // Build React Flow edges with improved formatting + pipeline grouping
  for (const edge of graph.edges) {
    const isAsync = edge.type === 'async' || edge.type === 'event';
    const edgeKey = `${edge.source}::${edge.target}::${edge.type || 'req'}`;

    // Skip overcrowded edges (visual clarity enforcement)
    if (!allowedEdgeIds.has(edgeKey)) continue;

    // Determine pipeline group for client-side filtering
    const pipelineGroup = edge.pipelineId
      ? (edge.pipelineId.startsWith('order')    ? 'order-flow'
       : edge.pipelineId.startsWith('analytics') ? 'analytics-flow'
       : edge.pipelineId.startsWith('auth')      ? 'auth-flow'
       : edge.pipelineId.startsWith('cache')     ? 'cache-strategy'
       : edge.pipelineId.startsWith('infra')     ? 'infra-wiring'
       : edge.pipelineId)
      : 'system';

    rfEdges.push({
      id: `edge-${edge.source}-${edge.target}-${edge.type || 'req'}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      protocol: edge.protocol,
      reason: edge.reason,
      type: 'smoothstep',
      animated: isAsync,
      pipelineId: edge.pipelineId,
      pipelineGroup,
      style: { 
        strokeWidth: edge.type === 'request' ? 2 : 1.5,
        strokeDasharray: isAsync ? '6 3' : undefined
      }
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}


/**
 * Builds a proper layered layout where:
 * 1. Group nodes come FIRST (ReactFlow requirement)
 * 2. Child positions are RELATIVE to their parent group
 * 3. Groups are sized dynamically based on child count
 */
function buildLayeredLayout(graph) {
  const rfNodes = [];
  const rfEdges = [];

  const groupNodes = graph.nodes.filter(n => n.type === 'group');
  const childNodes = graph.nodes.filter(n => n.type !== 'group');

  const layerOrder = ['interaction', 'processing', 'data', 'integration'];
  
  const childrenByGroup = {};
  for (const child of childNodes) {
    const groupId = child.parentNode || `group-${child.layer}`;
    if (!childrenByGroup[groupId]) childrenByGroup[groupId] = [];
    childrenByGroup[groupId].push(child);
  }

  // ── Step 1: Create and position GROUP nodes (must come first!) ──
  let groupY = 0;
  const groupPositions = {};

  for (const layer of layerOrder) {
    const group = groupNodes.find(g => g.layer === layer);
    if (!group) continue;

    const children = childrenByGroup[group.id] || [];
    const cols = Math.min(children.length, 4); // max 4 columns (up from 3)
    const rows = Math.ceil(children.length / 4) || 1;
    
    const groupWidth = Math.max(800, cols * (NODE_WIDTH + GROUP_PADDING_X) + GROUP_PADDING_X * 2);
    const groupHeight = Math.max(180, rows * (NODE_HEIGHT + GROUP_PADDING_Y) + GROUP_HEADER + GROUP_PADDING_Y);

    groupPositions[group.id] = { x: 0, y: groupY, width: groupWidth, height: groupHeight };

    rfNodes.push({
      id: group.id,
      type: 'group',
      position: { x: 0, y: groupY },
      data: {
        label: group.name,
        metadata: { layer: group.layer, role: 'group' }
      },
      style: {
        width: groupWidth,
        height: groupHeight,
        backgroundColor: 'rgba(240, 240, 240, 0.08)',
        borderRadius: '12px'
      }
    });

    groupY += groupHeight + 50; // gap between groups
  }

  // ── Step 2: Position children RELATIVE to their parent group ──
  for (const groupId of Object.keys(childrenByGroup)) {
    const children = childrenByGroup[groupId];
    const groupInfo = groupPositions[groupId];
    if (!groupInfo) continue;

    const cols = Math.min(children.length, 4);
    const totalChildrenWidth = cols * NODE_WIDTH + (cols - 1) * GROUP_PADDING_X;
    const startX = Math.max(GROUP_PADDING_X, (groupInfo.width - totalChildrenWidth) / 2);

    children.forEach((child, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);

      const relX = startX + col * (NODE_WIDTH + GROUP_PADDING_X);
      const relY = GROUP_HEADER + GROUP_PADDING_Y + row * (NODE_HEIGHT + GROUP_PADDING_Y);

      rfNodes.push({
        id: child.id,
        type: 'default',
        position: { x: relX, y: relY },
        data: {
          label: child.name,
          tech: child.tech || null,
          description: child.description || null,
          protocol: child.protocol || null,
          color: child.color || null,
          icon: child.icon || child.type,
          metadata: {
            layer: child.layer,
            capability: child.capability,
            role: child.type
          }
        },
        parentNode: groupId,
        extent: 'parent'
      });
    });
  }

  // ── Step 3: Edges ──
  for (const edge of graph.edges) {
    const isAsync = edge.type === 'async' || edge.type === 'event';
    rfEdges.push({
      id: `edge-${edge.source}-${edge.target}-${edge.type || 'req'}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      protocol: edge.protocol,
      reason: edge.reason,
      type: 'smoothstep',
      animated: isAsync,
      style: { 
        strokeWidth: edge.type === 'request' ? 2 : 1.5,
        strokeDasharray: isAsync ? '6 3' : undefined
      }
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

module.exports = { adaptToReactFlow };
