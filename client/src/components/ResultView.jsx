import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Check, Download, Sparkles, ArrowUp, Image, FileCode, FileText } from 'lucide-react';
import { Diagram } from './Diagram.jsx';
import { InsightsPanel } from './InsightsPanel.jsx';
import { reassess, refine } from '../lib/api.js';
import { toMermaid, toDesignDoc, downloadText, copyText, exportPng, slug } from '../lib/export.js';
import './diagram.css';

const scoreColor = (s) => (s >= 90 ? 'var(--success)' : s >= 70 ? 'var(--accent)' : 'var(--danger)');
const rid = () => Math.random().toString(36).slice(2, 6);

const PALETTE = [
  ['Client', [['web_app', 'Web App'], ['mobile_app', 'Mobile App']]],
  ['Gateway', [['api_gateway', 'API Gateway'], ['load_balancer', 'Load Balancer']]],
  ['Service', [['service', 'Service'], ['worker', 'Worker'], ['serverless_function', 'Serverless Fn']]],
  ['Data', [['sql_db', 'SQL Database'], ['nosql_db', 'NoSQL Database'], ['cache', 'Cache'], ['search_index', 'Search Index'], ['blob_storage', 'Object Storage'], ['data_warehouse', 'Warehouse']]],
  ['Async', [['message_queue', 'Message Queue'], ['event_bus', 'Event Bus'], ['stream_processor', 'Stream Processor']]],
  ['ML / AI', [['model_serving', 'Model Serving'], ['vector_db', 'Vector DB']]],
  ['Security', [['auth_service', 'Auth Service']]],
  ['Observability', [['logging', 'Logging'], ['metrics', 'Metrics'], ['tracing', 'Tracing']]],
  ['External', [['payment_gateway', 'Payment Gateway'], ['email_service', 'Email'], ['push_service', 'Push'], ['maps_service', 'Maps']]],
];

