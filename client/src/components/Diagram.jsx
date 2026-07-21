import { useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArchNode } from './ArchNode.jsx';

const nodeTypes = { arch: ArchNode };

export function Diagram({ graph, static: isStatic = false, editable = false, onNodeClick, onEdgeClick, onConnect, highlight = null }) {
  // When the explanation panel points at a step, spotlight that node and dim
  // the rest so the narrative and the picture line up.
  const nodes = useMemo(() => {
    if (!highlight?.length) return graph.nodes;
    const on = new Set(highlight);
    return graph.nodes.map((n) => (on.has(n.id)
      ? { ...n, data: { ...n.data, spotlight: true } }
      : { ...n, data: { ...n.data, dimmed: true } }));
  }, [graph.nodes, highlight]);

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
        nodes={nodes}
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
