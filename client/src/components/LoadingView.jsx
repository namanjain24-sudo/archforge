import { useEffect, useState } from 'react';
import { ScanSearch, Library, ShieldCheck, LayoutGrid, Check } from 'lucide-react';
import './loading.css';

const STAGES = [
  { icon: ScanSearch, label: 'Understanding the requirements' },
  { icon: Library, label: 'Grounding on real reference architectures' },
  { icon: ShieldCheck, label: 'Generating & verifying candidates' },
  { icon: LayoutGrid, label: 'Estimating capacity & laying out' },
];

/** Premium generating screen — walks the real pipeline stages while the model
 *  works. Purely presentational timing (the API is one call), but it mirrors
 *  what's actually happening and makes the wait feel considered. */
export function LoadingView({ prompt }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="loading-view">
      <div className="loading-orb"><span /><span /><span /></div>
      <h2>Designing your architecture</h2>
      {prompt && <p className="loading-prompt">&ldquo;{prompt}&rdquo;</p>}
      <ul className="loading-stages">
        {STAGES.map((s, i) => {
          const done = i < active, on = i === active;
          const Ico = done ? Check : s.icon;
          return (
            <li key={i} className={done ? 'done' : on ? 'on' : ''}>
              <span className="ls-ico"><Ico size={15} /></span>
              {s.label}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
