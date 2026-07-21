import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as Lucide from 'lucide-react';

const pascal = (k = '') => k.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
const iconFor = (name) => Lucide[pascal(name)] || Lucide.Box;

/** A single architecture component. Layer color, tech badge, redundancy mark,
 *  and its "why" surfaced on hover — trust is the product. */
export const ArchNode = memo(function ArchNode({ data }) {
  const Icon = iconFor(data.icon);
  const color = `var(--layer-${data.layer})`;
  return (
    <div
      className={`arch-node${data.spotlight ? ' spotlight' : ''}${data.dimmed ? ' dimmed' : ''}`}
      style={{ '--lc': color }}
      title={data.why}
    >
      <Handle type="target" position={Position.Top} className="arch-handle" />
      <div className="arch-node-icon"><Icon size={17} /></div>
      <div className="arch-node-body">
        <div className="arch-node-label">
          {data.label}
          {data.redundant && <span className="arch-node-ha" title="Redundant / highly available" />}
        </div>
        {data.tech && <div className="arch-node-tech mono">{data.tech}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="arch-handle" />
    </div>
  );
});
