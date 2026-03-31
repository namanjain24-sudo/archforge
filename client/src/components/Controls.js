import React from 'react';
import { Layers, Maximize, Cpu, GitBranch } from 'lucide-react';

export default function Controls({ viewMode, setViewMode }) {
  const modes = [
    { id: 'simple',   label: 'Simple',   icon: <Layers size={13} /> },
    { id: 'detailed', label: 'Detailed', icon: <Cpu size={13} /> },
    { id: 'layered',  label: 'Layered',  icon: <Maximize size={13} /> },
    { id: 'flow',     label: 'Flow',     icon: <GitBranch size={13} /> },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
      <div
        className="flex items-center p-1 rounded-xl gap-0.5"
        style={{
          background: 'rgba(10, 15, 25, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
        }}
      >
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: viewMode === mode.id
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'transparent',
              color: viewMode === mode.id ? '#fff' : '#64748b',
              boxShadow: viewMode === mode.id ? '0 0 12px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
