import React from 'react';
import { Sparkles, Loader2, Command } from 'lucide-react';

export default function InputBox({ value, onChange, onGenerate, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto group">
      {/* Glow ring on focus */}
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/30 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="relative flex items-center bg-[#141c2e] rounded-xl border border-white/[0.07] group-focus-within:border-indigo-500/50 transition-all duration-300 shadow-lg shadow-black/40">
        {/* Left icon */}
        <div className="pl-4 flex-none">
          <Command size={15} className="text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
        </div>

        <input
          type="text"
          className="flex-1 bg-transparent px-3 py-3.5 text-slate-200 outline-none placeholder:text-slate-600 text-sm font-medium"
          placeholder="e.g. video distribution platform with CDN, queues, and real-time analytics..."
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Kbd hint */}
        {!loading && !value && (
          <div className="hidden md:flex items-center gap-1 mr-3 text-slate-700 text-[10px] font-mono select-none">
            <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/5">↵</span>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={loading || !value.trim()}
          className="flex-none m-1.5 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden"
          style={{
            background: loading || !value.trim()
              ? 'rgba(30,41,59,0.8)'
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: loading || !value.trim() ? '#475569' : '#fff',
            boxShadow: loading || !value.trim() ? 'none' : '0 0 16px rgba(99,102,241,0.4)',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Forging...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Forge</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
