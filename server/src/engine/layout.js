/**
 * Layout engine — deterministic layered positioning via elkjs.
 * ------------------------------------------------------------
 * Turns a verified architecture into React-Flow-ready nodes and edges with
 * clean (x, y) positions. Nodes are partitioned into horizontal bands by their
 * taxonomy layer (client at the top → data/observability at the bottom), so the
 * diagram always reads top-to-bottom the way an architecture should. Running it
 * server-side keeps the result deterministic and testable; the frontend can
 * still let users drag from these starting positions.
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import { LAYERS, NODE_TYPES, PROTOCOLS } from '../contracts/index.js';
import { cloudServicesFor } from '../references/cloudMap.js';

const elk = new ELK();

const NODE_W = 190;
const NODE_H = 66;

/**
 * @param {object} arch verified architecture
 * @returns {Promise<{ nodes, edges }>} React-Flow shaped graph with positions
 */
export async function layoutArchitecture(arch) {
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.partitioning.activate': 'true',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '55',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: arch.nodes.map((n) => ({
      id: n.id,
      width: NODE_W,
      height: NODE_H,
      // Partition = taxonomy layer order → forces the visual banding.
      layoutOptions: { 'elk.partitioning.partition': String(LAYERS[n.layer]?.order ?? 5) },
    })),
    edges: arch.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const laid = await elk.layout(elkGraph);
  const pos = Object.fromEntries((laid.children || []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));

  const nodes = arch.nodes.map((n) => ({
    id: n.id,
    type: 'arch',
    position: pos[n.id] || { x: 0, y: 0 },
    width: NODE_W,
    height: NODE_H,
    data: {
      label: n.label,
      nodeType: n.type,
      layer: n.layer,
      layerLabel: LAYERS[n.layer]?.label,
      icon: NODE_TYPES[n.type]?.icon,
      tech: n.tech,
      why: n.why,
      redundant: n.redundant,
      stateful: n.stateful,
      isStore: !!NODE_TYPES[n.type]?.isStore,
      cloud: cloudServicesFor(n.type), // { aws, gcp, azure } | null
    },
  }));

  const edges = arch.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.protocol === 'stream',
    data: { protocol: e.protocol, protocolLabel: PROTOCOLS[e.protocol]?.label, why: e.why },
  }));

  return { nodes, edges };
}