export function ResultView({ result, onNew }) {
  const [data, setData] = useState(result);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [highlight, setHighlight] = useState(null); // node ids spotlit from the Explain panel

  useEffect(() => { setData(result); setEditing(false); setSelected(null); setHighlight(null); }, [result]);

  const a = data.architecture;
  const { review, readiness } = data;
  const selNode = selected && data.graph.nodes.find((n) => n.id === selected);

  async function applyArch(nextArch) {
    setBusy(true);
    try {
      const next = await reassess(nextArch, data.prompt);
      // Re-verifying re-runs the auto-layout, which would discard wherever the
      // user had dragged things. Keep their placement for every node that still
      // exists; only genuinely new nodes take a computed position.
      const placed = new Map(data.graph.nodes.map((n) => [n.id, n.position]));
      next.graph = {
        ...next.graph,
        nodes: next.graph.nodes.map((n) => (placed.has(n.id) ? { ...n, position: placed.get(n.id) } : n)),
      };
      setData(next);
      // keep selection only if the node still exists
      setSelected((s) => (next.architecture.nodes.some((n) => n.id === s) ? s : null));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const clone = () => JSON.parse(JSON.stringify(a));
  const updateNode = (id, patch) => { const c = clone(); const n = c.nodes.find((x) => x.id === id); if (n) Object.assign(n, patch); applyArch(c); };
  const deleteNode = (id) => { const c = clone(); c.nodes = c.nodes.filter((n) => n.id !== id); c.edges = c.edges.filter((e) => e.source !== id && e.target !== id); applyArch(c); };
  const deleteEdge = (id) => { const c = clone(); c.edges = c.edges.filter((e) => e.id !== id); applyArch(c); };
  const addNode = (type, label) => { const c = clone(); c.nodes.push({ id: `${type}-${rid()}`, label, type, why: 'Added by you.' }); setShowPalette(false); applyArch(c); };
  const onConnect = ({ source, target }) => { if (!source || !target || source === target) return; const c = clone(); c.edges.push({ id: `e-${rid()}`, source, target, label: 'call', protocol: 'sync', why: 'User-added connection.' }); applyArch(c); };
  const onEdgeClick = (id) => { if (editing && confirm('Delete this connection?')) deleteEdge(id); };

  async function doRefine(e) {
    e?.preventDefault();
    const inst = refineText.trim();
    if (inst.length < 2 || refining) return;
    setRefining(true);
    try {
      const next = await refine(data.architecture, inst, data.prompt);
      setData(next); setRefineText(''); setSelected(null);
    } catch (err) { console.error(err); } finally { setRefining(false); }
  }

  const name = slug(a.system.name);
  const doExport = async (kind) => {
    setShowExport(false);
    if (kind === 'png') await exportPng(document.querySelector('.result .react-flow'), name);
    else if (kind === 'mermaid') { const ok = await copyText(toMermaid(a)); setCopied(ok); setTimeout(() => setCopied(false), 1600); }
    else if (kind === 'doc') downloadText(`${name}.md`, toDesignDoc(data), 'text/markdown');
  };

  return (
    <div className="result">
      <div className="result-bar">
        <div className="result-title">
          <h2>{a.system.name}</h2>
          <span className="scale">{a.system.scale} · {a.nodes.length} components{data.edited ? ' · edited' : ''}</span>
        </div>
        <div className="result-scores">
          <span className="score-chip"><span className="ring" style={{ background: scoreColor(readiness.score) }} /> Readiness <b>{readiness.score}</b></span>
          <span className="score-chip"><span className="ring" style={{ background: scoreColor(review.overall) }} /> Well-Architected <b>{review.overall}</b></span>
          <div style={{ position: 'relative' }}>
            <button className="edit-toggle" onClick={() => setShowExport((s) => !s)}><Download size={15} /> Export</button>
            {showExport && (
              <div className="export-menu">
                <button onClick={() => doExport('png')}><Image size={15} /> PNG image</button>
                <button onClick={() => doExport('mermaid')}><FileCode size={15} /> {copied ? 'Copied!' : 'Copy Mermaid'}</button>
                <button onClick={() => doExport('doc')}><FileText size={15} /> Design doc (.md)</button>
              </div>
            )}
          </div>
          <button className={`edit-toggle${editing ? ' on' : ''}`} onClick={() => { setEditing((e) => !e); setSelected(null); setShowPalette(false); }}>
            {editing ? <><Check size={15} /> Done</> : <><Pencil size={15} /> Edit</>}
          </button>
          <button className="btn-primary" onClick={onNew}><Plus size={15} /> New</button>
        </div>
      </div>

      <div className="result-body">
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex' }}>
          {editing && <div className="edit-hint">Click a component to edit · drag between components to connect · click a line to remove</div>}
          {editing && (
            <>
              <button className="btn-primary" style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, padding: '8px 12px' }} onClick={() => setShowPalette((s) => !s)}>
                <Plus size={15} /> Add
              </button>
              {showPalette && (
                <div className="palette">
                  {PALETTE.map(([layer, types]) => (
                    <div key={layer}>
                      <div className="pal-layer">{layer}</div>
                      {types.map(([t, label]) => <button key={t} onClick={() => addNode(t, label)}>{label}</button>)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Diagram
            key={result.generatedAt}
            graph={data.graph}
            editable={editing}
            highlight={editing ? null : highlight}
            onNodeClick={(id) => editing && setSelected(id)}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            onNodesPersist={(ns) => setData((d) => ({ ...d, graph: { ...d.graph, nodes: ns } }))}
          />

          {!editing && (
            <form className="refine-bar" onSubmit={doRefine}>
              <Sparkles size={16} style={{ color: 'var(--accent)', flex: 'none' }} />
              <input value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Refine — e.g. add caching, make it multi-region, use Cassandra" disabled={refining} />
              <button type="submit" className="btn-primary" style={{ padding: '7px 12px' }} disabled={refineText.trim().length < 2 || refining}>
                {refining ? <Loader2 size={14} className="spin" /> : <ArrowUp size={14} />}
              </button>
            </form>
          )}

          {(busy || refining) && <div className="busy-veil"><Loader2 size={22} className="spin" style={{ color: 'var(--primary)' }} /></div>}

          {editing && selNode && (
            <div className="inspector">
              <div className="inspector-head">
                <strong style={{ fontSize: 14 }}>Edit component</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="layer-tag">{selNode.data.layer}</span>
                  <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setSelected(null)}><X size={14} /></button>
                </div>
              </div>
              <div className="inspector-body">
                <div className="field">
                  <label>Name</label>
                  <input value={selNode.data.label} onChange={(e) => setData((d) => patchNodeData(d, selected, { label: e.target.value }))} onBlur={(e) => updateNode(selected, { label: e.target.value })} />
                </div>
                <div className="field">
                  <label>Technology</label>
                  <input value={selNode.data.tech || ''} placeholder="e.g. PostgreSQL" onChange={(e) => setData((d) => patchNodeData(d, selected, { tech: e.target.value }))} onBlur={(e) => updateNode(selected, { tech: e.target.value || null })} />
                </div>
                {selNode.data.why && <div className="inspector-why">{selNode.data.why}</div>}
              </div>
              <div className="inspector-actions">
                <button className="btn-danger" onClick={() => deleteNode(selected)}><Trash2 size={14} /> Delete component</button>
              </div>
            </div>
          )}
        </div>
        <InsightsPanel result={data} onHighlight={setHighlight} />
      </div>

      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.spin{animation:none}}`}</style>
    </div>
  );
}

/** Optimistic local text update for the inspector inputs (committed on blur). */
function patchNodeData(d, id, patch) {
  return {
    ...d,
    graph: { ...d.graph, nodes: d.graph.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) },
  };
}
