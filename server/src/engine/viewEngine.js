/**
 * ============================================================================
 * ARCHFORGE — VIEW ENGINE v2 (INDUSTRY-GRADE MULTI-VIEW)
 * ============================================================================
 * 
 * Transforms generated Multi-Graphs into distinct perspectives tailored for
 * specific use-cases. v2 IMPROVEMENTS:
 * 
 * 1. Simple View:  PROMPT-SPECIFIC summary (not generic tiers!) showing
 *                  representative nodes per layer with actual domain names.
 * 2. Detailed View: Complete transparent mapping with all nodes and edges.
 * 3. Layered View: Groups components physically nested within layer zones.
 * 4. Flow View:    PIPELINE visualization showing multi-hop request paths
 *                  through the system with step numbering.
 * ============================================================================
 */

const { adaptToReactFlow } = require('./adapters/reactFlowAdapter');

// ═══════════════════════════════════════════════════════════════
// HELPER: Map layer names to domain-specific display names
// ═══════════════════════════════════════════════════════════════

const LAYER_DISPLAY = {
  interaction: { label: 'Client & Ingress', icon: '🌐' },
  processing:  { label: 'Application Services', icon: '⚙️' },
  data:        { label: 'Data & Storage', icon: '💾' },
  integration: { label: 'Messaging & External', icon: '🔗' }
};

function getLayerDisplayName(layerName, components) {
  const base = LAYER_DISPLAY[layerName] || { label: layerName.toUpperCase(), icon: '📦' };
  const count = components.length;
  return `${base.label} (${count})`;
}

/**
 * Picks the most important/representative components from a layer.
 * Uses priority ordering: high > medium > low, then takes first N.
 */
function pickRepresentatives(components, maxCount = 3) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...components].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    return pa - pb;
  });
  return sorted.slice(0, maxCount);
}


/**
 * ── SIMPLE VIEW (v2 — PROMPT-SPECIFIC) ──
 *
 * Builds a unique simplified view for each prompt:
 * - Each layer shows its domain-specific name + component count
 * - Up to 4 representative nodes are listed inside each layer summary
 * - Edges represent actual cross-layer data flows
 * - Adjacent layers always have at least one guaranteed edge
 */
