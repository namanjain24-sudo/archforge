import { Diagram } from './Diagram.jsx';
import sample from '../dev/sample-result.json';

/** Large, real product visual for the landing — the actual generated diagram in
 *  an app-window frame. This is the "see it work", not a mockup. */
export function Showcase() {
  return (
    <div className="showcase">
      <div className="showcase-glow" aria-hidden />
      <div className="showcase-frame">
        <div className="showcase-bar">
          <div className="sc-dots"><i /><i /><i /></div>
          <span className="showcase-title mono">url-shortener · verified architecture</span>
          <div className="showcase-badges">
            <span className="sc-badge">Readiness <b>100</b></span>
            <span className="sc-badge">Well-Architected <b>100</b></span>
          </div>
        </div>
        <div className="showcase-canvas">
          <Diagram graph={sample.graph} static />
        </div>
      </div>
    </div>
  );
}
