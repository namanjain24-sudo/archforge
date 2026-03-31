import React, { useState } from 'react';
import axios from 'axios';
import InputBox from './components/InputBox';
import Diagram from './components/Diagram';
import Controls from './components/Controls';
import InsightsPanel from './components/InsightsPanel';
import {
  Layers, AlertTriangle, MessageCircle, Zap,
  GitBranch, Database, Shield, BarChart2, ArrowRight, Cpu
} from 'lucide-react';

/* ── EXAMPLE PROMPTS ── */
const EXAMPLES = [
  { label: 'E-Commerce', prompt: 'an e-commerce platform with payment processing, inventory management and order tracking', color: '#6366f1' },
  { label: 'Chat App',   prompt: 'a real-time chat app with WebSocket messaging, user presence, and push notifications', color: '#8b5cf6' },
  { label: 'Streaming',  prompt: 'a video streaming platform with CDN delivery, transcoding pipeline and recommendation engine', color: '#06b6d4' },
  { label: 'Ride Share', prompt: 'a ride-sharing platform with live location tracking, driver matching, and surge pricing', color: '#f59e0b' },
];

/* ── FEATURE HIGHLIGHTS ── */
const FEATURES = [
  { icon: <GitBranch size={16} />, label: 'Saga Orchestration',  desc: 'Auto-wired compensation flows',       color: '#6366f1' },
  { icon: <Database  size={16} />, label: 'DB-per-Service',      desc: 'Strict bounded context isolation',     color: '#8b5cf6' },
  { icon: <Shield    size={16} />, label: 'Edge Auth',           desc: 'JWT validation at the gateway',        color: '#06b6d4' },
  { icon: <BarChart2 size={16} />, label: 'Analytics Pipeline',  desc: 'Service → Kafka → ETL → Warehouse',    color: '#f59e0b' },
  { icon: <Cpu       size={16} />, label: '17 Invariants',       desc: 'Hard architectural correctness checks', color: '#34d399' },
  { icon: <Zap       size={16} />, label: 'Flow Simulation',     desc: 'Request/response path tracing',        color: '#f87171' },
];

/* ── HOW IT WORKS PIPELINE ── */
const HOW_IT_WORKS = [
  { step: '01', title: 'Semantic Parsing', desc: 'NLP translates natural language into a graph of systemic capabilities and nodes.', icon: <MessageCircle size={16} />, color: '#6366f1' },
  { step: '02', title: 'Domain Heuristics', desc: 'Matches capabilities to FAANG templates (e.g. E-Commerce Saga, CQRS, Real-time).', icon: <Layers size={16} />, color: '#8b5cf6' },
  { step: '03', title: 'Invariants Compiler', desc: 'Checks and strictly enforces 17 design rules, rejecting shared databases and raw reads.', icon: <Shield size={16} />, color: '#06b6d4' },
  { step: '04', title: 'Simulation Engine', desc: 'Deterministically wires network edges, sync/async boundaries, and exact protocols.', icon: <Zap size={16} />, color: '#f59e0b' },
];

