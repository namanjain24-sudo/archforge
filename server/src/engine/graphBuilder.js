/**
 * ============================================================================
 * ARCHFORGE — GRAPH BUILDER ENGINE (v2 — CLEAN)
 * ============================================================================
 * 
 * Converts a strictly layered component collection into a directed multi-graph.
 * 
 * v2 CHANGES:
 *  - Removed fragile capability-matching EDGE_RULES entirely
 *  - Flow engine now generates ALL edges (properly tiered)
 *  - Graph builder focuses purely on node creation + edge integration
 *  - Orphan detection and prevention happens in flow engine
 *  - Cleaner separation of concerns
 * ============================================================================
 */

/**
 * Builds nodes and edges from categorized component outputs.
 * All edges now come from the flow engine — no fallback edge generation.
 * 
 * @param {object} systemData - Output from component processing ({ components, flows })
 * @returns {object} { nodes: Array, edges: Array, pipelines: Array }
 */
function buildGraph(systemData) {
  const { components, flows = [] } = systemData;
  
  // Visual Hierarchy Mapping 
  const priorityColors = {
    high: '#ef4444',     // Red 500 (Crucial Infra)
    medium: '#3b82f6',   // Blue 500 (Core Logic/Services)
    low: '#94a3b8'       // Slate 400 (Standard UI/Edge Nodes)
  };

  const prioritySizes = {
    high: 1.35,
    medium: 1.0,
    low: 0.85
  };

  // Build a set of all valid node IDs
  const nodeIds = new Set();
  
  // 1. Compile isolated Nodes list with enterprise metadata
  const nodes = [];
  for (const layer in components) {
    for (const comp of components[layer]) {
      const priorityTag = comp.priority || 'low';
      
      nodeIds.add(comp.id);
      
      nodes.push({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        icon: comp.type,
        layer: comp.layer || layer,
        capability: comp.capability,
        priority: priorityTag,
        size: prioritySizes[priorityTag] || 0.85,
        color: priorityColors[priorityTag] || '#94a3b8',
        tech: comp.tech || null,
        description: comp.description || null,
        protocol: comp.protocol || null
      });
    }
  }

  // 2. Build edges from flow engine output only — no fallback edge rules
  const edges = [];
  const seenEdges = new Set();

  for (const flow of flows) {
    // Validate that both source and target nodes exist
    if (!nodeIds.has(flow.source) || !nodeIds.has(flow.target)) continue;
    if (flow.source === flow.target) continue;
    
    const edgeId = `${flow.source}->${flow.target}:${flow.type}`;
    if (seenEdges.has(edgeId)) continue;
    seenEdges.add(edgeId);
    
    // Enterprise label: "Uses [HTTPS]" or "Publishes [AMQP]"
    const protocolTag = flow.protocol ? ` [${flow.protocol}]` : '';
    
    edges.push({
      source: flow.source,
      target: flow.target,
      type: flow.type,
      label: `${flow.label}${protocolTag}`,
      step: flow.step,
      protocol: flow.protocol,
      reason: flow.reason,
      pipelineId: flow.pipelineId || 'unknown',
      weight: flow.weight || 2,
      autoFixed: flow.autoFixed || false,
      style: { stroke: '#64748b' }
    });
  }

  return { 
    nodes, 
    edges
  };
}

module.exports = { buildGraph };
