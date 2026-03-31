import React, { useState } from 'react';
import {
  Network, AlertCircle, TrendingUp, CheckCircle, ShieldAlert,
  ChevronRight, Cpu, GitBranch, BarChart2, Zap, Lock, Database
} from 'lucide-react';

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: <Network size={13} /> },
  { id: 'scaling',  label: 'Scaling',  icon: <TrendingUp size={13} /> },
  { id: 'risks',    label: 'Risks',    icon: <ShieldAlert size={13} /> },
];

export default function InsightsPanel({ insights }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!insights) return null;

  const { classification, scaling = [], missing = [], risks = [], invariants } = insights;
  const satisfiedPct = invariants
    ? Math.round((invariants.satisfiedCount / Math.max(invariants.totalChecked, 1)) * 100)
    : null;

  return (
    <div className="h-full w-full flex flex-col bg-[#0c1220] animate-slideInRight">

      {/* ── HEADER ── */}
      <div className="flex-none px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Network size={16} className="text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">System Intelligence</h2>
        </div>
        <p className="text-[11px] text-slate-600 ml-9">Auto-generated architectural analysis</p>
      </div>

      {/* ── ARCHETYPE BANNER ── */}
      <div className="flex-none px-5 py-4 border-b border-white/[0.05]">
        <div
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          {/* Decorative orb */}
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/70 mb-1.5 font-mono">
            Primary Archetype
          </p>
          <p className="text-sm font-bold gradient-text leading-snug">
            {classification?.primaryArchetype || 'Distributed System'}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(classification?.traits || []).slice(0, 4).map((trait, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── INVARIANT HEALTH METER ── */}
      {satisfiedPct !== null && (
        <div className="flex-none px-5 py-3 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Lock size={11} className="text-slate-500" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Arch Invariants</span>
            </div>
            <span
              className="text-[10px] font-bold font-mono"
              style={{ color: satisfiedPct >= 90 ? '#34d399' : satisfiedPct >= 70 ? '#fbbf24' : '#f87171' }}
            >
              {invariants.satisfiedCount}/{invariants.totalChecked} PASS
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${satisfiedPct}%`,
                background: satisfiedPct >= 90
                  ? 'linear-gradient(90deg, #059669, #34d399)'
                  : satisfiedPct >= 70
                  ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                  : 'linear-gradient(90deg, #dc2626, #f87171)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex-none flex items-center gap-1 px-5 py-2 border-b border-white/[0.05]">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer"
            style={{
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeTab === tab.id ? '#818cf8' : '#475569',
              border: activeTab === tab.id ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'risks' && risks.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                {risks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-3 animate-fadeIn">
            {missing.length > 0 ? (
              <>
                <SectionHeader icon={<AlertCircle size={13} />} label="Missing Dependencies" color="#fbbf24" count={missing.length} />
                {missing.map((item, i) => (
                  <InsightCard key={i} item={item} accentColor="#d97706" bgColor="rgba(217,119,6,0.06)" borderColor="rgba(217,119,6,0.15)" />
                ))}
              </>
            ) : (
              <HealthBadge />
            )}

            {/* Stats row */}
            {insights.simulation && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <StatCard
                  label="Flow Coverage"
                  value={`${insights.simulation.pipelineCompleteness ?? 0}%`}
                  icon={<BarChart2 size={13} />}
                  color="#6366f1"
                />
                <StatCard
                  label="Flows Simulated"
                  value={insights.simulation.totalFlowsSimulated ?? 0}
                  icon={<GitBranch size={13} />}
                  color="#8b5cf6"
                />
              </div>
            )}
          </div>
        )}

        {/* SCALING TAB */}
        {activeTab === 'scaling' && (
          <div className="space-y-3 animate-fadeIn">
            <SectionHeader icon={<TrendingUp size={13} />} label="Scaling Recommendations" color="#34d399" count={scaling.length} />
            {scaling.length > 0
              ? scaling.map((item, i) => (
                  <InsightCard key={i} item={item} accentColor="#059669" bgColor="rgba(5,150,105,0.06)" borderColor="rgba(5,150,105,0.15)" />
                ))
              : <EmptyState label="No scaling suggestions — architecture is well-sized." />
            }
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && (
          <div className="space-y-3 animate-fadeIn">
            <SectionHeader icon={<ShieldAlert size={13} />} label="Structural Risks" color="#f87171" count={risks.length} />
            {risks.length > 0
              ? risks.map((item, i) => (
                  <InsightCard key={i} item={item} accentColor="#dc2626" bgColor="rgba(220,38,38,0.06)" borderColor="rgba(220,38,38,0.15)" showSeverity />
                ))
              : <HealthBadge />
            }
          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <div className="flex-none px-5 py-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-700">ARCHFORGE ENGINE v4</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-600">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

function SectionHeader({ icon, label, color, count }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
          {count} item{count !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function InsightCard({ item, accentColor, bgColor, borderColor, showSeverity }) {
  const [expanded, setExpanded] = useState(false);
  const confidence = item.confidence ? Math.round(item.confidence * 100) : null;

  return (
    <div
      className="rounded-xl p-3.5 cursor-pointer transition-all duration-200 node-card-hover"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-none mt-0.5 w-1 h-1 rounded-full mt-1.5" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
        <p className={`text-xs text-slate-300 leading-relaxed flex-1 ${!expanded ? 'line-clamp-2' : ''}`}>
          {item.suggestion}
        </p>
        <ChevronRight
          size={12}
          className="flex-none text-slate-600 transition-transform duration-200 mt-0.5"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </div>
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between" style={{ borderColor: borderColor }}>
          {showSeverity && item.severity && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {item.severity}
            </span>
          )}
          {item.certainty === 'low' && (
            <span className="text-[9px] font-mono text-yellow-500/70">Optional suggestion</span>
          )}
          {confidence !== null && (
            <span className="text-[9px] font-mono ml-auto" style={{ color: accentColor }}>
              CONF {confidence}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ background: `${color}0d`, border: `1px solid ${color}20` }}
    >
      <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-base font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] font-mono text-slate-600 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function HealthBadge() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="relative mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <CheckCircle size={20} className="text-emerald-400" />
        </div>
        <div className="absolute -inset-2 rounded-full opacity-20 blur-md" style={{ background: '#34d399' }} />
      </div>
      <p className="text-sm font-semibold text-slate-300">No Issues Found</p>
      <p className="text-[11px] text-slate-600 mt-1">Architecture looks clean</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[11px] text-slate-600">{label}</p>
    </div>
  );
}