export default function App() {
  const [inputVal, setInputVal]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [systemData, setSystemData] = useState(null);
  const [viewMode, setViewMode]   = useState('layered');

  const handleGenerate = async () => {
    if (!inputVal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:3000/api/generate', { input: inputVal });
      setSystemData(response.data);
    } catch (err) {
      const errorData = err.response?.data;
      setError({
        type: errorData?.type === 'NO_ARCHITECTURE_INTENT' ? 'intent' : 'error',
        message: errorData?.error || 'Failed to generate architecture.',
      });
      if (errorData?.type !== 'NO_ARCHITECTURE_INTENT') setSystemData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden relative" style={{ background: '#080c14', fontFamily: 'Inter, sans-serif' }}>
      
      {/* GLOBAL BACKGROUND ENHANCEMENT */}
      <div className="bg-grid" />

      {/* ══ HEADER ══ */}
      <header
        className="flex-none flex items-center justify-between px-6 py-3 z-20"
        style={{
          background: 'rgba(8,12,20,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 0 rgba(99,102,241,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 select-none">
          <div
            className="relative flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 16px rgba(99,102,241,0.45)',
            }}
          >
            <Layers size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">ArchForge</h1>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest leading-none mt-0.5">System Design Compiler</p>
          </div>
        </div>

        {/* Center — Input */}
        <div className="flex-1 max-w-2xl mx-8">
          <InputBox
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onGenerate={handleGenerate}
            loading={loading}
          />
        </div>

        {/* Right — Status */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="hidden md:flex px-3 py-1.5 rounded-full text-[10px] font-mono text-amber-500/80 uppercase tracking-widest items-center gap-1.5 bg-amber-500/5 border border-amber-500/20 mr-1" title="Data will be lost if you refresh.">
            <AlertTriangle size={11} />
            Data lost on reload
          </div>
          {systemData && (
            <div
              className="text-[10px] font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', color: '#34d399' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Architecture Ready
            </div>
          )}
          {loading && (
            <div
              className="text-[10px] font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Compiling...
            </div>
          )}
        </div>
      </header>

      {/* ══ ERROR TOAST ══ */}
      {error && error.type === 'error' && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm animate-fadeIn"
          style={{
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          {error.message}
        </div>
      )}

      {/* ══ MAIN ══ */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Canvas / Content */}
        <div className="flex-1 relative overflow-hidden">

          {/* ── DIAGRAM ── */}
          {systemData && (
            <div className="absolute inset-0 animate-fadeIn">
              <Diagram views={systemData.views} viewMode={viewMode} />
            </div>
          )}

          {/* ── LOADING SKELETON ── */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              {/* Animated rings */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-spin-slow" />
                <div className="absolute inset-2 rounded-full border-2 border-purple-500/30" style={{ animation: 'spin-slow 5s linear infinite reverse' }} />
                <div className="absolute inset-4 rounded-full border-2 border-indigo-400/40 animate-spin-slow" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers size={24} className="text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-300">Compiling Architecture</p>
                <p className="text-[11px] font-mono text-slate-600">Running 17 invariants + domain flow engine...</p>
              </div>
              {/* Skeleton rows */}
              <div className="space-y-2 w-64 mt-2">
                {['w-full', 'w-4/5', 'w-3/5'].map((w, i) => (
                  <div key={i} className={`h-2 rounded skeleton ${w}`} style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* ── INTENT ERROR ── */}
          {!loading && error?.type === 'intent' && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div
                className="max-w-xl w-full rounded-2xl p-7 animate-fadeIn"
                style={{
                  background: 'rgba(12, 18, 32, 0.95)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <MessageCircle size={20} className="text-amber-400" />
                  </div>
                  <h2 className="text-base font-bold text-white">Architecture Input Required</h2>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{error.message}</p>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Quick Start</p>
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => { setInputVal(ex.prompt); setError(null); }}
                      className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer group"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: ex.color }} />
                      <span className="flex-1">"{ex.prompt}"</span>
                      <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ex.color }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LANDING STATE ── */}
          {!loading && !systemData && !error && (
            <LandingState onExample={(p) => { setInputVal(p); }} />
          )}

          {/* ── CONTROLS ── */}
          {systemData && !loading && (
            <Controls viewMode={viewMode} setViewMode={setViewMode} />
          )}
        </div>

        {/* ── INSIGHTS SIDEBAR ── */}
        {systemData && !loading && (
          <aside
            className="w-80 flex-none flex flex-col animate-slideInRight"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}
          >
            <InsightsPanel insights={systemData.insights} />
          </aside>
        )}
      </main>
    </div>
  );
}

/* ══ LANDING PAGE ══ */
function LandingState({ onExample }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 pb-8 px-8 overflow-y-auto no-scrollbar">

      {/* Background orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.03] blur-3xl pointer-events-none animate-orb"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.03] blur-3xl pointer-events-none animate-orb"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animationDelay: '4s' }} />

      {/* Hero */}
      <div className="relative text-center mb-12 animate-fadeIn">
        <div className="flex items-center justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 32px rgba(99,102,241,0.4), 0 0 64px rgba(99,102,241,0.1)',
            }}
          >
            <Layers size={28} className="text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Describe your system.
        </h2>
        <p className="text-base gradient-text font-semibold mb-1">
          We'll architect it.
        </p>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          FAANG-grade microservices architecture generated in seconds — with saga orchestration, DB-per-service, and 17 hard invariants enforced automatically.
        </p>
      </div>

      {/* HOW IT WORKS PIPELINE */}
      <div className="w-full max-w-5xl mb-12 relative animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="text-center mb-6">
          <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">How Engine Works</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-800 -z-10 hidden md:block" />
          {HOW_IT_WORKS.map((h, i) => (
            <div key={i} className="bg-[#0f172a] border border-slate-700/60 p-5 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-1">
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-[0.03] group-hover:opacity-[0.15] transition-opacity blur-xl" style={{ backgroundColor: h.color }} />
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl border border-slate-700/50" style={{ backgroundColor: `${h.color}15`, color: h.color }}>
                  {h.icon}
                </div>
                <span className="text-3xl font-black font-mono opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{ color: h.color }}>
                  {h.step}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2 leading-tight">{h.title}</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fadeIn max-w-3xl" style={{ animationDelay: '0.15s' }}>
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono cursor-default transition-colors hover:bg-slate-800"
            style={{
              background: `rgba(15,23,42,0.6)`,
              border: `1px solid ${f.color}30`,
              color: f.color,
              animationDelay: `${i * 0.03}s`
            }}
          >
            {f.icon}
            <span className="text-slate-300">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Example cards */}
      <div className="w-full max-w-5xl animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="text-center mb-5">
          <h3 className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Example Architectures</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => onExample(ex.prompt)}
            className="text-left px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer group relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${ex.color}30`; e.currentTarget.style.background = `${ex.color}08`; }}
            onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color: ex.color }}>{ex.label}</span>
              <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ color: ex.color }} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
              "{ex.prompt}"
            </p>
          </button>
        ))}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <AlertTriangle size={12} className="text-amber-500/70" />
        Note: Architecture sessions are ephemeral. Reloading the page will reset your data.
      </div>
    </div>
  );
}
