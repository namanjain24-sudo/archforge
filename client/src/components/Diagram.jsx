import { useMemo, useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MarkerType, applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArchNode } from './ArchNode.jsx';

const nodeTypes = { arch: ArchNode };

export function Diagram({ graph, static: isStatic = false, editable = false, onNodeClick, onEdgeClick, onConnect, onNodesPersist, highlight = null }) {
  // React Flow needs to own node positions for dragging to stick. Passing a
  // controlled `nodes` array with no change handler meant a drag snapped back,
  // so the user could never arrange the diagram themselves.
  const [nodes, setNodes] = useState(graph.nodes);
  useEffect(() => { setNodes(graph.nodes); }, [graph.nodes]);

  const onNodesChange = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  // Hand the arrangement back up once a drag settles, so a later edit (which
  // re-runs the auto-layout) can preserve where things were put.
  const onNodeDragStop = useCallback(() => {
    setNodes((current) => { onNodesPersist?.(current); return current; });
  }, [onNodesPersist]);

  // When the explanation panel points at a step, spotlight that node and dim
  // the rest so the narrative and the picture line up.
  const displayNodes = useMemo(() => {
    if (!highlight?.length) return nodes;
    const on = new Set(highlight);
    return nodes.map((n) => (on.has(n.id)
      ? { ...n, data: { ...n.data, spotlight: true } }
      : { ...n, data: { ...n.data, dimmed: true } }));
  }, [nodes, highlight]);

  const edges = useMemo(() => graph.edges.map((e) => {
    const proto = e.data?.protocol;
    const stream = proto === 'stream';
    const async = proto === 'async';
    const stroke = stream ? 'var(--primary)' : 'var(--border-strong)';
    return {
      ...e,
      animated: stream,
      style: { stroke, strokeWidth: 1.5, strokeDasharray: async ? '5 5' : undefined },
      labelBgStyle: { fill: 'var(--surface)', fillOpacity: 0.9 },
      labelStyle: { fill: 'var(--ink-faint)', fontSize: 10, fontFamily: 'var(--font-sans)' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stream ? 'var(--primary)' : 'var(--ink-faint)' },
    };
  }), [graph.edges]);

  return (
    <div className="diagram">
      <ReactFlow
        nodes={displayNodes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: isStatic ? 0.12 : 0.18 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!isStatic}
        nodesConnectable={editable}
        elementsSelectable={!isStatic}
        onNodeClick={(_, n) => onNodeClick?.(n.id)}
        onEdgeClick={(_, e) => onEdgeClick?.(e.id)}
        onConnect={onConnect}
        panOnDrag={!isStatic}
        zoomOnScroll={!isStatic}
        zoomOnPinch={!isStatic}
        zoomOnDoubleClick={!isStatic}
        preventScrolling={!isStatic}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--border)" />
        {!isStatic && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
