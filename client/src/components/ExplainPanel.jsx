import { ArrowDown, Database, Layers, Route, Zap, Radio, BarChart3 } from 'lucide-react';

const FLOW_ICON = { sync: Route, async: Zap, realtime: Radio, analytics: BarChart3 };

/**
 * The "how does this actually work" view. Everything here is derived from the
 * verified graph on the server, so it always matches the diagram — hovering a
 * step spotlights that component in the picture.
 */
export function ExplainPanel({ explanation, onHighlight }) {
  if (!explanation || (!explanation.flows?.length && !explanation.layers?.length)) {
    return <p className="explain-empty">No walkthrough available for this diagram.</p>;
  }
  const { summary, flows = [], layers = [], stores = [] } = explanation;
  const hi = (ids) => onHighlight?.(ids);
  const clear = () => onHighlight?.(null);

  return (
    <div className="explain" onMouseLeave={clear}>
      {summary && <p className="explain-summary">{summary}</p>}

      {flows.map((f) => {
        const Ico = FLOW_ICON[f.kind] || Route;
        return (
          <section className="panel-sec" key={f.id}>
            <h3><Ico size={13} />{f.title}</h3>
            <p className="explain-note">{f.note}</p>
            <ol
              className="flow"
              onMouseEnter={() => hi(f.steps.map((s) => s.id))}
            >
              {f.steps.map((s, i) => (
                <li key={`${f.id}-${s.id}-${i}`}>
                  {i > 0 && (
                    <div className="flow-link">
                      <ArrowDown size={12} />
                      {s.via && <span className="flow-via">{s.via}</span>}
                    </div>
                  )}
                  <div
                    className="flow-step"
                    onMouseEnter={(e) => { e.stopPropagation(); hi([s.id]); }}
                  >
                    <span className="flow-n tnum">{i + 1}</span>
                    <div className="flow-body">
                      <div className="flow-label">
                        {s.label}
                        {s.tech && <span className="flow-tech mono">{s.tech}</span>}
                      </div>
                      {s.why && <div className="flow-why">{s.why}</div>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {stores.length > 0 && (
        <section className="panel-sec">
          <h3><Database size={13} />What each datastore holds</h3>
          <ul className="store-list">
            {stores.map((s) => (
              <li key={s.id} onMouseEnter={() => hi([s.id])}>
                <div className="store-head">
                  {s.label}
                  {s.tech && <span className="flow-tech mono">{s.tech}</span>}
                </div>
                <div className="store-role">For {s.role}.</div>
                {s.writtenBy?.length > 0 && (
                  <div className="store-by">Written by {s.writtenBy.join(', ')}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {layers.length > 0 && (
        <section className="panel-sec">
          <h3><Layers size={13} />What each tier is for</h3>
          <ul className="tier-list">
            {layers.map((l) => (
              <li key={l.layer} onMouseEnter={() => hi(l.components.map((c) => c.id))}>
                <div className="tier-head">
                  <span className="tier-dot" style={{ background: `var(--layer-${l.layer})` }} />
                  {l.label}
                  <span className="tier-count">{l.components.length}</span>
                </div>
                <div className="tier-role">{l.role}</div>
                <div className="tier-comps">
                  {l.components.map((c) => <span className="tier-chip" key={c.id}>{c.label}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