function buildSimpleView(graph) {
  // Group nodes by layer
  const layerGroups = {};
  for (const node of graph.nodes) {
    if (!layerGroups[node.layer]) layerGroups[node.layer] = [];
    layerGroups[node.layer].push(node);
  }

  const activeLayers = Object.keys(layerGroups);
  if (activeLayers.length === 0) return { nodes: [], edges: [] };

  // ── CANONICAL LAYER ORDER ──
  const layerOrder = ['interaction', 'processing', 'data', 'integration'];
  const orderedLayers = [
    ...layerOrder.filter(l => layerGroups[l]),
    ...Object.keys(layerGroups).filter(l => !layerOrder.includes(l))
  ];

  // ── BUILD SUMMARY NODES with EXPLICIT POSITIONS ──
  // ── BUILD SUMMARY NODES with EXPLICIT POSITIONS ──
  // Positioned manually in a clean vertical cascade (no dagre needed for 4 nodes)
  const NODE_H = 110;
  const GAP_Y = 80;

  const nodes = [];

  orderedLayers.forEach((layerName, i) => {
    const layerComps = layerGroups[layerName];
    const reps = pickRepresentatives(layerComps, 4);
    const repNames = reps.map(r => r.name).join(', ');

    const typeSummary = {};
    for (const comp of layerComps) {
      typeSummary[comp.type] = (typeSummary[comp.type] || 0) + 1;
    }
    const typeBreakdown = Object.entries(typeSummary)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(' · ');

    const displayName = getLayerDisplayName(layerName, layerComps);
    const yPos = i * (NODE_H + GAP_Y);

    nodes.push({
      id: `layer-${layerName}`,
      type: 'default',
      position: { x: 300, y: yPos },
      style: { width: 420 },
      data: {
        label: displayName,
        tech: typeBreakdown,
        description: `Key services: ${repNames}`,
        metadata: { layer: layerName, role: 'summary' }
      }
    });
  });

  // ── BUILD CROSS-LAYER EDGES from actual graph flows ──
  const crossLayerFlows = {};

  for (const edge of graph.edges) {
    const sourceNode = graph.nodes.find(n => n.id === edge.source);
    const targetNode = graph.nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;
    if (sourceNode.layer === targetNode.layer) continue;

    const key = `layer-${sourceNode.layer}->layer-${targetNode.layer}`;
    if (!crossLayerFlows[key]) {
      crossLayerFlows[key] = {
        source: `layer-${sourceNode.layer}`,
        target: `layer-${targetNode.layer}`,
        protocols: new Set(),
        types: new Set(),
        count: 0
      };
    }
    const flow = crossLayerFlows[key];
    if (edge.protocol) flow.protocols.add(edge.protocol);
    flow.types.add(edge.type || 'request');
    flow.count++;
  }

  // ── GUARANTEE EDGES between all adjacent ordered layers ──
  // Even if no cross-layer edges found (e.g. first render), show basic flow
  for (let i = 0; i < orderedLayers.length - 1; i++) {
    const srcLayer = orderedLayers[i];
    const tgtLayer = orderedLayers[i + 1];
    const key = `layer-${srcLayer}->layer-${tgtLayer}`;
    if (!crossLayerFlows[key]) {
      crossLayerFlows[key] = {
        source: `layer-${srcLayer}`,
        target: `layer-${tgtLayer}`,
        protocols: new Set(['HTTPS']),
        types: new Set(['request']),
        count: 1
      };
    }
  }

  const edges = [];
  for (const flow of Object.values(crossLayerFlows)) {
    // Skip if either layer not in this diagram
    if (!nodes.find(n => n.id === flow.source)) continue;
    if (!nodes.find(n => n.id === flow.target)) continue;

    const protocols = Array.from(flow.protocols);
    const types = Array.from(flow.types);
    const isAsync = types.includes('async') || types.includes('event');
    const protocolLabel = protocols.length > 0 ? protocols.slice(0, 2).join('/') : 'System';

    edges.push({
      id: `simple-${flow.source}-${flow.target}`,
      source: flow.source,
      target: flow.target,
      type: 'smoothstep',
      animated: isAsync,
      label: `${flow.count > 1 ? flow.count + ' flows' : 'Data Flow'} [${protocolLabel}]`,
      protocol: protocols[0] || 'HTTPS',
      reason: `${flow.count} data flows cross this boundary via ${protocols.join(', ') || 'system'} protocols`,
      style: {
        stroke: isAsync ? '#f59e0b' : '#3b82f6',
        strokeWidth: 2,
        strokeDasharray: isAsync ? '6 3' : undefined
      },
      labelStyle: { fill: '#e2e8f0', fontWeight: 600, fontSize: 9, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95, rx: 4 }
    });
  }

  // Return pre-positioned nodes directly (no dagre needed for 4 nodes)
  return { nodes, edges };
}



/**
 * ── DETAILED VIEW ──
 * Exposes the exact bare topology of all capability nodes + components.
 */
function buildDetailedView(graph) {
  return adaptToReactFlow(graph);
}


/**
 * ── LAYERED VIEW ──
 * Nests node children strictly inside "Group" parent containers.
 */
function buildLayeredView(graph) {
  const nodes = [];
  const edges = [...graph.edges];
  const renderedLayers = new Set(graph.nodes.map(n => n.layer));
  
  for (const layer of renderedLayers) {
    nodes.push({
      id: `group-${layer}`,
      name: `${(LAYER_DISPLAY[layer]?.label || layer).toUpperCase()} ZONE`,
      type: 'group',
      layer: layer
    });
  }

  for (const node of graph.nodes) {
    nodes.push({
      ...node,
      parentNode: `group-${node.layer}`
    });
  }

  return adaptToReactFlow({ nodes, edges }, true);
}


