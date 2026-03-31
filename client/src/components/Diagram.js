import React, { useMemo, useState, useCallback, useRef } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap,
  MarkerType,
  Handle, 
  Position,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, Server, MonitorSmartphone, Share2, Layers as LayerIcon, Download, Share, Code, Info, Globe, Shield, Cpu, HardDrive, Cloud, Zap, Filter } from 'lucide-react';
import { toPng } from 'html-to-image';

// ── ENTERPRISE COLOR SYSTEM ──
const LAYER_COLORS = {
  interaction: { bg: 'rgba(14,30,58,0.9)',  border: '#3b82f6', accent: '#60a5fa', label: 'Client Layer' },
  processing:  { bg: 'rgba(10,30,22,0.9)',  border: '#22c55e', accent: '#4ade80', label: 'Application Layer' },
  data:        { bg: 'rgba(40,18,18,0.9)',  border: '#ef4444', accent: '#f87171', label: 'Data Layer' },
  integration: { bg: 'rgba(28,16,46,0.9)', border: '#a855f7', accent: '#c084fc', label: 'Integration Layer' }
};

const TYPE_COLORS = {
  ui:       { bg: '#0b162c', border: '#0ea5e9', glow: '#0ea5e9', icon: '#38bdf8', label: 'CLIENT'   },
  service:  { bg: '#0d2116', border: '#22c55e', glow: '#22c55e', icon: '#4ade80', label: 'SERVICE'  },
  database: { bg: '#2f1208', border: '#f97316', glow: '#f97316', icon: '#fb923c', label: 'DATABASE' },
  cache:    { bg: '#281f05', border: '#eab308', glow: '#eab308', icon: '#facc15', label: 'CACHE'    },
  queue:    { bg: '#1e0c3a', border: '#a855f7', glow: '#a855f7', icon: '#c084fc', label: 'QUEUE'    },
  worker:   { bg: '#100e2e', border: '#6366f1', glow: '#6366f1', icon: '#818cf8', label: 'WORKER'   },
  external: { bg: '#17171f', border: '#6b7280', glow: '#9ca3af', icon: '#9ca3af', label: 'EXTERNAL' },
  group:    { bg: '#080c14', border: '#334155', glow: 'none',    icon: '#64748b', label: 'LAYER'    }
};

