import { useState } from 'react';
import { Check, X, AlertTriangle, Info, Wrench, Sparkles, BookOpen, Gauge } from 'lucide-react';
import { ExplainPanel } from './ExplainPanel.jsx';
import './panel.css';

const scoreColor = (s) => (s >= 90 ? 'var(--success)' : s >= 70 ? 'var(--accent)' : 'var(--danger)');

const sevIcon = { error: X, warning: AlertTriangle, info: Info };
const sevColor = { error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--ink-faint)' };

export function InsightsPanel({ result, onHighlight }) {
  const { capacity, readiness, review, findings, capabilities, explanation } = result;
  const [tab, setTab] = useState('explain');

  return (
    <aside className="panel">
      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'explain'} className={tab === 'explain' ? 'on' : ''} onClick={() => setTab('explain')}>
          <BookOpen size={14} /> Explain
        </button>
        <button role="tab" aria-selected={tab === 'insights'} className={tab === 'insights' ? 'on' : ''} onClick={() => { setTab('insights'); onHighlight?.(null); }}>
          <Gauge size={14} /> Insights
        </button>
      </div>

      {tab === 'explain' && <ExplainPanel explanation={explanation} onHighlight={onHighlight} />}

      {tab === 'insights' && (<>
      {capabilities?.length > 0 && (
        <div className="panel-caps">
          {capabilities.map((c) => <span key={c.id} className="cap">{c.label}</span>)}
        </div>
      )}

      {/* Capacity */}
      <section className="panel-sec">
        <h3>Capacity estimate</h3>
        <div className="metric-grid">
          {capacity.metrics.map((m) => (
            <div className="metric" key={m.label}>
              <div className="metric-val tnum mono">{m.value}</div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-hint">{m.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Production readiness */}
      <section className="panel-sec">
        <div className="sec-head">
          <h3>Production readiness</h3>
          <span className="sec-score" style={{ color: scoreColor(readiness.score) }}>{readiness.score}<span>/100</span></span>
        </div>
        <ul className="checklist">
          {readiness.items.map((i) => (
            <li key={i.item} className={i.present ? 'on' : 'off'}>
              {i.present ? <Check size={14} /> : <X size={14} />} {i.item}
            </li>
          ))}
        </ul>
      </section>

      {/* Well-Architected */}
      <section className="panel-sec">
        <div className="sec-head">
          <h3>Well-Architected</h3>
          <span className="sec-score" style={{ color: scoreColor(review.overall) }}>{review.overall}<span>/100</span></span>
        </div>
        <div className="pillars">
          {review.pillars.map((p) => (
            <div className="pillar" key={p.pillar}>
              <div className="pillar-row">
                <span>{p.label}</span>
                <span className="tnum" style={{ color: scoreColor(p.score) }}>{p.score}</span>
              </div>
              <div className="bar"><i style={{ width: p.score + '%', background: scoreColor(p.score) }} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* Findings */}
      {findings?.length > 0 && (
        <section className="panel-sec">
          <h3>Findings <span className="count">{findings.length}</span></h3>
          <ul className="findings">
            {findings.map((f, i) => {
              const Ico = f.fixed ? Wrench : (sevIcon[f.severity] || Info);
              return (
                <li key={i}>
                  <Ico size={14} style={{ color: f.fixed ? 'var(--success)' : sevColor[f.severity], flex: 'none', marginTop: 2 }} />
                  <div>
                    <div className="f-title">{f.title}{f.fixed && <span className="f-fixed">auto-fixed</span>}</div>
                    <div className="f-msg">{f.message}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="panel-foot">
        <Sparkles size={13} /> Grounded on {result.grounding?.map((g) => g.domain).join(', ') || 'first principles'}
      </div>
      </>)}
    </aside>
  );
}