/**
 * ── FLOW VIEW (NEW — Pipeline Visualization) ──
 * 
 * Traces the PRIMARY request path through the system showing the
 * multi-hop flow: UI → CDN → WAF → LB → Gateway → Service → Cache → DB
 * 
 * Groups flows by pipeline for clear visualization.
 */
function buildFlowView(graph) {
  if (!graph.nodes || graph.nodes.length === 0) {
    return adaptToReactFlow({ nodes: [], edges: [] });
  }

  // Identify the primary request path by tracing from UI/ingress nodes
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
  const adjacency = {};
  
  // Build adjacency list from edges
  for (const edge of graph.edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push({ target: edge.target, edge });
  }

  // Find starting points (nodes with no inbound sync edges)
  const hasInbound = new Set();
  for (const edge of graph.edges) {
    if (edge.type === 'request') hasInbound.add(edge.target);
  }
  
  const startNodes = graph.nodes.filter(n => 
    !hasInbound.has(n.id) && (n.type === 'ui' || n.layer === 'interaction')
  );
  
  // If no clear entry points, use UI nodes or first node
  const entries = startNodes.length > 0 ? startNodes : 
    graph.nodes.filter(n => n.type === 'ui').length > 0 ? graph.nodes.filter(n => n.type === 'ui') :
    [graph.nodes[0]];

  // BFS to find all reachable nodes from entries following request edges first
  const visited = new Set();
  const pipelineNodes = new Set();
  const pipelineEdges = [];
  const queue = [...entries.map(e => e.id)];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    pipelineNodes.add(current);
    
    const neighbors = adjacency[current] || [];
    // Sort: request edges first, then event, then async
    const sorted = [...neighbors].sort((a, b) => {
      const order = { request: 0, event: 1, async: 2 };
      return (order[a.edge.type] || 2) - (order[b.edge.type] || 2);
    });
    
    for (const { target, edge } of sorted) {
      if (!visited.has(target)) {
        pipelineEdges.push(edge);
        queue.push(target);
      }
    }
  }

  // Include any remaining unvisited nodes (orphan prevention)
  for (const node of graph.nodes) {
    if (!pipelineNodes.has(node.id)) {
      pipelineNodes.add(node.id);
    }
  }

  // Build flow nodes with step numbers
  const flowNodes = [];
  let stepNumber = 0;
  
  // Order nodes by their position in the flow (BFS order = visited order)
  const orderedNodeIds = [...visited];
  // Add unvisited nodes at the end
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) orderedNodeIds.push(node.id);
  }
  
  for (const nodeId of orderedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    stepNumber++;
    flowNodes.push({
      ...node,
      name: `[${stepNumber}] ${node.name}`,
      description: node.description || `Step ${stepNumber} in request pipeline`
    });
  }

  // Number the edges with step indicators
  const flowEdges = pipelineEdges.map((edge, i) => ({
    ...edge,
    label: `Step ${i + 1}: ${edge.label || 'Connects'}`,
    step: i + 1
  }));

  // Add edges for remaining nodes that weren't in the BFS path
  for (const edge of graph.edges) {
    const alreadyIncluded = pipelineEdges.some(pe => 
      pe.source === edge.source && pe.target === edge.target
    );
    if (!alreadyIncluded) {
      flowEdges.push({
        ...edge,
        label: edge.label || 'Connects'
      });
    }
  }

  return adaptToReactFlow({ nodes: flowNodes, edges: flowEdges });
}


/**
 * Exporter routing orchestrator.
 * 
 * @param {object} graph 
 * @returns {object} Maps of different projection outputs
 */
function generateViews(graph) {
  return {
    simple: buildSimpleView(graph),
    detailed: buildDetailedView(graph),
    layered: buildLayeredView(graph),
    flow: buildFlowView(graph)
  };
}

module.exports = { generateViews };