// Enterprise Node Component — Solid Readability Design
const EnterpriseNode = ({ data }) => {
  const isGroup = data.metadata?.role === 'group';
  const role = data.metadata?.role || 'service';
  const colors = TYPE_COLORS[role] || TYPE_COLORS.service;
  const layerColors = LAYER_COLORS[data.metadata?.layer] || LAYER_COLORS.processing;

  const renderIcon = () => {
    const iconProps = { size: 15, color: colors.icon, strokeWidth: 2 };
    switch (role) {
      case 'database': return <Database {...iconProps} />;
      case 'cache':    return <HardDrive {...iconProps} />;
      case 'ui':       return <MonitorSmartphone {...iconProps} />;
      case 'service':  return <Server {...iconProps} />;
      case 'queue':    return <Share2 {...iconProps} />;
      case 'worker':   return <Cpu {...iconProps} />;
      case 'external': return <Cloud {...iconProps} />;
      default:         return <Globe {...iconProps} />;
    }
  };

  if (isGroup) {
    return (
      <div
        className="h-full w-full rounded-2xl flex flex-col pointer-events-none relative"
        style={{
          border: `1px solid ${layerColors.border}20`,
          background: `linear-gradient(to bottom right, ${layerColors.bg}, transparent)`,
          boxShadow: `inset 0 0 30px ${layerColors.border}05`
        }}
      >
        <div
          className="absolute -top-3.5 left-5 px-3 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-[0.18em] uppercase"
          style={{
            background: `linear-gradient(135deg, rgba(20,25,35,0.95), rgba(15,20,30,0.95))`,
            color: layerColors.accent,
            border: `1px solid ${layerColors.border}30`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          {data.label || layerColors.label}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl transition-all duration-200 cursor-pointer group relative z-10"
      style={{
        backgroundColor: colors.bg,
        border: `1.5px solid ${colors.border}`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)`,
        minWidth: '240px',
        maxWidth: '300px',
      }}
      onMouseEnter={e => { 
        e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.9), 0 0 15px ${colors.glow}40, inset 0 1px 0 rgba(255,255,255,0.2)`; 
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)`; 
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border, border: `2px solid #080c14`, width: 12, height: 12, zIndex: 20 }} />

      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] opacity-70" style={{ background: `radial-gradient(circle, ${colors.icon}, transparent)` }} />

      {/* Header */}
      <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-2 border-b" style={{ borderColor: `${colors.border}30` }}>
        <div
          className="flex-none p-2 rounded-lg"
          style={{ backgroundColor: `${colors.border}30`, border: `1px solid ${colors.border}60` }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${colors.icon}, transparent)` }} />
          <div className="relative z-10">{renderIcon()}</div>
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[13px] font-bold text-white leading-tight truncate tracking-tight">{data.label}</h3>
          </div>
          {data.tech && (
            <p className="text-[10px] font-mono truncate" style={{ color: colors.icon, opacity: 0.85 }}>
              {data.tech}
            </p>
          )}
        </div>
        {/* Type badge */}
        <span
          className="flex-none text-[8px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full font-mono mt-0.5"
          style={{ background: 'rgba(0,0,0,0.4)', color: colors.icon, border: `1px solid ${colors.border}30` }}
        >
          {colors.label || role}
        </span>
      </div>

      {/* Description */}
      {data.description && (
        <div className="mx-3.5 mb-2 mt-2">
          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
            {data.description.length > 110 ? data.description.substring(0, 110) + '…' : data.description}
          </p>
        </div>
      )}

      {/* Footer / Meta Data */}
      {data.metadata?.layer && (
        <div className="px-3.5 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 opacity-60">
            <LayerIcon size={10} color={layerColors.accent} />
            <span
              className="text-[8px] uppercase tracking-[0.2em] font-mono font-semibold"
              style={{ color: layerColors.accent }}
            >
              {data.metadata.layer}
            </span>
          </div>
          {data.metadata?.capability && (
            <span className="text-[8px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">
              {data.metadata.capability.replace('-', ' ')}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: colors.border, border: `2px solid #080c14`, width: 12, height: 12, zIndex: 20 }} />
    </div>
  );
};

const nodeTypes = {
  default: EnterpriseNode,
  group: EnterpriseNode
};

const EDGE_COLORS = {
  'HTTPS':    '#60a5fa', // lighter blue
  'HTTP':     '#60a5fa',
  'WSS':      '#4ade80', // lighter green
  'WebSocket':'#4ade80',
  'gRPC':     '#c084fc', // lighter purple
  'AMQP':     '#fbbf24', // lighter orange
  'TCP':      '#818cf8', // lighter indigo
  'TCP/SQL':  '#f87171', // lighter red
  'TCP/TLS':  '#a78bfa',
  'SMTP/HTTPS': '#f472b6',
  'TCP/SQL (ETL)': '#f87171'
};

// ── PIPELINE GROUP COLOR OVERRIDES ──
// Edges in specific pipelines get color-coded for instant visual grouping
const PIPELINE_GROUP_COLORS = {
  'order-flow':    '#fbbf24', // bright amber
  'analytics-flow':'#4ade80', // bright green
  'auth-flow':     '#f472b6', // bright pink
  'cache-strategy':'#818cf8', // bright indigo
  'infra-wiring':  '#94a3b8', // slate 400
  'system':        '#94a3b8'  // default
};

// ── EDGE TYPE STYLES (Thicker for visibility) ──
const EDGE_TYPE_STYLES = {
  request:      { strokeWidth: 3,  strokeDasharray: undefined, animated: false },
  event:        { strokeWidth: 3,  strokeDasharray: '10 6',    animated: true  },
  async:        { strokeWidth: 3,  strokeDasharray: '5 5',     animated: true  },
  response:     { strokeWidth: 2.5,  strokeDasharray: '8 5',     animated: false },
  compensation: { strokeWidth: 3,  strokeDasharray: '4 3',     animated: true  } // dashed orange for saga rollback
};

function FlowCanvas({ views, viewMode }) {
  const { getNodes, getEdges } = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const [activeEdge, setActiveEdge] = useState(null);

  const { nodes, edges } = useMemo(() => {
    setActiveEdge(null);
    if (!views || !views[viewMode]) return { nodes: [], edges: [] };
    
    const allEdges = views[viewMode].edges;

    const formattedEdges = allEdges.map((e) => {
      const protocol = e.protocol || e.label?.match(/\[(.+?)\]/)?.[1];
      // Pipeline group color takes precedence over protocol color for clarity
      const pipelineColor = e.pipelineGroup ? PIPELINE_GROUP_COLORS[e.pipelineGroup] : null;
      const edgeColor = pipelineColor || (protocol ? (EDGE_COLORS[protocol] || '#64748b') : '#64748b');
      const typeStyle = EDGE_TYPE_STYLES[e.type] || EDGE_TYPE_STYLES.request;
      
      return {
        ...e,
        data: { reason: e.reason, label: e.label, type: e.type, protocol, pipelineId: e.pipelineId, pipelineGroup: e.pipelineGroup, weight: e.weight },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          width: 18, 
          height: 18, 
          color: edgeColor
        },
        interactionWidth: 20, // Make edge hover detection easier
        style: { 
          stroke: edgeColor, 
          strokeWidth: typeStyle.strokeWidth, 
          strokeDasharray: typeStyle.strokeDasharray,
          filter: `drop-shadow(0 0 3px ${edgeColor}40)` // Add a subtle glow to edges
        },
        labelStyle: { fill: '#e2e8f0', fontWeight: 600, fontSize: 9, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95, rx: 4 },
        animated: typeStyle.animated
      };
    });

    return { nodes: views[viewMode].nodes, edges: formattedEdges };
  }, [views, viewMode]);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setActiveEdge(edge);
  }, []);

  const onPaneClick = useCallback(() => {
    setActiveEdge(null);
  }, []);

  const exportToJson = useCallback(() => {
    const data = JSON.stringify({ nodes: getNodes(), edges: getEdges() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archforge-export-${Date.now()}.json`;
    a.click();
  }, [getNodes, getEdges]);

  const exportToPng = useCallback(() => {
    if (reactFlowWrapper.current === null) return;
    toPng(reactFlowWrapper.current, { backgroundColor: '#0f172a', filter: (n) => !(n.classList && n.classList.contains('react-flow__panel')) })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `archforge-diagram-${Date.now()}.png`;
        a.click();
      });
  }, []);

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        className="bg-slate-950 font-sans"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#1e293b" size={1} gap={25} />
        
        {/* EXPORT PANEL */}
        <Panel position="top-right" className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1.5 rounded-lg shadow-xl mt-3 mr-3">
           <button onClick={exportToJson} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors" title="Export JSON">
             <Code size={16} />
           </button>
           <button onClick={exportToPng} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors" title="Export PNG">
             <Download size={16} />
           </button>
           <button onClick={() => alert("Copied Architecture Share Link!")} className="p-1.5 hover:bg-slate-700 text-blue-400 rounded transition-colors" title="Share">
             <Share size={16} />
           </button>
        </Panel>


        {/* PROTOCOL + EDGE TYPE LEGEND */}
        <Panel position="bottom-left" className="bg-[#0f172a] border border-slate-700 rounded-xl p-4 shadow-2xl mb-24 ml-3">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3 font-semibold">Protocol Legend</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'HTTPS / REST', color: '#60a5fa' },
              { label: 'WebSocket',    color: '#4ade80' },
              { label: 'gRPC',         color: '#c084fc' },
              { label: 'Kafka Events', color: '#fbbf24' },
              { label: 'TCP/Database', color: '#f87171' },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] rounded shadow-sm" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}80` }}></div>
                <span className="text-[10px] font-mono text-slate-300 font-medium">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/80">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3 font-semibold">Edge Types</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#cbd5e1" strokeWidth="2.5" filter="drop-shadow(0 0 2px rgba(203,213,225,0.5))"/></svg>
                <span className="text-[10px] font-mono text-slate-300 font-medium">Sync (request)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="6 4" filter="drop-shadow(0 0 2px rgba(203,213,225,0.5))"/></svg>
                <span className="text-[10px] font-mono text-slate-300 font-medium">Event (publish)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3"/></svg>
                <span className="text-[10px] font-mono text-slate-300 font-medium">Async (consume)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="4 2" filter="drop-shadow(0 0 3px rgba(251,191,36,0.6))"/></svg>
                <span className="text-[10px] font-mono text-slate-300 font-medium">Compensation (saga)</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* EDGE EXPLANATION OVERLAY */}
        {activeEdge && activeEdge.data?.reason && (
          <Panel position="bottom-center" className="mb-8 max-w-lg w-full z-50">
             <div className="bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl p-4 relative">
                 <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: activeEdge.style?.stroke || '#3b82f6' }}></div>
                 <div className="flex items-center gap-2 mb-1.5 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                   <Zap size={12} style={{ color: activeEdge.style?.stroke || '#3b82f6' }} />
                   {activeEdge.data.protocol || 'System'} · {activeEdge.data.type || 'request'} · {activeEdge.data.pipelineGroup || activeEdge.data.pipelineId || 'pipeline'}
                 </div>
                <h4 className="text-white font-semibold text-sm mb-1.5">{activeEdge.data.label}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{activeEdge.data.reason}</p>
             </div>
          </Panel>
        )}

        <Controls className="bg-slate-800 fill-slate-300 border border-slate-700 shadow-xl mb-16" />
        <MiniMap nodeColor={(n) => {
          const role = n.data?.metadata?.role;
          return TYPE_COLORS[role]?.border || '#475569';
        }} maskColor="rgba(15, 23, 42, 0.8)" className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl" />
      </ReactFlow>
    </div>
  );
}

export default function DiagramWrapper(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
